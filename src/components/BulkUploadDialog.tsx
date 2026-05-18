import { Fragment, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload, Loader2, CheckCircle2, AlertCircle, Music, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { extractAudioMetadata } from "@/lib/audioMetadata";
import { generateAudioPreview, type PreviewStartMode } from "@/lib/audioPreview";
import { validateAudioFile } from "@/lib/trackSchema";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const CONCURRENCY = 3;

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
  progress: number;
  step?: string;
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
        progress: 0,
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

  const uploadRow = async (row: Row) => {
    updateRow(row.id, { status: "uploading", error: undefined, progress: 5, step: "Audio…" });
    const trackId = crypto.randomUUID();
    const ext = row.file.name.split(".").pop() || "mp3";

    const { error: upErr } = await supabase.storage
      .from("track-audio")
      .upload(`${trackId}/audio.${ext}`, row.file, { upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("track-audio").getPublicUrl(`${trackId}/audio.${ext}`);
    updateRow(row.id, { progress: 45, step: "Preview…" });

    // Génération auto du preview 30s
    let previewUrl: string | null = null;
    const previewBlob = await generateAudioPreview(row.file, 30);
    if (previewBlob) {
      const { error: pErr } = await supabase.storage
        .from("track-previews")
        .upload(`${trackId}/preview.wav`, previewBlob, { upsert: true, contentType: "audio/wav" });
      if (!pErr) {
        const { data: pPub } = supabase.storage.from("track-previews").getPublicUrl(`${trackId}/preview.wav`);
        previewUrl = pPub.publicUrl;
      }
    }
    updateRow(row.id, { progress: 70, step: "Cover…" });

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
    updateRow(row.id, { progress: 90, step: "Enregistrement…" });

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
      preview_url: previewUrl,
      cover_url: coverUrl,
      tags: [],
      created_by: userId,
    });
    if (dbErr) throw dbErr;
    updateRow(row.id, { status: "done", progress: 100, step: "Publié" });
  };

  const runQueue = async (queue: Row[]) => {
    let done = 0, errors = 0;
    setProgress({ done: 0, total: queue.length, errors: 0 });
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }).map(async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) break;
        try {
          await uploadRow(row);
          done++;
        } catch (err: any) {
          updateRow(row.id, { status: "error", error: err.message || "Erreur", progress: 0, step: undefined });
          errors++;
        }
        setProgress((p) => ({ done: done + errors, total: p.total, errors }));
      }
    });
    await Promise.all(workers);
    return { done, errors };
  };

  const handleUpload = async () => {
    const valid = rows.filter((r) => r.title && r.artist && r.status !== "done");
    if (valid.length === 0) {
      toast({ title: "Rien à publier", description: "Vérifie titre + artiste pour chaque ligne.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const { done, errors } = await runQueue([...valid]);
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["tracks"] });
    toast({
      title: "Import terminé",
      description: `${done}/${valid.length} publié(s)${errors ? `, ${errors} erreur(s)` : ""}`,
      variant: errors ? "destructive" : "default",
    });
  };

  const retryErrors = async () => {
    const failed = rows.filter((r) => r.status === "error");
    if (failed.length === 0) return;
    setUploading(true);
    const { done, errors } = await runQueue([...failed]);
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["tracks"] });
    toast({
      title: "Nouvelle tentative",
      description: `${done} réussi(s)${errors ? `, ${errors} encore en erreur` : ""}`,
      variant: errors ? "destructive" : "default",
    });
  };

  const retryRow = async (row: Row) => {
    if (uploading) return;
    setUploading(true);
    try {
      await uploadRow(row);
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    } catch (err: any) {
      updateRow(row.id, { status: "error", error: err.message || "Erreur", progress: 0 });
    } finally {
      setUploading(false);
    }
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
                  <Fragment key={r.id}>
                  <tr className={cn(r.status === "done" && "opacity-60", r.status === "error" && "bg-destructive/5")}>
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
                      <div className="flex items-center gap-1 justify-center">
                        {r.status === "error" && (
                          <button type="button" onClick={() => retryRow(r)} disabled={uploading} className="text-muted-foreground hover:text-primary disabled:opacity-30" title="Réessayer">
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" onClick={() => removeRow(r.id)} disabled={uploading} className="text-muted-foreground hover:text-destructive disabled:opacity-30">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {(r.status === "uploading" || r.status === "error" || (r.status === "done" && r.progress < 100)) && (
                    <tr key={r.id + "-p"} className={cn(r.status === "error" && "bg-destructive/5")}>
                      <td colSpan={9} className="px-3 pb-1.5">
                        <div className="flex items-center gap-2">
                          <Progress value={r.progress} className="h-1 flex-1" />
                          <span className={cn("text-[10px] tabular-nums", r.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                            {r.status === "error" ? (r.error || "Erreur") : `${r.progress}% · ${r.step ?? ""}`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {uploading && progress.total > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <Progress value={(progress.done / progress.total) * 100} className="h-1.5 flex-1" />
            <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
              {progress.done}/{progress.total}{progress.errors ? ` · ${progress.errors} err.` : ""}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {rows.length === 0 ? "Aucun fichier" : `${rows.length} fichier(s) · upload parallèle x${CONCURRENCY}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={uploading}>
              Fermer
            </Button>
            {rows.some((r) => r.status === "error") && (
              <Button variant="outline" size="sm" onClick={retryErrors} disabled={uploading}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Réessayer erreurs
              </Button>
            )}
            <Button variant="hero" size="sm" onClick={handleUpload} disabled={uploading || rows.length === 0}>
              {uploading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Upload...</> : `Publier ${rows.filter((r) => r.status !== "done").length} track(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
