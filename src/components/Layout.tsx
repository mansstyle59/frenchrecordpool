import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, Disc3, LogIn, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";

const navLinks = [
  { to: "/tracks", label: "Catalogue" },
  { to: "/new", label: "Nouveautés" },
  { to: "/top", label: "Top" },
  { to: "/genres", label: "Genres" },
  { to: "/artists", label: "Artistes" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAdmin, profile, signOut } = useAuth();
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
                placeholder="Rechercher un titre, artiste..."
                className="w-48 lg:w-64 bg-secondary border-border"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            )}
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-4 w-4" />
            </Button>

            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1">
                      <Shield className="h-4 w-4" /> Admin
                    </Button>
                  </Link>
                )}
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
            <div className="flex gap-2 pt-2">
              {user ? (
                <>
                  <Link to="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">Mon compte</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>Déconnexion</Button>
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

      <main className={`flex-1 ${currentTrack ? "pb-16" : ""}`}>{children}</main>

      <footer className={`border-t border-border py-8 mt-12 ${currentTrack ? "mb-16" : ""}`}>
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Disc3 className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold gradient-text">French Record Pool</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/tracks" className="hover:text-foreground transition-colors">Catalogue</Link>
              <Link to="/genres" className="hover:text-foreground transition-colors">Genres</Link>
              <Link to="/top" className="hover:text-foreground transition-colors">Top</Link>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 French Record Pool. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
