import { Link } from "react-router-dom";
import { Disc3, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Disc3 className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl gradient-text">French Record Pool</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Connexion</h1>
          <p className="text-sm text-muted-foreground mt-1">Accédez à votre compte DJ</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="dj@example.com" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <a href="#" className="text-xs text-primary hover:underline">Mot de passe oublié ?</a>
            </div>
            <Input id="password" type="password" className="bg-secondary border-border" />
          </div>
          <Button variant="hero" className="w-full" type="submit">
            <LogIn className="h-4 w-4 mr-2" /> Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-primary hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}
