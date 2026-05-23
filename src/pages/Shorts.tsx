import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Music, ArrowLeft, Volume2, VolumeX, Tag as TagIcon, Disc3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { youtubeEmbedUrl, youtubeThumb } from "@/lib/youtube";

type Short = {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  youtube_url: string;
  thumbnail_url: string | null;
  tags: string[];
  artist_id: string | null;
  track_id: string | null;
};

export default function Shorts() {
  const { data: shorts = [], isLoading } = useQuery({
    queryKey: ["public-shorts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dj_shorts")
        .select("id,title,description,youtube_id,youtube_url,thumbnail_url,tags,artist_id,track_id")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Short[];
    },
  });

  // Genre/tag filter
  const allTags = useMemo(() => {
    const set = new Set<string>();
    shorts.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [shorts]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const filtered = useMemo(
    () => (tagFilter ? shorts.filter((s) => s.tags?.includes(tagFilter)) : shorts),
    [shorts, tagFilter]
  );

  // Track which item is most visible to autoplay
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = itemsRef.current.findIndex((el) => el === e.target);
            if (idx >= 0) setActiveIdx(idx);
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    itemsRef.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [filtered.length]);

  // Lookup related artist/track for the active short
  const active = filtered[activeIdx];
  const { data: relatedArtist } = useQuery({
    queryKey: ["short-artist", active?.artist_id],
    enabled: !!active?.artist_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("id,name,slug,kind,photo_url")
        .eq("id", active!.artist_id!)
        .maybeSingle();
      return data as any;
    },
  });
  const { data: relatedTrack } = useQuery({
    queryKey: ["short-track", active?.track_id],
    enabled: !!active?.track_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks")
        .select("id,title,artist,cover_url")
        .eq("id", active!.track_id!)
        .maybeSingle();
      return data as any;
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 safe-top">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 bg-gradient-to-b from-black/70 to-transparent">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <p className="font-display font-black uppercase tracking-widest text-sm flex items-center gap-1.5">
            <Disc3 className="h-4 w-4 text-primary" /> Shorts DJ
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            aria-label={muted ? "Activer le son" : "Couper le son"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        {allTags.length > 0 && (
          <div className="px-3 pb-2 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 w-max">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={`px-3 h-7 rounded-full text-xs font-bold uppercase tracking-wider border transition ${
                  !tagFilter ? "bg-white text-black border-white" : "bg-white/10 border-white/20 text-white"
                }`}
              >
                Tous
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTagFilter(t)}
                  className={`px-3 h-7 rounded-full text-xs font-bold uppercase tracking-wider border transition ${
                    tagFilter === t ? "bg-white text-black border-white" : "bg-white/10 border-white/20 text-white"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vertical snap feed */}
      <div
        className="h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-contain"
        style={{ scrollbarWidth: "none" }}
      >
        {isLoading && (
          <div className="h-full flex items-center justify-center text-white/70 text-sm">Chargement…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <Disc3 className="h-10 w-10 text-white/40 mb-3" />
            <p className="font-display font-bold text-lg">Aucun short pour le moment</p>
            <p className="text-sm text-white/60 mt-1">L'admin doit en ajouter via /admin/shorts.</p>
          </div>
        )}
        {filtered.map((s, i) => (
          <div
            key={s.id}
            ref={(el) => (itemsRef.current[i] = el)}
            className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black"
          >
            {/* Backdrop blur image */}
            <img
              src={s.thumbnail_url || youtubeThumb(s.youtube_id)}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              style={{ filter: "blur(28px) saturate(140%)" }}
            />

            {/* Video frame (9:16-ish) */}
            <div className="relative w-full h-full max-w-md mx-auto">
              {i === activeIdx ? (
                <iframe
                  key={`${s.id}-${muted ? "m" : "s"}`}
                  src={youtubeEmbedUrl(s.youtube_id, { autoplay: true, mute: muted, loop: true })}
                  title={s.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              ) : (
                <img
                  src={s.thumbnail_url || youtubeThumb(s.youtube_id)}
                  alt={s.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Bottom overlay info */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: i === activeIdx ? 1 : 0, y: i === activeIdx ? 0 : 16 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pt-16 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none"
              >
                <div className="pointer-events-auto max-w-md mx-auto">
                  <h2 className="font-display text-lg font-black leading-tight line-clamp-2">{s.title}</h2>
                  {s.description && (
                    <p className="text-sm text-white/80 mt-1 line-clamp-2">{s.description}</p>
                  )}
                  {s.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.tags.slice(0, 4).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="bg-white/10 border-white/20 text-white text-[10px] gap-1"
                        >
                          <TagIcon className="h-3 w-3" /> {t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Related artist / track CTA */}
                  {i === activeIdx && (relatedArtist || relatedTrack) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {relatedArtist && (
                        <Link
                          to={
                            relatedArtist.kind === "remixer"
                              ? `/remixers/${relatedArtist.slug}`
                              : `/artists/${relatedArtist.slug}`
                          }
                        >
                          <Button size="sm" variant="secondary" className="gap-2">
                            {relatedArtist.photo_url ? (
                              <img
                                src={relatedArtist.photo_url}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover"
                              />
                            ) : (
                              <Heart className="h-3.5 w-3.5" />
                            )}
                            {relatedArtist.name}
                          </Button>
                        </Link>
                      )}
                      {relatedTrack && (
                        <Link to={`/tracks/${relatedTrack.id}`}>
                          <Button size="sm" className="gap-2">
                            <Music className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[160px]">{relatedTrack.title}</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
