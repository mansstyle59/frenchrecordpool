import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Search, Disc3, LogIn, LogOut, Shield, Mic2, Eye, EyeOff, User, Menu,
  Home, Sparkles, Music2, Download, CreditCard, Users as UsersIcon, Clapperboard,
  ListMusic, Layers, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import SupportLauncher from "@/components/SupportLauncher";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import CmsText from "@/components/cms/CmsText";
import CmsLink from "@/components/cms/CmsLink";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ─── Navigation config (DJcity-like: dense top nav + sub-nav) ──────────────
const NAV_MAIN = [
  { key: "nav.new", to: "/new", label: "Nouveautés", icon: Sparkles },
  { key: "nav.playlists", to: "/playlists", label: "Playlists", icon: ListMusic },
  { key: "nav.djs", to: "/remixers", label: "DJ & Remixers", icon: Mic2 },
  { key: "nav.artists", to: "/artists", label: "Artistes", icon: Music2 },
  { key: "nav.stems", to: "/stems", label: "Stems", icon: Layers },
  { key: "nav.shorts", to: "/shorts", label: "Shorts", icon: Clapperboard },
];

const NAV_SUB = [
  { key: "nav.home", to: "/", label: "Accueil", end: true },
  { key: "nav.new", to: "/new", label: "Nouveautés" },
  { key: "nav.playlists", to: "/playlists", label: "Playlists" },
  { key: "nav.djs", to: "/remixers", label: "DJ & Remixers" },
  { key: "nav.artists", to: "/artists", label: "Artistes" },
  { key: "nav.stems", to: "/stems", label: "Stems" },
  { key: "nav.shorts", to: "/shorts", label: "Shorts" },
  { key: "nav.pricing", to: "/pricing", label: "Abonnements" },
];

// ─── Mobile drawer ─────────────────────────────────────────────────────────
function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, realIsAdmin, viewAsUser, setViewAsUser, profile, signOut } = useAuth();

  const close = () => onOpenChange(false);
  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const Item = ({ to, label, icon: Icon, end }: any) => (
    <NavLink
      to={to}
      end={end}
      onClick={close}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium min-h-11",
        "transition-colors",
        isActive(to, end)
          ? "bg-primary/15 text-primary"
          : "text-foreground/80 hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate"><CmsText editKey={`nav.${label}`} fallback={label}>{label}</CmsText></span>
    </NavLink>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[86vw] max-w-sm p-0 flex flex-col safe-top safe-bottom">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle asChild>
            <Link to="/" onClick={close} className="flex items-center gap-2">
              <Disc3 className="h-6 w-6 text-primary animate-pulse-glow" />
              <span className="font-display text-xl font-bold gradient-text">French Record Pool</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <CmsText editKey="nav.group.discover">Découvrir</CmsText>
            </p>
            <div className="space-y-1">
              <Item to="/" label="Accueil" icon={Home} end />
              {NAV_MAIN.map((n) => <Item key={n.to} {...n} />)}
            </div>
          </div>

          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <CmsText editKey="nav.group.account">Mon compte</CmsText>
            </p>
            <div className="space-y-1">
              <Item to="/downloads" label="Mes téléchargements" icon={Download} />
              <Item to="/pricing" label="Abonnements" icon={CreditCard} />
              {user && <Item to="/dashboard" label={profile?.dj_name || "Tableau de bord"} icon={User} />}
              {user && <Item to="/dj" label="Espace DJ" icon={Mic2} />}
              {isAdmin && <Item to="/admin" label="Administration" icon={Shield} />}
            </div>
          </div>
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          {realIsAdmin && (
            <button
              onClick={() => setViewAsUser(!viewAsUser)}
              className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-sm min-h-11 hover:bg-secondary"
            >
              {viewAsUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{viewAsUser ? "Repasser en admin" : "Aperçu utilisateur"}</span>
            </button>
          )}
          {user ? (
            <button
              onClick={async () => { await signOut(); close(); navigate("/"); }}
              className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-sm min-h-11 hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
              <span>Se déconnecter</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button asChild variant="outline" className="min-h-11">
                <Link to="/login" onClick={close}><LogIn className="h-4 w-4 mr-2" />Se connecter</Link>
              </Button>
              <Button asChild variant="hero" className="min-h-11">
                <Link to="/signup" onClick={close}>Créer un compte</Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Desktop main nav (visible ≥ lg) ───────────────────────────────────────
function DesktopNav() {
  const { pathname } = useLocation();
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {NAV_MAIN.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-semibold tracking-wide transition-colors",
            isActive(n.to)
              ? "text-primary bg-primary/10"
              : "text-foreground/75 hover:text-foreground hover:bg-secondary",
          )}
        >
          <CmsText editKey={n.key}>{n.label}</CmsText>
        </NavLink>
      ))}
    </nav>
  );
}

