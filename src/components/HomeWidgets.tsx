import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Clock, Megaphone, Users, Code as CodeIcon, Sparkles, Play,
  Music2, Headphones, ArrowRight, BarChart3, Tag, Star, HelpCircle,
  ChevronDown, Minus, Quote, Download, TrendingUp, Disc, Disc3, DiscAlbum, Radio,
  Image as ImageIcon, Check, Instagram, Newspaper, X as XIcon,
  Music, Pause, ListMusic, Mic2, Volume2, Volume1, VolumeX,
  CheckCircle, CheckCircle2, Heart, Globe, Lock, Unlock, User,
  Calendar, Search, Filter, Settings, Bell, MessageCircle, Share2,
  Link as LinkIcon, ExternalLink, FileAudio, Video, Camera, Layers, LayoutGrid,
  Columns3, LayoutTemplate, Monitor, Smartphone, Wifi, Award, Crown,
  ThumbsUp, Eye, Shield, ShieldCheck, Zap, AlertCircle, Info,
  Plus, ArrowLeft, Trash2, Pencil, Copy, Save, RefreshCw, SlidersHorizontal,
  Hash, Bookmark, Flag, MapPin, Phone, ShoppingCart, CreditCard, Truck,
  Package, Gift, Percent, DollarSign, Euro, ArrowUpRight, Briefcase,
  Building2, Headset, Keyboard, MousePointerClick, Palette, Wand2,
  Code2, Terminal, Fingerprint, ScanFace, Cloud, CloudDownload,
  Database, Server, HardDrive, Cpu, WifiOff, Globe2, Landmark,
  Megaphone as MegaphoneIcon, Tv, Film, Clapperboard, CirclePlay,
  Aperture, Sun, Moon, Flame, Snowflake, Leaf, TreePine, Mountain,
  Anchor, Compass, Sailboat, Ship, Plane, Car, Bike, Bus, TrainFront,
  Ticket, Map as MapIcon, Pin as PinIcon, Navigation, BookOpen, BookMarked, Library,
  GraduationCap, School, PenTool, Ruler, Calculator, Scissors,
  Paintbrush, PencilRuler, Drum, Guitar, Piano, Mic, Speaker,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import { resolveCover } from "@/lib/trackCover";
import { usePlayer } from "@/contexts/PlayerContext";
import { titleStyle, bodyStyle } from "@/lib/widgetTypography";
import {
  ANIM_VARIANTS, CONTAINER_CLASS, PAD_X, padYClasses, bgStyle,
  type WidgetCommon,
} from "@/lib/widgetCommon";
import DjShortsWidget from "@/components/DjShortsWidget";

export interface Widget {
  id: string;
  type: string;
  position: number;
  config: Record<string, any> & { common?: WidgetCommon };
  is_active: boolean;
}

interface Props {
  widgets?: Widget[];
  preview?: boolean;
}

export default function HomeWidgets({ widgets: propWidgets, preview = false }: Props) {
  const [widgets, setWidgets] = useState<Widget[]>(propWidgets ?? []);

  useEffect(() => {
    if (propWidgets) { setWidgets(propWidgets); return; }
    let cancelled = false;
    supabase
      .from("home_widgets")
      .select("*")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .then(({ data }: any) => { if (!cancelled && data) setWidgets(data as Widget[]); });
    return () => { cancelled = true; };
  }, [propWidgets]);

  if (widgets.length === 0) return null;

  return (
    <div className={preview ? "space-y-4" : "space-y-4 md:space-y-6"}>
      {widgets.map((w) => (
        <WidgetWrapper key={w.id} widget={w} preview={preview} />
      ))}
    </div>
  );
}

/* ─── Shared shell : container + bg + entrance animation ─── */
function WidgetWrapper({ widget, preview }: { widget: Widget; preview: boolean }) {
  const common: WidgetCommon = widget.config.common || {};
  // Hero defaults to full width without container
  const isHero = widget.type === "hero";
  const containerKey = (common.container ?? (isHero ? "full" : "default")) as keyof typeof CONTAINER_CLASS;
  const padY = padYClasses(common);
  const padX = PAD_X[common.pad_x ?? "none"];

  const hasBg = common.bg_kind && common.bg_kind !== "none";
  const animKey = common.anim ?? "slide-up";
  const variants = ANIM_VARIANTS[animKey] || ANIM_VARIANTS["slide-up"];

  const content = (
    <div className={`${CONTAINER_CLASS[containerKey]} ${padX} relative z-10`}>
      <WidgetRenderer widget={widget} preview={preview} />
    </div>
  );

  return (
    <motion.section
      variants={variants}
      initial={animKey === "none" ? false : "hidden"}
      whileInView={animKey === "none" ? undefined : "show"}
      viewport={{ once: true, amount: 0.15 }}
      transition={common.anim_delay ? { delay: common.anim_delay / 1000 } : undefined}
      className={`relative ${padY} ${hasBg ? "overflow-hidden" : ""}`}
    >
      {hasBg && (
        <>
          <div className="absolute inset-0 -z-0" style={bgStyle(common)} />
          {common.bg_kind === "image" && common.bg_blur ? (
            <div className="absolute inset-0 -z-0 backdrop-blur" style={{ backdropFilter: `blur(${common.bg_blur}px)` }} />
          ) : null}
          {common.bg_overlay ? (
            <div className="absolute inset-0 -z-0 bg-background" style={{ opacity: (common.bg_overlay ?? 0) / 100 }} />
          ) : null}
        </>
      )}
      {content}
    </motion.section>
  );
}

