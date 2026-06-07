import React, { useEffect, useMemo, useState } from "react";
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
import { sanitizeHtml } from "@/lib/sanitizeHtml";
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
  containerStyle, shellStyle, alignYClass,
  itemStyle, itemClasses, itemCssVars, LAYOUT_DENSITY_CLASS,
  type WidgetCommon,
} from "@/lib/widgetCommon";
import DjShortsWidget from "@/components/DjShortsWidget";
import TopDownloadsPeriod from "@/components/widgets/TopDownloadsPeriod";
import TrendingArtists from "@/components/widgets/TrendingArtists";
import FeaturedGenres from "@/components/widgets/FeaturedGenres";
import WelcomeBanner from "@/components/widgets/WelcomeBanner";
import PlaylistsCarousel from "@/components/widgets/PlaylistsCarousel";
import DjCharts from "@/components/widgets/DjCharts";
import MostFavorited from "@/components/widgets/MostFavorited";
import RecentlyPlayed from "@/components/widgets/RecentlyPlayed";
import EditorialFrame from "@/components/widgets/EditorialFrame";
import WidgetSkeleton from "@/components/widgets/WidgetSkeleton";
import WidgetEmptyState from "@/components/widgets/WidgetEmptyState";
import WidgetHeader from "@/components/widgets/WidgetHeader";
import { HeaderActions, Segmented } from "@/components/widgets/WidgetHeaderActions";
import SectionShell, { gridClassesForLayout, type SectionLayout } from "@/components/widgets/SectionShell";
import ColumnShell from "@/components/widgets/ColumnShell";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import ArtistCredit from "@/components/ArtistCredit";

export interface Widget {
  id: string;
  type: string;
  position: number;
  config: Record<string, any> & { common?: WidgetCommon };
  is_active: boolean;
  audience?: string | null;
  devices?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  /** Parent dans la hiérarchie Section → Colonne → Widget (NULL = racine). */
  parent_id?: string | null;
  /** 0 = racine, 1 = colonne, 2 = widget enfant (informatif, indexé en DB). */
  depth?: number;
}

interface Props {
  widgets?: Widget[];
  preview?: boolean;
}

/** Decide whether the current viewer matches the widget's targeting rules. */
function matchesTargeting(
  w: Widget,
  ctx: { isMobile: boolean; isLogged: boolean; hasSub: boolean; preview: boolean }
): boolean {
  if (ctx.preview) return true;
  // Date window
  const now = Date.now();
  if (w.starts_at && new Date(w.starts_at).getTime() > now) return false;
  if (w.ends_at && new Date(w.ends_at).getTime() < now) return false;
  // Device
  const dev = w.devices || "all";
  if (dev === "mobile" && !ctx.isMobile) return false;
  if (dev === "desktop" && ctx.isMobile) return false;
  // Audience
  const aud = w.audience || "all";
  if (aud === "anon" && ctx.isLogged) return false;
  if (aud === "registered" && !ctx.isLogged) return false;
  if (aud === "subscribed" && !ctx.hasSub) return false;
  return true;
}

