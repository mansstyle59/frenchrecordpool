import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail, Clock, Megaphone, Users, Code as CodeIcon, Sparkles, Play,
  Music2, Headphones, ArrowRight, BarChart3, Tag, Star, HelpCircle,
  ChevronDown, Minus, Quote,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import TrackRow from "@/components/TrackRow";
import { resolveCover } from "@/lib/trackCover";
import { usePlayer } from "@/contexts/PlayerContext";
import { titleStyle, bodyStyle } from "@/lib/widgetTypography";


export interface Widget {
  id: string;
  type: string;
  position: number;
  config: Record<string, any>;
  is_active: boolean;
}

interface Props {
  /** Pre-loaded widgets (used by admin preview). If undefined, fetch active widgets. */
  widgets?: Widget[];
  /** Disable links/interactions (preview mode) */
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
    <div className={preview ? "space-y-8" : "space-y-12 md:space-y-16"}>
      {widgets.map((w) => (
        <WidgetWrapper key={w.id} widget={w} preview={preview} />
      ))}
    </div>
  );
}

function WidgetWrapper({ widget, preview }: { widget: Widget; preview: boolean }) {
  // Hero widget is full-width, others get container
  if (widget.type === "hero") {
    return <HeroWidget config={widget.config} preview={preview} />;
  }
  return (
    <section className="container">
      <WidgetRenderer widget={widget} preview={preview} />
    </section>
  );
}

function WidgetRenderer({ widget, preview }: { widget: Widget; preview: boolean }) {
  switch (widget.type) {
    case "hero":             return <HeroWidget config={widget.config} preview={preview} />;
    case "track_grid":       return <TrackGridWidget config={widget.config} preview={preview} />;
    case "artist_carousel":  return <ArtistCarouselWidget config={widget.config} />;
    case "cta":              return <CtaWidget config={widget.config} />;
    case "rich_text":        return <RichTextWidget config={widget.config} />;
    case "video_embed":      return <VideoEmbedWidget config={widget.config} />;
    case "newsletter":       return <NewsletterWidget config={widget.config} />;
    case "countdown":        return <CountdownWidget config={widget.config} />;
    case "promo_banner":     return <PromoBannerWidget config={widget.config} />;
    case "top_djs":          return <ArtistCarouselWidget config={{ ...widget.config, featured_only: true }} />;
    case "html_block":       return <HtmlBlockWidget config={widget.config} />;
    case "stats":            return <StatsWidget config={widget.config} />;
    case "genres_cloud":     return <GenresCloudWidget config={widget.config} />;
    case "featured_track":   return <FeaturedTrackWidget config={widget.config} />;
    case "testimonials":     return <TestimonialsWidget config={widget.config} />;
    case "faq":              return <FaqWidget config={widget.config} />;
    case "logos_strip":      return <LogosStripWidget config={widget.config} />;
    case "divider":          return <DividerWidget config={widget.config} />;
    case "two_columns":      return <TwoColumnsWidget config={widget.config} />;
    default: return null;
  }
}


