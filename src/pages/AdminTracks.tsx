import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, UploadCloud,
  Search, Heart, Eye, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { resolveCover } from "@/lib/trackCover";
import AdminLayout from "@/components/admin/AdminLayout";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const uploadFile = async (file: File, bucket: string, path: string, step: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      const e: any = new Error(`Upload ${step} échoué : ${error.message}`);
      e.step = step;
      throw e;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (data: TrackFormData) => {
    if (!data.title || !data.artist) return;
    setSaving(true);
    try {
      // Refresh + vérification de session
      let { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        await supabase.auth.refreshSession();
        ({ data: userRes } = await supabase.auth.getUser());
      }
      const currentUser = userRes?.user;
      if (!currentUser) {
        toast({
          title: "Session expirée",
          description: "Reconnecte-toi pour publier des tracks.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const trackId = editingTrack?.id ?? crypto.randomUUID();
      let coverUrl: string | null = editingTrack?.cover_url ?? null;
      let audioUrl: string | null = editingTrack?.audio_url ?? null;
      let previewUrl: string | null = editingTrack?.preview_url ?? null;

      if (data.coverFile) coverUrl = await uploadFile(data.coverFile, "track-covers", `${trackId}/cover.${data.coverFile.name.split(".").pop()}`, "pochette");
      else if (data.coverUrl) coverUrl = data.coverUrl;
      if (data.audioFile) audioUrl = await uploadFile(data.audioFile, "track-audio", `${trackId}/audio.${data.audioFile.name.split(".").pop()}`, "audio");
      else if (data.audioUrl) audioUrl = data.audioUrl;
      if (data.previewFile) previewUrl = await uploadFile(data.previewFile, "track-previews", `${trackId}/preview.${data.previewFile.name.split(".").pop()}`, "preview");
      else if (data.previewUrl) previewUrl = data.previewUrl;

      const trackPayload = {
        id: trackId,
        title: data.title,
        artist: data.artist,
        genre: data.genre || "",
        bpm: data.bpm || null,
        musical_key: data.musicalKey || null,
        version: data.version || "Original",
        label: data.label || null,
        duration: data.duration || null,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        cover_url: coverUrl,
        audio_url: audioUrl,
        preview_url: previewUrl,
        download_url: data.downloadUrl || (editingTrack as any)?.download_url || null,
        acapella_url: data.acapellaUrl || (editingTrack as any)?.acapella_url || null,
        instrumental_url: data.instrumentalUrl || (editingTrack as any)?.instrumental_url || null,
      };

      // Insert/update via RPC SECURITY DEFINER — contourne tout faux positif RLS
      const { data: rpcId, error: rpcErr } = await supabase.rpc("admin_upsert_track", {
        _track: trackPayload as any,
        _id: editingTrack ? editingTrack.id : null,
      });
      if (rpcErr) throw rpcErr;

      await logAdminAction({
        actorId: currentUser.id,
        action: editingTrack ? "track.update" : "track.create",
        entityType: "track",
        entityId: (rpcId as any) ?? trackId,
        entityLabel: `${data.title} — ${data.artist}`,
        details: editingTrack ? { changes: trackPayload } : undefined,
      });

      toast({ title: editingTrack ? "Track modifiée !" : "Track ajoutée !" });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setDialogOpen(false);
      setEditingTrack(null);
    } catch (err: any) {
      const msg = err?.message || "";
      let friendly = msg || "Une erreur est survenue.";
      if (/not_admin/i.test(msg)) {
        friendly = "Ton compte n'a pas les droits admin. Reconnecte-toi avec le compte admin.";
      } else if (/not_authenticated/i.test(msg)) {
        friendly = "Session expirée. Reconnecte-toi puis réessaie.";
      } else if (err?.step) {
        friendly = `Échec à l'étape « ${err.step} » : ${msg}. Vérifie le fichier (taille / format) et réessaie.`;
      } else if (/row-level security|violates row-level/i.test(msg)) {
        friendly = "Permission refusée. Déconnecte-toi puis reconnecte-toi en admin (dewulf.denis@gmail.com).";
      }
      toast({ title: "Erreur", description: friendly, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };



  const openEdit = (track: DbTrack) => { setEditingTrack(track); setDialogOpen(true); };
  const openAdd = () => { setEditingTrack(null); setDialogOpen(true); };

  const handleDelete = async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!confirm("Supprimer cette track ?")) return;
    const { error } = await supabase.rpc("admin_delete_track", { _id: id });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      await logAdminAction({
        actorId: user!.id, action: "track.delete",
        entityType: "track", entityId: id,
        entityLabel: track ? `${track.title} — ${track.artist}` : id,
      });
      toast({ title: "Track supprimée" });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    }
  };


  const handleFavorite = (id: string) => {
    if (!user) { sonnerToast.error("Connectez-vous pour ajouter aux favoris"); return; }
    toggleFavorite(id);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllPage = () => {
    const allIds = paginated.map(t => t.id);
    const allSelected = allIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach(id => next.delete(id));
      else allIds.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer ${selected.size} track(s) ? Action irréversible.`)) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      const { error } = await supabase.rpc("admin_delete_track", { _id: id });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
    }

    await logAdminAction({
      actorId: user!.id, action: "track.bulk_delete",
      entityType: "track", entityId: ids.join(","),
      entityLabel: `${ids.length} tracks`,
      details: { ids },
    });
    toast({ title: `${ids.length} track(s) supprimée(s)` });
    clearSelection();
    queryClient.invalidateQueries({ queryKey: ["tracks"] });
  };

  if (loading) return null;

  const allPageSelected = paginated.length > 0 && paginated.every(t => selected.has(t.id));

  return (
    <AdminLayout
      wide
      title="Gestion des Tracks"
      subtitle={`${filtered.length} track${filtered.length > 1 ? "s" : ""} ${hasFilters ? "filtrée(s)" : "au total"}`}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setBulkOpen(true)}>
            <UploadCloud className="h-4 w-4" /> Upload par lot
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTrack(null); }}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm" className="gap-1" onClick={openAdd}><Plus className="h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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
        </>
      }
    >
      {user && <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} userId={user.id} />}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5">
          <p className="text-sm">
            <span className="font-semibold text-primary">{selected.size}</span> track(s) sélectionnée(s)
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>Désélectionner</Button>
            <Button variant="destructive" size="sm" className="gap-1" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          </div>
        </div>
      )}



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
                  <th className="px-3 py-3 w-8">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAllPage}
                      aria-label="Tout sélectionner"
                    />
                  </th>
                  <th className="px-4 py-3">Cover</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Remixeur</th>
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
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    {hasFilters ? "Aucun résultat pour ces filtres." : "Aucune track. Cliquez sur \"Ajouter\" pour commencer."}
                  </td></tr>
                ) : paginated.map((track) => (
                  <tr key={track.id} className={`hover:bg-secondary/30 ${selected.has(track.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selected.has(track.id)}
                        onCheckedChange={() => toggleSelect(track.id)}
                        aria-label={`Sélectionner ${track.title}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <img src={resolveCover(track)} alt="" className="h-8 w-8 rounded object-cover" />
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate">{track.title}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{track.artist}</td>
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
    </AdminLayout>
  );
}