function WidgetRenderer({ widget, preview }: { widget: Widget; preview: boolean }) {
  switch (widget.type) {
    case "hero":             return <HeroWidget config={widget.config} preview={preview} />;
    case "track_grid":       return <TrackGridWidget config={widget.config} preview={preview} />;
    case "top_downloads":    return <TrackGridWidget config={{ title: "Top téléchargements", sort_by: "popular", limit: 8, see_all_url: "/popular", ...widget.config }} preview={preview} />;
    case "new_releases":     return <TrackGridWidget config={{ title: "Nouveautés", sort_by: "recent", limit: 8, see_all_url: "/new", ...widget.config }} preview={preview} />;
    case "top_genre":        return <TopGenreWidget config={widget.config} preview={preview} />;
    case "top_label":        return <TopLabelWidget config={widget.config} />;
    case "top_artists":      return <TopArtistsWidget config={widget.config} />;
    case "artist_carousel":  return <ArtistCarouselWidget config={widget.config} />;
    case "cta":              return <CtaWidget config={widget.config} />;
    case "rich_text":        return <RichTextWidget config={widget.config} />;
    case "video_embed":      return <VideoEmbedWidget config={widget.config} />;
    case "dj_shorts":        return <DjShortsWidget config={widget.config} />;
    case "audio_embed":      return <AudioEmbedWidget config={widget.config} />;
    case "newsletter":       return <NewsletterWidget config={widget.config} />;
    case "countdown":        return <CountdownWidget config={widget.config} />;
    case "promo_banner":     return <PromoBannerWidget config={widget.config} />;
    case "sticky_promo":     return <StickyPromoWidget config={widget.config} />;
    case "top_djs":          return <ArtistCarouselWidget config={{ ...widget.config, featured_only: true }} />;
    case "html_block":       return <HtmlBlockWidget config={widget.config} />;
    case "stats":            return <StatsWidget config={widget.config} />;
    case "live_counter":     return <LiveCounterWidget config={widget.config} />;
    case "genres_cloud":     return <GenresCloudWidget config={widget.config} />;
    case "featured_track":   return <FeaturedTrackWidget config={widget.config} />;
    case "testimonials":     return <TestimonialsWidget config={widget.config} />;
    case "video_testimonial":return <VideoTestimonialWidget config={widget.config} />;
    case "faq":              return <FaqWidget config={widget.config} />;
    case "logos_strip":      return <LogosStripWidget config={widget.config} />;
    case "divider":          return <DividerWidget config={widget.config} />;
    case "two_columns":      return <TwoColumnsWidget config={widget.config} />;
    case "slides_carousel":  return <SlidesCarouselWidget config={widget.config} preview={preview} />;
    case "image_gallery":    return <ImageGalleryWidget config={widget.config} />;
    case "marquee":          return <MarqueeWidget config={widget.config} />;
    case "plans_compare":    return <PlansCompareWidget config={widget.config} />;
    case "features_grid":    return <FeaturesGridWidget config={widget.config} />;
    case "blog_cards":       return <BlogCardsWidget config={widget.config} />;
    case "team_grid":        return <TeamGridWidget config={widget.config} />;
    case "instagram_feed":   return <InstagramFeedWidget config={widget.config} />;
    default: return null;
  }
}


