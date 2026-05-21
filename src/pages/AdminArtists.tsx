import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Users, Star, Image as ImageIcon, Upload, ExternalLink, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminStatsRow from "@/components/admin/AdminStatsRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Artist = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  bio: string | null;
  country: string | null;
  genre: string | null;
  soundcloud_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  featured: boolean;
  sort_order: number;
};

const empty = {
  name: "", slug: "", photo_url: "", bio: "", country: "", genre: "",
  soundcloud_url: "", instagram_url: "", website_url: "",
  featured: false, sort_order: 0,
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

export default function AdminArtists() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ["admin-artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists" as any)
        .select("*")
        .order("featured", { ascending: false })
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Artist[];
    },
    enabled: isAdmin,
  });

  // Track counts per artist (best-effort, group client-side)
  const { data: trackCounts = {} } = useQuery({
    queryKey: ["admin-artist-track-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("tracks").select("artist");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((t: any) => {
        const key = (t.artist || "").toLowerCase().trim();
        if (key) counts[key] = (counts[key] ?? 0) + 1;
      });
      return counts;
    },
    enabled: isAdmin,
  });

  const stats = useMemo(() => ({
    total: artists.length,
    featured: artists.filter((a) => a.featured).length,
    withPhoto: artists.filter((a) => !!a.photo_url).length,
    countries: new Set(artists.map((a) => a.country).filter(Boolean)).size,
  }), [artists]);

  const filtered = useMemo(() => {
    if (!search) return artists;
    const q = search.toLowerCase();
    return artists.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.genre ?? "").toLowerCase().includes(q) ||
      (a.country ?? "").toLowerCase().includes(q),
    );
  }, [artists, search]);

  const openAdd = () => { setEditing(null); setForm({ ...empty, sort_order: artists.length }); setPhotoFile(null); setOpen(true); };
  const openEdit = (a: Artist) => {
    setEditing(a);
    setForm({
      name: a.name, slug: a.slug,
      photo_url: a.photo_url ?? "", bio: a.bio ?? "",
      country: a.country ?? "", genre: a.genre ?? "",
      soundcloud_url: a.soundcloud_url ?? "",
      instagram_url: a.instagram_url ?? "",
      website_url: a.website_url ?? "",
      featured: a.featured, sort_order: a.sort_order,
    });
    setPhotoFile(null);
    setOpen(true);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `artists/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast({ title: "Upload échoué", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Nom requis", variant: "destructive" }); return; }
    setSaving(true);
    let photoUrl = form.photo_url || null;
    if (photoFile) {
      const url = await uploadPhoto(photoFile);
      if (url) photoUrl = url;
    }
    const slug = (form.slug || slugify(form.name));
    const payload: any = {
      name: form.name.trim(),
      slug,
      photo_url: photoUrl,
      bio: form.bio || null,
      country: form.country || null,
      genre: form.genre || null,
      soundcloud_url: form.soundcloud_url || null,
      instagram_url: form.instagram_url || null,
      website_url: form.website_url || null,
      featured: form.featured,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("artists" as any).update(payload).eq("id", editing.id)
      : await supabase.from("artists" as any).insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "DJ modifié" : "DJ ajouté" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-artists"] });
  };

  const toggleFeatured = async (a: Artist) => {
    const { error } = await supabase.from("artists" as any).update({ featured: !a.featured }).eq("id", a.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["admin-artists"] });
  };

  const remove = async (a: Artist) => {
    if (!confirm(`Supprimer "${a.name}" ? Les tracks associés ne sont pas affectés.`)) return;
    const { error } = await supabase.from("artists" as any).delete().eq("id", a.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "DJ supprimé" });
    qc.invalidateQueries({ queryKey: ["admin-artists"] });
  };

  return (
    <AdminLayout
      wide
      title="DJs / Artistes"
      subtitle="Fichier des artistes et remixeurs présents sur la plateforme."
      actions={<Button onClick={openAdd} variant="hero"><Plus className="h-4 w-4 mr-2" />Nouveau DJ</Button>}
    >
      <AdminStatsRow
        stats={[
          { icon: <Users className="h-4 w-4" />, label: "Total", value: stats.total, hint: "DJs enregistrés" },
          { icon: <Star className="h-4 w-4" />, label: "Mis en avant", value: stats.featured, hint: "vitrine", accent: "primary" },
          { icon: <ImageIcon className="h-4 w-4" />, label: "Avec photo", value: stats.withPhoto, hint: `${stats.total - stats.withPhoto} sans photo`, accent: "accent" },
          { icon: <Users className="h-4 w-4" />, label: "Pays", value: stats.countries, hint: "représentés", accent: "muted" },
        ]}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, genre, pays…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">{search ? "Aucun résultat." : "Aucun DJ pour le moment."}</p>
          {!search && <Button onClick={openAdd} variant="hero"><Plus className="h-4 w-4 mr-2" />Ajouter le premier DJ</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => {
            const count = trackCounts[a.name.toLowerCase().trim()] ?? 0;
            return (
              <div key={a.id} className="group relative rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden hover:border-primary/50 hover:-translate-y-0.5 transition-all">
                <div className="relative aspect-square bg-secondary overflow-hidden">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-display font-bold text-muted-foreground/40">
                      {a.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {a.featured && (
                    <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground gap-1 text-[10px]">
                      <Star className="h-3 w-3 fill-current" /> Vedette
                    </Badge>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-7 w-7 text-destructive" onClick={() => remove(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-semibold truncate">{a.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono truncate">{a.slug}</p>
                    </div>
                    <Switch checked={a.featured} onCheckedChange={() => toggleFeatured(a)} aria-label="Mettre en avant" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {a.genre && <Badge variant="secondary" className="text-[10px]">{a.genre}</Badge>}
                    {a.country && <Badge variant="outline" className="text-[10px]">{a.country}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{count} track{count !== 1 ? "s" : ""}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Modifier ${editing.name}` : "Nouveau DJ"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-xl bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                  {photoFile ? (
                    <img src={URL.createObjectURL(photoFile)} alt="" className="w-full h-full object-cover" />
                  ) : form.photo_url ? (
                    <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 cursor-pointer text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    {photoFile ? photoFile.name : "Choisir un fichier"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <Input placeholder="…ou URL d'une image" value={form.photo_url}
                    onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: f.slug && editing ? f.slug : slugify(name) }));
                }}
                placeholder="DJ Yass" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="dj-yass" />
            </div>
            <div className="space-y-2">
              <Label>Genre principal</Label>
              <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Afro House" />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="FR" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Bio</Label>
              <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Quelques mots sur l'artiste, son parcours, ses styles…" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> SoundCloud</Label>
              <Input value={form.soundcloud_url} onChange={(e) => setForm({ ...form, soundcloud_url: e.target.value })}
                placeholder="https://soundcloud.com/…" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Instagram</Label>
              <Input value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                placeholder="https://instagram.com/…" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Site web</Label>
              <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://…" />
            </div>
            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              <Label className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-accent" /> Mettre en avant (vitrine)</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="hero" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
