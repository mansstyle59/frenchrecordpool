import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Pencil, Save, X, Eye, EyeOff, ArrowUp, ArrowDown,
  ListMusic, Search,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  parsePlaylistUrl, getEmbedSrc, SOURCE_LABEL, type PlaylistSource,
} from "@/lib/playlistEmbed";

interface PlaylistDraft {
  id?: string;
  title: string;
  description: string | null;
  source: PlaylistSource;
  source_url: string | null;
  embed_id: string | null;
  cover_url: string | null;
  accent_color: string;
  tags: string[];
  track_ids: string[];
  position: number;
  is_active: boolean;
}

const EMPTY: PlaylistDraft = {
  title: "",
  description: "",
  source: "spotify",
  source_url: "",
  embed_id: "",
  cover_url: "",
  accent_color: "220 80% 58%",
  tags: [],
  track_ids: [],
  position: 0,
  is_active: true,
};

export default function AdminPlaylists() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PlaylistDraft | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-playlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (d: PlaylistDraft) => {
      const payload: any = {
        title: d.title.trim(),
        description: d.description?.trim() || null,
        source: d.source,
        source_url: d.source_url?.trim() || null,
        embed_id: d.embed_id?.trim() || null,
        cover_url: d.cover_url?.trim() || null,
        accent_color: d.accent_color || "220 80% 58%",
        tags: d.tags,
        track_ids: d.track_ids,
        position: d.position,
        is_active: d.is_active,
      };
      if (d.id) {
        const { error } = await supabase.from("playlists").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("playlists").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Playlist enregistrée");
      qc.invalidateQueries({ queryKey: ["admin-playlists"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error("Erreur : " + (e.message || "")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimée");
      qc.invalidateQueries({ queryKey: ["admin-playlists"] });
    },
  });

  const toggleActive = async (p: any) => {
    await supabase.from("playlists").update({ is_active: !p.is_active }).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["admin-playlists"] });
  };

  const move = async (p: any, dir: -1 | 1) => {
    const list = [...items].sort((a, b) => a.position - b.position);
    const i = list.findIndex((x) => x.id === p.id);
    const swap = list[i + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("playlists").update({ position: swap.position }).eq("id", p.id),
      supabase.from("playlists").update({ position: p.position }).eq("id", swap.id),
    ]);
    qc.invalidateQueries({ queryKey: ["admin-playlists"] });
  };

  return (
    <AdminLayout
      title="Playlists"
      subtitle="Spotify, Deezer, SoundCloud ou playlists internes du catalogue — affichées sur /playlists et en widget home."
      actions={
        <Button
          variant="hero"
          size="sm"
          className="gap-2"
          onClick={() => setEditing({ ...EMPTY, position: items.length })}
        >
          <Plus className="h-4 w-4" /> Nouvelle playlist
        </Button>
      }
    >
      {editing ? (
        <PlaylistEditor
          draft={editing}
          onCancel={() => setEditing(null)}
          onSave={(d) => save.mutate(d)}
          saving={save.isPending}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!isLoading && items.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-border rounded-xl">
              <ListMusic className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucune playlist. Clique « Nouvelle playlist » pour commencer.</p>
            </div>
          )}
          {items.map((p: any) => (
            <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div
                className="relative aspect-square"
                style={{ background: `linear-gradient(135deg, hsl(${p.accent_color} / 0.7), hsl(${p.accent_color} / 0.2))` }}
              >
                {p.cover_url ? (
                  <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <ListMusic className="h-12 w-12 text-white/70" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2 text-[10px] uppercase">{SOURCE_LABEL[p.source as PlaylistSource]}</Badge>
                {!p.is_active && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <p className="font-semibold text-sm line-clamp-2">{p.title}</p>
                {p.tags?.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate">#{p.tags.join(" #")}</p>
                )}
                <div className="flex items-center gap-1 mt-auto pt-2">
                  <Button size="icon" variant="ghost" onClick={() => move(p, -1)} aria-label="Monter">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => move(p, 1)} aria-label="Descendre">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleActive(p)} aria-label={p.is_active ? "Désactiver" : "Activer"}>
                    {p.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <div className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Supprimer cette playlist ?")) remove.mutate(p.id);
                    }}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function PlaylistEditor({ draft, onCancel, onSave, saving }: {
  draft: PlaylistDraft;
  onCancel: () => void;
  onSave: (d: PlaylistDraft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<PlaylistDraft>({ ...draft });
  const set = <K extends keyof PlaylistDraft>(k: K, v: PlaylistDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  // Auto-parse URL → source + embed_id for external sources
  useEffect(() => {
    if (d.source === "custom" || !d.source_url) return;
    const parsed = parsePlaylistUrl(d.source_url);
    if (parsed) {
      setD((p) => ({
        ...p,
        source: parsed.source,
        embed_id: parsed.embed_id,
      }));
    }
  }, [d.source_url]);

  const previewSrc = d.source !== "custom"
    ? getEmbedSrc({ source: d.source, embed_id: d.embed_id, source_url: d.source_url, accent_color: d.accent_color })
    : null;

  const submit = () => {
    if (!d.title.trim()) return toast.error("Titre requis");
    if (d.source !== "custom" && !d.embed_id) return toast.error("URL source invalide");
    if (d.source === "custom" && d.track_ids.length === 0) return toast.error("Ajoute au moins un morceau");
    onSave(d);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4 bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{d.id ? "Modifier" : "Nouvelle"} playlist</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Source</Label>
          <Select value={d.source} onValueChange={(v) => set("source", v as PlaylistSource)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spotify">Spotify</SelectItem>
              <SelectItem value="deezer">Deezer</SelectItem>
              <SelectItem value="soundcloud">SoundCloud</SelectItem>
              <SelectItem value="custom">Playlist interne (catalogue)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {d.source !== "custom" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">URL de la playlist</Label>
            <Input
              value={d.source_url ?? ""}
              onChange={(e) => set("source_url", e.target.value)}
              placeholder={d.source === "spotify" ? "https://open.spotify.com/playlist/…" : d.source === "deezer" ? "https://www.deezer.com/playlist/…" : "https://soundcloud.com/user/sets/…"}
            />
            {d.embed_id && <p className="text-[11px] text-emerald-500">✓ Détecté : {d.embed_id.slice(0, 40)}…</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input value={d.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea rows={2} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs text-muted-foreground">Image de couverture (URL)</Label>
            <Input value={d.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Couleur d'accent (HSL)</Label>
            <Input value={d.accent_color} onChange={(e) => set("accent_color", e.target.value)} placeholder="220 80% 58%" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Position</Label>
            <Input type="number" value={d.position} onChange={(e) => set("position", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs text-muted-foreground">Tags (séparés par virgule)</Label>
            <Input
              value={(d.tags || []).join(", ")}
              onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
              placeholder="house, hip-hop, summer"
            />
          </div>
        </div>

        {d.source === "custom" && (
          <CustomTrackPicker value={d.track_ids} onChange={(v) => set("track_ids", v)} />
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Switch checked={d.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <span className="text-sm">Active</span>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button variant="hero" onClick={submit} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Aperçu</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {d.source !== "custom" && previewSrc ? (
            <iframe
              title="preview"
              src={previewSrc}
              width="100%"
              height={d.source === "spotify" ? 480 : 420}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block w-full"
              style={{ border: 0 }}
            />
          ) : d.source === "custom" ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {d.track_ids.length} morceau{d.track_ids.length > 1 ? "x" : ""} sélectionné{d.track_ids.length > 1 ? "s" : ""}.
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">Colle une URL pour prévisualiser.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomTrackPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery({
    queryKey: ["track-picker", q],
    queryFn: async () => {
      let query = supabase
        .from("tracks")
        .select("id,title,artist,cover_url")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);
      if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: selectedTracks = [] } = useQuery({
    queryKey: ["track-picker-selected", value.join(",")],
    queryFn: async () => {
      if (!value.length) return [];
      const { data } = await supabase.from("tracks").select("id,title,artist,cover_url").in("id", value);
      return value.map((id) => (data ?? []).find((t: any) => t.id === id)).filter(Boolean);
    },
  });

  const add = (id: string) => { if (!value.includes(id)) onChange([...value, id]); };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <Label className="text-xs text-muted-foreground">Morceaux du catalogue</Label>

      {selectedTracks.length > 0 && (
        <div className="space-y-1">
          {selectedTracks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/40">
              <img src={t.cover_url || ""} alt="" className="h-8 w-8 rounded object-cover bg-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{t.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un morceau…"
          className="pl-8 h-8 text-sm"
        />
      </div>

      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {results
          .filter((t: any) => !value.includes(t.id))
          .map((t: any) => (
            <button
              key={t.id}
              type="button"
              onClick={() => add(t.id)}
              className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-muted/60 transition"
            >
              <img src={t.cover_url || ""} alt="" className="h-7 w-7 rounded object-cover bg-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{t.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
              </div>
              <Plus className="h-3.5 w-3.5 text-primary" />
            </button>
          ))}
      </div>
    </div>
  );
}
