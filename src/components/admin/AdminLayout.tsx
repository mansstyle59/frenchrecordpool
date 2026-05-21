import { ReactNode, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Disc3, LayoutDashboard, Music, Users, CreditCard, Palette, ScrollText,
  ArrowLeft, ExternalLink, Layers, Ticket, Mic2, Inbox,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/tracks", label: "Tracks", icon: Music },
  { to: "/admin/queue", label: "File de modération", icon: Inbox },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/artists", label: "DJs / Artistes", icon: Mic2 },
  { to: "/admin/plans", label: "Plans", icon: Layers },
  { to: "/admin/subscriptions", label: "Abonnements", icon: CreditCard },
  { to: "/admin/promo-codes", label: "Codes promo", icon: Ticket },
  { to: "/admin/branding", label: "Branding", icon: Palette },
  { to: "/admin/audit", label: "Journal", icon: ScrollText },
];


function AdminSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2">
          <Disc3 className="h-6 w-6 text-primary shrink-0" />
          <span className="font-display font-bold gradient-text truncate group-data-[collapsible=icon]:hidden">
            Admin
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

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** When true, content takes full width without container constraint */
  wide?: boolean;
}

export default function AdminLayout({ title, subtitle, actions, children, wide }: AdminLayoutProps) {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border glass sticky top-0 z-30 flex items-center gap-3 px-4">
            <SidebarTrigger />
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Admin
            </Link>
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          </header>

          <main className={wide ? "flex-1 px-4 lg:px-6 py-6 space-y-6" : "flex-1 container py-6 space-y-6"}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
