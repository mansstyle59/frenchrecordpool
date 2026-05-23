import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Search, Disc3, LogIn, LogOut, Shield, Mic2, Eye, EyeOff, User,
  Home, Sparkles, Music2, Download, CreditCard, Users as UsersIcon, Clapperboard,
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
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";

const NAV_MAIN = [
  { key: "nav.home", to: "/", label: "Accueil", icon: Home, end: true },
  { key: "nav.new", to: "/new", label: "Nouveautés", icon: Sparkles },
  { key: "nav.shorts", to: "/shorts", label: "Shorts", icon: Clapperboard },
  { key: "nav.artists", to: "/remixers", label: "Remixers", icon: Mic2 },
  { key: "nav.stems", to: "/stems", label: "Stems", icon: Music2 },
];

const NAV_ACCOUNT = [
  { key: "nav.downloads", to: "/downloads", label: "Téléchargements", icon: Download },
  { key: "nav.pricing", to: "/pricing", label: "Tarifs", icon: CreditCard },
];

function PublicSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, realIsAdmin, viewAsUser, setViewAsUser, profile, signOut } = useAuth();

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.();
    navigate("/");
  };

  const renderItem = (item: { key: string; to: string; label: string; icon: any; end?: boolean }) => (
    <SidebarMenuItem key={item.to}>
      <SidebarMenuButton asChild isActive={isActive(item.to, item.end)} tooltip={item.label}>
        <NavLink to={item.to} end={item.end} onClick={onNavigate} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          <span><CmsText editKey={item.key}>{item.label}</CmsText></span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2 px-2 py-2">
          <Disc3 className="h-6 w-6 text-primary shrink-0 animate-pulse-glow" />
          <span className="font-display font-bold gradient-text truncate group-data-[collapsible=icon]:hidden">
            French Record Pool
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Catalogue</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{NAV_MAIN.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Compte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{NAV_ACCOUNT.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Espaces</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard")} tooltip="Mon compte">
                    <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{profile?.dj_name || "Mon compte"}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dj")} tooltip="Espace DJ">
                    <NavLink to="/dj" onClick={onNavigate} className="flex items-center gap-2">
                      <Mic2 className="h-4 w-4" />
                      <span>Espace DJ</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")} tooltip="Admin">
                      <NavLink to="/admin" onClick={onNavigate} className="flex items-center gap-2 text-primary">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        {user ? (
          <SidebarMenu>
            {realIsAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={viewAsUser ? "Quitter aperçu" : "Voir comme user"}
                  onClick={() => setViewAsUser(!viewAsUser)}
                >
                  {viewAsUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{viewAsUser ? "Quitter aperçu" : "Voir comme user"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Déconnexion" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Connexion">
                <Link to="/login" onClick={onNavigate} className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Connexion</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="S'inscrire" className="text-primary">
                <Link to="/signup" onClick={onNavigate} className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />
                  <span>S'inscrire</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAdmin, profile } = useAuth();
  const { currentTrack } = usePlayer();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PublicSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 glass safe-top border-b border-border">
            <div className="flex items-center gap-2 sm:gap-3 h-14 sm:h-16 px-3 sm:px-4">
              <SidebarTrigger />


              <div className="ml-auto flex items-center gap-2">
                {searchOpen && (
                  <Input
                    placeholder="Rechercher un titre, remixeur..."
                    className="w-48 lg:w-64 bg-secondary border-border"
                    autoFocus
                    onBlur={() => setSearchOpen(false)}
                  />
                )}
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} aria-label="Rechercher">
                  <Search className="h-4 w-4" />
                </Button>
                <ThemeToggle />

                {user ? (
                  <>
                    <NotificationBell />
                    {isAdmin && (
                      <Link to="/admin" className="hidden md:inline-flex">
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
                  <>
                    <Link to="/login" className="hidden sm:inline-flex">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <LogIn className="h-4 w-4" /> Connexion
                      </Button>
                    </Link>
                    <Link to="/signup" className="hidden sm:inline-flex">
                      <Button variant="hero" size="sm">S'inscrire</Button>
                    </Link>
                  </>
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
                  
                  <CmsLink editKey="footer.link.artists" defaultLabel="Remixers" defaultUrl="/remixers" className="hover:text-foreground transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground">
                  <CmsText editKey="footer.copyright">© 2026 French Record Pool. Tous droits réservés.</CmsText>
                </p>
              </div>
            </div>
          </footer>
        </div>
        <SupportLauncher />
      </div>
    </SidebarProvider>
  );
}

