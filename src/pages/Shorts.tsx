import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Music, ArrowLeft, Volume2, VolumeX, Tag as TagIcon, Disc3, ChevronUp, ChevronDown } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Observe the scroll container so the active short is the most-visible one inside it
  useEffect(() => {
    if (!scrollRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let best: { idx: number; ratio: number } | null = null;
        entries.forEach((e) => {
          const idx = itemsRef.current.findIndex((el) => el === e.target);
          if (idx < 0) return;
          if (!best || e.intersectionRatio > best.ratio) best = { idx, ratio: e.intersectionRatio };
        });
        if (best && best.ratio > 0.55) setActiveIdx(best.idx);
      },
      { root: scrollRef.current, threshold: [0.25, 0.55, 0.75, 1] }
    );
    itemsRef.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [filtered.length]);

  // Reset to top when filter changes
  useEffect(() => {
    setActiveIdx(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [tagFilter]);

  // Toggle mute on the active iframe without reloading it
  const postYT = useCallback((func: "mute" | "unMute" | "playVideo" | "pauseVideo") => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  }, []);

  useEffect(() => {
    // small delay so the iframe is ready after src change
    const t = setTimeout(() => postYT(muted ? "mute" : "unMute"), 150);
    return () => clearTimeout(t);
  }, [muted, activeIdx, postYT]);

  const scrollToIdx = (idx: number) => {
    const el = itemsRef.current[idx];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    <div
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden"
      style={{ height: "100svh" }}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 safe-top pointer-events-none">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
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
          <div className="px-3 pb-2 overflow-x-auto scrollbar-none pointer-events-auto">
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

      {/* Side controls (desktop/tablet) */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white"
          onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          aria-label="Précédent"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white"
          onClick={() => scrollToIdx(Math.min(filtered.length - 1, activeIdx + 1))}
          disabled={activeIdx >= filtered.length - 1}
          aria-label="Suivant"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      {/* Vertical snap feed */}
      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-contain scrollbar-none"
        style={{
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
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
        {filtered.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <div
              key={s.id}
              ref={(el) => (itemsRef.current[i] = el)}
              className="relative w-full snap-start snap-always flex items-center justify-center bg-black"
              style={{ height: "100svh" }}
            >
              {/* Ambient blurred backdrop */}
              <img
                src={s.thumbnail_url || youtubeThumb(s.youtube_id)}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover opacity-40"
                style={{ filter: "blur(40px) saturate(140%)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

              {/* 9:16 stage — full screen on mobile, centered phone-frame on md+ */}
              <div
                className="relative mx-auto h-full w-full md:h-[min(92svh,900px)] md:w-auto md:aspect-[9/16] md:rounded-3xl md:overflow-hidden md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] md:ring-1 md:ring-white/10"
                style={{ maxWidth: "100vw" }}
              >
                {isActive ? (
                  <iframe
                    ref={iframeRef}
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
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Bottom overlay info */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none"
                >
                  <div className="pointer-events-auto mx-auto max-w-md">
                    <h2 className="font-display text-lg md:text-xl font-black leading-tight line-clamp-2">{s.title}</h2>
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
                    {isActive && (relatedArtist || relatedTrack) && (
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

              {/* Progress dots (desktop) */}
              <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-1.5">
                {filtered.slice(0, 20).map((_, idx) => (
                  <span
                    key={idx}
                    className={`block w-1 rounded-full transition-all ${
                      idx === activeIdx ? "h-6 bg-white" : "h-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
