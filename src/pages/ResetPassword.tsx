import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-handles the recovery token from URL hash and creates a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "6 caractères minimum.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mot de passe mis à jour", description: "Vous pouvez maintenant vous connecter." });
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-primary" />
        <div className="flex-1 bg-background" />
        <div className="flex-1 bg-accent" />
      </div>
      <motion.div className="w-full max-w-sm space-y-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Disc3 className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl gradient-text">French Record Pool</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-1">Définissez votre nouveau mot de passe</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 glow-primary space-y-4">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              Lien invalide ou expiré. <Link to="/forgot-password" className="text-primary hover:underline">Demander un nouveau lien</Link>.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input id="password" type="password" className="bg-secondary border-border" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input id="confirm" type="password" className="bg-secondary border-border" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" /> {loading ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
