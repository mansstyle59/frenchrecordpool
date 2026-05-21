import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, Disc3, LogIn, LogOut, Shield, Mic2, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import CmsText from "@/components/cms/CmsText";
import CmsLink from "@/components/cms/CmsLink";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";


const NAV_DEFAULTS = [
  { key: "nav.new", to: "/new", label: "Nouveautés" },
  { key: "nav.genres", to: "/genres", label: "Genres" },
  { key: "nav.artists", to: "/artists", label: "Remixeurs" },
  { key: "nav.stems", to: "/stems", label: "Stems" },
];


export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAdmin, realIsAdmin, viewAsUser, setViewAsUser, profile, signOut } = useAuth();
  const { currentTrack } = usePlayer();

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass safe-top">
        <div className="container flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="flex items-center gap-2">
                    <Disc3 className="h-6 w-6 text-primary" />
                    <span className="font-display gradient-text">French Record Pool</span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <nav className="space-y-1">
                    {NAV_DEFAULTS.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={closeMenu}
                        className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          location.pathname === link.to
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <CmsText editKey={link.key}>{link.label}</CmsText>
                      </Link>
                    ))}
                  </nav>

                  {user ? (
                    <div className="space-y-1 border-t border-border pt-4">
                      <Link to="/dashboard" onClick={closeMenu} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
                        <User className="h-4 w-4" /> {profile?.dj_name || "Mon compte"}
                      </Link>
                      <Link to="/dj" onClick={closeMenu} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
                        <Mic2 className="h-4 w-4" /> Espace DJ
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={closeMenu} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10">
                          <Shield className="h-4 w-4" /> Admin
                        </Link>
                      )}
                      {realIsAdmin && (
                        <button
                          onClick={() => { setViewAsUser(!viewAsUser); closeMenu(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          {viewAsUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {viewAsUser ? "Quitter aperçu" : "Voir comme user"}
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <LogOut className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t border-border pt-4">
                      <Link to="/login" onClick={closeMenu} className="block">
                        <Button variant="outline" className="w-full gap-2" size="sm">
                          <LogIn className="h-4 w-4" /> Connexion
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={closeMenu} className="block">
                        <Button variant="hero" className="w-full" size="sm">S'inscrire</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2 shrink-0">
              <Disc3 className="h-7 w-7 text-primary animate-pulse-glow" />
              <span className="font-display font-bold text-lg gradient-text hidden sm:inline">
                French Record Pool
              </span>
            </Link>
          </div>

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
                {isAdmin && (
                  <Link to="/admin" className="hidden sm:inline-flex">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Shield className="h-4 w-4" /> <span className="hidden lg:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    {profile?.dj_name || "Mon compte"}
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/signup" className="hidden sm:inline-flex">
                <Button variant="hero" size="sm">S'inscrire</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <ViewAsUserBanner />

      <main className={`flex-1 ${currentTrack ? "pb-20 sm:pb-16" : ""}`}>{children}</main>

      <footer className={`border-t border-border py-8 mt-12 ${currentTrack ? "mb-20 sm:mb-16" : ""}`}>
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Disc3 className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold gradient-text">French Record Pool</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <CmsLink editKey="footer.link.new" defaultLabel="Nouveautés" defaultUrl="/new" className="hover:text-foreground transition-colors" />
              <CmsLink editKey="footer.link.genres" defaultLabel="Genres" defaultUrl="/genres" className="hover:text-foreground transition-colors" />
              <CmsLink editKey="footer.link.artists" defaultLabel="Remixeurs" defaultUrl="/artists" className="hover:text-foreground transition-colors" />
            </div>

            <p className="text-xs text-muted-foreground"><CmsText editKey="footer.copyright">© 2026 French Record Pool. Tous droits réservés.</CmsText></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
