import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Save, X, Eye, EyeOff, Video, ArrowUp, ArrowDown, Youtube, Instagram } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { detectProvider, extractShortId, shortThumbnail, providerLabel, type ShortProvider } from "@/lib/shorts";

type ShortRow = {
  id: string;
  title: string;
  description: string | null;
  provider: ShortProvider;
  source_url: string | null;
  source_id: string | null;
  youtube_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  tags: string[];
  artist_id: string | null;
  track_id: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
};

type Draft = Partial<ShortRow> & { id?: string };

export default function AdminShorts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const { data: shorts = [], isLoading } = useQuery({
    queryKey: ["admin-shorts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dj_shorts")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShortRow[];
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["admin-shorts-artists"],
    queryFn: async () => {
      const { data } = await supabase.from("artists").select("id,name,kind").order("name");
      return data ?? [];
    },
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ["admin-shorts-tracks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks")
        .select("id,title,artist")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(300);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const url = (d.source_url || d.youtube_url || "").trim();
      const provider = (d.provider as ShortProvider) || detectProvider(url);
      if (!provider) throw new Error("Plateforme non reconnue (URL YouTube ou Instagram requise)");
      const sid = extractShortId(url, provider);
      if (!sid) throw new Error(`URL ${providerLabel(provider)} invalide`);
      const thumb = d.thumbnail_url || shortThumbnail(provider, sid) || null;
      const payload: any = {
        title: d.title || "Sans titre",
        description: d.description || null,
        provider,
        source_url: url,
        source_id: sid,
        // back-compat columns
        youtube_url: provider === "youtube" ? url : null,
        youtube_id: provider === "youtube" ? sid : null,
        thumbnail_url: thumb,
        tags: d.tags ?? [],
        artist_id: d.artist_id || null,
        track_id: d.track_id || null,
        position: d.position ?? 0,
        is_active: d.is_active ?? true,
      };
      if (d.id) {
        const { error } = await supabase.from("dj_shorts").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dj_shorts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-shorts"] });
      toast.success("Short enregistré");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dj_shorts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-shorts"] });
      toast.success("Supprimé");
    },
  });

  const toggleActive = async (s: ShortRow) => {
    await supabase.from("dj_shorts").update({ is_active: !s.is_active }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin-shorts"] });
  };

  const move = async (s: ShortRow, dir: -1 | 1) => {
    const sorted = [...shorts].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((x) => x.id === s.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("dj_shorts").update({ position: swap.position }).eq("id", s.id),
      supabase.from("dj_shorts").update({ position: s.position }).eq("id", swap.id),
    ]);
    qc.invalidateQueries({ queryKey: ["admin-shorts"] });
  };

  return (
    <AdminLayout
      title="Shorts DJ"
      subtitle="Vidéos courtes (YouTube Shorts) affichées sur /shorts et en widget home."
      actions={
        <Button
          variant="hero"
          size="sm"
          className="gap-2"
          onClick={() => setEditing({ position: shorts.length, is_active: true, tags: [] })}
        >
          <Plus className="h-4 w-4" /> Nouveau short
        </Button>
      }
    >
      {editing ? (
        <ShortEditor
          draft={editing}
          artists={artists as any}
          tracks={tracks as any}
          onCancel={() => setEditing(null)}
          onSave={(d) => save.mutate(d)}
          saving={save.isPending}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!isLoading && shorts.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-border rounded-xl">
              <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucun short. Clique « Nouveau short » pour commencer.</p>
            </div>
          )}
          {shorts.map((s) => {
            const thumb = s.thumbnail_url || shortThumbnail(s.provider, s.source_id || s.youtube_id);
            const ProviderIcon = s.provider === "instagram" ? Instagram : Youtube;
            return (
            <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-[9/16] bg-secondary">
                {thumb ? (
                  <img src={thumb} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 via-secondary to-accent/30">
                    <ProviderIcon className="h-10 w-10 text-foreground/40" />
                  </div>
                )}
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-bold uppercase tracking-wider">
                  <ProviderIcon className="h-3 w-3" /> {s.provider === "instagram" ? "Reel" : "Short"}
                </div>
                {!s.is_active && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Inactif</span>
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <p className="font-semibold text-sm line-clamp-2">{s.title}</p>
                {s.tags?.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate">#{s.tags.join(" #")}</p>
                )}
                <div className="flex items-center gap-1 mt-auto pt-2">
                  <Button size="icon" variant="ghost" onClick={() => move(s, -1)} aria-label="Monter">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => move(s, 1)} aria-label="Descendre">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleActive(s)}
                    aria-label={s.is_active ? "Désactiver" : "Activer"}
                  >
                    {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <div className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Supprimer ce short ?")) remove.mutate(s.id);
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

function ShortEditor({
  draft,
  artists,
  tracks,
  onCancel,
  onSave,
  saving,
}: {
  draft: Draft;
  artists: { id: string; name: string; kind: string }[];
  tracks: { id: string; title: string; artist: string }[];
  onCancel: () => void;
  onSave: (d: Draft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<Draft>(draft);
  const tagsText = useMemo(() => (d.tags ?? []).join(", "), [d.tags]);
  const ytId = extractYouTubeId(d.youtube_url || "");

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-4 max-w-5xl">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <Label>URL YouTube *</Label>
          <Input
            placeholder="https://www.youtube.com/shorts/…  ou  https://youtu.be/…"
            value={d.youtube_url || ""}
            onChange={(e) => setD({ ...d, youtube_url: e.target.value })}
          />
          {d.youtube_url && !ytId && (
            <p className="text-xs text-destructive mt-1">URL non reconnue.</p>
          )}
        </div>
        <div>
          <Label>Titre *</Label>
          <Input
            value={d.title || ""}
            onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder="Mix de Brad — Rooftop session"
          />
        </div>
        <div>
          <Label>Description courte</Label>
          <Textarea
            value={d.description || ""}
            onChange={(e) => setD({ ...d, description: e.target.value })}
            rows={3}
            placeholder="Phrase d'accroche affichée en overlay sur la vidéo."
          />
        </div>
        <div>
          <Label>Tags / genres (séparés par des virgules)</Label>
          <Input
            value={tagsText}
            onChange={(e) =>
              setD({
                ...d,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="house, afro, summer"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Artiste / Remixer lié</Label>
            <Select
              value={d.artist_id || "none"}
              onValueChange={(v) => setD({ ...d, artist_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {artists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.kind === "remixer" ? "· remixer" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Morceau lié (catalogue)</Label>
            <Select
              value={d.track_id || "none"}
              onValueChange={(v) => setD({ ...d, track_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} — {t.artist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Switch
            checked={d.is_active ?? true}
            onCheckedChange={(v) => setD({ ...d, is_active: v })}
            id="short-active"
          />
          <Label htmlFor="short-active" className="cursor-pointer">Actif (visible publiquement)</Label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Annuler
          </Button>
          <Button
            onClick={() => onSave(d)}
            disabled={saving || !d.title || !ytId}
            className="gap-2"
          >
            <Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Aperçu</p>
        <div className="aspect-[9/16] bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
          {ytId ? (
            <img src={youtubeThumb(ytId)} alt="" className="w-full h-full object-cover" />
          ) : (
            <Video className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}
