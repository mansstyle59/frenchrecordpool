import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, ArrowLeft, Disc3, UploadCloud,
  Search, Heart, Eye, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTracks } from "@/hooks/useTracks";
import { useFavorites } from "@/hooks/useFavorites";
import type { DbTrack } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import TrackForm from "@/components/TrackForm";
import type { TrackFormData } from "@/components/TrackForm";
import BulkUploadDialog from "@/components/BulkUploadDialog";
import { logAdminAction } from "@/lib/auditLog";

type SortKey = "newest" | "oldest" | "az" | "za" | "bpm_asc" | "bpm_desc" | "downloads";
const PAGE_SIZE = 25;

export default function AdminTracks() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: tracks = [], isLoading } = useTracks();
  const { isFavorite, toggleFavorite } = useFavorites();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTrack, setEditingTrack] = useState<DbTrack | null>(null);

  // Filtres
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("all");
  const [label, setLabel] = useState("all");
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { setPage(1); }, [search, genre, label, bpmMin, bpmMax, sort]);

  const genres = useMemo(() => Array.from(new Set(tracks.map(t => t.genre).filter(Boolean))).sort(), [tracks]);
  const labels = useMemo(() => Array.from(new Set(tracks.map(t => t.label).filter(Boolean))).sort() as string[], [tracks]);

  const filtered = useMemo(() => {
    let res = [...tracks];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.label ?? "").toLowerCase().includes(q) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (genre !== "all") res = res.filter(t => t.genre === genre);
    if (label !== "all") res = res.filter(t => t.label === label);
    const min = bpmMin ? parseInt(bpmMin) : null;
    const max = bpmMax ? parseInt(bpmMax) : null;
    if (min !== null) res = res.filter(t => (t.bpm ?? 0) >= min);
    if (max !== null) res = res.filter(t => (t.bpm ?? 0) <= max);

    switch (sort) {
      case "newest": res.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "oldest": res.sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case "az": res.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "za": res.sort((a, b) => b.title.localeCompare(a.title)); break;
      case "bpm_asc": res.sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0)); break;
      case "bpm_desc": res.sort((a, b) => (b.bpm ?? 0) - (a.bpm ?? 0)); break;
      case "downloads": res.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)); break;
    }
    return res;
  }, [tracks, search, genre, label, bpmMin, bpmMax, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(""); setGenre("all"); setLabel("all");
    setBpmMin(""); setBpmMax(""); setSort("newest");
  };

  const hasFilters = search || genre !== "all" || label !== "all" || bpmMin || bpmMax;

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
      else if (data.coverUrl) coverUrl = data.coverUrl;
      if (data.audioFile) audioUrl = await uploadFile(data.audioFile, "track-audio", `${trackId}/audio.${data.audioFile.name.split(".").pop()}`);
      else if (data.audioUrl) audioUrl = data.audioUrl;
      if (data.previewFile) previewUrl = await uploadFile(data.previewFile, "track-previews", `${trackId}/preview.${data.previewFile.name.split(".").pop()}`);
      else if (data.previewUrl) previewUrl = data.previewUrl;

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
        download_url: data.downloadUrl || (editingTrack as any)?.download_url || null,
        acapella_url: data.acapellaUrl || (editingTrack as any)?.acapella_url || null,
        instrumental_url: data.instrumentalUrl || (editingTrack as any)?.instrumental_url || null,
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

  const openEdit = (track: DbTrack) => { setEditingTrack(track); setDialogOpen(true); };
  const openAdd = () => { setEditingTrack(null); setDialogOpen(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette track ?")) return;
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Track supprimée" });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    }
  };

  const handleFavorite = (id: string) => {
    if (!user) { sonnerToast.error("Connectez-vous pour ajouter aux favoris"); return; }
    toggleFavorite(id);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-30">
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

      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Gestion des Tracks</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} track{filtered.length > 1 ? "s" : ""} {hasFilters ? "filtrée(s)" : "au total"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1" onClick={() => setBulkOpen(true)}>
              <UploadCloud className="h-4 w-4" /> Upload par lot
            </Button>
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
        </div>

        {user && <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} userId={user.id} />}

        {/* Filtres */}
        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Titre, artiste, label, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-full lg:w-40 bg-secondary border-border"><SelectValue placeholder="Genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous genres</SelectItem>
                {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger className="w-full lg:w-40 bg-secondary border-border"><SelectValue placeholder="Label" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous labels</SelectItem>
                {labels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="BPM min" value={bpmMin} onChange={e => setBpmMin(e.target.value)} className="w-24 bg-secondary border-border" />
              <span className="text-muted-foreground">–</span>
              <Input type="number" placeholder="BPM max" value={bpmMax} onChange={e => setBpmMax(e.target.value)} className="w-24 bg-secondary border-border" />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-full lg:w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus récentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
                <SelectItem value="az">Titre A→Z</SelectItem>
                <SelectItem value="za">Titre Z→A</SelectItem>
                <SelectItem value="bpm_asc">BPM ↑</SelectItem>
                <SelectItem value="bpm_desc">BPM ↓</SelectItem>
                <SelectItem value="downloads">Téléchargements</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters} className="gap-1">
                <X className="h-4 w-4" /> Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Cover</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Artiste</th>
                  <th className="px-4 py-3">Genre</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">BPM</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">DL</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    {hasFilters ? "Aucun résultat pour ces filtres." : "Aucune track. Cliquez sur \"Ajouter\" pour commencer."}
                  </td></tr>
                ) : paginated.map((track) => (
                  <tr key={track.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <img src={track.cover_url || "/placeholder.svg"} alt="" className="h-8 w-8 rounded object-cover" />
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{track.title}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{track.artist}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{track.genre}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{track.label || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.bpm || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.musical_key || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.downloads ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{track.release_date ? new Date(track.release_date).toLocaleDateString("fr-FR") : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className={`h-7 w-7 ${isFavorite(track.id) ? "text-red-500" : ""}`}
                          onClick={() => handleFavorite(track.id)}
                          title="Favori"
                        >
                          <Heart className={`h-3 w-3 ${isFavorite(track.id) ? "fill-current" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Voir détails">
                          <Link to={`/tracks/${track.id}`}><Eye className="h-3 w-3" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(track)} title="Éditer">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(track.id)} title="Supprimer">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Page {page} / {totalPages} · {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
