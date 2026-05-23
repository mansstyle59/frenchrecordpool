import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Music, Clock, CheckCircle2, XCircle, Download, Upload, Bell, Pencil,
  Headphones, Disc3, Globe, Instagram, Youtube, Music2, ExternalLink,
  TrendingUp, Trophy, Sparkles, UserCircle, ListMusic, Image as ImageIcon,
  FileText, AtSign, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTracks } from "@/hooks/useTracks";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import DjLayout from "@/components/dj/DjLayout";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { resolveCover } from "@/lib/trackCover";
import type { DbTrack } from "@/hooks/useTracks";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  approved: { label: "Approuvé", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  rejected: { label: "Refusé", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default function DjDashboard() {
  const { user } = useAuth();
  const { data: myTracks = [] } = useMyTracks(user?.id);
  const { notifications } = useNotifications();

  // ── Studio profile ──
  const { data: studio } = useQuery({
    queryKey: ["dj-studio-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const linked = await supabase.from("artists").select("*").eq("user_id", user!.id).maybeSingle();
      if (linked.data) return linked.data as any;
      const fallbackId = myTracks.find((t) => (t as any).artist_id)?.["artist_id" as keyof DbTrack];
      if (fallbackId) {
        const { data } = await supabase.from("artists").select("*").eq("id", fallbackId as string).maybeSingle();
        return data as any;
      }
      return null;
    },
  });

  const { data: remixTracks = [] } = useQuery({
    queryKey: ["dj-as-remixer", studio?.id],
    enabled: !!studio?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks").select("*")
        .eq("status", "approved")
        .contains("remixer_ids", [studio!.id])
        .order("created_at", { ascending: false });
      return (data ?? []) as DbTrack[];
    },
  });

  const stats = useMemo(() => {
    const allTracks = [...myTracks, ...remixTracks];
    const pending = myTracks.filter((t) => t.status === "pending").length;
    const approved = myTracks.filter((t) => t.status === "approved").length;
    const rejected = myTracks.filter((t) => t.status === "rejected").length;
    const downloads = allTracks.reduce((s, t) => s + (t.downloads ?? 0), 0);
    const now = Date.now();
    const last30 = allTracks.filter((t) => now - new Date(t.created_at).getTime() < 30 * DAY_MS).length;
    const last7 = allTracks.filter((t) => now - new Date(t.created_at).getTime() < 7 * DAY_MS).length;
    return { pending, approved, rejected, downloads, total: allTracks.length, last30, last7 };
  }, [myTracks, remixTracks]);

  // Top morceau (le plus téléchargé, approuvé)
  const topTrack = useMemo(() => {
    return [...myTracks, ...remixTracks]
      .filter((t) => t.status === "approved")
      .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))[0] ?? null;
  }, [myTracks, remixTracks]);

  // Profile completion (only when studio linked)
  const completion = useMemo(() => {
    if (!studio) return null;
    const checks: { ok: boolean; label: string; icon: any; field: string }[] = [
      { ok: !!studio.photo_url, label: "Photo de profil", icon: ImageIcon, field: "photo" },
      { ok: !!studio.banner_url, label: "Bannière studio", icon: ImageIcon, field: "banner" },
      { ok: !!(studio.bio_long || studio.bio), label: "Biographie", icon: FileText, field: "bio" },
      { ok: !!studio.tagline, label: "Tagline", icon: Sparkles, field: "tagline" },
      { ok: !!(studio.instagram_url || studio.soundcloud_url || studio.spotify_url || studio.youtube_url || studio.beatport_url || studio.tiktok_url || studio.website_url), label: "Au moins 1 réseau social", icon: AtSign, field: "socials" },
    ];
    const done = checks.filter((c) => c.ok).length;
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100), checks };
  }, [studio]);

  const recent = myTracks.slice(0, 5);
  const displayName = studio?.name || (user?.email?.split("@")[0] ?? "Mon studio");
  const profileUrl = studio?.slug ? `/artists/${studio.slug}` : null;
  const isRemixerKind = studio?.kind === "remixer" || studio?.kind === "both";

  return (
    <DjLayout
      title=""
      actions={
        <Link to="/dj/upload">
          <Button variant="hero" size="sm" className="gap-2">
            <Upload className="h-4 w-4" /> Nouveau morceau
          </Button>
        </Link>
      }
    >
      {/* ───── Studio branding hero ───── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative -mx-4 sm:-mx-6 -mt-6 mb-2 rounded-none sm:rounded-3xl overflow-hidden border-y sm:border border-border"
      >
        <div className="relative h-44 sm:h-56 md:h-64 w-full">
          {studio?.banner_url ? (
            <img src={studio.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-accent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        </div>

        <div className="relative -mt-20 md:-mt-24 px-4 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-accent ring-4 ring-background shadow-2xl shrink-0">
              {studio?.photo_url ? (
                <img src={studio.photo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-display font-black text-background">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
                {studio ? (isRemixerKind ? "Studio Remixer · French Record Pool" : "Studio Artiste · French Record Pool") : "Espace DJ"}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black leading-tight truncate">{displayName}</h1>
              {studio?.tagline && (
                <p className="text-sm text-muted-foreground italic mt-1 line-clamp-1">{studio.tagline}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline" className="gap-1.5 text-xs"><Disc3 className="h-3 w-3" /> {stats.total} titre{stats.total > 1 ? "s" : ""}</Badge>
                <Badge variant="outline" className="gap-1.5 text-xs"><Download className="h-3 w-3" /> {stats.downloads.toLocaleString()} dl</Badge>
                {studio?.kind === "both" && (
                  <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/30">DJ + Remixer</Badge>
                )}
                <SocialLinks artist={studio} />
              </div>
            </div>
            <div className="flex sm:flex-col gap-2 shrink-0">
              <Link to="/dj/profile">
                <Button size="sm" variant="secondary" className="gap-1.5 w-full">
                  <Pencil className="h-3.5 w-3.5" /> Studio
                </Button>
              </Link>
              {profileUrl && (
                <Link to={profileUrl} target="_blank">
                  <Button size="sm" variant="ghost" className="gap-1.5 w-full">
                    <ExternalLink className="h-3.5 w-3.5" /> Voir
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {!studio && (
            <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
              Aucun studio lié à ce compte. Publie un morceau pour créer automatiquement ta page artiste, puis demande à un admin de la lier à ton compte.
            </div>
          )}
        </div>
      </motion.div>

      {/* ───── Quick actions ribbon ───── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickAction to="/dj/upload" icon={Upload} label="Nouveau morceau" accent="primary" />
        <QuickAction to="/dj/tracks" icon={ListMusic} label="Mes morceaux" accent="accent" />
        <QuickAction to="/dj/profile" icon={UserCircle} label="Mon studio" accent="primary" />
        <QuickAction to={profileUrl || "/dj/profile"} icon={ExternalLink} label="Page publique" accent="accent" external={!!profileUrl} />
      </div>

      {/* ───── Stats ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Music} label="Total titres" value={stats.total} hint={stats.last30 > 0 ? `+${stats.last30} ce mois` : "—"} accent="from-primary/20 to-primary/5" iconColor="text-primary" />
        <StatCard icon={Clock} label="En attente" value={stats.pending} hint={stats.pending > 0 ? "Validation 24-48h" : "À jour"} accent="from-accent/15 to-accent/5" iconColor="text-accent" />
        <StatCard icon={CheckCircle2} label="Approuvés" value={stats.approved} hint={`${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% du total`} accent="from-primary/15 to-primary/5" iconColor="text-primary" />
        <StatCard icon={XCircle} label="Refusés" value={stats.rejected} hint={stats.rejected > 0 ? "Voir motifs" : "Aucun refus"} accent="from-destructive/15 to-destructive/5" iconColor="text-destructive" />
        <StatCard icon={Download} label="Téléchargements" value={stats.downloads.toLocaleString()} hint={stats.last7 > 0 ? `+${stats.last7} titres cette semaine` : "Cumulés"} accent="from-accent/20 to-accent/5" iconColor="text-accent" />
      </div>

      {/* ───── Profile completion + Top track ───── */}
      {(completion || topTrack) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {completion && completion.pct < 100 && (
            <CompletionCard completion={completion} />
          )}
          {topTrack && (
            <TopTrackCard track={topTrack} />
          )}
        </div>
      )}

      {/* ───── Remix discography ───── */}
      {remixTracks.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Headphones className="h-4 w-4 text-accent" />
              Mes remixes
              <span className="text-xs font-normal text-muted-foreground">({remixTracks.length})</span>
            </h2>
            {profileUrl && (
              <Link to={profileUrl} className="text-xs text-muted-foreground hover:text-primary">
                Voir la page publique →
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden">
            <TrackListHeader />
            {remixTracks.map((t) => <TrackRow key={t.id} track={t} />)}
          </div>
        </section>
      )}

      {/* ───── Recent + Notifications ───── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" /> Mes derniers morceaux
            </h3>
            <Link to="/dj/tracks" className="text-xs text-muted-foreground hover:text-primary">Tout voir</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>Aucun morceau pour le moment.</p>
              <Link to="/dj/upload">
                <Button variant="outline" size="sm" className="mt-3 gap-2">
                  <Upload className="h-3 w-3" />Soumettre ton premier morceau
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((t) => {
                const st = STATUS_LABEL[t.status ?? "pending"];
                return (
                  <li key={t.id} className="flex items-center gap-3">
                    <img src={resolveCover(t)} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5">
          <h3 className="font-display text-lg font-bold tracking-tight flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-accent" /> Notifications récentes
          </h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune notification.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read_at ? "bg-muted" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DjLayout>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent, iconColor }: any) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${accent} border border-border rounded-2xl p-4 backdrop-blur-xl`}>
      <Icon className={`h-5 w-5 ${iconColor} mb-3`} />
      <p className="text-3xl font-display font-black leading-none tracking-tight">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1.5 font-semibold">{label}</p>
      {hint && (
        <p className="text-[10px] text-muted-foreground/80 mt-1 truncate flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5" /> {hint}
        </p>
      )}
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, accent, external }: any) {
  const colorCls = accent === "accent"
    ? "from-accent/15 to-accent/5 group-hover:from-accent/25 group-hover:to-accent/10 text-accent"
    : "from-primary/15 to-primary/5 group-hover:from-primary/25 group-hover:to-primary/10 text-primary";
  return (
    <Link to={to} target={external ? "_blank" : undefined} className="group">
      <div className={`relative overflow-hidden bg-gradient-to-br ${colorCls} border border-border rounded-2xl p-3 flex items-center gap-3 transition-all hover:border-primary/40 hover:-translate-y-0.5`}>
        <div className="h-9 w-9 rounded-xl bg-background/60 backdrop-blur flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm text-foreground truncate">{label}</span>
        <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

function CompletionCard({ completion }: { completion: { done: number; total: number; pct: number; checks: { ok: boolean; label: string; icon: any }[] } }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Complète ton studio
        </h3>
        <span className="text-2xl font-display font-black tracking-tight text-primary">{completion.pct}%</span>
      </div>
      <Progress value={completion.pct} className="h-2 mb-4" />
      <ul className="space-y-1.5 mb-4">
        {completion.checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-2 text-sm ${c.ok ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {c.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <c.icon className="h-3.5 w-3.5 text-accent shrink-0" />
            )}
            <span className="truncate">{c.label}</span>
          </li>
        ))}
      </ul>
      <Link to="/dj/profile">
        <Button size="sm" variant="hero" className="w-full gap-2">
          <Pencil className="h-3.5 w-3.5" /> Compléter mon profil
        </Button>
      </Link>
    </div>
  );
}

function TopTrackCard({ track }: { track: DbTrack }) {
  return (
    <div className="relative rounded-2xl border border-border bg-gradient-to-br from-accent/15 via-card/40 to-primary/15 backdrop-blur-xl p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-accent" />
        <h3 className="font-display text-lg font-bold tracking-tight">Top morceau</h3>
        <Badge variant="outline" className="ml-auto text-[10px] bg-accent/10 border-accent/30 text-accent gap-1">
          <Download className="h-3 w-3" /> {(track.downloads ?? 0).toLocaleString()} dl
        </Badge>
      </div>
      <div className="flex gap-4 items-center">
        <img src={resolveCover(track)} alt={track.title} className="h-20 w-20 rounded-xl object-cover ring-2 ring-border shrink-0 shadow-lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/tracks/${track.id}`} className="font-display text-xl font-black tracking-tight truncate hover:text-primary block">
            {track.title}
          </Link>
          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {track.bpm && <Badge variant="outline" className="text-[10px]">{track.bpm} BPM</Badge>}
            {track.musical_key && <Badge variant="outline" className="text-[10px]">{track.musical_key}</Badge>}
            {track.genre && <Badge variant="outline" className="text-[10px] truncate max-w-[120px]">{track.genre}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialLinks({ artist }: { artist: any }) {
  if (!artist) return null;
  const links: { url?: string; icon: any; label: string }[] = [
    { url: artist.website_url, icon: Globe, label: "Site" },
    { url: artist.instagram_url, icon: Instagram, label: "Instagram" },
    { url: artist.youtube_url, icon: Youtube, label: "YouTube" },
    { url: artist.soundcloud_url, icon: Music2, label: "SoundCloud" },
    { url: artist.spotify_url, icon: Music, label: "Spotify" },
  ].filter((l) => l.url);
  if (!links.length) return null;
  return (
    <div className="flex gap-1 ml-auto">
      {links.map((l) => (
        <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
          className="h-7 w-7 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
          title={l.label}>
          <l.icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}
