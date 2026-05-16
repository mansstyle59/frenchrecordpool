import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload, Loader2, CheckCircle2, AlertCircle, Music } from "lucide-react";
import { extractAudioMetadata } from "@/lib/audioMetadata";
import { validateAudioFile } from "@/lib/trackSchema";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const VERSIONS = ["Original", "Intro Edit", "Clean", "Dirty", "Extended", "Short Edit", "Acapella", "Instrumental"];

interface Row {
  id: string;
  file: File;
  title: string;
  artist: string;
  genre: string;
  bpm: string;
  musicalKey: string;
  version: string;
  duration: string;
  coverFile: File | null;
  coverPreview: string | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export default function BulkUploadDialog({ open, onOpenChange, userId }: BulkUploadDialogProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const addFiles = async (files: FileList | File[]) => {
    const accepted: Row[] = [];
    for (const file of Array.from(files)) {
      const err = validateAudioFile(file);
      if (err) {
        toast({ title: file.name, description: err, variant: "destructive" });
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "",
        genre: "",
        bpm: "",
        musicalKey: "",
        version: "Original",
        duration: "",
        coverFile: null,
        coverPreview: null,
        status: "pending",
      });
    }
    setRows((prev) => [...prev, ...accepted]);

    // Extract metadata in background
    for (const row of accepted) {
      extractAudioMetadata(row.file).then((meta) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  title: meta.title || r.title,
                  artist: meta.artist || r.artist,
                  genre: meta.genre || r.genre,
                  duration: meta.duration || r.duration,
                  bpm: meta.bpm ? String(meta.bpm) : r.bpm,
                  musicalKey: meta.key || r.musicalKey,
                }
              : r
          )
        );
      });
    }
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleUpload = async () => {
    const valid = rows.filter((r) => r.title && r.artist && r.status !== "done");
    if (valid.length === 0) {
      toast({ title: "Rien à publier", description: "Vérifie titre + artiste pour chaque ligne.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: valid.length, errors: 0 });
    let done = 0;
    let errors = 0;

    for (const row of valid) {
      updateRow(row.id, { status: "uploading", error: undefined });
      try {
        const trackId = crypto.randomUUID();
        const ext = row.file.name.split(".").pop() || "mp3";
        const { error: upErr } = await supabase.storage
          .from("track-audio")
          .upload(`${trackId}/audio.${ext}`, row.file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("track-audio").getPublicUrl(`${trackId}/audio.${ext}`);

        let coverUrl: string | null = null;
        if (row.coverFile) {
          const cExt = row.coverFile.name.split(".").pop() || "jpg";
          const { error: cErr } = await supabase.storage
            .from("track-covers")
            .upload(`${trackId}/cover.${cExt}`, row.coverFile, { upsert: true });
          if (cErr) throw cErr;
          const { data: cPub } = supabase.storage.from("track-covers").getPublicUrl(`${trackId}/cover.${cExt}`);
          coverUrl = cPub.publicUrl;
        }

        const { error: dbErr } = await supabase.from("tracks").insert({
          id: trackId,
          title: row.title.trim(),
          artist: row.artist.trim(),
          genre: row.genre.trim() || "Unknown",
          bpm: row.bpm ? parseInt(row.bpm) : null,
          musical_key: row.musicalKey || null,
          version: row.version,
          duration: row.duration || null,
          audio_url: pub.publicUrl,
          cover_url: coverUrl,
          tags: [],
          created_by: userId,
        });
        if (dbErr) throw dbErr;
        updateRow(row.id, { status: "done" });
        done++;
      } catch (err: any) {
        updateRow(row.id, { status: "error", error: err.message });
        errors++;
      }
      setProgress({ done: done + errors, total: valid.length, errors });
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["tracks"] });
    toast({
      title: "Import terminé",
      description: `${done}/${valid.length} publié(s)${errors ? `, ${errors} erreur(s)` : ""}`,
      variant: errors ? "destructive" : "default",
    });
  };

  const reset = () => {
    setRows([]);
    setProgress({ done: 0, total: 0, errors: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && !uploading) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload par lot</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all bg-secondary/30",
            dragActive ? "border-primary bg-primary/5" : "hover:border-primary/60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <Upload className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm">
            <span className="text-primary font-medium">Cliquez</span> ou glissez plusieurs fichiers audio
          </p>
          <p className="text-xs text-muted-foreground mt-1">Métadonnées (BPM, titre, artiste...) extraites automatiquement</p>
        </div>

        {rows.length > 0 && (
          <div className="flex-1 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-2 w-6"></th>
                  <th className="px-2 py-2 w-14">Cover</th>
                  <th className="px-2 py-2">Titre *</th>
                  <th className="px-2 py-2">Artiste *</th>
                  <th className="px-2 py-2">Genre</th>
                  <th className="px-2 py-2 w-16">BPM</th>
                  <th className="px-2 py-2 w-16">Key</th>
                  <th className="px-2 py-2 w-32">Version</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className={cn(r.status === "done" && "opacity-60", r.status === "error" && "bg-destructive/5")}>
                    <td className="px-2 py-1.5 text-center">
                      {r.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin text-primary mx-auto" />}
                      {r.status === "done" && <CheckCircle2 className="h-3 w-3 text-primary mx-auto" />}
                      {r.status === "error" && <AlertCircle className="h-3 w-3 text-destructive mx-auto" />}
                      {r.status === "pending" && <Music className="h-3 w-3 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-1 py-1">
                      <label className="block h-9 w-9 rounded overflow-hidden bg-secondary border border-border cursor-pointer relative group">
                        {r.coverPreview ? (
                          <img src={r.coverPreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Upload className="h-3 w-3 text-muted-foreground absolute inset-0 m-auto" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const preview = URL.createObjectURL(f);
                            updateRow(r.id, { coverFile: f, coverPreview: preview });
                          }}
                        />
                      </label>
                    </td>
                    <td className="px-1 py-1">
                      <Input value={r.title} onChange={(e) => updateRow(r.id, { title: e.target.value })} disabled={uploading} className="h-7 text-xs bg-secondary border-border" />
                    </td>
                    <td className="px-1 py-1">
                      <Input value={r.artist} onChange={(e) => updateRow(r.id, { artist: e.target.value })} disabled={uploading} className="h-7 text-xs bg-secondary border-border" />
                    </td>
                    <td className="px-1 py-1">
                      <Input value={r.genre} onChange={(e) => updateRow(r.id, { genre: e.target.value })} disabled={uploading} className="h-7 text-xs bg-secondary border-border" />
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" value={r.bpm} onChange={(e) => updateRow(r.id, { bpm: e.target.value })} disabled={uploading} className="h-7 text-xs bg-secondary border-border" />
                    </td>
                    <td className="px-1 py-1">
                      <Input value={r.musicalKey} onChange={(e) => updateRow(r.id, { musicalKey: e.target.value })} disabled={uploading} className="h-7 text-xs bg-secondary border-border" />
                    </td>
                    <td className="px-1 py-1">
                      <Select value={r.version} onValueChange={(v) => updateRow(r.id, { version: v })} disabled={uploading}>
                        <SelectTrigger className="h-7 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{VERSIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeRow(r.id)} disabled={uploading} className="text-muted-foreground hover:text-destructive disabled:opacity-30">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {rows.length === 0 ? "Aucun fichier" : `${rows.length} fichier(s)`}
            {uploading && progress.total > 0 && ` · ${progress.done}/${progress.total} traités${progress.errors ? ` · ${progress.errors} erreurs` : ""}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={uploading}>
              Fermer
            </Button>
            <Button variant="hero" size="sm" onClick={handleUpload} disabled={uploading || rows.length === 0}>
              {uploading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Upload...</> : `Publier ${rows.filter((r) => r.status !== "done").length} track(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
