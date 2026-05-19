import { useEffect, useState } from "react";
import { Upload, Link as LinkIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileDropzone from "@/components/FileDropzone";
import { extractAudioMetadataFast, needsBpmAnalysis, analyzeBpmAsync } from "@/lib/audioMetadata";
import { trackSchema, validateAudioFile, validateImageFile } from "@/lib/trackSchema";
import { toast } from "@/hooks/use-toast";
import type { DbTrack } from "@/hooks/useTracks";

const VERSIONS = ["Original", "Intro Edit", "Clean", "Dirty", "Extended", "Short Edit", "Acapella", "Instrumental"];

interface TrackFormProps {
  initialData?: DbTrack | null;
  saving: boolean;
  onSubmit: (data: TrackFormData) => void;
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

export default function TrackForm({ initialData, saving, onSubmit }: TrackFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [artist, setArtist] = useState(initialData?.artist ?? "");
  const [genre, setGenre] = useState(initialData?.genre ?? "");
  const [bpm, setBpm] = useState(initialData?.bpm?.toString() ?? "");
  const [musicalKey, setMusicalKey] = useState(initialData?.musical_key ?? "");
  const [version, setVersion] = useState(initialData?.version ?? "Original");
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [duration, setDuration] = useState(initialData?.duration ?? "");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") ?? "");
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
        if (meta.title || meta.artist || meta.bpm) {
          toast({ title: "Métadonnées détectées", description: "Champs pré-remplis depuis le fichier." });
        }
        setExtracting(false);
        // Analyse BPM en tâche de fond si nécessaire
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
    return () => {
      cancelled = true;
    };
  }, [audioFile]);


  // Cover preview
  useEffect(() => {
    if (!coverFile) return;
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = trackSchema.safeParse({
      title, artist, genre, bpm, musicalKey, version, label, duration, tags,
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
    onSubmit({ title, artist, genre, bpm, musicalKey, version, label, duration, tags, audioFile, audioUrl, previewFile, previewUrl, coverFile, coverUrl, downloadUrl, acapellaUrl, instrumentalUrl });
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {extracting && (
        <div className="text-xs text-primary flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded px-2 py-1.5">
          <Sparkles className="h-3 w-3 animate-pulse" /> Extraction des métadonnées audio...
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Titre *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label>Artiste *</Label>
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} required className="bg-secondary border-border" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Genre</Label>
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="House, Hip-Hop..." className="bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label>BPM</Label>
          <Input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label>Tonalité</Label>
          <Input value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} placeholder="Am" className="bg-secondary border-border" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Version</Label>
          <Select value={version} onValueChange={setVersion}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{VERSIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label>Durée</Label>
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="4:30" className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Tags (séparés par des virgules)</Label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="house, melodic, summer" className="bg-secondary border-border" />
      </div>

      {/* Audio */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1">
          Fichier audio (MP3/WAV)
          {initialData?.audio_url && <span className="text-xs text-muted-foreground ml-1">(actuel conservé si vide)</span>}
          <ModeToggle mode={audioMode} setMode={setAudioMode} />
        </Label>
        {audioMode === "file" ? (
          <FileDropzone
            accept="*/*"
            file={audioFile}
            onFile={setAudioFile}
            validate={validateAudioFile}
            helper="Tout format accepté · aucune limite de taille · métadonnées auto-détectées"
          />
        ) : (
          <Input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://example.com/track.mp3" className="bg-secondary border-border" />
        )}
      </div>

      {/* Preview */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1">
          Extrait/Preview
          {initialData?.preview_url && <span className="text-xs text-muted-foreground ml-1">(actuel conservé si vide)</span>}
          <ModeToggle mode={previewMode} setMode={setPreviewMode} />
        </Label>
        {previewMode === "file" ? (
          <FileDropzone
            accept="*/*"
            file={previewFile}
            onFile={setPreviewFile}
            validate={validateAudioFile}
            helper="Tout format accepté · aucune limite"
          />
        ) : (
          <Input type="url" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://example.com/preview.mp3" className="bg-secondary border-border" />
        )}
      </div>

      {/* Cover */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1">
          Cover (image)
          {initialData?.cover_url && <span className="text-xs text-muted-foreground ml-1">(actuelle conservée si vide)</span>}
          <ModeToggle mode={coverMode} setMode={setCoverMode} />
        </Label>
        {coverMode === "file" ? (
          <FileDropzone
            accept="*/*"
            file={coverFile}
            onFile={setCoverFile}
            validate={validateImageFile}
            preview={coverFile ? coverPreview ?? undefined : undefined}
            helper="Tout type d'image accepté · aucune limite"
          />
        ) : (
          <Input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://example.com/cover.jpg" className="bg-secondary border-border" />
        )}
      </div>

      <div className="space-y-1">
        <Label className="flex items-center gap-1">
          Lien de téléchargement
          {(initialData as any)?.download_url && <span className="text-xs text-muted-foreground ml-1">(actuel conservé si vide)</span>}
        </Label>
        <Input type="url" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://example.com/download-link" className="bg-secondary border-border" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <div className="space-y-1">
          <Label className="text-xs">🎤 URL Acapella</Label>
          <Input type="url" value={acapellaUrl} onChange={(e) => setAcapellaUrl(e.target.value)} placeholder="https://..." className="bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">🎹 URL Instrumentale</Label>
          <Input type="url" value={instrumentalUrl} onChange={(e) => setInstrumentalUrl(e.target.value)} placeholder="https://..." className="bg-secondary border-border" />
        </div>
      </div>

      <Button variant="hero" type="submit" disabled={saving} className="w-full">
        {saving ? "Enregistrement..." : initialData ? "Modifier la track" : "Ajouter la track"}
      </Button>
    </form>
  );
}
