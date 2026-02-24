import { Link } from "react-router-dom";
import { Disc3, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Disc3 className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl gradient-text">French Record Pool</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Créer un compte</h1>
          <p className="text-sm text-muted-foreground mt-1">Rejoignez la communauté DJ</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="djName">Nom DJ</Label>
            <Input id="djName" placeholder="DJ Awesome" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="dj@example.com" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input id="confirm" type="password" className="bg-secondary border-border" />
          </div>
          <Button variant="hero" className="w-full" type="submit">
            <UserPlus className="h-4 w-4 mr-2" /> S'inscrire
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
