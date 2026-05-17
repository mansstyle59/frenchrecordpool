import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Disc3, Users, Download, Music, Settings, Palette, Heart,
  TrendingUp, CreditCard, Upload, ArrowRight, Activity, ScrollText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTracks } from "@/hooks/useTracks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { to: "/admin/tracks", label: "Gérer les tracks", desc: "Ajout, édition et upload en masse", icon: Music },
  { to: "/admin/users", label: "Gérer les utilisateurs", desc: "Comptes DJ et rôles", icon: Users },
  { to: "/admin/subscriptions", label: "Abonnements", desc: "Plans et statuts Stripe", icon: CreditCard },
  { to: "/admin/branding", label: "Branding Studio", desc: "Couleurs, logos, typographie", icon: Palette },
  { to: "/admin/audit", label: "Journal d'audit", desc: "Historique des actions admin", icon: ScrollText },
];

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: tracks = [] } = useTracks();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

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
      return {
        users: p.count ?? 0,
        activeSubs: s.count ?? 0,
        downloads: d.count ?? 0,
        favorites: f.count ?? 0,
      };
    },
  });

  const { data: recentTracks = [] } = useQuery({
    queryKey: ["admin-recent-tracks"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks")
        .select("id, title, artist, cover_url, created_at, downloads")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, dj_name, email, created_at, avatar_url")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    );
  }

  const totalDownloads = tracks.reduce((s, t) => s + (t.downloads ?? 0), 0);
  const topTracks = [...tracks]
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 5);

  const stats = [
    { label: "Tracks", value: tracks.length, icon: Music, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Téléchargements", value: counts?.downloads ?? totalDownloads, icon: Download, accent: "from-accent/20 to-accent/5", iconColor: "text-accent" },
    { label: "Utilisateurs", value: counts?.users ?? "-", icon: Users, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Abonnements actifs", value: counts?.activeSubs ?? "-", icon: CreditCard, accent: "from-accent/20 to-accent/5", iconColor: "text-accent" },
    { label: "Favoris", value: counts?.favorites ?? 0, icon: Heart, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">Admin</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour au site
          </Link>
        </div>
      </header>

      <div className="container py-8 space-y-10">
        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              <Activity className="inline h-3 w-3 mr-1" /> Tableau de bord
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Bienvenue, <span className="gradient-text">admin</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vue d'ensemble de la plateforme French Record Pool.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/tracks">
              <Button variant="hero" size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> Uploader un track
              </Button>
            </Link>
            <Link to="/admin/branding">
              <Button variant="outline" size="sm" className="gap-2">
                <Palette className="h-4 w-4" /> Branding
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`relative overflow-hidden bg-gradient-to-br ${s.accent} border border-border rounded-xl p-4`}
            >
              <s.icon className={`h-5 w-5 ${s.iconColor} mb-3`} />
              <p className="text-2xl font-display font-bold leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Raccourcis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {adminLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <link.icon className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="font-display font-semibold group-hover:text-primary transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent + Top */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent tracks */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" /> Tracks récents
              </h3>
              <Link to="/admin/tracks" className="text-xs text-muted-foreground hover:text-primary">
                Tout voir
              </Link>
            </div>
            {recentTracks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucun track.</p>
            ) : (
              <ul className="space-y-3">
                {recentTracks.map((t: any) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-secondary overflow-hidden shrink-0">
                      {t.cover_url && (
                        <img src={t.cover_url} alt={t.title} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Top tracks */}
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
                    <span className="text-sm font-display font-bold text-muted-foreground w-5">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                    </div>
                    <span className="text-xs font-mono text-accent">
                      {t.downloads ?? 0} <Download className="inline h-3 w-3" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent users */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Nouveaux DJs
              </h3>
              <Link to="/admin/users" className="text-xs text-muted-foreground hover:text-primary">
                Tout voir
              </Link>
            </div>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucun utilisateur.</p>
            ) : (
              <ul className="space-y-3">
                {recentUsers.map((u: any) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (u.dj_name || u.email || "?").slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.dj_name || "Sans nom"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
