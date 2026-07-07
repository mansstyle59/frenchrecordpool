import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe." });
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 relative overflow-hidden">
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
          <h1 className="font-display text-2xl font-bold">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground mt-1">Recevez un lien de réinitialisation par email</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 glow-primary space-y-4">
          {sent ? (
            <p className="text-sm text-muted-foreground text-center">
              Si un compte existe pour <strong>{email}</strong>, un email de réinitialisation a été envoyé.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="dj@example.com" className="bg-secondary border-border" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                <Mail className="h-4 w-4 mr-2" /> {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline font-medium">Retour à la connexion</Link>
        </p>
      </motion.div>
    </div>
  );
}
