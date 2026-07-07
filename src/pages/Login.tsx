import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Tricolor decorative bars */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-primary" />
        <div className="flex-1 bg-background" />
        <div className="flex-1 bg-accent" />
      </div>
      <motion.div className="w-full max-w-sm space-y-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Disc3 className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl gradient-text">French Record Pool</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Se connecter</h1>
          <p className="text-sm text-muted-foreground mt-1">Accédez à votre compte DJ</p>
        </motion.div>

        <motion.div className="bg-card border border-border rounded-xl p-6 glow-primary space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="dj@example.com" className="bg-secondary border-border" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" className="bg-secondary border-border" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button variant="hero" className="w-full" type="submit" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" /> {loading ? "Connexion..." : "Se connecter"}

            </Button>
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        </motion.div>

        <motion.p className="text-center text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">Créer un compte</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
