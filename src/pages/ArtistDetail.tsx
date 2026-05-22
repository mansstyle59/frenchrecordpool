import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Disc3, Music2, ArrowLeft, Pencil, Download, Headphones, Globe, Instagram, Youtube, Music } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { DbTrack } from "@/hooks/useTracks";
import { slugify } from "@/lib/slug";

interface ArtistDetailProps {
  kind?: "artist" | "remixer";
}

export default function ArtistDetail({ kind = "artist" }: ArtistDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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
          const { data } = await supabase
            .from("tracks").select("*")
            .eq("status", "approved").eq("artist_id", artist.id)
            .order("created_at", { ascending: false });
          primary = (data ?? []) as DbTrack[];
        } else {
          const { data } = await supabase
            .from("tracks").select("*")
            .eq("status", "approved").contains("remixer_ids", [artist.id])
            .order("created_at", { ascending: false });
          primary = (data ?? []) as DbTrack[];
        }
      }
      if (primary.length === 0) {
        const { data } = await supabase
          .from("tracks").select("*")
          .eq("status", "approved").order("created_at", { ascending: false });
        const all = (data ?? []) as DbTrack[];
        const target = (artist?.name ?? slug ?? "").toLowerCase();
        primary = all.filter((t) => {
          if (kind === "artist") {
            return (t.artist ?? "").toLowerCase() === target || slugify(t.artist ?? "") === slug;
          }
          return (t.version ?? "").toLowerCase().includes(target);
        });
      }
      return primary;
    },
  });

  const displayName = artist?.name ?? slug?.replace(/-/g, " ");
  const isLoading = loadingArtist || loadingTracks;
  const canEdit = !!user && (isAdmin || (artist?.user_id && artist.user_id === user.id));

  const totalDownloads = useMemo(
    () => tracks.reduce((s, t) => s + ((t as any).downloads ?? 0), 0),
    [tracks],
  );

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    tracks.forEach((t) => { if (t.genre) counts.set(t.genre, (counts.get(t.genre) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  }, [tracks]);

  return (
    <Layout>
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-56 md:h-80 w-full overflow-hidden"
      >
        {artist?.banner_url ? (
          <img src={artist.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-accent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="container relative h-full flex items-end pb-4">
          <Link to={kind === "artist" ? "/artists" : "/remixers"} className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs text-white/90 bg-black/40 backdrop-blur px-2.5 py-1.5 rounded-md hover:bg-black/60">
            <ArrowLeft className="h-3.5 w-3.5" /> {kind === "artist" ? "Artistes" : "Remixers"}
          </Link>
          {canEdit && (
            <Button size="sm" variant="secondary" className="absolute top-4 right-4 gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Modifier ma page
            </Button>
          )}
        </div>
      </motion.div>

      <div className="container -mt-20 md:-mt-24 relative z-10">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-5 items-center md:items-end mb-6"
        >
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-accent ring-4 ring-background shadow-2xl shrink-0">
            {artist?.photo_url ? (
              <img src={artist.photo_url} alt={displayName} className="w-full h-full object-cover" />
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
            {artist?.tagline && <p className="text-sm md:text-base text-muted-foreground italic">{artist.tagline}</p>}
          </div>
        </motion.div>

        {/* Stats + socials */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="outline" className="gap-1.5 text-xs py-1.5"><Disc3 className="h-3.5 w-3.5" /> {tracks.length} titre{tracks.length > 1 ? "s" : ""}</Badge>
          <Badge variant="outline" className="gap-1.5 text-xs py-1.5"><Download className="h-3.5 w-3.5" /> {totalDownloads.toLocaleString()} téléchargements</Badge>
          {topGenres.map((g) => (
            <Badge key={g} variant="outline" className="gap-1 text-xs"><Music2 className="h-3 w-3" /> {g}</Badge>
          ))}
          <div className="flex-1" />
          <SocialLinks artist={artist} />
        </div>

        {/* Bio long */}
        {(artist?.bio_long || artist?.bio) && (
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-5 mb-6">
            <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">À propos</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{artist?.bio_long || artist?.bio}</p>
          </div>
        )}

        {/* Tracks */}
        <div className="mb-12">
          <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
            <Headphones className="h-4 w-4 text-primary" /> Discographie
          </h2>
          {isLoading ? (
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

      {canEdit && artist && (
        <EditArtistDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          artist={artist}
          onSaved={() => qc.invalidateQueries({ queryKey: ["artist-detail", kind, slug] })}
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

function EditArtistDialog({
  open, onOpenChange, artist, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; artist: any; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setForm({
      tagline: artist.tagline ?? "",
      bio_long: artist.bio_long ?? artist.bio ?? "",
      banner_url: artist.banner_url ?? "",
      photo_url: artist.photo_url ?? "",
      website_url: artist.website_url ?? "",
      instagram_url: artist.instagram_url ?? "",
      soundcloud_url: artist.soundcloud_url ?? "",
      youtube_url: artist.youtube_url ?? "",
      spotify_url: artist.spotify_url ?? "",
      beatport_url: artist.beatport_url ?? "",
      tiktok_url: artist.tiktok_url ?? "",
    });
  }, [open, artist]);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const uploadFile = async (file: File, field: "banner_url" | "photo_url") => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${artist.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("artist-banners").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast({ title: "Upload échoué", description: error.message, variant: "destructive" }); return; }
    const { data } = supabase.storage.from("artist-banners").getPublicUrl(path);
    set(field, data.publicUrl);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("artists").update(form).eq("id", artist.id);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Page mise à jour" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifier ma page</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bannière (hero)</Label>
              {form.banner_url && <img src={form.banner_url} alt="" className="h-24 w-full object-cover rounded mb-2" />}
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "banner_url")} disabled={uploading} />
              <Input className="mt-1" placeholder="ou URL" value={form.banner_url} onChange={(e) => set("banner_url", e.target.value)} />
            </div>
            <div>
              <Label>Photo de profil</Label>
              {form.photo_url && <img src={form.photo_url} alt="" className="h-24 w-24 object-cover rounded mb-2" />}
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "photo_url")} disabled={uploading} />
              <Input className="mt-1" placeholder="ou URL" value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Une phrase d'accroche" />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea rows={5} value={form.bio_long} onChange={(e) => set("bio_long", e.target.value)} placeholder="Présentez-vous, votre style, vos influences..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["website_url", "Site web"], ["instagram_url", "Instagram"],
              ["soundcloud_url", "SoundCloud"], ["youtube_url", "YouTube"],
              ["spotify_url", "Spotify"], ["beatport_url", "Beatport"],
              ["tiktok_url", "TikTok"],
            ].map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input value={form[k] || ""} onChange={(e) => set(k, e.target.value)} placeholder="https://..." />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving || uploading}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
