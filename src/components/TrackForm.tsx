import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, Link as LinkIcon, Sparkles, Wand2, Play, Pause, RefreshCw, X, Tag as TagIcon,
  Music2, FileAudio, Image as ImageIcon, Disc3, Cloud, Loader2, Search, Check, ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import FileDropzone from "@/components/FileDropzone";
import CoverPicker from "@/components/CoverPicker";
import { extractAudioMetadataFast, needsBpmAnalysis, analyzeBpmAsync } from "@/lib/audioMetadata";
import { generateAudioPreview, type PreviewStartMode } from "@/lib/audioPreview";
import { trackSchema, validateAudioFile, validateImageFile } from "@/lib/trackSchema";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { DbTrack } from "@/hooks/useTracks";

const VERSIONS = ["Original", "Intro Edit", "Clean", "Dirty", "Extended", "Short Edit", "Acapella", "Instrumental", "Quick Hit", "Transition"];
const MUSICAL_KEYS = [
  "C", "Cm", "C#", "C#m", "Db", "Dbm", "D", "Dm", "D#", "D#m", "Eb", "Ebm",
  "E", "Em", "F", "Fm", "F#", "F#m", "Gb", "Gbm", "G", "Gm", "G#", "G#m",
  "Ab", "Abm", "A", "Am", "A#", "A#m", "Bb", "Bbm", "B", "Bm",
];
const SUGGESTED_TAG_BANK = [
  "exclusive", "summer", "club", "festival", "radio", "tiktok", "viral",
  "throwback", "remix", "vocal", "instrumental", "mashup", "transition",
  "bigroom", "afterhours", "warmup", "peaktime", "drive", "chill",
];

interface TrackFormProps {
  initialData?: DbTrack | null;
  saving: boolean;
  onSubmit: (data: TrackFormData) => void;
  existingGenres?: string[];
  existingTags?: string[];
}

export interface TrackFormData {
  title: string;
  artist: string;
  genre: string;
  bpm: string;
  musicalKey: string;
  version: string;
  label: string;
  duration: string;
  tags: string;
  audioFile: File | null;
  audioUrl: string;
  previewFile: File | null;
  previewUrl: string;
  coverFile: File | null;
  coverUrl: string;
  downloadUrl: string;
  acapellaUrl: string;
  instrumentalUrl: string;
}

type SourceMode = "file" | "url";

