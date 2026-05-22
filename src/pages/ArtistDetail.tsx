import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Disc3, Music2, ArrowLeft, Pencil, Download, Headphones, Globe, Instagram, Youtube, Music, X, Eye } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { DbTrack } from "@/hooks/useTracks";
import { slugify } from "@/lib/slug";

interface ArtistDetailProps {
  kind?: "artist" | "remixer";
}

const EDITABLE_FIELDS = [
  "tagline", "bio_long", "banner_url", "photo_url",
  "website_url", "instagram_url", "soundcloud_url", "youtube_url",
  "spotify_url", "beatport_url", "tiktok_url",
] as const;

export default function ArtistDetail({ kind = "artist" }: ArtistDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: artist, isLoading: loadingArtist } = useQuery({
    queryKey: ["artist-detail", kind, slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("*")
        .in("kind", kind === "remixer" ? ["remixer", "both"] : ["artist", "both"])
        .eq("slug", slug!)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ["artist-tracks", kind, slug, artist?.id],
    enabled: !!slug,
    queryFn: async () => {
      let primary: DbTrack[] = [];
      if (artist?.id) {
        if (kind === "artist") {
          const { data } = await supabase.from("tracks").select("*")
            .eq("status", "approved").eq("artist_id", artist.id)
            .order("created_at", { ascending: false });
          primary = (data ?? []) as DbTrack[];
        } else {
          const { data } = await supabase.from("tracks").select("*")
            .eq("status", "approved").contains("remixer_ids", [artist.id])
            .order("created_at", { ascending: false });
          primary = (data ?? []) as DbTrack[];
        }
      }
      if (primary.length === 0) {
        const { data } = await supabase.from("tracks").select("*")
          .eq("status", "approved").order("created_at", { ascending: false });
        const all = (data ?? []) as DbTrack[];
        const target = (artist?.name ?? slug ?? "").toLowerCase();
        primary = all.filter((t) =>
          kind === "artist"
            ? (t.artist ?? "").toLowerCase() === target || slugify(t.artist ?? "") === slug
            : (t.version ?? "").toLowerCase().includes(target)
        );
      }
      return primary;
    },
  });

  const canEdit = !!user && (isAdmin || (artist?.user_id && artist.user_id === user.id));

  // Merge stored artist + live draft for the rendered preview
  const liveArtist = useMemo(() => ({ ...(artist ?? {}), ...draft }), [artist, draft]);
  const displayName = liveArtist?.name ?? slug?.replace(/-/g, " ");

  const totalDownloads = useMemo(
    () => tracks.reduce((s, t) => s + ((t as any).downloads ?? 0), 0), [tracks]);
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    tracks.forEach((t) => { if (t.genre) counts.set(t.genre, (counts.get(t.genre) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  }, [tracks]);

  const openEditor = () => {
    if (!artist) return;
    const initial: Record<string, string> = {};
    EDITABLE_FIELDS.forEach((k) => (initial[k] = (artist as any)[k] ?? ""));
    setDraft(initial);
    setEditing(true);
  };

  const updateDraft = (k: string, v: string) => setDraft((p) => ({ ...p, [k]: v }));

  const uploadImage = async (file: File, field: "banner_url" | "photo_url") => {
    if (!artist) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${artist.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("artist-banners").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload échoué", description: error.message, variant: "destructive" }); return; }
    const { data } = supabase.storage.from("artist-banners").getPublicUrl(path);
    updateDraft(field, data.publicUrl);
    toast({ title: "Image chargée", description: "Aperçu mis à jour en direct." });
  };

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!artist) return;
    setSaving(true);
    const { error } = await supabase.from("artists").update(draft).eq("id", artist.id);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Page mise à jour ✨" });
    qc.invalidateQueries({ queryKey: ["artist-detail", kind, slug] });
    setEditing(false);
  };

  return (
    <Layout>
      <div className={editing ? "lg:pr-[420px] transition-[padding] duration-300" : ""}>
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-56 md:h-80 w-full overflow-hidden"
        >
          {liveArtist?.banner_url ? (
            <img src={liveArtist.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-accent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="container relative h-full flex items-end pb-4">
            <Link to={kind === "artist" ? "/artists" : "/remixers"} className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs text-white/90 bg-black/40 backdrop-blur px-2.5 py-1.5 rounded-md hover:bg-black/60">
              <ArrowLeft className="h-3.5 w-3.5" /> {kind === "artist" ? "Artistes" : "Remixers"}
            </Link>
            {canEdit && !editing && (
              <Button size="sm" variant="secondary" className="absolute top-4 right-4 gap-1.5" onClick={openEditor}>
                <Pencil className="h-3.5 w-3.5" /> Modifier ma page
              </Button>
            )}
          </div>
        </motion.div>

        <div className="container -mt-20 md:-mt-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-5 items-center md:items-end mb-6"
          >
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-accent ring-4 ring-background shadow-2xl shrink-0">
              {liveArtist?.photo_url ? (
                <img src={liveArtist.photo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-display font-black text-background">
                  {displayName?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left pb-2">
              <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-1">
                Remixer officiel · French Record Pool
              </p>
              <h1 className="font-display text-3xl md:text-5xl font-black mb-1 capitalize">{displayName}</h1>
              {liveArtist?.tagline && <p className="text-sm md:text-base text-muted-foreground italic">{liveArtist.tagline}</p>}
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge variant="outline" className="gap-1.5 text-xs py-1.5"><Disc3 className="h-3.5 w-3.5" /> {tracks.length} titre{tracks.length > 1 ? "s" : ""}</Badge>
            <Badge variant="outline" className="gap-1.5 text-xs py-1.5"><Download className="h-3.5 w-3.5" /> {totalDownloads.toLocaleString()} téléchargements</Badge>
            {topGenres.map((g) => (
              <Badge key={g} variant="outline" className="gap-1 text-xs"><Music2 className="h-3 w-3" /> {g}</Badge>
            ))}
            <div className="flex-1" />
            <SocialLinks artist={liveArtist} />
          </div>

          {(liveArtist?.bio_long || liveArtist?.bio) && (
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-5 mb-6">
              <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">À propos</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{liveArtist?.bio_long || liveArtist?.bio}</p>
            </div>
          )}

          <div className="mb-12">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" /> Discographie
            </h2>
            {(loadingArtist || loadingTracks) ? (
              <p className="text-center text-muted-foreground py-10">Chargement…</p>
            ) : tracks.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground">Aucun titre publié pour le moment.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden">
                {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && canEdit && artist && (
        <LiveEditorPanel
          draft={draft}
          onChange={updateDraft}
          onUpload={uploadImage}
          onClose={() => setEditing(false)}
          onSave={save}
          saving={saving}
        />
      )}
    </Layout>
  );
}

function SocialLinks({ artist }: { artist: any }) {
  if (!artist) return null;
  const items: Array<{ url?: string | null; icon: any; label: string }> = [
    { url: artist.website_url, icon: Globe, label: "Site" },
    { url: artist.instagram_url, icon: Instagram, label: "Instagram" },
    { url: artist.soundcloud_url, icon: Music, label: "SoundCloud" },
    { url: artist.youtube_url, icon: Youtube, label: "YouTube" },
    { url: artist.spotify_url, icon: Music, label: "Spotify" },
    { url: artist.beatport_url, icon: Music, label: "Beatport" },
    { url: artist.tiktok_url, icon: Music, label: "TikTok" },
  ].filter((x) => x.url);
  if (items.length === 0) return null;
  return (
    <div className="flex gap-1.5">
      {items.map((it) => (
        <Button key={it.label} asChild variant="outline" size="icon" className="h-8 w-8" title={it.label}>
          <a href={it.url!} target="_blank" rel="noopener noreferrer"><it.icon className="h-3.5 w-3.5" /></a>
        </Button>
      ))}
    </div>
  );
}

interface PanelProps {
  draft: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onUpload: (f: File, field: "banner_url" | "photo_url") => Promise<void>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}

function LiveEditorPanel({ draft, onChange, onUpload, onClose, onSave, saving }: PanelProps) {
  return (
    <motion.aside
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      className="fixed top-0 right-0 h-screen w-full sm:w-[420px] z-50 bg-card/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col"
    >
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold">Éditeur live</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-muted-foreground">Chaque champ met à jour l'aperçu à gauche en temps réel.</p>

        <div>
          <Label className="text-xs">Bannière (hero)</Label>
          {draft.banner_url && <img src={draft.banner_url} alt="" className="h-20 w-full object-cover rounded mb-2" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], "banner_url")} />
          <Input className="mt-1 text-xs" placeholder="ou URL" value={draft.banner_url || ""} onChange={(e) => onChange("banner_url", e.target.value)} />
        </div>

        <div>
          <Label className="text-xs">Photo de profil</Label>
          {draft.photo_url && <img src={draft.photo_url} alt="" className="h-20 w-20 object-cover rounded mb-2" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], "photo_url")} />
          <Input className="mt-1 text-xs" placeholder="ou URL" value={draft.photo_url || ""} onChange={(e) => onChange("photo_url", e.target.value)} />
        </div>

        <div>
          <Label className="text-xs">Tagline</Label>
          <Input value={draft.tagline || ""} onChange={(e) => onChange("tagline", e.target.value)} placeholder="Phrase d'accroche" />
        </div>

        <div>
          <Label className="text-xs">Bio</Label>
          <Textarea rows={5} value={draft.bio_long || ""} onChange={(e) => onChange("bio_long", e.target.value)} placeholder="Présente-toi…" />
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Réseaux sociaux</Label>
          {[
            ["website_url", "Site web"], ["instagram_url", "Instagram"],
            ["soundcloud_url", "SoundCloud"], ["youtube_url", "YouTube"],
            ["spotify_url", "Spotify"], ["beatport_url", "Beatport"],
            ["tiktok_url", "TikTok"],
          ].map(([k, label]) => (
            <div key={k}>
              <Label className="text-[11px]">{label}</Label>
              <Input className="text-xs" value={draft[k] || ""} onChange={(e) => onChange(k, e.target.value)} placeholder="https://..." />
            </div>
          ))}
        </div>
      </div>
      <footer className="p-4 border-t border-border flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Annuler</Button>
        <Button className="flex-1" onClick={onSave} disabled={saving}>{saving ? "…" : "Publier"}</Button>
      </footer>
    </motion.aside>
  );
}
