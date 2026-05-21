import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, Disc3, LogIn, LogOut, Shield, Mic2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";

const navLinks = [
  { to: "/new", label: "Nouveautés" },
  { to: "/genres", label: "Genres" },
  { to: "/artists", label: "Remixeurs" },
  { to: "/stems", label: "Stems" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAdmin, realIsAdmin, viewAsUser, setViewAsUser, profile, signOut } = useAuth();
  const { currentTrack } = usePlayer();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Disc3 className="h-7 w-7 text-primary animate-pulse-glow" />
            <span className="font-display font-bold text-lg gradient-text hidden sm:inline">
              French Record Pool
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {searchOpen && (
              <Input
                placeholder="Rechercher un titre, remixeur..."
                className="w-48 lg:w-64 bg-secondary border-border"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-4 w-4" />
            </Button>

            {user ? (
              <>
                <NotificationBell />
                {realIsAdmin && (
                  <Button
                    variant={viewAsUser ? "accent" as any : "ghost"}
                    size="sm"
                    className="gap-1"
                    onClick={() => setViewAsUser(!viewAsUser)}
                    title={viewAsUser ? "Quitter le mode aperçu utilisateur" : "Voir le site comme un utilisateur"}
                  >
                    {viewAsUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="hidden lg:inline">{viewAsUser ? "Aperçu" : "Voir comme user"}</span>
                  </Button>
                )}
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Shield className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <Link to="/dj">
                  <Button variant="ghost" size="sm" className="gap-1 hidden sm:inline-flex">
                    <Mic2 className="h-4 w-4" /> Espace DJ
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                    {profile?.dj_name || "Mon compte"}
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1">
                    <LogIn className="h-4 w-4" /> Connexion
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" size="sm" className="hidden sm:inline-flex">
                    S'inscrire
                  </Button>
                </Link>
              </>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border px-4 pb-4 pt-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === link.to
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)}>
                      <Button variant="hero" className="w-full gap-2" size="sm">
                        <Shield className="h-4 w-4" /> Admin
                      </Button>
                    </Link>
                  )}
                  <div className="flex gap-2">
                    <Link to="/dashboard" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">Mon compte</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>Déconnexion</Button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">Connexion</Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button variant="hero" className="w-full" size="sm">S'inscrire</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <ViewAsUserBanner />

      <main className={`flex-1 ${currentTrack ? "pb-16" : ""}`}>{children}</main>

      <footer className={`border-t border-border py-8 mt-12 ${currentTrack ? "mb-16" : ""}`}>
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Disc3 className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold gradient-text">French Record Pool</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/new" className="hover:text-foreground transition-colors">Nouveautés</Link>
              <Link to="/genres" className="hover:text-foreground transition-colors">Genres</Link>
              <Link to="/artists" className="hover:text-foreground transition-colors">Remixeurs</Link>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 French Record Pool. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
