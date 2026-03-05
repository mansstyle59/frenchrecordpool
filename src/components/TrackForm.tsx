import { useState } from "react";
import { Upload, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const VERSIONS = ["Original", "Intro Edit", "Clean", "Dirty", "Extended", "Short Edit", "Acapella", "Instrumental"];
import type { DbTrack } from "@/hooks/useTracks";

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
  const [audioMode, setAudioMode] = useState<SourceMode>("file");
  const [previewMode, setPreviewMode] = useState<SourceMode>("file");
  const [coverMode, setCoverMode] = useState<SourceMode>("file");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist) return;
    onSubmit({ title, artist, genre, bpm, musicalKey, version, label, duration, tags, audioFile, audioUrl, previewFile, previewUrl, coverFile, coverUrl });
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
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Ex: House, Hip-Hop..." className="bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label>BPM</Label>
          <Input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} className="bg-secondary border-border" />
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
      <div className="grid grid-cols-1 gap-3">
        {/* Audio */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1">
            Fichier audio (MP3/WAV)
            {initialData?.audio_url && <span className="text-xs text-muted-foreground ml-1">(actuel conservé si vide)</span>}
            <ModeToggle mode={audioMode} setMode={setAudioMode} />
          </Label>
          {audioMode === "file" ? (
            <Input type="file" accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.wma" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
          ) : (
            <Input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://example.com/track.mp3" className="bg-secondary border-border" />
          )}
        </div>
        {/* Preview */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1">
            Extrait/Preview (MP3)
            {initialData?.preview_url && <span className="text-xs text-muted-foreground ml-1">(actuel conservé si vide)</span>}
            <ModeToggle mode={previewMode} setMode={setPreviewMode} />
          </Label>
          {previewMode === "file" ? (
            <Input type="file" accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.wma" onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
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
            <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
          ) : (
            <Input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://example.com/cover.jpg" className="bg-secondary border-border" />
          )}
        </div>
      </div>
      <Button variant="hero" type="submit" disabled={saving} className="w-full">
        {saving ? "Enregistrement..." : initialData ? "Modifier la track" : "Ajouter la track"}
      </Button>
    </form>
  );
}