export default function HomeWidgets({ widgets: propWidgets, preview = false }: Props) {
  const [widgets, setWidgets] = useState<Widget[]>(propWidgets ?? []);
  const { user, hasActiveSubscription } = useAuth();
  const isMobile = useIsMobile();

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

  // Visibilité ancêtre-aware : un widget n'est visible que si lui ET tous
  // ses ancêtres (colonne, section) passent le ciblage. Ainsi désactiver
  // une section masque automatiquement ses colonnes/widgets enfants.
  const visible = useMemo(() => {
    const all = widgets;
    const byIdAll = new Map<string, Widget>();
    for (const w of all) byIdAll.set(w.id, w);
    const ctx = {
      isMobile,
      isLogged: !!user,
      hasSub: hasActiveSubscription,
      preview,
    };
    const cache = new Map<string, boolean>();
    const passes = (w: Widget): boolean => {
      if (cache.has(w.id)) return cache.get(w.id)!;
      if (!w.is_active) { cache.set(w.id, false); return false; }
      if (!matchesTargeting(w, ctx)) { cache.set(w.id, false); return false; }
      if (w.parent_id) {
        const parent = byIdAll.get(w.parent_id);
        if (!parent) { cache.set(w.id, false); return false; }
        const ok = passes(parent);
        cache.set(w.id, ok);
        return ok;
      }
      cache.set(w.id, true);
      return true;
    };
    return all.filter(passes);
  }, [widgets, isMobile, user, hasActiveSubscription, preview]);

  if (visible.length === 0) return null;

  /* ─── Tree-aware rendering : Section → Colonne → Widget ─── */

  // Enfants par parent (triés par position)
  const childrenOf = new Map<string | null, Widget[]>();
  for (const w of visible) {
    const key = w.parent_id ?? null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(w);
    childrenOf.set(key, arr);
  }
  for (const arr of childrenOf.values()) {
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  // Racines = parent_id null, hors colonnes orphelines
  const roots = (childrenOf.get(null) ?? []).filter((w) => w.type !== "column");

  // Rend les widgets enfants d'une colonne (ou directs d'une section).
  const renderLeafChildren = (parent: Widget): React.ReactNode[] => {
    const kids = (childrenOf.get(parent.id) ?? []).filter(
      (c) => c.type !== "column" && c.type !== "section"
    );
    return kids.map((child) => (
      <WidgetWrapper key={child.id} widget={child} preview={preview} />
    ));
  };

  const renderSection = (section: Widget): React.ReactNode => {
    const cfg = (section.config ?? {}) as any;
    const layout: SectionLayout = (cfg.layout ?? "1") as SectionLayout;
    const stackAt: "md" | "lg" = cfg.stack_at ?? "md";
    const { spans } = gridClassesForLayout(layout, stackAt);

    const cols = (childrenOf.get(section.id) ?? []).filter((c) => c.type === "column");
    const orphanChildren = (childrenOf.get(section.id) ?? []).filter(
      (c) => c.type !== "column" && c.type !== "section"
    );

    const renderedCols: React.ReactNode[] = cols.map((col, idx) => {
      const colCfg = (col.config ?? {}) as any;
      const spanOverride: number | undefined = colCfg.span;
      const baseSpan = spans[idx] ?? spans[spans.length - 1] ?? "col-span-1";
      const overrideMap: Record<string, string> = {
        "md-1": "col-span-1 md:col-span-1",
        "md-2": "col-span-1 md:col-span-2",
        "md-3": "col-span-1 md:col-span-3",
        "md-4": "col-span-1 md:col-span-4",
        "lg-1": "col-span-1 lg:col-span-1",
        "lg-2": "col-span-1 lg:col-span-2",
        "lg-3": "col-span-1 lg:col-span-3",
        "lg-4": "col-span-1 lg:col-span-4",
      };
      const spanClass =
        spanOverride && spanOverride >= 1 && spanOverride <= 4
          ? overrideMap[`${stackAt}-${spanOverride}`] ?? baseSpan
          : baseSpan;
      const children = renderLeafChildren(col);
      if (children.length === 0) return null;
      return (
        <ColumnShell key={col.id} config={colCfg} spanClass={spanClass} preview={preview}>
          {children}
        </ColumnShell>
      );
    });

    // Fallback : widgets posés directement dans la section (sans colonne) →
    // empilés dans une colonne implicite pleine largeur en fin de grille.
    if (orphanChildren.length > 0) {
      const fallbackSpan = stackAt === "lg" ? "col-span-1 lg:col-span-full" : "col-span-1 md:col-span-full";
      renderedCols.push(
        <ColumnShell
          key={`${section.id}-implicit`}
          config={{}}
          spanClass={fallbackSpan}
          preview={preview}
        >
          {orphanChildren.map((c) => (
            <WidgetWrapper key={c.id} widget={c} preview={preview} />
          ))}
        </ColumnShell>
      );
    }

    return (
      <SectionShell key={section.id} config={cfg} columns={renderedCols} preview={preview} />
    );
  };

  // Pour les racines non-section, conserver le legacy col_span grouping.
  type Row =
    | { kind: "section"; w: Widget }
    | { kind: "node"; w: Widget }
    | { kind: "group"; span: 1 | 3; items: Widget[] };
  const rows: Row[] = [];
  for (const w of roots) {
    if (w.type === "section") {
      rows.push({ kind: "section", w });
      continue;
    }
    const raw = (w.config as any)?.col_span;
    const span: 1 | 2 | 3 = raw === 1 ? 1 : raw === 3 ? 3 : 2;
    if (span === 2) {
      rows.push({ kind: "node", w });
    } else {
      const max = span === 1 ? 2 : 3;
      const last = rows[rows.length - 1];
      if (last && last.kind === "group" && last.span === span && last.items.length < max) {
        last.items.push(w);
      } else {
        rows.push({ kind: "group", span, items: [w] });
      }
    }
  }

  return (
    <div className={preview ? "space-y-4" : "space-y-4 md:space-y-6"}>
      {rows.map((row, i) => {
        if (row.kind === "section") return renderSection(row.w);
        if (row.kind === "node") {
          return <WidgetWrapper key={row.w.id} widget={row.w} preview={preview} />;
        }
        return (
          <div
            key={`grp-${i}`}
            className={`grid gap-4 md:gap-6 grid-cols-1 ${
              row.span === 1 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {row.items.map((w) => (
              <WidgetWrapper key={w.id} widget={w} preview={preview} />
            ))}
          </div>
        );
      })}
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
    <div
      className={`${CONTAINER_CLASS[containerKey]} ${padX} relative z-10`}
      style={containerStyle(common)}
    >
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
      className={`relative ${padY} ${alignYClass(common)} ${hasBg ? "overflow-hidden" : ""}`}
      style={shellStyle(common)}
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
    case "top_downloads_period": return <TopDownloadsPeriod config={widget.config} />;
    case "trending_artists": return <TrendingArtists config={widget.config} />;
    case "featured_genres":  return <FeaturedGenres config={widget.config} />;
    case "welcome_banner":   return <WelcomeBanner config={widget.config} />;
    case "playlists_carousel": return <PlaylistsCarousel config={widget.config} />;
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
    case "dj_charts":        return <DjCharts config={widget.config} />;
    case "most_favorited":   return <MostFavorited config={widget.config} />;
    case "recently_played":  return <RecentlyPlayed config={widget.config} />;
    default: return null;
  }
}


/* ─── HERO (Éditorial haut contraste) ─── */
function HeroWidget({ config, preview }: { config: any; preview: boolean }) {
  const layout = config.layout || "center";
  const height =
    config.height === "compact"
      ? "py-16 md:py-20"
      : config.height === "full"
      ? "py-28 md:py-40"
      : "py-20 md:py-32";
  const overlay = config.overlay_opacity ?? 75;
  const isCenter = layout === "center";

  return (
    <div className="relative overflow-hidden bg-background selection:bg-accent selection:text-accent-foreground">
      {/* Optional background image */}
      {config.bg_url && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${config.bg_url})` }}
          aria-hidden
        />
      )}

      {/* Background fade → site background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: `linear-gradient(to bottom, hsl(var(--background) / ${Math.max(
            0,
            overlay - 30,
          ) / 100}) 0%, hsl(var(--background) / ${overlay / 100}) 55%, hsl(var(--background)) 100%)`,
        }}
      />

      {/* Ambient gradient blobs */}
      <motion.div
        aria-hidden
        className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-[160px]"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-[160px]"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Dot grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Decorative side wordmarks (only when centered + non-preview) */}
      {isCenter && !preview && (
        <>
          <div
            aria-hidden
            className="hidden xl:block absolute right-[-3rem] top-1/2 -rotate-90 origin-center pointer-events-none font-display text-foreground/[0.04] text-9xl tracking-[0.5em] select-none"
          >
            POOL
          </div>
          <div
            aria-hidden
            className="hidden xl:block absolute left-[-3rem] top-1/2 rotate-90 origin-center pointer-events-none font-display text-foreground/[0.04] text-9xl tracking-[0.5em] select-none"
          >
            FRANCE
          </div>
        </>
      )}

      <div
        className={`relative container ${preview ? "py-12" : height} ${
          layout === "left"
            ? "text-left"
            : layout === "split"
            ? "grid md:grid-cols-2 gap-12 items-center text-left"
            : "text-center flex flex-col items-center"
        }`}
      >
        <div
          className={
            layout === "left"
              ? "max-w-3xl"
              : layout === "split"
              ? "max-w-2xl"
              : "max-w-5xl mx-auto flex flex-col items-center"
          }
        >
          {/* Eyebrow chip — glass pill with pulse dot */}
          {config.eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`mb-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-foreground/10 bg-foreground/[0.04] backdrop-blur-md ${
                isCenter ? "" : ""
              }`}
            >
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-foreground/80">
                {config.eyebrow}
              </span>
            </motion.div>
          )}

          {/* Headline — massive Bebas with accent line crossing */}
          {(config.title || config.highlight) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative"
            >
              <h1
                className={`font-display font-black tracking-tight uppercase leading-[0.85] break-words ${
                  preview
                    ? "text-5xl"
                    : "text-6xl sm:text-8xl md:text-[9rem] lg:text-[12rem] xl:text-[14rem]"
                }`}
                style={titleStyle(config.typo)}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/20 drop-shadow-2xl">
                  {config.title}
                  {config.title && config.highlight && " "}
                  {config.highlight}
                </span>
              </h1>
              <div
                aria-hidden
                className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
              />
            </motion.div>
          )}

          {/* Sub copy */}
          {config.subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className={`${preview ? "mt-6 text-base" : "mt-10 md:mt-12 text-lg md:text-2xl"} font-light leading-relaxed text-foreground/70 max-w-xl ${
                isCenter ? "mx-auto" : ""
              }`}
              style={bodyStyle(config.typo)}
            >
              {config.subtitle}
            </motion.p>
          )}

          {/* CTAs — square primary with accent corner */}
          {(config.cta_primary_label || config.cta_secondary_label) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className={`mt-10 flex flex-wrap items-center gap-4 ${
                isCenter ? "justify-center" : ""
              }`}
            >
              {config.cta_primary_label && (
                <Link
                  to={config.cta_primary_url || "/new"}
                  className="group relative inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 shadow-[0_20px_50px_hsl(var(--primary)/0.35)]"
                >
                  <span>{config.cta_primary_label}</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 h-2 w-2 bg-accent"
                  />
                </Link>
              )}
              {config.cta_secondary_label && (
                <Link
                  to={config.cta_secondary_url || "/pricing"}
                  className="group inline-flex items-center gap-2 px-6 py-5 text-foreground/80 hover:text-foreground font-bold uppercase tracking-[0.2em] text-sm transition-colors"
                >
                  <span className="relative after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-foreground after:transition-transform after:duration-300 group-hover:after:origin-left group-hover:after:scale-x-100">
                    {config.cta_secondary_label}
                  </span>
                </Link>
              )}
            </motion.div>
          )}

          {/* Trust badges */}
          {config.trust_badges?.length ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={`flex flex-wrap gap-x-6 gap-y-2 mt-10 text-xs uppercase tracking-[0.2em] text-foreground/50 font-semibold ${
                isCenter ? "justify-center" : ""
              }`}
            >
              {config.trust_badges.map((b: string, i: number) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-accent" /> {b}
                </span>
              ))}
            </motion.div>
          ) : null}
        </div>

        {layout === "split" && config.bg_url && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden md:block relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-accent/20 blur-2xl" aria-hidden />
            <img
              src={config.bg_url}
              alt=""
              className="relative w-full aspect-[4/5] object-cover shadow-2xl"
            />
            <span aria-hidden className="absolute -top-2 -right-2 h-3 w-3 bg-accent" />
          </motion.div>
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
  const wordmark = config.sort_by === "popular" ? "TOP" : config.sort_by === "alphabetical" ? "A→Z" : "NEW";
  const kicker = config.sort_by === "popular" ? "POPULAIRES" : config.sort_by === "alphabetical" ? "CATALOGUE" : "NOUVEAUTÉS";
  const eyebrow = config.sort_by === "popular" ? "Tendances" : config.sort_by === "alphabetical" ? "Catalogue" : "Sorties";

  const tabOptions = tabsEnabled && genres.length > 0
    ? [{ id: "__all__", label: "Tous" }, ...genres.map((g) => ({ id: g, label: g }))]
    : [];

  return (
    <EditorialFrame wordmark={wordmark} kicker={kicker}>
      <WidgetHeader
        icon={Icon}
        eyebrow={eyebrow}
        title={config.title || "Tracks"}
        subtitle={config.subtitle}
        seeAllUrl={config.see_all_url}
        typo={config.typo}
        preview={preview}
        right={
          tabsEnabled && tabOptions.length > 0 ? (
            <HeaderActions>
              <div className="max-w-[min(70vw,520px)] overflow-x-auto scrollbar-none">
                <Segmented<string>
                  ariaLabel="Filtre par genre"
                  value={activeGenre ?? "__all__"}
                  onChange={(v) => setActiveGenre(v === "__all__" ? null : v)}
                  options={tabOptions}
                />
              </div>
            </HeaderActions>
          ) : undefined
        }
      />

      {loading ? (
        <WidgetSkeleton variant="list" count={Math.min(config.limit || 8, 6)} />
      ) : tracks.length === 0 ? (
        <WidgetEmptyState
          icon={Icon}
          title={activeGenre ? `Aucun titre en « ${activeGenre} »` : "Aucun titre à afficher"}
          message={
            activeGenre
              ? "Essaie un autre genre ou explore l'intégralité du catalogue."
              : "Les morceaux apparaîtront ici dès qu'ils seront publiés."
          }
          ctaLabel="Voir tout le catalogue"
          ctaUrl={config.see_all_url || "/new"}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
          <TrackListHeader />
          {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}
        </div>
      )}
    </EditorialFrame>
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
      <WidgetHeader
        icon={TrendingUp}
        eyebrow="Genre populaire"
        title={config.title || `Top ${genre}`}
        subtitle={config.subtitle}
        seeAllUrl={`/tracks?genre=${encodeURIComponent(genre)}`}
        typo={config.typo}
        preview={preview}
      />
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
    let q = supabase.from("artists").select("id, name, slug, photo_url, roles");
    if (config.featured_only) q = q.eq("featured", true);
    if (config.kind === "remixer" || config.kind === "artist") q = (q as any).contains("roles", [config.kind === "artist" ? "dj" : config.kind]);
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
            to={`/artists/${dj.slug}`}
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
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(config.html) }} />
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
  const { hasActiveSubscription } = useAuth();
  useEffect(() => {
    if (config.track_id) {
      supabase.from("tracks").select("*").eq("id", config.track_id).maybeSingle().then(({ data }) => setTrack(data));
    } else {
      supabase.from("tracks").select("*").eq("status", "approved").order("downloads", { ascending: false }).limit(1).then(({ data }) => data?.[0] && setTrack(data[0]));
    }
  }, [config.track_id]);

  if (!track) return null;
  const cover = resolveCover(track);
  const playbackSrc = hasActiveSubscription
    ? (track.audio_url || track.preview_url)
    : (track.preview_url || track.audio_url);
  const handlePlay = () => {
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverUrl: cover,
      previewUrl: playbackSrc,
      isFull: hasActiveSubscription && !!track.audio_url,
    });
  };
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
        <p className="text-muted-foreground text-lg mb-4">
          <ArtistCredit name={track.artist} artistSlug={(track as any).artist_slug} />
        </p>
        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          <Button size="lg" variant="hero" onClick={handlePlay}>
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
