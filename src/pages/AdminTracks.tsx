import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowLeft, Disc3, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTracks } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { GENRES, VERSIONS } from "@/data/mockTracks";
import { useEffect } from "react";

export default function AdminTracks() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: tracks = [], isLoading } = useTracks();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("House");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [version, setVersion] = useState("Original");
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [tags, setTags] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  const resetForm = () => {
    setTitle(""); setArtist(""); setGenre("House"); setBpm(""); setMusicalKey("");
    setVersion("Original"); setLabel(""); setDuration(""); setTags("");
    setAudioFile(null); setPreviewFile(null); setCoverFile(null);
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist) return;
    setSaving(true);
    try {
      const trackId = crypto.randomUUID();
      let coverUrl = null;
      let audioUrl = null;
      let previewUrl = null;

      if (coverFile) coverUrl = await uploadFile(coverFile, "track-covers", `${trackId}/cover.${coverFile.name.split(".").pop()}`);
      if (audioFile) audioUrl = await uploadFile(audioFile, "track-audio", `${trackId}/audio.${audioFile.name.split(".").pop()}`);
      if (previewFile) previewUrl = await uploadFile(previewFile, "track-previews", `${trackId}/preview.${previewFile.name.split(".").pop()}`);

      const { error } = await supabase.from("tracks").insert({
        title, artist, genre,
        bpm: bpm ? parseInt(bpm) : null,
        musical_key: musicalKey || null,
        version, label: label || null,
        duration: duration || null,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        cover_url: coverUrl, audio_url: audioUrl, preview_url: previewUrl,
        created_by: user!.id,
      });

      if (error) throw error;
      toast({ title: "Track ajoutée !" });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-1"><Plus className="h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter une track</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
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
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
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
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Upload className="h-3 w-3" /> Fichier audio (MP3/WAV)</Label>
                    <Input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Upload className="h-3 w-3" /> Extrait/Preview (MP3)</Label>
                    <Input type="file" accept="audio/*" onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Upload className="h-3 w-3" /> Cover (image)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
                  </div>
                </div>
                <Button variant="hero" type="submit" disabled={saving} className="w-full">
                  {saving ? "Enregistrement..." : "Ajouter la track"}
                </Button>
              </form>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
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
