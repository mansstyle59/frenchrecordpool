import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowLeft, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTracks } from "@/hooks/useTracks";
import type { DbTrack } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import TrackForm from "@/components/TrackForm";
import type { TrackFormData } from "@/components/TrackForm";
import { useEffect } from "react";

export default function AdminTracks() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: tracks = [], isLoading } = useTracks();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTrack, setEditingTrack] = useState<DbTrack | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (data: TrackFormData) => {
    if (!data.title || !data.artist) return;
    setSaving(true);
    try {
      const trackId = editingTrack?.id ?? crypto.randomUUID();
      let coverUrl = editingTrack?.cover_url ?? null;
      let audioUrl = editingTrack?.audio_url ?? null;
      let previewUrl = editingTrack?.preview_url ?? null;

      if (data.coverFile) coverUrl = await uploadFile(data.coverFile, "track-covers", `${trackId}/cover.${data.coverFile.name.split(".").pop()}`);
      if (data.audioFile) audioUrl = await uploadFile(data.audioFile, "track-audio", `${trackId}/audio.${data.audioFile.name.split(".").pop()}`);
      if (data.previewFile) previewUrl = await uploadFile(data.previewFile, "track-previews", `${trackId}/preview.${data.previewFile.name.split(".").pop()}`);

      const payload = {
        title: data.title,
        artist: data.artist,
        genre: data.genre,
        bpm: data.bpm ? parseInt(data.bpm) : null,
        musical_key: data.musicalKey || null,
        version: data.version,
        label: data.label || null,
        duration: data.duration || null,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
        cover_url: coverUrl,
        audio_url: audioUrl,
        preview_url: previewUrl,
      };

      if (editingTrack) {
        const { error } = await supabase.from("tracks").update(payload).eq("id", editingTrack.id);
        if (error) throw error;
        toast({ title: "Track modifiée !" });
      } else {
        const { error } = await supabase.from("tracks").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
        toast({ title: "Track ajoutée !" });
      }

      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setDialogOpen(false);
      setEditingTrack(null);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (track: DbTrack) => {
    setEditingTrack(track);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingTrack(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette track ?")) return;
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Track supprimée" });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">Admin</span>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
      </header>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">Gestion des Tracks</h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTrack(null); }}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-1" onClick={openAdd}><Plus className="h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTrack ? "Modifier la track" : "Ajouter une track"}</DialogTitle>
              </DialogHeader>
              <TrackForm
                key={editingTrack?.id ?? "new"}
                initialData={editingTrack}
                saving={saving}
                onSubmit={handleSubmit}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Cover</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Artiste</th>
                  <th className="px-4 py-3">Genre</th>
                  <th className="px-4 py-3">BPM</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : tracks.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucune track. Cliquez sur "Ajouter" pour commencer.</td></tr>
                ) : tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <img src={track.cover_url || "/placeholder.svg"} alt="" className="h-8 w-8 rounded object-cover" />
                    </td>
                    <td className="px-4 py-3 font-medium">{track.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.artist}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{track.genre}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{track.bpm}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.release_date ? new Date(track.release_date).toLocaleDateString("fr-FR") : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(track)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(track.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