export default function TrackForm({ initialData, saving, onSubmit, existingGenres = [], existingTags = [] }: TrackFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [artist, setArtist] = useState(initialData?.artist ?? "");
  const [genre, setGenre] = useState(initialData?.genre ?? "");
  const [bpm, setBpm] = useState(initialData?.bpm?.toString() ?? "");
  const [musicalKey, setMusicalKey] = useState(initialData?.musical_key ?? "");
  const [version, setVersion] = useState(initialData?.version ?? "Original");
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [duration, setDuration] = useState(initialData?.duration ?? "");
  const [tagList, setTagList] = useState<string[]>(initialData?.tags ?? []);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState((initialData as any)?.download_url ?? "");
  const [acapellaUrl, setAcapellaUrl] = useState((initialData as any)?.acapella_url ?? "");
  const [instrumentalUrl, setInstrumentalUrl] = useState((initialData as any)?.instrumental_url ?? "");
  const [audioMode, setAudioMode] = useState<SourceMode>("file");
  const [previewMode, setPreviewMode] = useState<SourceMode>("file");
  const [coverMode, setCoverMode] = useState<SourceMode>("file");
  const [extracting, setExtracting] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_url ?? null);
  const [analyzingBpm, setAnalyzingBpm] = useState(false);

  // SoundCloud quick-import
  const [scUrl, setScUrl] = useState("");
  const [scImporting, setScImporting] = useState(false);

  // Wizard step + meta search
  const [step, setStep] = useState(0);
  const [metaQuery, setMetaQuery] = useState("");
  const [metaSearching, setMetaSearching] = useState(false);
  const [metaResults, setMetaResults] = useState<any[]>([]);

  // Preview auto-generation
  const [previewAuto, setPreviewAuto] = useState(true);
  const [previewStart, setPreviewStart] = useState<PreviewStartMode>("quarter");
  const [previewSeconds, setPreviewSeconds] = useState(30);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-fill metadata when audio file selected
  useEffect(() => {
    if (!audioFile) return;
    let cancelled = false;
    setExtracting(true);
    extractAudioMetadataFast(audioFile)
      .then((meta) => {
        if (cancelled) return;
        setTitle((v) => v || meta.title || "");
        setArtist((v) => v || meta.artist || "");
        setGenre((v) => v || meta.genre || "");
        setDuration((v) => v || meta.duration || "");
        if (meta.bpm) setBpm((v) => v || String(meta.bpm));
        if (meta.key) setMusicalKey((v) => v || meta.key!);
        if (meta.version) {
          const matched = VERSIONS.find((v) => meta.version!.toLowerCase().includes(v.toLowerCase()))
            || (meta.version.toLowerCase().includes("remix") ? "Extended" : null);
          if (matched) setVersion((cur) => (cur && cur !== "Original" ? cur : matched));
        }
        // Auto-set cover from embedded artwork if none provided
        if (meta.pictureFile && !coverFile && !coverUrl && !initialData?.cover_url) {
          setCoverFile(meta.pictureFile);
          toast({ title: "Pochette détectée", description: "Image intégrée extraite du fichier." });
        }
        if (meta.title || meta.artist || meta.bpm) {
          toast({ title: "Métadonnées détectées", description: "Champs pré-remplis depuis le fichier." });
        }
        setExtracting(false);
        if (needsBpmAnalysis(meta)) {
          setAnalyzingBpm(true);
          analyzeBpmAsync(audioFile)
            .then((detected) => {
              if (cancelled) return;
              if (detected) {
                setBpm((v) => v || String(detected));
                toast({ title: "BPM détecté", description: `Analyse audio : ${detected} BPM` });
              }
            })
            .finally(() => !cancelled && setAnalyzingBpm(false));
        }
      })
      .catch(() => !cancelled && setExtracting(false));
    return () => { cancelled = true; };
  }, [audioFile]);

  // Auto-generate preview when full audio is set and no manual preview provided
  const generatePreview = async (file: File, mode: PreviewStartMode, seconds: number) => {
    setPreviewGenerating(true);
    try {
      const blob = await generateAudioPreview(file, { startMode: mode, seconds });
      if (!blob) {
        toast({ title: "Génération impossible", description: "Impossible de décoder le fichier audio.", variant: "destructive" });
        return;
      }
      const generated = new File([blob], `preview-${Date.now()}.wav`, { type: "audio/wav" });
      setPreviewFile(generated);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
      toast({ title: "Extrait généré", description: `${seconds}s · ${(blob.size / 1024).toFixed(0)} Ko` });
    } finally {
      setPreviewGenerating(false);
    }
  };

  // Trigger auto-generation when audio file changes (only if no manual preview)
  useEffect(() => {
    if (!audioFile || !previewAuto) return;
    if (previewFile || previewUrl) return;
    generatePreview(audioFile, previewStart, previewSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile]);

  // Cover preview
  useEffect(() => {
    if (!coverFile) return;
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    return () => { if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl); };
  }, [previewBlobUrl]);

  const togglePreviewPlayback = () => {
    if (!previewBlobUrl) return;
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(previewBlobUrl);
      previewAudioRef.current.onended = () => setPreviewPlaying(false);
    } else if (previewAudioRef.current.src !== previewBlobUrl) {
      previewAudioRef.current.src = previewBlobUrl;
    }
    if (previewPlaying) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setPreviewPlaying(true)).catch(() => {});
    }
  };

  const regeneratePreview = () => {
    if (!audioFile) {
      toast({ title: "Fichier audio requis", description: "Charge d'abord un fichier audio complet.", variant: "destructive" });
      return;
    }
    generatePreview(audioFile, previewStart, previewSeconds);
  };

  const importFromSoundCloud = async () => {
    const url = scUrl.trim();
    if (!url || !/soundcloud\.com/i.test(url)) {
      toast({ title: "Lien invalide", description: "Colle un lien SoundCloud valide.", variant: "destructive" });
      return;
    }
    setScImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "soundcloud_meta", url },
      });
      if (error || !data || (data as any).error) {
        throw new Error((data as any)?.error || error?.message || "Échec de l'import");
      }
      const meta = data as { thumbnail?: string; title?: string; author_name?: string };

      // Parse "Artist - Title" pattern when present
      let parsedArtist = meta.author_name || "";
      let parsedTitle = meta.title || "";
      if (parsedTitle && /\s[-–—]\s/.test(parsedTitle)) {
        const [left, ...rest] = parsedTitle.split(/\s[-–—]\s/);
        parsedArtist = parsedArtist || left.trim();
        parsedTitle = rest.join(" - ").trim();
      }

      // Fill audio + preview URL with the SoundCloud page URL (public listenable link)
      setAudioMode("url");
      setAudioUrl(url);
      setPreviewMode("url");
      setPreviewUrl(url);
      setPreviewAuto(false);
      setDownloadUrl((v) => v || url);

      if (parsedTitle) setTitle((v) => v || parsedTitle);
      if (parsedArtist) setArtist((v) => v || parsedArtist);

      // Cover from SoundCloud artwork
      if (meta.thumbnail) {
        try {
          const proxy = await supabase.functions.invoke("cover-tools", {
            body: { action: "fetch", url: meta.thumbnail },
          });
          const dataUrl = (proxy.data as any)?.dataUrl as string | undefined;
          if (dataUrl) {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], "soundcloud-cover.jpg", { type: blob.type || "image/jpeg" });
            setCoverFile(file);
            setCoverUrl("");
          } else {
            setCoverUrl(meta.thumbnail);
          }
        } catch {
          setCoverUrl(meta.thumbnail);
        }
      }

      toast({ title: "Import SoundCloud", description: "Métadonnées et pochette importées." });
    } catch (err: any) {
      toast({ title: "Erreur SoundCloud", description: err?.message || "Import impossible", variant: "destructive" });
    } finally {
      setScImporting(false);
    }
  };

  // Auto-fill metadata from iTunes / Deezer
  const runMetaSearch = async () => {
    const q = metaQuery.trim() || `${artist} ${title}`.trim();
    if (!q) {
      toast({ title: "Recherche vide", description: "Tape un artiste ou un titre.", variant: "destructive" });
      return;
    }
    setMetaSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "meta_search", query: q },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Erreur");
      const results = ((data as any).results ?? []) as any[];
      setMetaResults(results);
      if (!results.length) toast({ title: "Aucun résultat", description: "Essaie une autre formulation." });
    } catch (err: any) {
      toast({ title: "Erreur de recherche", description: err?.message ?? "Inconnue", variant: "destructive" });
    } finally {
      setMetaSearching(false);
    }
  };

  const applyMetaResult = async (r: any) => {
    if (r.artist) setArtist(r.artist);
    if (r.title) setTitle(r.title);
    if (r.genre && !genre) setGenre(r.genre);
    if (r.album && !label) setLabel(r.album);
    if (r.durationMs && !duration) {
      const total = Math.round(r.durationMs / 1000);
      const m = Math.floor(total / 60);
      const s = String(total % 60).padStart(2, "0");
      setDuration(`${m}:${s}`);
    }
    if (r.coverUrl && !coverFile && !coverUrl) {
      try {
        const proxy = await supabase.functions.invoke("cover-tools", {
          body: { action: "fetch", url: r.coverUrl },
        });
        const dataUrl = (proxy.data as any)?.dataUrl as string | undefined;
        if (dataUrl) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          setCoverFile(new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" }));
        } else {
          setCoverUrl(r.coverUrl);
        }
      } catch {
        setCoverUrl(r.coverUrl);
      }
    }
    setMetaResults([]);
    toast({ title: "Métadonnées appliquées", description: `${r.source} · ${r.artist} — ${r.title}` });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsStr = tagList.join(", ");
    const result = trackSchema.safeParse({
      title, artist, genre, bpm, musicalKey, version, label, duration, tags: tagsStr,
      audioUrl, previewUrl, coverUrl, downloadUrl,
    });
    if (!result.success) {
      const firstError = result.error.issues[0];
      toast({ title: "Validation", description: firstError.message, variant: "destructive" });
      return;
    }
    if (!initialData && !audioFile && !audioUrl) {
      toast({ title: "Audio requis", description: "Ajoute un fichier ou une URL audio.", variant: "destructive" });
      return;
    }
    onSubmit({
      title, artist, genre, bpm, musicalKey, version, label, duration,
      tags: tagsStr,
      audioFile, audioUrl, previewFile, previewUrl, coverFile, coverUrl,
      downloadUrl, acapellaUrl, instrumentalUrl,
    });
  };

  const ModeToggle = ({ mode, setMode }: { mode: SourceMode; setMode: (m: SourceMode) => void }) => (
    <div className="flex gap-1 ml-auto">
      <button type="button" onClick={() => setMode("file")} className={`text-xs px-2 py-0.5 rounded ${mode === "file" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        <Upload className="h-3 w-3 inline mr-1" />Fichier
      </button>
      <button type="button" onClick={() => setMode("url")} className={`text-xs px-2 py-0.5 rounded ${mode === "url" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        <LinkIcon className="h-3 w-3 inline mr-1" />Lien
      </button>
    </div>
  );

  const tagSuggestions = useMemo(() => {
    const lower = new Set(tagList.map((t) => t.toLowerCase()));
    const pool = Array.from(new Set([...existingTags, ...SUGGESTED_TAG_BANK]));
    return pool.filter((t) => !lower.has(t.toLowerCase())).slice(0, 14);
  }, [tagList, existingTags]);

  // Progress / status pills
  const statusPills = [
    { ok: !!title && !!artist, label: "Titre + Remixeur" },
    { ok: !!genre, label: "Genre" },
    { ok: !!bpm && !!musicalKey, label: "BPM + Tonalité" },
    { ok: tagList.length > 0, label: "Tags" },
    { ok: !!audioFile || !!audioUrl || !!initialData?.audio_url, label: "Audio" },
    { ok: !!previewFile || !!previewUrl || !!initialData?.preview_url, label: "Extrait" },
    { ok: !!coverFile || !!coverUrl || !!initialData?.cover_url, label: "Pochette" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Status bar */}
      <div className="flex flex-wrap gap-1.5 items-center px-1">
        {statusPills.map((p) => (
          <span
            key={p.label}
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
              p.ok ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground border-border"
            }`}
          >
            {p.ok ? "✓" : "·"} {p.label}
          </span>
        ))}
      </div>

      {(extracting || analyzingBpm || previewGenerating) && (
        <div className="space-y-1">
          {extracting && (
            <div className="text-xs text-primary flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded px-2 py-1.5">
              <Sparkles className="h-3 w-3 animate-pulse" /> Extraction des métadonnées audio...
            </div>
          )}
          {analyzingBpm && (
            <div className="text-xs text-accent flex items-center gap-2 bg-accent/5 border border-accent/20 rounded px-2 py-1.5">
              <Sparkles className="h-3 w-3 animate-pulse" /> Analyse BPM en cours…
            </div>
          )}
          {previewGenerating && (
            <div className="text-xs text-primary flex items-center gap-2 bg-primary/5 border border-primary/20 rounded px-2 py-1.5">
              <Wand2 className="h-3 w-3 animate-pulse" /> Génération de l'extrait audio…
            </div>
          )}
        </div>
      )}

      {/* ============= STEPPER ============= */}
      <Stepper
        current={step}
        steps={[
          { label: "Source", icon: <Cloud className="h-3.5 w-3.5" /> },
          { label: "Métadonnées", icon: <Disc3 className="h-3.5 w-3.5" /> },
          { label: "Pochette & Extrait", icon: <ImageIcon className="h-3.5 w-3.5" /> },
          { label: "Publication", icon: <Check className="h-3.5 w-3.5" /> },
        ]}
        onSelect={setStep}
      />

      {/* ============= STEP 0 : SOURCE ============= */}
      {step === 0 && (
        <div className="space-y-5 pt-2">
          {/* SoundCloud quick-import */}
          <div className="space-y-2 rounded-lg border border-[hsl(15_90%_55%)]/40 bg-[hsl(15_90%_55%)]/5 p-3">
            <Label className="flex items-center gap-1.5 text-sm">
              <Cloud className="h-4 w-4 text-[hsl(15_90%_55%)]" />
              Import depuis SoundCloud
              <span className="text-[10px] uppercase tracking-wider font-normal text-muted-foreground ml-1">
                morceau + lien
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={scUrl}
                onChange={(e) => setScUrl(e.target.value)}
                placeholder="https://soundcloud.com/artiste/titre"
                className="bg-secondary border-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!scImporting) importFromSoundCloud();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-[hsl(15_90%_55%)]/40 hover:bg-[hsl(15_90%_55%)]/10"
                disabled={scImporting || !scUrl.trim()}
                onClick={importFromSoundCloud}
              >
                {scImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Importer
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Lien SoundCloud public : titre, artiste, pochette importés automatiquement.
            </p>
          </div>

          {/* Audio principal */}
          <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
            <Label className="flex items-center gap-1.5 text-sm">
              <FileAudio className="h-4 w-4 text-primary" />
              Fichier audio complet
              {initialData?.audio_url && <span className="text-xs text-muted-foreground ml-1 font-normal">(actuel conservé si vide)</span>}
              <ModeToggle mode={audioMode} setMode={setAudioMode} />
            </Label>
            {audioMode === "file" ? (
              <FileDropzone
                accept="*/*" file={audioFile} onFile={setAudioFile} validate={validateAudioFile}
                helper="MP3, WAV, FLAC… Métadonnées + BPM auto-détectés. Extrait public généré automatiquement."
              />
            ) : (
              <Input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://example.com/track.mp3" className="bg-secondary border-border" />
            )}
          </div>
        </div>
      )}

      {/* ============= STEP 1 : MÉTADONNÉES ============= */}
      {step === 1 && (
        <div className="space-y-4 pt-2">
          {/* Auto-fill recherche iTunes/Deezer */}
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Label className="flex items-center gap-1.5 text-sm">
              <Search className="h-4 w-4 text-primary" />
              Auto-remplir depuis iTunes / Deezer
            </Label>
            <div className="flex gap-2">
              <Input
                value={metaQuery}
                onChange={(e) => setMetaQuery(e.target.value)}
                placeholder={artist || title ? `${artist} ${title}`.trim() : "Artiste — Titre"}
                className="bg-secondary border-border"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!metaSearching) runMetaSearch(); } }}
              />
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={metaSearching} onClick={runMetaSearch}>
                {metaSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Chercher
              </Button>
            </div>
            {metaResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border bg-background/60">
                {metaResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyMetaResult(r)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-primary/10 text-left transition-colors"
                  >
                    <img src={r.thumb || r.coverUrl} alt="" className="h-10 w-10 rounded object-cover bg-secondary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{r.artist} — {r.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.source}{r.album ? ` · ${r.album}` : ""}{r.genre ? ` · ${r.genre}` : ""}
                      </p>
                    </div>
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Remplit titre, artiste, genre, label (album), durée et pochette en un clic.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ma Philosophie" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label>Remixeur *</Label>
              <Input value={artist} onChange={(e) => setArtist(e.target.value)} required placeholder="DJ Yass" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Music2 className="h-3 w-3" /> Genre</Label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="House, Hip-Hop, Reggaeton…"
                list="track-genres-suggest"
                className="bg-secondary border-border"
              />
              <datalist id="track-genres-suggest">
                {existingGenres.map((g) => <option key={g} value={g} />)}
              </datalist>
              {existingGenres.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {existingGenres.slice(0, 6).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(g)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        genre === g ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>BPM</Label>
              <Input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="128" className="bg-secondary border-border font-mono" />
            </div>

            <div className="space-y-1">
              <Label>Tonalité</Label>
              <Select value={musicalKey || "__none"} onValueChange={(v) => setMusicalKey(v === "__none" ? "" : v)}>
                <SelectTrigger className="bg-secondary border-border font-mono">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none">— Aucune</SelectItem>
                  {MUSICAL_KEYS.map((k) => <SelectItem key={k} value={k} className="font-mono">{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Version</Label>
              <Select value={version} onValueChange={setVersion}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{VERSIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Universal, Indie…" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label>Durée</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="4:30" className="bg-secondary border-border font-mono" />
            </div>
          </div>

          {/* Tags chip input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><TagIcon className="h-3 w-3" /> Tags <span className="text-muted-foreground font-normal">— Entrée ou virgule pour valider</span></Label>
            <TagsInput value={tagList} onChange={setTagList} />
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">Suggestions :</span>
                {tagSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTagList((prev) => [...prev, t])}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============= STEP 2 : POCHETTE & EXTRAIT ============= */}
      {step === 2 && (
        <div className="space-y-5 pt-2">
          {/* Preview avec auto-génération */}
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="flex items-center gap-1.5 text-sm m-0">
                <Wand2 className="h-4 w-4 text-primary" />
                Extrait public (preview)
                {initialData?.preview_url && <span className="text-xs text-muted-foreground ml-1 font-normal">(actuel conservé si vide)</span>}
              </Label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={previewAuto}
                  onChange={(e) => setPreviewAuto(e.target.checked)}
                  className="accent-primary"
                />
                Générer automatiquement
              </label>
            </div>

            {previewAuto ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Départ</Label>
                    <Select value={previewStart} onValueChange={(v) => setPreviewStart(v as PreviewStartMode)}>
                      <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intro">Intro (0%)</SelectItem>
                        <SelectItem value="quarter">Premier quart (25%)</SelectItem>
                        <SelectItem value="middle">Milieu (45%)</SelectItem>
                        <SelectItem value="drop">Drop (60%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Durée</Label>
                    <Select value={String(previewSeconds)} onValueChange={(v) => setPreviewSeconds(Number(v))}>
                      <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 secondes</SelectItem>
                        <SelectItem value="30">30 secondes</SelectItem>
                        <SelectItem value="45">45 secondes</SelectItem>
                        <SelectItem value="60">60 secondes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-xs">Action</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full gap-1.5"
                      disabled={!audioFile || previewGenerating}
                      onClick={regeneratePreview}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${previewGenerating ? "animate-spin" : ""}`} />
                      {previewBlobUrl ? "Régénérer" : "Générer"}
                    </Button>
                  </div>
                </div>

                {previewFile && previewBlobUrl && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background/60 border border-border">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePreviewPlayback}>
                      {previewPlaying ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary fill-current" />}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">Extrait généré · {previewSeconds}s</p>
                      <p className="text-[10px] text-muted-foreground">{(previewFile.size / 1024).toFixed(0)} Ko · WAV mono 22kHz</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">AUTO</Badge>
                  </div>
                )}

                {!audioFile && !initialData && (
                  <p className="text-[11px] text-muted-foreground italic">
                    L'extrait sera créé automatiquement dès que vous ajouterez un fichier audio complet.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <ModeToggle mode={previewMode} setMode={setPreviewMode} />
                {previewMode === "file" ? (
                  <FileDropzone
                    accept="*/*" file={previewFile} onFile={setPreviewFile} validate={validateAudioFile}
                    helper="Format libre. ~30s recommandés pour le public non abonné."
                  />
                ) : (
                  <Input type="url" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://example.com/preview.mp3" className="bg-secondary border-border" />
                )}
              </div>
            )}
          </div>

          {/* Cover with multi-source picker */}
          <CoverPicker
            artist={artist}
            title={title}
            genre={genre}
            coverFile={coverFile}
            coverUrl={coverUrl}
            coverPreview={coverPreview}
            currentCoverUrl={initialData?.cover_url ?? null}
            onPickFile={(f) => { setCoverFile(f); if (f) setCoverUrl(""); }}
            onPickUrl={(u) => { setCoverUrl(u); if (u) setCoverFile(null); }}
          />
        </div>
      )}

      {/* ============= STEP 3 : PUBLICATION ============= */}
      {step === 3 && (
        <div className="space-y-5 pt-2">
          {/* Summary card */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Aperçu avant publication</h3>
            </div>
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
                {coverPreview || initialData?.cover_url || coverUrl ? (
                  <img
                    src={coverPreview ?? coverUrl ?? initialData?.cover_url ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-display text-lg font-bold truncate">{title || <span className="text-muted-foreground italic">Sans titre</span>}</p>
                <p className="text-sm text-muted-foreground truncate">{artist || <span className="italic">Sans artiste</span>}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {genre && <Badge variant="outline" className="text-[10px]">{genre}</Badge>}
                  {bpm && <Badge variant="outline" className="text-[10px] font-mono">{bpm} BPM</Badge>}
                  {musicalKey && <Badge variant="outline" className="text-[10px] font-mono">{musicalKey}</Badge>}
                  {version && version !== "Original" && <Badge variant="outline" className="text-[10px]">{version}</Badge>}
                  {label && <Badge variant="outline" className="text-[10px]">{label}</Badge>}
                  {duration && <Badge variant="outline" className="text-[10px] font-mono">{duration}</Badge>}
                </div>
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {tagList.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {previewFile && previewBlobUrl && (
              <div className="flex items-center gap-2 px-3 py-2 mt-3 rounded-md bg-background/60 border border-border">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePreviewPlayback}>
                  {previewPlaying ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary fill-current" />}
                </Button>
                <p className="text-xs text-muted-foreground">Écouter l'extrait généré</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[10px] uppercase tracking-wider font-mono">
              <SummaryPill ok={!!title && !!artist} label="Métadonnées" />
              <SummaryPill ok={!!audioFile || !!audioUrl || !!initialData?.audio_url} label="Audio" />
              <SummaryPill ok={!!previewFile || !!previewUrl || !!initialData?.preview_url} label="Extrait" />
              <SummaryPill ok={!!coverFile || !!coverUrl || !!initialData?.cover_url} label="Pochette" />
            </div>
          </div>

          {/* Liens optionnels */}
          <div className="space-y-2">
            <Label>Lien de téléchargement direct (optionnel)</Label>
            <Input type="url" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://drive.google.com/… ou https://wetransfer.com/…" className="bg-secondary border-border" />
            <p className="text-[11px] text-muted-foreground">
              Si renseigné, ce lien sera utilisé prioritairement pour le bouton de téléchargement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">🎤 URL Acapella</Label>
              <Input type="url" value={acapellaUrl} onChange={(e) => setAcapellaUrl(e.target.value)} placeholder="https://…" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">🎹 URL Instrumentale</Label>
              <Input type="url" value={instrumentalUrl} onChange={(e) => setInstrumentalUrl(e.target.value)} placeholder="https://…" className="bg-secondary border-border" />
            </div>
          </div>
        </div>
      )}

      {/* ============= NAVIGATION ============= */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            variant="hero"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            className="gap-1.5 min-w-[160px]"
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="hero" type="submit" disabled={saving} className="min-w-[220px] gap-1.5">
            <Check className="h-4 w-4" />
            {saving ? "Enregistrement..." : initialData ? "Modifier la track" : "Publier la track"}
          </Button>
        )}
      </div>
    </form>
  );
}

function SummaryPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-2 py-1 rounded-full border text-center ${
      ok ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground border-border"
    }`}>
      {ok ? "✓" : "·"} {label}
    </span>
  );
}

function Stepper({
  current, steps, onSelect,
}: {
  current: number;
  steps: { label: string; icon: React.ReactNode }[];
  onSelect: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card/40 p-1.5">
      {steps.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-2 rounded-lg transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow"
                : done
                ? "bg-primary/15 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-[10px]">
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// =========== Chip-based Tags Input ===========
function TagsInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const lower = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      if (!lower.has(p.toLowerCase())) {
        next.push(p);
        lower.add(p.toLowerCase());
      }
    }
    onChange(next);
    setDraft("");
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[44px] rounded-md border border-border bg-secondary px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="hover:text-destructive transition-colors"
            aria-label={`Retirer ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            removeAt(value.length - 1);
          }
        }}
        onBlur={() => draft && commit(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes(",")) {
            e.preventDefault();
            commit(text);
          }
        }}
        placeholder={value.length === 0 ? "Tape un tag puis Entrée…" : ""}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-0.5"
      />
    </div>
  );
}
