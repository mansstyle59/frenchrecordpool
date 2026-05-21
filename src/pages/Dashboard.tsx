import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { User, CreditCard, Download, LogOut, Camera, Loader2, Heart, Music2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useTracks } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { resolveCover } from "@/lib/trackCover";

export default function Dashboard() {
  const { user, loading, profile, hasActiveSubscription, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { favoriteIds } = useFavorites();
  const { data: allTracks = [] } = useTracks();
  const [djName, setDjName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    setDjName(profile?.dj_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  const { data: downloadHistory = [] } = useQuery({
    queryKey: ["downloads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("id, downloaded_at, track_id")
        .eq("user_id", user!.id)
        .order("downloaded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const favoriteTracks = allTracks.filter((t) => favoriteIds.includes(t.id));
  const tracksById = new Map(allTracks.map((t) => [t.id, t]));

  const handleSave = async () => {
    if (!user) return;
    const trimmed = djName.trim();
    if (trimmed.length < 2) { toast({ title: "Nom DJ trop court", description: "2 caractères minimum.", variant: "destructive" }); return; }
    if (trimmed.length > 50) { toast({ title: "Nom DJ trop long", description: "50 caractères maximum.", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ dj_name: trimmed }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { await refreshProfile(); toast({ title: "Profil enregistré" }); }
  };

  const handleAvatar = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Format invalide", description: "Image uniquement.", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Trop volumineux", description: "Max 5 MB.", variant: "destructive" }); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("user_id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(data.publicUrl);
      await refreshProfile();
      toast({ title: "Avatar mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading || !user) return <Layout><div className="container py-20 text-center text-muted-foreground">Chargement...</div></Layout>;

  const stats = [
    { icon: Download, label: "Téléchargements", value: downloadHistory.length, color: "text-primary" },
    { icon: Heart, label: "Favoris", value: favoriteIds.length, color: "text-accent" },
    { icon: Music2, label: "Catalogue", value: allTracks.length, color: "text-primary" },
  ];

  return (
    <Layout>
      <motion.div className="container py-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <div>
            <h1 className="font-display text-3xl font-bold">Bonjour {profile?.dj_name || "DJ"} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">Voici un aperçu de votre activité.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4 mr-1" /> Déconnexion
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
            >
              <div className={`h-12 w-12 rounded-full bg-secondary flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="profile" className="gap-1"><User className="h-4 w-4" /> Profil</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1"><CreditCard className="h-4 w-4" /> Abonnement</TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1"><Heart className="h-4 w-4" /> Favoris</TabsTrigger>
            <TabsTrigger value="downloads" className="gap-1"><Download className="h-4 w-4" /> Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="max-w-lg space-y-5 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInput.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label="Changer l'avatar"
                  >
                    {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  </button>
                  <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatar(e.target.files?.[0] ?? null)} />
                </div>
                <div>
                  <p className="font-display font-semibold">{profile?.dj_name || "DJ sans nom"}</p>
                  <p className="text-xs text-muted-foreground">Cliquez sur la photo pour changer</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dj_name">Nom DJ</Label>
                <Input id="dj_name" value={djName} onChange={(e) => setDjName(e.target.value)} maxLength={50} placeholder="DJ Awesome" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || user.email || ""} className="bg-secondary border-border" readOnly />
              </div>
              <Button variant="hero" onClick={handleSave} disabled={saving || djName === (profile?.dj_name ?? "")}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="max-w-lg bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-lg">Abonnement</p>
                  <p className="text-sm text-muted-foreground">Accès au téléchargement du catalogue</p>
                </div>
                <Badge className={hasActiveSubscription ? "bg-primary/20 text-primary border-primary/30" : "bg-destructive/20 text-destructive"}>
                  {hasActiveSubscription ? "Actif" : "Inactif"}
                </Badge>
              </div>
              {!hasActiveSubscription && (
                <p className="text-sm text-muted-foreground">Contactez l'administrateur pour activer votre abonnement.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites">
            <div className="bg-card border border-border rounded-xl p-4">
              {favoriteTracks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Aucun favori. Cliquez sur le ❤ d'une track pour l'ajouter.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {favoriteTracks.map((t) => (
                    <li key={t.id}>
                      <Link to={`/tracks/${t.id}`} className="flex items-center gap-3 py-2 hover:bg-secondary/50 px-2 rounded-md transition-colors">
                        <img src={resolveCover(t)} alt="" className="h-10 w-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.artist} · {t.genre}</p>
                        </div>
                        {t.bpm && <span className="text-xs text-muted-foreground">{t.bpm} BPM</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="downloads">
            <div className="bg-card border border-border rounded-xl p-4">
              {downloadHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Aucun téléchargement pour le moment.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {downloadHistory.map((d) => {
                    const t = tracksById.get(d.track_id);
                    if (!t) return (
                      <li key={d.id} className="py-2 px-2 text-xs text-muted-foreground">
                        Track supprimée · {new Date(d.downloaded_at).toLocaleString("fr-FR")}
                      </li>
                    );
                    return (
                      <li key={d.id}>
                        <Link to={`/tracks/${t.id}`} className="flex items-center gap-3 py-2 hover:bg-secondary/50 px-2 rounded-md transition-colors">
                          <img src={resolveCover(t)} alt="" className="h-10 w-10 rounded object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                          </div>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {new Date(d.downloaded_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