/* ─── HERO ─── */
function HeroWidget({ config, preview }: { config: any; preview: boolean }) {
  const layout = config.layout || "center";
  const height = config.height === "compact" ? "py-8 md:py-12" : config.height === "full" ? "py-20 md:py-48" : "py-12 md:py-32";
  const overlay = config.overlay_opacity ?? 75;
  return (
    <div className="relative overflow-hidden rounded-none">
      {config.bg_url && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${config.bg_url})` }} />
      )}
      {/* Dégradé qui se fond dans le background du site (haut translucide → background plein en bas) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, hsl(var(--background) / ${Math.max(0, overlay - 30) / 100}) 0%, hsl(var(--background) / ${overlay / 100}) 55%, hsl(var(--background)) 100%)`,
        }}
      />
      <motion.div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 10, repeat: Infinity }} />

      <div className={`relative container ${preview ? "py-10" : height} ${layout === "left" ? "text-left" : layout === "split" ? "grid md:grid-cols-2 gap-10 items-center text-left" : "text-center"}`}>
        <div className={layout === "left" || layout === "split" ? "max-w-2xl" : "max-w-3xl mx-auto"}>
          {config.eyebrow && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-5">
              <Sparkles className="h-3 w-3" /> {config.eyebrow}
            </span>
          )}
          {(config.title || config.highlight) && (
            <h1 className={`font-display font-black tracking-tight ${preview ? "text-3xl" : "text-3xl sm:text-5xl md:text-7xl"} mb-4 break-words`} style={titleStyle(config.typo)}>
              {config.title}
              {config.title && config.highlight && " "}
              {config.highlight && <span className="gradient-text">{config.highlight}</span>}
            </h1>
          )}
          {config.subtitle && (
            <p className={`text-muted-foreground ${layout === "center" ? "mx-auto" : ""} ${preview ? "text-sm max-w-xl" : "text-base sm:text-lg md:text-xl max-w-2xl"} mb-6 md:mb-8`} style={bodyStyle(config.typo)}>
              {config.subtitle}
            </p>
          )}

          <div className={`flex flex-wrap gap-3 ${layout === "center" ? "justify-center" : ""}`}>
            {config.cta_primary_label && (
              <Button asChild size={preview ? "default" : "lg"} variant="default">
                <Link to={config.cta_primary_url || "/new"}>
                  {config.cta_primary_label} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
            {config.cta_secondary_label && (
              <Button asChild size={preview ? "default" : "lg"} variant="ghost">
                <Link to={config.cta_secondary_url || "/pricing"}>{config.cta_secondary_label}</Link>
              </Button>
            )}
          </div>

          {config.trust_badges?.length ? (
            <div className={`flex flex-wrap gap-4 mt-8 text-xs text-muted-foreground ${layout === "center" ? "justify-center" : ""}`}>
              {config.trust_badges.map((b: string, i: number) => (
                <span key={i} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {b}</span>
              ))}
            </div>
          ) : null}
        </div>

        {layout === "split" && config.bg_url && (
          <div className="hidden md:block relative">
            <img src={config.bg_url} alt="" className="rounded-3xl shadow-2xl w-full aspect-[4/5] object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TRACK GRID ─── */
function TrackGridWidget({ config, preview }: { config: any; preview: boolean }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<string[]>([]);
  const [activeGenre, setActiveGenre] = useState<string | null>(config.genre || null);
  const tabsEnabled = !!config.genre_tabs;

  // Load available genres once if tabs are enabled
  useEffect(() => {
    if (!tabsEnabled) return;
    supabase.from("tracks").select("genre").eq("status", "approved").then(({ data }) => {
      const counts = new Map<string, number>();
      (data || []).forEach((t: any) => t.genre && counts.set(t.genre, (counts.get(t.genre) || 0) + 1));
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
      setGenres(sorted.slice(0, 12));
    });
  }, [tabsEnabled]);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("tracks").select("*").eq("status", "approved");
    const sort = config.sort_by || "recent";
    if (sort === "popular") q = q.order("downloads", { ascending: false });
    else if (sort === "alphabetical") q = q.order("title", { ascending: true });
    else q = q.order("release_date", { ascending: false }).order("created_at", { ascending: false });
    const effectiveGenre = tabsEnabled ? activeGenre : config.genre;
    if (effectiveGenre) q = q.eq("genre", effectiveGenre);
    if (config.label) q = q.eq("label", config.label);
    if (config.tag)   q = q.contains("tags", [config.tag]);
    q.limit(Math.min(config.limit || 8, 24)).then(({ data }) => {
      setTracks(data || []);
      setLoading(false);
    });
  }, [config.sort_by, config.genre, config.tag, config.label, config.limit, activeGenre, tabsEnabled]);

  const Icon = config.sort_by === "popular" ? Headphones : Music2;
  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent shrink-0" />
          <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 truncate" style={titleStyle(config.typo)}>
            <Icon className="h-5 w-5 text-primary shrink-0" />
            {config.title || "Tracks"}
          </h2>
        </div>
        {config.see_all_url && !preview && (
          <Button asChild variant="ghost" size="sm">
            <Link to={config.see_all_url}>Tout voir <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        )}
      </div>

      {/* Menu roulant de genres */}
      {tabsEnabled && genres.length > 0 && (
        <div className="relative -mx-1 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none px-1 pb-1 snap-x">
            <button
              onClick={() => setActiveGenre(null)}
              className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all ${
                activeGenre === null
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                  : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              Tous
            </button>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all ${
                  activeGenre === g
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                    : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-1 w-6 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-background to-transparent" />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden min-h-[120px]">
        {loading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: Math.min(config.limit || 8, 6) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="h-14 w-14 rounded-lg bg-muted/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-muted/50 rounded" />
                  <div className="h-2.5 w-1/4 bg-muted/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun titre {activeGenre ? `pour le genre "${activeGenre}"` : "à afficher"}.
          </div>
        ) : (
          <>
            <TrackListHeader />
            {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── TOP GENRE ─── */
function TopGenreWidget({ config, preview }: { config: any; preview: boolean }) {
  const [genre, setGenre] = useState<string | null>(config.genre || null);
  const [tracks, setTracks] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      let g = config.genre;
      if (!g) {
        const { data } = await supabase.from("tracks").select("genre").eq("status", "approved");
        const map = new Map<string, number>();
        (data || []).forEach((t: any) => t.genre && map.set(t.genre, (map.get(t.genre) || 0) + 1));
        g = [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        setGenre(g);
      }
      if (!g) return;
      const { data: list } = await supabase.from("tracks").select("*").eq("status", "approved").eq("genre", g).order("downloads", { ascending: false }).limit(config.limit || 6);
      setTracks(list || []);
    })();
  }, [config.genre, config.limit]);
  if (!genre || tracks.length === 0) return null;
  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent shrink-0" />
          <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 truncate" style={titleStyle(config.typo)}>
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            {config.title || `Top ${genre}`}
          </h2>
        </div>
        {!preview && (
          <Button asChild variant="ghost" size="sm">
            <Link to={`/tracks?genre=${encodeURIComponent(genre)}`}>Tout voir <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
        <TrackListHeader />
        {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}
      </div>
    </div>
  );
}

/* ─── TOP LABEL ─── */
function TopLabelWidget({ config }: { config: any }) {
  const [list, setList] = useState<{ label: string; count: number; cover?: string }[]>([]);
  useEffect(() => {
    supabase.from("tracks").select("label, cover_url, downloads").eq("status", "approved").then(({ data }) => {
      const map = new Map<string, { count: number; cover?: string }>();
      (data || []).forEach((t: any) => {
        if (!t.label) return;
        const cur = map.get(t.label) || { count: 0, cover: t.cover_url };
        map.set(t.label, { count: cur.count + (t.downloads || 1), cover: cur.cover || t.cover_url });
      });
      setList([...map.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count).slice(0, config.limit || 8));
    });
  }, [config.limit]);
  if (list.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2" style={titleStyle(config.typo)}>
          <Disc3 className="h-5 w-5 text-primary" /> {config.title || "Labels en vogue"}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {list.map((l) => (
          <Link key={l.label} to={`/tracks?label=${encodeURIComponent(l.label)}`}
            className="group relative aspect-video rounded-2xl overflow-hidden border border-border hover:border-primary/60 transition">
            {l.cover ? <img src={l.cover} alt={l.label} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end">
              <p className="font-bold text-white text-sm md:text-base truncate">{l.label}</p>
              <p className="text-white/60 text-[10px] uppercase tracking-widest">{l.count} dl</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── TOP ARTISTS (by downloads aggregate) ─── */
function TopArtistsWidget({ config }: { config: any }) {
  const [list, setList] = useState<{ name: string; count: number; cover?: string }[]>([]);
  useEffect(() => {
    supabase.from("tracks").select("artist, cover_url, downloads").eq("status", "approved").then(({ data }) => {
      const map = new Map<string, { count: number; cover?: string }>();
      (data || []).forEach((t: any) => {
        if (!t.artist) return;
        const cur = map.get(t.artist) || { count: 0, cover: t.cover_url };
        map.set(t.artist, { count: cur.count + (t.downloads || 1), cover: cur.cover || t.cover_url });
      });
      setList([...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, config.limit || 6));
    });
  }, [config.limit]);
  if (list.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2" style={titleStyle(config.typo)}>
          <Users className="h-5 w-5 text-primary" /> {config.title || "Top artistes"}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {list.map((a, i) => (
          <Link key={a.name} to={`/tracks?artist=${encodeURIComponent(a.name)}`}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-border hover:border-primary/60 transition">
            {a.cover ? <img src={a.cover} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition" /> :
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl font-bold">{a.name[0]}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">{i + 1}</div>
            <div className="absolute inset-0 p-3 flex items-end">
              <p className="text-white font-semibold text-sm truncate w-full">{a.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── ARTIST CAROUSEL ─── */
function ArtistCarouselWidget({ config }: { config: any }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    let q = supabase.from("artists").select("id, name, slug, photo_url, kind");
    if (config.featured_only) q = q.eq("featured", true);
    if (config.kind === "remixer" || config.kind === "artist") q = q.eq("kind", config.kind);
    q.order("sort_order", { ascending: true })
     .limit(config.limit || 8)
     .then(({ data }) => data && setList(data));
  }, [config.featured_only, config.kind, config.limit]);

  if (list.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2" style={titleStyle(config.typo)}>
          <Users className="h-5 w-5 text-primary" /> {config.title || "Artistes"}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {list.map((dj) => (
          <Link
            key={dj.id}
            to={`/remixers/${dj.slug}`}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-border hover:border-primary/60 transition-all hover:scale-[1.03]"
          >
            {dj.photo_url ? (
              <img src={dj.photo_url} alt={dj.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl font-bold text-foreground/40">
                {dj.name?.[0]}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent flex items-end p-3">
              <p className="text-sm font-semibold text-white truncate w-full">{dj.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── CTA ─── */
function CtaWidget({ config }: { config: any }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-accent/15 p-10 md:p-14 text-center">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative">
        <h2 className="font-display text-3xl md:text-5xl font-black mb-3" style={titleStyle(config.typo)}>
          {config.title || "Prêt à jouer en live ?"}
        </h2>
        {config.body && <p className="text-muted-foreground md:text-lg mb-6 max-w-2xl mx-auto" style={bodyStyle(config.typo)}>{config.body}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {config.cta_label && (
            <Button asChild size="lg" variant="hero">
              <Link to={config.cta_url || "/pricing"}>{config.cta_label}</Link>
            </Button>
          )}
          {config.cta_secondary_label && (
            <Button asChild size="lg" variant="outline">
              <Link to={config.cta_secondary_url || "/new"}>{config.cta_secondary_label}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── RICH TEXT ─── */
function RichTextWidget({ config }: { config: any }) {
  const align = config.align === "center" ? "text-center" : config.align === "right" ? "text-right" : "text-left";
  return (
    <div className={`prose prose-invert max-w-3xl ${config.center !== false ? "mx-auto" : ""} ${align}`}>
      {config.title && <h2 className="font-display text-3xl md:text-4xl font-bold mb-4" style={titleStyle(config.typo)}>{config.title}</h2>}
      {config.body && <p className="text-muted-foreground whitespace-pre-line text-lg" style={bodyStyle(config.typo)}>{config.body}</p>}
    </div>
  );
}

/* ─── VIDEO EMBED ─── */
function VideoEmbedWidget({ config }: { config: any }) {
  const url = config.url || "";
  let embed = url;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/);
  if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
  return (
    <div>
      {config.title && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="font-display text-2xl md:text-3xl font-bold" style={titleStyle(config.typo)}>{config.title}</h2>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden border border-border aspect-video bg-black">
        {embed ? (
          <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">URL vidéo manquante</div>
        )}
      </div>
    </div>
  );
}

/* ─── AUDIO EMBED (Spotify / SoundCloud) ─── */
function AudioEmbedWidget({ config }: { config: any }) {
  const url = config.url || "";
  let src = "";
  let height = 152;
  if (/spotify\.com/.test(url)) {
    src = url.replace("/track/", "/embed/track/").replace("/playlist/", "/embed/playlist/").replace("/album/", "/embed/album/");
    height = url.includes("playlist") || url.includes("album") ? 380 : 152;
  } else if (/soundcloud\.com/.test(url)) {
    src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%233b82f6&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false`;
    height = 166;
  }
  return (
    <div>
      {config.title && (
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-4" style={titleStyle(config.typo)}>{config.title}</h2>
      )}
      <div className="rounded-2xl overflow-hidden border border-border bg-card">
        {src ? <iframe src={src} width="100%" height={height} frameBorder={0} allow="autoplay; encrypted-media" /> :
          <div className="p-6 text-center text-sm text-muted-foreground">Colle un lien Spotify ou SoundCloud.</div>}
      </div>
    </div>
  );
}

/* ─── NEWSLETTER ─── */
function NewsletterWidget({ config }: { config: any }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setLoading(false); setEmail("");
    toast.success(config.success_message || "Merci ! On reste en contact.");
  };
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-8 md:p-12">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-4">
          <Mail className="h-3 w-3" /> Newsletter
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2" style={titleStyle(config.typo)}>{config.title || "Reste informé"}</h2>
        <p className="text-muted-foreground mb-6" style={bodyStyle(config.typo)}>{config.body || "Reçois chaque semaine les meilleures exclus."}</p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={config.placeholder || "ton@email.com"} className="flex-1" />
          <Button type="submit" disabled={loading}>{loading ? "…" : (config.cta_label || "S'inscrire")}</Button>
        </form>
      </div>
    </div>
  );
}

/* ─── COUNTDOWN ─── */
function CountdownWidget({ config }: { config: any }) {
  const target = config.end_date ? new Date(config.end_date).getTime() : Date.now();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
  const units = [["Jours", d], ["Heures", h], ["Min", m], ["Sec", s]] as const;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-card to-primary/10 p-8 md:p-12 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider mb-3">
        <Clock className="h-3 w-3" /> {config.tag || "Bientôt"}
      </div>
      <h2 className="font-display text-3xl md:text-4xl font-bold mb-2" style={titleStyle(config.typo)}>{config.title || "Drop exclusif"}</h2>
      {config.subtitle && <p className="text-muted-foreground mb-6">{config.subtitle}</p>}
      <div className="flex justify-center gap-3 md:gap-6 mt-6 flex-wrap">
        {units.map(([label, value]) => (
          <div key={label} className="min-w-[72px] md:min-w-[96px] rounded-2xl border border-border bg-card/70 backdrop-blur p-4">
            <div className="font-mono font-bold text-3xl md:text-5xl tabular-nums">{String(value).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>
      {config.cta_label && config.cta_url && (
        <Button asChild className="mt-8"><Link to={config.cta_url}>{config.cta_label}</Link></Button>
      )}
    </div>
  );
}

/* ─── PROMO BANNER ─── */
function PromoBannerWidget({ config }: { config: any }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border p-8 md:p-12 flex flex-col md:flex-row items-center gap-6"
      style={{
        background: config.bg_color ? `linear-gradient(135deg, hsl(${config.bg_color}), hsl(${config.bg_color} / 0.7))` : undefined,
        color: config.text_color ? `hsl(${config.text_color})` : undefined,
      }}
    >
      {config.image_url && <img src={config.image_url} alt="" className="w-40 h-40 rounded-2xl object-cover shadow-xl shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider mb-3">
          <Megaphone className="h-3 w-3" /> {config.tag || "Promo"}
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2" style={titleStyle(config.typo)}>{config.title || "Offre limitée"}</h2>
        {config.body && <p className="opacity-80 mb-4">{config.body}</p>}
        {config.cta_label && config.cta_url && (
          <Button asChild variant="secondary"><Link to={config.cta_url}>{config.cta_label}</Link></Button>
        )}
      </div>
    </div>
  );
}

/* ─── STICKY PROMO BANNER (top thin bar with dismiss) ─── */
function StickyPromoWidget({ config }: { config: any }) {
  const storageKey = `dismiss_promo_${config.id || config.title || "default"}`;
  const [open, setOpen] = useState(true);
  useEffect(() => { if (typeof window !== "undefined" && localStorage.getItem(storageKey)) setOpen(false); }, [storageKey]);
  if (!open) return null;
  return (
    <div className="rounded-2xl border border-border flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{ background: config.bg_color ? `hsl(${config.bg_color})` : "hsl(var(--primary))", color: config.text_color ? `hsl(${config.text_color})` : "hsl(var(--primary-foreground))" }}>
      <Megaphone className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate font-medium">{config.title || "Offre limitée"}</span>
      {config.cta_label && config.cta_url && (
        <Link to={config.cta_url} className="underline font-bold whitespace-nowrap">{config.cta_label}</Link>
      )}
      <button onClick={() => { localStorage.setItem(storageKey, "1"); setOpen(false); }} className="opacity-70 hover:opacity-100">
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── HTML ─── */
function HtmlBlockWidget({ config }: { config: any }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 md:p-8 prose prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: config.html || "" }} />
    </div>
  );
}

/* ─── STATS ─── */
function StatsWidget({ config }: { config: any }) {
  const [counts, setCounts] = useState<{ tracks: number; djs: number; downloads: number }>({ tracks: 0, djs: 0, downloads: 0 });
  useEffect(() => {
    if (!config.auto_fetch) return;
    (async () => {
      const [{ count: tracks }, { count: djs }, { data: dl }] = await Promise.all([
        supabase.from("tracks").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("artists").select("id", { count: "exact", head: true }),
        supabase.from("tracks").select("downloads").eq("status", "approved"),
      ]);
      const sum = (dl || []).reduce((s, r: any) => s + (r.downloads || 0), 0);
      setCounts({ tracks: tracks || 0, djs: djs || 0, downloads: sum });
    })();
  }, [config.auto_fetch]);

  const items = (config.items?.length ? config.items : [
    { label: "Tracks", value: config.auto_fetch ? String(counts.tracks) : "1 200+" },
    { label: "DJs", value: config.auto_fetch ? String(counts.djs) : "350+" },
    { label: "Téléchargements", value: config.auto_fetch ? String(counts.downloads) : "50K+" },
  ]);

  return (
    <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 md:p-10">
      {config.title && (
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8" style={titleStyle(config.typo)}>{config.title}</h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {items.map((it: any, i: number) => (
          <div key={i} className="text-center">
            <div className="font-display font-black text-3xl md:text-5xl gradient-text tabular-nums">{it.value}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── LIVE COUNTER (members) ─── */
function LiveCounterWidget({ config }: { config: any }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => setCount(count || 0));
    const ch = supabase.channel("rt-profiles-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => setCount((c) => (c ?? 0) + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return (
    <div className="rounded-3xl border border-border bg-card p-8 md:p-10 text-center relative overflow-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live
      </div>
      <Radio className="h-8 w-8 text-primary mx-auto mb-3" />
      <p className="text-xs uppercase tracking-widest text-muted-foreground" style={bodyStyle(config.typo)}>{config.label || "DJs inscrits en ce moment"}</p>
      <div className="font-display font-black text-5xl md:text-7xl gradient-text tabular-nums mt-2" style={titleStyle(config.typo)}>
        {count === null ? "—" : count.toLocaleString("fr-FR")}
      </div>
      {config.cta_label && config.cta_url && (
        <Button asChild className="mt-6"><Link to={config.cta_url}>{config.cta_label}</Link></Button>
      )}
    </div>
  );
}

/* ─── GENRES CLOUD ─── */
function GenresCloudWidget({ config }: { config: any }) {
  const [genres, setGenres] = useState<{ name: string; count: number }[]>([]);
  useEffect(() => {
    supabase.from("tracks").select("genre").eq("status", "approved").then(({ data }) => {
      const map = new Map<string, number>();
      (data || []).forEach((t: any) => t.genre && map.set(t.genre, (map.get(t.genre) || 0) + 1));
      setGenres([...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, config.limit || 16));
    });
  }, [config.limit]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2" style={titleStyle(config.typo)}>
          <Tag className="h-5 w-5 text-primary" /> {config.title || "Genres"}
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link key={g.name} to={`/tracks?genre=${encodeURIComponent(g.name)}`}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition"
            style={{ fontSize: `${Math.min(1.5, 0.85 + g.count / 50)}rem` }}>
            <span className="font-display font-semibold">{g.name}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{g.count}</span>
          </Link>
        ))}
        {genres.length === 0 && <p className="text-sm text-muted-foreground">Aucun genre disponible.</p>}
      </div>
    </div>
  );
}

/* ─── FEATURED TRACK ─── */
function FeaturedTrackWidget({ config }: { config: any }) {
  const [track, setTrack] = useState<any>(null);
  const { play } = usePlayer();
  useEffect(() => {
    if (config.track_id) {
      supabase.from("tracks").select("*").eq("id", config.track_id).maybeSingle().then(({ data }) => setTrack(data));
    } else {
      supabase.from("tracks").select("*").eq("status", "approved").order("downloads", { ascending: false }).limit(1).then(({ data }) => data?.[0] && setTrack(data[0]));
    }
  }, [config.track_id]);

  if (!track) return null;
  const cover = resolveCover(track);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10">
      {cover && <div className="absolute inset-0 opacity-25 bg-cover bg-center blur-3xl" style={{ backgroundImage: `url(${cover})` }} />}
      <div className="relative shrink-0 mx-auto md:mx-0">
        <img src={cover || "/placeholder.svg"} alt={track.title} className="w-56 h-56 md:w-72 md:h-72 rounded-2xl object-cover shadow-2xl" />
      </div>
      <div className="relative flex-1 flex flex-col justify-center text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-3 self-center md:self-start">
          <Star className="h-3 w-3" /> {config.tag || "Track de la semaine"}
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-black mb-2" style={titleStyle(config.typo)}>{track.title}</h2>
        <p className="text-muted-foreground text-lg mb-4">{track.artist}</p>
        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          <Button size="lg" variant="hero" onClick={() => play(track)}>
            <Play className="mr-1 h-4 w-4" /> Écouter
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to={`/tracks/${track.id}`}>Détails</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── TESTIMONIALS ─── */
function TestimonialsWidget({ config }: { config: any }) {
  const items = config.items || [{ quote: "La meilleure source d'edits du moment.", author: "DJ Example", role: "Club, Paris" }];
  return (
    <div>
      {config.title && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="font-display text-2xl md:text-3xl font-bold" style={titleStyle(config.typo)}>{config.title}</h2>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it: any, i: number) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 relative">
            <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/15" />
            <p className="text-base mb-4">"{it.quote}"</p>
            <div className="flex items-center gap-3">
              {it.avatar && <img src={it.avatar} alt={it.author} className="w-10 h-10 rounded-full object-cover" />}
              <div>
                <p className="font-semibold text-sm">{it.author}</p>
                {it.role && <p className="text-xs text-muted-foreground">{it.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── VIDEO TESTIMONIAL ─── */
function VideoTestimonialWidget({ config }: { config: any }) {
  const url = config.video_url || "";
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/);
  const embed = yt ? `https://www.youtube.com/embed/${yt[1]}` : url;
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 md:p-10">
      <div className="rounded-2xl overflow-hidden border border-border aspect-video bg-black">
        {embed ? <iframe src={embed} className="w-full h-full" allowFullScreen /> : <div className="p-6 text-sm text-muted-foreground">URL vidéo manquante</div>}
      </div>
      <div>
        <Quote className="h-10 w-10 text-primary/30 mb-3" />
        <p className="text-xl md:text-2xl font-display font-semibold mb-6" style={titleStyle(config.typo)}>
          "{config.quote || "Le pool indispensable de mes sets."}"
        </p>
        <div className="flex items-center gap-3">
          {config.avatar && <img src={config.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />}
          <div>
            <p className="font-bold">{config.author || "DJ Example"}</p>
            <p className="text-xs text-muted-foreground">{config.role || "Résident, Paris"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FAQ ─── */
function FaqWidget({ config }: { config: any }) {
  const items = config.items || [];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 justify-center">
        <HelpCircle className="h-6 w-6 text-primary" />
        <h2 className="font-display text-2xl md:text-3xl font-bold" style={titleStyle(config.typo)}>{config.title || "Questions fréquentes"}</h2>
      </div>
      <div className="space-y-2">
        {items.map((it: any, i: number) => {
          const isOpen = open === i;
          return (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition">
                <span className="font-semibold">{it.question}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">{it.answer}</div>}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center">Aucune question configurée.</p>}
      </div>
    </div>
  );
}

/* ─── LOGOS STRIP ─── */
function LogosStripWidget({ config }: { config: any }) {
  const logos = config.logos || [];
  return (
    <div className="text-center">
      {config.title && (
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6" style={bodyStyle(config.typo)}>{config.title}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-70">
        {logos.map((l: any, i: number) => (
          <a key={i} href={l.url || "#"} target={l.url ? "_blank" : undefined} rel="noreferrer" className="hover:opacity-100 opacity-60 transition">
            <img src={l.image_url} alt={l.alt || ""} className="h-8 md:h-10 object-contain grayscale hover:grayscale-0 transition" />
          </a>
        ))}
        {logos.length === 0 && <p className="text-sm text-muted-foreground">Ajoute des logos partenaires.</p>}
      </div>
    </div>
  );
}

/* ─── DIVIDER ─── */
function DividerWidget({ config }: { config: any }) {
  if (config.style === "spacer") return <div style={{ height: `${config.height || 40}px` }} />;
  if (config.style === "gradient") {
    return <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />;
  }
  return (
    <div className="flex items-center gap-4 text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      {config.label ? <span className="text-xs uppercase tracking-widest">{config.label}</span> : <Minus className="h-4 w-4" />}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── TWO COLUMNS ─── */
function TwoColumnsWidget({ config }: { config: any }) {
  const reversed = config.image_position === "right";
  return (
    <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${reversed ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div className="rounded-3xl overflow-hidden border border-border aspect-video md:aspect-square bg-muted">
        {config.image_url ? (
          <img src={config.image_url} alt={config.title || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Ajoute une image</div>
        )}
      </div>
      <div>
        {config.eyebrow && <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">{config.eyebrow}</p>}
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4" style={titleStyle(config.typo)}>{config.title || "Titre"}</h2>
        {config.body && <p className="text-muted-foreground whitespace-pre-line mb-6" style={bodyStyle(config.typo)}>{config.body}</p>}
        {config.cta_label && (
          <Button asChild variant="hero">
            <Link to={config.cta_url || "#"}>{config.cta_label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── SLIDES CAROUSEL (fullscreen-style) ─── */
function SlidesCarouselWidget({ config, preview }: { config: any; preview: boolean }) {
  const slides = config.slides || [];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length < 2 || !config.autoplay) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), (config.duration || 5) * 1000);
    return () => clearInterval(id);
  }, [slides.length, config.autoplay, config.duration]);
  if (slides.length === 0) return <div className="p-12 text-center text-muted-foreground border border-dashed rounded-2xl">Ajoute des slides.</div>;
  const s = slides[idx];
  return (
    <div className={`relative overflow-hidden rounded-3xl ${preview ? "aspect-[16/8]" : "aspect-[16/7] md:aspect-[16/6]"} bg-card border border-border`}>
      <AnimatePresence mode="wait">
        <motion.div key={idx}
          initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}
          className="absolute inset-0">
          {s.image_url && <img src={s.image_url} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 text-white">
            {s.eyebrow && <span className="text-xs uppercase tracking-widest text-primary font-bold mb-2">{s.eyebrow}</span>}
            <h2 className="font-display text-3xl md:text-5xl font-black mb-3 max-w-3xl" style={titleStyle(config.typo)}>{s.title}</h2>
            {s.body && <p className="text-base md:text-lg max-w-2xl opacity-90 mb-5">{s.body}</p>}
            {s.cta_label && s.cta_url && (
              <Button asChild variant="hero" className="self-start"><Link to={s.cta_url}>{s.cta_label}</Link></Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {slides.map((_: any, i: number) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-3 bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── IMAGE GALLERY (masonry-ish grid) ─── */
function ImageGalleryWidget({ config }: { config: any }) {
  const images = config.images || [];
  return (
    <div>
      {config.title && (
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-6" style={titleStyle(config.typo)}>{config.title}</h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((im: any, i: number) => (
          <a key={i} href={im.url || im.image_url} target="_blank" rel="noreferrer" className="block group">
            <div className={`rounded-2xl overflow-hidden border border-border ${i % 5 === 0 ? "aspect-square" : "aspect-[4/3]"}`}>
              <img src={im.image_url} alt={im.alt || ""} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
            </div>
          </a>
        ))}
        {images.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Ajoute des images.</p>}
      </div>
    </div>
  );
}

/* ─── MARQUEE ─── */
function MarqueeWidget({ config }: { config: any }) {
  const items = (config.items || "FRESH · NEW · HOT · EXCLUSIVE · 100% DJ").split("·").filter(Boolean);
  return (
    <div className="relative overflow-hidden border-y border-border py-3 bg-card">
      <div className="flex gap-12 whitespace-nowrap animate-[marquee_30s_linear_infinite] will-change-transform">
        {[...items, ...items, ...items].map((s, i) => (
          <span key={i} className="font-display font-black text-xl md:text-3xl tracking-tighter flex items-center gap-12" style={titleStyle(config.typo)}>
            <span>{s.trim()}</span>
            <Sparkles className="h-5 w-5 text-primary inline" />
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}

/* ─── PLANS COMPARE ─── */
function PlansCompareWidget({ config }: { config: any }) {
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setPlans(data || []));
  }, []);
  return (
    <div>
      {config.title && (
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-3" style={titleStyle(config.typo)}>{config.title}</h2>
      )}
      {config.subtitle && <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">{config.subtitle}</p>}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p, i) => {
          const highlight = config.highlight_slug ? p.slug === config.highlight_slug : i === 1;
          return (
            <div key={p.id} className={`relative rounded-3xl border p-6 md:p-8 ${highlight ? "border-primary bg-gradient-to-br from-primary/20 via-card to-accent/15 shadow-2xl scale-[1.02]" : "border-border bg-card"}`}>
              {highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Recommandé</Badge>}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <p className="text-muted-foreground text-sm mb-5">{p.description}</p>
              <div className="mb-6">
                <span className="font-display font-black text-4xl">{(p.price_cents / 100).toFixed(0)}€</span>
                <span className="text-sm text-muted-foreground">/{p.interval === "month" ? "mois" : "an"}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {(p.features || []).map((f: string, j: number) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" variant={highlight ? "hero" : "outline"}>
                <Link to="/pricing">Choisir</Link>
              </Button>
            </div>
          );
        })}
        {plans.length === 0 && <p className="text-sm text-muted-foreground text-center col-span-full">Configure tes plans dans l'admin.</p>}
      </div>
    </div>
  );
}

/* Badge imported at top */

/* ─── FEATURES GRID ─── */
function FeaturesGridWidget({ config }: { config: any }) {
  const items = config.items || [];
  const iconMap: Record<string, any> = {
    Download, Music, Music2, Play, Pause, ListMusic, Mic2, Volume2, Volume1, VolumeX,
    Star, Headphones, Sparkles, Radio, Disc, Disc3, DiscAlbum, Mail, Clock, Check, CheckCircle, CheckCircle2,
    Heart, TrendingUp, BarChart3, Globe, Lock, Unlock, User, Users, Calendar, Tag, Search, Filter,
    Settings, Bell, MessageCircle, Share2, Link: LinkIcon, ExternalLink, FileAudio, Video, Camera, Image: ImageIcon, Layers, LayoutGrid,
    Columns3, LayoutTemplate, Monitor, Smartphone, Wifi, Award, Crown, ThumbsUp, Eye,
    Shield, ShieldCheck, Zap, AlertCircle, Info, HelpCircle, Minus, Plus, ArrowRight, ArrowLeft,
    X: XIcon, Trash2, Pencil, Copy, Save, RefreshCw, SlidersHorizontal,
    Hash, Bookmark, Flag, MapPin, Phone, ShoppingCart, CreditCard, Truck,
    Package, Gift, Percent, DollarSign, Euro, ArrowUpRight, Briefcase,
    Building2, Headset, Keyboard, MousePointerClick, Palette, Wand2,
    Code2, Terminal, Fingerprint, ScanFace, Cloud, CloudDownload,
    Database, Server, HardDrive, Cpu, WifiOff, Globe2, Landmark,
    Megaphone: MegaphoneIcon, Tv, Film, Clapperboard, CirclePlay,
    Aperture, Sun, Moon, Flame, Snowflake, Leaf, TreePine, Mountain,
    Anchor, Compass, Sailboat, Ship, Plane, Car, Bike, Bus, TrainFront,
    Ticket, Map: MapIcon, Pin: PinIcon, Navigation, BookOpen, BookMarked, Library,
    GraduationCap, School, PenTool, Ruler, Calculator, Scissors,
    Paintbrush, PencilRuler, Drum, Guitar, Piano, Mic, Speaker,
  };
  return (
    <div>
      {config.title && (
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-3" style={titleStyle(config.typo)}>{config.title}</h2>
      )}
      {config.subtitle && <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">{config.subtitle}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it: any, i: number) => {
          const Ic = iconMap[it.icon || "Sparkles"] || Sparkles;
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                <Ic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-1">{it.title}</h3>
              <p className="text-sm text-muted-foreground">{it.body}</p>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center">Ajoute des features.</p>}
      </div>
    </div>
  );
}

/* ─── BLOG CARDS ─── */
function BlogCardsWidget({ config }: { config: any }) {
  const items = config.items || [];
  return (
    <div>
      {config.title && (
        <div className="flex items-center gap-3 mb-6">
          <Newspaper className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl md:text-3xl font-bold" style={titleStyle(config.typo)}>{config.title}</h2>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it: any, i: number) => (
          <Link key={i} to={it.url || "#"} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/60 transition">
            {it.image_url && (
              <div className="aspect-video overflow-hidden">
                <img src={it.image_url} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
            )}
            <div className="p-5">
              {it.category && <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">{it.category}</p>}
              <h3 className="font-display text-lg font-bold mb-2 group-hover:text-primary transition">{it.title}</h3>
              {it.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{it.excerpt}</p>}
              {it.date && <p className="text-xs text-muted-foreground mt-3">{it.date}</p>}
            </div>
          </Link>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center">Ajoute des articles.</p>}
      </div>
    </div>
  );
}

/* ─── TEAM GRID ─── */
function TeamGridWidget({ config }: { config: any }) {
  const items = config.items || [];
  return (
    <div>
      {config.title && (
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8" style={titleStyle(config.typo)}>{config.title}</h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {items.map((m: any, i: number) => (
          <div key={i} className="text-center">
            <div className="aspect-square rounded-2xl overflow-hidden border border-border mb-3">
              {m.avatar ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" /> :
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl font-bold">{m.name?.[0]}</div>}
            </div>
            <p className="font-bold">{m.name}</p>
            <p className="text-xs text-muted-foreground">{m.role}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center">Ajoute des membres.</p>}
      </div>
    </div>
  );
}

/* ─── INSTAGRAM FEED (static cards, no API) ─── */
function InstagramFeedWidget({ config }: { config: any }) {
  const items = config.items || [];
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Instagram className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl md:text-3xl font-bold" style={titleStyle(config.typo)}>{config.title || "Sur Instagram"}</h2>
        </div>
        {config.handle && (
          <a href={`https://instagram.com/${config.handle.replace("@", "")}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">@{config.handle.replace("@", "")}</a>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {items.map((it: any, i: number) => (
          <a key={i} href={it.url || "#"} target="_blank" rel="noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-border group relative">
            <img src={it.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Instagram className="h-6 w-6 text-white" />
            </div>
          </a>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center">Ajoute des posts.</p>}
      </div>
    </div>
  );
}