/* ─── HERO ─── */
function HeroWidget({ config, preview }: { config: any; preview: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {config.bg_url && (
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${config.bg_url})` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/90 to-background" />
      <motion.div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/30 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/30 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 10, repeat: Infinity }} />

      <div className={`relative container ${preview ? "py-10" : "py-20 md:py-32"} text-center`}>
        {config.eyebrow && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-5">
            <Sparkles className="h-3 w-3" /> {config.eyebrow}
          </span>
        )}
        <h1 className={`font-display font-black tracking-tight ${preview ? "text-3xl" : "text-5xl md:text-7xl"} mb-4`} style={titleStyle(config.typo)}>
          {config.title || "Le pool de musique des DJs"}
          {config.highlight && (
            <> <span className="gradient-text">{config.highlight}</span></>
          )}
        </h1>
        {config.subtitle && (
          <p className={`text-muted-foreground mx-auto ${preview ? "text-sm max-w-xl" : "text-lg md:text-xl max-w-2xl"} mb-8`} style={bodyStyle(config.typo)}>
            {config.subtitle}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {config.cta_primary_label && (
            <Button asChild size={preview ? "default" : "lg"} variant="hero">
              <Link to={config.cta_primary_url || "/new"}>
                {config.cta_primary_label} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
          {config.cta_secondary_label && (
            <Button asChild size={preview ? "default" : "lg"} variant="outline">
              <Link to={config.cta_secondary_url || "/pricing"}>{config.cta_secondary_label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── TRACK GRID ─── */
function TrackGridWidget({ config, preview }: { config: any; preview: boolean }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const { play } = usePlayer();

  useEffect(() => {
    let q = supabase.from("tracks").select("*").eq("status", "approved");
    const sort = config.sort_by || "recent";
    if (sort === "popular") q = q.order("downloads", { ascending: false });
    else if (sort === "alphabetical") q = q.order("title", { ascending: true });
    else q = q.order("release_date", { ascending: false }).order("created_at", { ascending: false });

    if (config.genre)    q = q.eq("genre", config.genre);
    if (config.tag)      q = q.contains("tags", [config.tag]);

    q.limit(Math.min(config.limit || 8, 24)).then(({ data }) => {
      if (data) setTracks(data);
    });
  }, [config.sort_by, config.genre, config.tag, config.limit]);

  if (tracks.length === 0) return null;

  const Icon = config.sort_by === "popular" ? Headphones : Music2;
  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent shrink-0" />
          <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 truncate">
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
      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} />
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
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
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
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-accent/15 p-10 md:p-14 text-center"
    >
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative">
        <h2 className="font-display text-3xl md:text-5xl font-black mb-3">
          {config.title || "Prêt à jouer en live ?"}
        </h2>
        {config.body && <p className="text-muted-foreground md:text-lg mb-6 max-w-2xl mx-auto">{config.body}</p>}
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
    </motion.div>
  );
}

/* ─── RICH TEXT ─── */
function RichTextWidget({ config }: { config: any }) {
  const align = config.align === "center" ? "text-center" : config.align === "right" ? "text-right" : "text-left";
  return (
    <div className={`prose prose-invert max-w-3xl ${config.center !== false ? "mx-auto" : ""} ${align}`}>
      {config.title && <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{config.title}</h2>}
      {config.body && <p className="text-muted-foreground whitespace-pre-line text-lg">{config.body}</p>}
    </div>
  );
}

/* ─── VIDEO EMBED ─── */
function VideoEmbedWidget({ config }: { config: any }) {
  const url = config.url || "";
  let embed = url;
  // Convert YouTube watch links
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/);
  if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
  return (
    <div>
      {config.title && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="font-display text-2xl md:text-3xl font-bold">{config.title}</h2>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-8 md:p-12"
    >
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-4">
          <Mail className="h-3 w-3" /> Newsletter
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">{config.title || "Reste informé"}</h2>
        <p className="text-muted-foreground mb-6">{config.body || "Reçois chaque semaine les meilleures exclus."}</p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={config.placeholder || "ton@email.com"} className="flex-1" />
          <Button type="submit" disabled={loading}>{loading ? "…" : (config.cta_label || "S'inscrire")}</Button>
        </form>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-card to-primary/10 p-8 md:p-12 text-center"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider mb-3">
        <Clock className="h-3 w-3" /> {config.tag || "Bientôt"}
      </div>
      <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">{config.title || "Drop exclusif"}</h2>
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
    </motion.div>
  );
}

/* ─── PROMO BANNER ─── */
function PromoBannerWidget({ config }: { config: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl border border-border p-8 md:p-12 flex flex-col md:flex-row items-center gap-6"
      style={{
        background: config.bg_color
          ? `linear-gradient(135deg, hsl(${config.bg_color}), hsl(${config.bg_color} / 0.7))` : undefined,
        color: config.text_color ? `hsl(${config.text_color})` : undefined,
      }}
    >
      {config.image_url && (
        <img src={config.image_url} alt="" className="w-40 h-40 rounded-2xl object-cover shadow-xl shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider mb-3">
          <Megaphone className="h-3 w-3" /> {config.tag || "Promo"}
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">{config.title || "Offre limitée"}</h2>
        {config.body && <p className="opacity-80 mb-4">{config.body}</p>}
        {config.cta_label && config.cta_url && (
          <Button asChild variant="secondary"><Link to={config.cta_url}>{config.cta_label}</Link></Button>
        )}
      </div>
    </motion.div>
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

/* ─── STATS (counters) ─── */
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
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 md:p-10"
    >
      {config.title && (
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">{config.title}</h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {items.map((it: any, i: number) => (
          <div key={i} className="text-center">
            <div className="font-display font-black text-3xl md:text-5xl gradient-text tabular-nums">{it.value}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{it.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
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
        <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" /> {config.title || "Genres"}
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link
            key={g.name} to={`/tracks?genre=${encodeURIComponent(g.name)}`}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition"
            style={{ fontSize: `${Math.min(1.5, 0.85 + g.count / 50)}rem` }}
          >
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
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10"
    >
      {cover && <div className="absolute inset-0 opacity-25 bg-cover bg-center blur-3xl" style={{ backgroundImage: `url(${cover})` }} />}
      <div className="relative shrink-0 mx-auto md:mx-0">
        <img src={cover || "/placeholder.svg"} alt={track.title} className="w-56 h-56 md:w-72 md:h-72 rounded-2xl object-cover shadow-2xl" />
      </div>
      <div className="relative flex-1 flex flex-col justify-center text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-3 self-center md:self-start">
          <Star className="h-3 w-3" /> {config.tag || "Track de la semaine"}
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-black mb-2">{track.title}</h2>
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
    </motion.div>
  );
}

/* ─── TESTIMONIALS ─── */
function TestimonialsWidget({ config }: { config: any }) {
  const items = config.items || [
    { quote: "La meilleure source d'edits du moment.", author: "DJ Example", role: "Club, Paris" },
  ];
  return (
    <div>
      {config.title && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="font-display text-2xl md:text-3xl font-bold">{config.title}</h2>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 relative"
          >
            <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/15" />
            <p className="text-base mb-4">"{it.quote}"</p>
            <div className="flex items-center gap-3">
              {it.avatar && <img src={it.avatar} alt={it.author} className="w-10 h-10 rounded-full object-cover" />}
              <div>
                <p className="font-semibold text-sm">{it.author}</p>
                {it.role && <p className="text-xs text-muted-foreground">{it.role}</p>}
              </div>
            </div>
          </motion.div>
        ))}
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
        <h2 className="font-display text-2xl md:text-3xl font-bold">{config.title || "Questions fréquentes"}</h2>
      </div>
      <div className="space-y-2">
        {items.map((it: any, i: number) => {
          const isOpen = open === i;
          return (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition"
              >
                <span className="font-semibold">{it.question}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">{it.answer}</div>
              )}
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">{config.title}</p>
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

/* ─── TWO COLUMNS (image + text) ─── */
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
        {config.eyebrow && (
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">{config.eyebrow}</p>
        )}
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{config.title || "Titre"}</h2>
        {config.body && <p className="text-muted-foreground whitespace-pre-line mb-6">{config.body}</p>}
        {config.cta_label && (
          <Button asChild variant="hero">
            <Link to={config.cta_url || "#"}>{config.cta_label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

