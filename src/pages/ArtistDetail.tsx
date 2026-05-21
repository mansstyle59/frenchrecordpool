import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Music2, ArrowLeft, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DbTrack } from "@/hooks/useTracks";
import { slugify } from "@/lib/slug";

interface ArtistDetailProps {
  kind?: "artist" | "remixer";
}

export default function ArtistDetail({ kind = "artist" }: ArtistDetailProps) {
  const { slug } = useParams<{ slug: string }>();

  const { data: artist, isLoading: loadingArtist } = useQuery({
    queryKey: ["artist-detail", kind, slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("*")
        .eq("kind", kind)
        .eq("slug", slug!)
        .maybeSingle();
      return data;
    },
  });

  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ["artist-tracks", kind, slug, artist?.id],
    enabled: !!slug,
    queryFn: async () => {
      // 1) Primary: filter by id in artist_id / remixer_ids
      let primary: DbTrack[] = [];
      if (artist?.id) {
        if (kind === "artist") {
          const { data } = await supabase
            .from("tracks")
            .select("*")
            .eq("status", "approved")
            .eq("artist_id", artist.id)
            .order("created_at", { ascending: false });
          primary = (data ?? []) as DbTrack[];
        } else {
          const { data } = await supabase
            .from("tracks")
            .select("*")
            .eq("status", "approved")
            .contains("remixer_ids", [artist.id])
            .order("created_at", { ascending: false });
          primary = (data ?? []) as DbTrack[];
        }
      }
      // 2) Fallback: match by text on artist name (legacy data)
      if (primary.length === 0) {
        const { data } = await supabase
          .from("tracks")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        const all = (data ?? []) as DbTrack[];
        const target = (artist?.name ?? slug ?? "").toLowerCase();
        primary = all.filter((t) => {
          if (kind === "artist") {
            return (t.artist ?? "").toLowerCase() === target
              || slugify(t.artist ?? "") === slug;
          }
          // remixer fallback uses the "version" text
          return (t.version ?? "").toLowerCase().includes(target);
        });
      }
      return primary;
    },
  });

  const displayName = artist?.name ?? slug?.replace(/-/g, " ");
  const isLoading = loadingArtist || loadingTracks;

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    tracks.forEach((t) => {
      if (t.genre) counts.set(t.genre, (counts.get(t.genre) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  }, [tracks]);

  return (
    <Layout>
      <div className="container py-6">
        <Link to={kind === "artist" ? "/artists" : "/remixers"} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> {kind === "artist" ? "Tous les artistes" : "Tous les remixers"}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-6 mb-6 flex flex-col md:flex-row gap-6 items-center md:items-start"
        >
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-full overflow-hidden bg-gradient-to-br from-primary/80 to-accent/80 ring-2 ring-border shrink-0">
            {artist?.photo_url ? (
              <img src={artist.photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-display font-black text-background">
                {displayName?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center md:text-left">
            <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-1">
              {kind === "artist" ? "Artiste" : "Remixer"}
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-black mb-2 capitalize">{displayName}</h1>
            {artist?.bio && <p className="text-sm text-muted-foreground mb-3">{artist.bio}</p>}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="outline" className="gap-1"><Disc3 className="h-3 w-3" /> {tracks.length} titre{tracks.length > 1 ? "s" : ""}</Badge>
              {topGenres.map((g) => (
                <Badge key={g} variant="outline" className="gap-1"><Music2 className="h-3 w-3" /> {g}</Badge>
              ))}
            </div>
            {(artist?.soundcloud_url || artist?.instagram_url || artist?.website_url) && (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                {artist?.soundcloud_url && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={artist.soundcloud_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> SoundCloud</a>
                  </Button>
                )}
                {artist?.instagram_url && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> Instagram</a>
                  </Button>
                )}
                {artist?.website_url && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={artist.website_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> Site</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">Chargement…</p>
        ) : tracks.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">Aucun titre publié pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
