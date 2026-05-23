import { ReactNode, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Disc3, LayoutDashboard, Music, Upload, ArrowLeft, ExternalLink, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import NotificationBell from "@/components/NotificationBell";

const items = [
  { to: "/dj", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dj/tracks", label: "Mes morceaux", icon: Music },
  { to: "/dj/upload", label: "Nouveau morceau", icon: Upload },
  { to: "/dj/profile", label: "Mon profil artiste", icon: UserCircle },
];

function DjSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dj" className="flex items-center gap-2 px-2 py-2">
          <Disc3 className="h-6 w-6 text-primary shrink-0" />
          <span className="font-display font-bold gradient-text truncate group-data-[collapsible=icon]:hidden">
            Espace DJ
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pilotage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <NavLink to={item.to} end={item.end} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Retour au site">
              <Link to="/" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <span>Retour au site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function DjLayout({ title, subtitle, actions, children }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }
  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DjSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border glass sticky top-0 z-30 flex items-center gap-3 px-4">
            <SidebarTrigger />
            <Link to="/dj" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Espace DJ
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              {actions}
            </div>
          </header>
          <main className="flex-1 container py-6 space-y-6">
            {title && (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 backdrop-blur-xl px-5 py-5 sm:px-6 sm:py-6">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent" />
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold mb-1">Espace DJ</p>
                    <h1 className="font-display text-3xl md:text-4xl font-black leading-none tracking-tight truncate">{title}</h1>
                    {subtitle && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>}
                  </div>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
