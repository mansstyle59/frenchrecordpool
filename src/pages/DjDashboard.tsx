import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Music, Clock, CheckCircle2, XCircle, Download, Upload, Bell, Pencil,
  Headphones, Disc3, Globe, Instagram, Youtube, Music2, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTracks } from "@/hooks/useTracks";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import DjLayout from "@/components/dj/DjLayout";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { resolveCover } from "@/lib/trackCover";
import type { DbTrack } from "@/hooks/useTracks";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  approved: { label: "Approuvé", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  rejected: { label: "Refusé", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function DjDashboard() {
  const { user } = useAuth();
  const { data: myTracks = [] } = useMyTracks(user?.id);
  const { notifications } = useNotifications();

  // ── Studio profile: artist linked to this user, or fallback by track submissions ──
  const { data: studio } = useQuery({
    queryKey: ["dj-studio-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // 1) direct link
      const linked = await supabase.from("artists").select("*").eq("user_id", user!.id).maybeSingle();
      if (linked.data) return linked.data as any;
      // 2) fallback: most-used artist_id from this user's submissions
      const fallbackId = myTracks.find((t) => (t as any).artist_id)?.["artist_id" as keyof DbTrack];
      if (fallbackId) {
        const { data } = await supabase.from("artists").select("*").eq("id", fallbackId as string).maybeSingle();
        return data as any;
      }
      return null;
    },
  });

  // ── Tracks where I'm credited as a remixer (via studio.id) ──
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
    const pending = myTracks.filter((t) => t.status === "pending").length;
    const approved = myTracks.filter((t) => t.status === "approved").length;
    const rejected = myTracks.filter((t) => t.status === "rejected").length;
    const downloads = myTracks.reduce((s, t) => s + (t.downloads ?? 0), 0)
      + remixTracks.reduce((s, t) => s + (t.downloads ?? 0), 0);
    return { pending, approved, rejected, downloads, total: myTracks.length + remixTracks.length };
  }, [myTracks, remixTracks]);

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
              {profileUrl && (
                <Link to={profileUrl}>
                  <Button size="sm" variant="secondary" className="gap-1.5 w-full">
                    <Pencil className="h-3.5 w-3.5" /> Studio
                  </Button>
                </Link>
              )}
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

      {/* ───── Compact stats ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Music} label="Total" value={stats.total} accent="from-primary/20 to-primary/5" iconColor="text-primary" />
        <StatCard icon={Clock} label="En attente" value={stats.pending} accent="from-accent/10 to-accent/5" iconColor="text-accent" />
        <StatCard icon={CheckCircle2} label="Approuvés" value={stats.approved} accent="from-primary/15 to-primary/5" iconColor="text-primary" />
        <StatCard icon={XCircle} label="Refusés" value={stats.rejected} accent="from-destructive/15 to-destructive/5" iconColor="text-destructive" />
        <StatCard icon={Download} label="Téléchargements" value={stats.downloads} accent="from-accent/20 to-accent/5" iconColor="text-accent" />
      </div>

      {/* ───── Remix discography (all tracks where I'm credited as remixer) ───── */}
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

      {/* ───── Two columns: recent submissions + notifications ───── */}
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

function StatCard({ icon: Icon, label, value, accent, iconColor }: any) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${accent} border border-border rounded-xl p-4`}>
      <Icon className={`h-5 w-5 ${iconColor} mb-3`} />
      <p className="text-2xl font-display font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
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
