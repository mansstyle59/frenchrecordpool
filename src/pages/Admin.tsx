import { Link } from "react-router-dom";
import {
  Users, Download, Music, Heart, TrendingUp, CreditCard, Upload, ArrowRight, Palette, ScrollText, Clapperboard, ListMusic,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTracks } from "@/hooks/useTracks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { resolveCover } from "@/lib/trackCover";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const adminLinks = [
  { to: "/admin/tracks", label: "Gérer les tracks", desc: "Ajout, édition et upload en masse", icon: Music },
  { to: "/admin/shorts", label: "Shorts DJ", desc: "Vidéos courtes YouTube (mobile)", icon: Clapperboard },
  { to: "/admin/users", label: "Gérer les utilisateurs", desc: "Comptes DJ et rôles", icon: Users },
  { to: "/admin/subscriptions", label: "Abonnements", desc: "Plans et statuts Stripe", icon: CreditCard },
  { to: "/admin/branding", label: "Branding Studio", desc: "Couleurs, logos, typographie", icon: Palette },
  { to: "/admin/audit", label: "Journal d'audit", desc: "Historique des actions admin", icon: ScrollText },
];

export default function Admin() {
  const { isAdmin } = useAuth();
  const { data: tracks = [] } = useTracks();

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    enabled: isAdmin,
    queryFn: async () => {
      const [p, s, d, f] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("downloads").select("id", { count: "exact", head: true }),
        supabase.from("favorites").select("id", { count: "exact", head: true }),
      ]);
      return { users: p.count ?? 0, activeSubs: s.count ?? 0, downloads: d.count ?? 0, favorites: f.count ?? 0 };
    },
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["admin-downloads-30d"],
    enabled: isAdmin,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 29);
      const { data } = await supabase
        .from("downloads")
        .select("downloaded_at")
        .gte("downloaded_at", since.toISOString());
      const map = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        map.set(d.toISOString().slice(0, 10), 0);
      }
      (data ?? []).forEach((r: any) => {
        const k = r.downloaded_at.slice(0, 10);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return Array.from(map.entries()).map(([date, count]) => ({
        date: date.slice(5),
        count,
      }));
    },
  });

  const { data: recentTracks = [] } = useQuery({
    queryKey: ["admin-recent-tracks"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks").select("id, title, artist, cover_url, created_at, downloads")
        .order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("id, dj_name, email, created_at, avatar_url")
        .order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const totalDownloads = tracks.reduce((s, t) => s + (t.downloads ?? 0), 0);
  const topTracks = [...tracks].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)).slice(0, 5);

  const stats = [
    { label: "Tracks", value: tracks.length, icon: Music, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Téléchargements", value: counts?.downloads ?? totalDownloads, icon: Download, accent: "from-accent/20 to-accent/5", iconColor: "text-accent" },
    { label: "Utilisateurs", value: counts?.users ?? "-", icon: Users, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Abonnements actifs", value: counts?.activeSubs ?? "-", icon: CreditCard, accent: "from-accent/20 to-accent/5", iconColor: "text-accent" },
    { label: "Favoris", value: counts?.favorites ?? 0, icon: Heart, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  ];

  return (
    <AdminLayout
      title="Tableau de bord"
      subtitle="Vue d'ensemble de la plateforme French Record Pool."
      actions={
        <>
          <Link to="/admin/tracks">
            <Button variant="hero" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> Uploader
            </Button>
          </Link>
          <Link to="/admin/branding">
            <Button variant="outline" size="sm" className="gap-2 hidden sm:inline-flex">
              <Palette className="h-4 w-4" /> Branding
            </Button>
          </Link>
        </>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`relative overflow-hidden bg-gradient-to-br ${s.accent} border border-border rounded-xl p-4`}>
            <s.icon className={`h-5 w-5 ${s.iconColor} mb-3`} />
            <p className="text-2xl font-display font-bold leading-none">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Downloads chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Téléchargements — 30 derniers jours
          </h3>
          <span className="text-xs text-muted-foreground">
            Total : {chartData.reduce((s, d) => s + d.count, 0)}
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#dl)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Raccourcis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {adminLinks.map((link) => (
            <Link
              key={link.to} to={link.to}
              className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <link.icon className="h-5 w-5 text-primary" />
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-display font-semibold group-hover:text-primary transition-colors">{link.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent + Top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" /> Tracks récents
            </h3>
            <Link to="/admin/tracks" className="text-xs text-muted-foreground hover:text-primary">Tout voir</Link>
          </div>
          {recentTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun track.</p>
          ) : (
            <ul className="space-y-3">
              {recentTracks.map((t: any) => (
                <li key={t.id} className="flex items-center gap-3">
                  <img src={resolveCover(t)} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Top téléchargements
            </h3>
          </div>
          {topTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Pas encore de données.</p>
          ) : (
            <ul className="space-y-3">
              {topTracks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="text-sm font-display font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                  </div>
                  <span className="text-xs font-mono text-accent">{t.downloads ?? 0} <Download className="inline h-3 w-3" /></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Nouveaux DJs
            </h3>
            <Link to="/admin/users" className="text-xs text-muted-foreground hover:text-primary">Tout voir</Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun utilisateur.</p>
          ) : (
            <ul className="space-y-3">
              {recentUsers.map((u: any) => (
                <li key={u.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u.dj_name || u.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.dj_name || "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