// ─── Sticky sub-nav pill row (mobile + tablet) ─────────────────────────────
function SubNav() {
  const { pathname } = useLocation();
  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <div className="lg:hidden border-b border-border bg-background/80 backdrop-blur-md">
      <div className="scroll-x scrollbar-none flex items-center gap-1.5 px-3 py-2">
        {NAV_SUB.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
              isActive(n.to, n.end)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground/70 hover:text-foreground",
            )}
          >
            <CmsText editKey={n.key}>{n.label}</CmsText>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { currentTrack } = usePlayer();

  return (
    <div className="min-h-dvh flex flex-col w-full bg-background">
      {/* ─── Top header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass safe-top border-b border-border">
        <div className="container flex items-center gap-2 sm:gap-4 h-14 sm:h-16">
          {/* Mobile burger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-11 min-w-11"
            aria-label="Ouvrir le menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Disc3 className="h-6 w-6 text-primary animate-pulse-glow" />
            <span className="font-display text-lg sm:text-xl font-bold gradient-text hidden xs:inline">
              French Record Pool
            </span>
          </Link>

          {/* Desktop main nav */}
          <div className="ml-6 flex-1">
            <DesktopNav />
          </div>

          {/* Search (desktop inline / mobile toggle) */}
          <div className="flex-1 lg:flex-none lg:w-72 max-w-md ml-auto lg:ml-0">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher un titre, un artiste…"
                className="pl-9 bg-secondary/60 border-border h-10"
                aria-label="Rechercher"
              />
            </div>
            {searchOpen && (
              <div className="md:hidden absolute inset-x-0 top-full bg-background border-b border-border p-2">
                <Input
                  autoFocus
                  placeholder="Rechercher…"
                  className="bg-secondary border-border"
                  onBlur={() => setSearchOpen(false)}
                  aria-label="Rechercher"
                />
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-h-11 min-w-11"
              aria-label="Rechercher"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <ThemeToggle />

            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 min-h-11 hidden sm:inline-flex"
                      aria-label="Menu utilisateur"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold text-xs">
                        {(profile?.dj_name || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <span className="hidden md:inline text-sm font-semibold max-w-[100px] truncate">
                        {profile?.dj_name || "Compte"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{profile?.dj_name || "Mon compte"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/dashboard"><User className="h-4 w-4 mr-2" />Tableau de bord</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/downloads"><Download className="h-4 w-4 mr-2" />Mes téléchargements</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/dj"><Mic2 className="h-4 w-4 mr-2" />Espace DJ</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/pricing"><CreditCard className="h-4 w-4 mr-2" />Abonnements</Link></DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link to="/admin" className="text-primary"><Shield className="h-4 w-4 mr-2" />Administration</Link></DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                      <LogOut className="h-4 w-4 mr-2" />Se déconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm" className="gap-1 min-h-11">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden md:inline"><CmsText editKey="nav.signin">Se connecter</CmsText></span>
                  </Button>
                </Link>
                <Link to="/signup" className="hidden xs:inline-flex">
                  <Button variant="hero" size="sm" className="min-h-11">
                    <CmsText editKey="nav.signup">Créer un compte</CmsText>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <SubNav />
      </header>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />

      <ViewAsUserBanner />

      <main className={cn("flex-1 min-w-0", currentTrack ? "pb-24 sm:pb-20" : "")}>{children}</main>

      <footer className={cn("border-t border-border py-8 mt-12", currentTrack ? "mb-20 sm:mb-16" : "")}>
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Disc3 className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold gradient-text">French Record Pool</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <CmsLink editKey="footer.link.new" defaultLabel="Nouveautés" defaultUrl="/new" className="hover:text-foreground transition-colors" />
              <CmsLink editKey="footer.link.djs" defaultLabel="DJ & Remixers" defaultUrl="/remixers" className="hover:text-foreground transition-colors" />
              <CmsLink editKey="footer.link.artists" defaultLabel="Artistes" defaultUrl="/artists" className="hover:text-foreground transition-colors" />
              <CmsLink editKey="footer.link.pricing" defaultLabel="Abonnements" defaultUrl="/pricing" className="hover:text-foreground transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground">
              <CmsText editKey="footer.copyright">© 2026 French Record Pool. Tous droits réservés.</CmsText>
            </p>
          </div>
        </div>
      </footer>

      <SupportLauncher />
    </div>
  );
}
