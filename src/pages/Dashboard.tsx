import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, CreditCard, Download, LogOut, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, loading, profile, hasActiveSubscription, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
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

  const handleSave = async () => {
    if (!user) return;
    const trimmed = djName.trim();
    if (trimmed.length < 2) {
      toast({ title: "Nom DJ trop court", description: "2 caractères minimum.", variant: "destructive" });
      return;
    }
    if (trimmed.length > 50) {
      toast({ title: "Nom DJ trop long", description: "50 caractères maximum.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ dj_name: trimmed })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profil enregistré" });
    }
  };

  const handleAvatar = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Image uniquement.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Trop volumineux", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
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

  return (
    <Layout>
      <motion.div className="container py-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <h1 className="font-display text-3xl font-bold">Mon Compte</h1>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4 mr-1" /> Déconnexion
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="profile" className="gap-1"><User className="h-4 w-4" /> Profil</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1"><CreditCard className="h-4 w-4" /> Abonnement</TabsTrigger>
            <TabsTrigger value="downloads" className="gap-1"><Download className="h-4 w-4" /> Téléchargements</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="max-w-lg space-y-5 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
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
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatar(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div>
                  <p className="font-display font-semibold">{profile?.dj_name || "DJ sans nom"}</p>
                  <p className="text-xs text-muted-foreground">Cliquez sur la photo pour changer</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dj_name">Nom DJ</Label>
                <Input
                  id="dj_name"
                  value={djName}
                  onChange={(e) => setDjName(e.target.value)}
                  maxLength={50}
                  placeholder="DJ Awesome"
                  className="bg-secondary border-border"
                />
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
                <p className="text-sm text-muted-foreground">
                  Contactez l'administrateur pour activer votre abonnement.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="downloads">
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-muted-foreground text-sm">Votre historique de téléchargements apparaîtra ici.</p>
            </div>
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
