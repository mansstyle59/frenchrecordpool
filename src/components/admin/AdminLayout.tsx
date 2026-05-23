import { ReactNode, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Disc3, ExternalLink, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { ADMIN_NAV, findAdminItem, findAdminGroup } from "./adminNav";
import AdminCommandPalette from "./AdminCommandPalette";

function useAdminBadges() {
  const { data: supportUnread = 0 } = useQuery({
    queryKey: ["admin-support-unread-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_threads")
        .select("id", { count: "exact", head: true })
        .eq("unread_for_admin", true);
      return count ?? 0;
    },
    refetchInterval: 15000,
  });
  const { data: pendingQueue = 0 } = useQuery({
    queryKey: ["admin-queue-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("tracks")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 30000,
  });
  return { supportUnread, pendingQueue };
}

function Badge({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold group-data-[collapsible=icon]:hidden">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function AdminSidebar() {
  const { pathname } = useLocation();
  const { supportUnread, pendingQueue } = useAdminBadges();

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
        {ADMIN_NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
                  const badge =
                    item.to === "/admin/support" ? supportUnread :
                    item.to === "/admin/queue" ? pendingQueue : 0;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <NavLink to={item.to} end={item.end} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1 truncate">{item.label}</span>
                          <Badge value={badge} />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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

function Breadcrumbs() {
  const { pathname } = useLocation();
  const item = findAdminItem(pathname);
  const group = findAdminGroup(item);
  return (
    <nav aria-label="Fil d'ariane" className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      <Link to="/admin" className="hover:text-foreground">Admin</Link>
      {group && group.label !== "Pilotage" && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate">{group.label}</span>
        </>
      )}
      {item && item.to !== "/admin" && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium truncate">{item.label}</span>
        </>
      )}
    </nav>
  );
}

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
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
            <Breadcrumbs />
            <div className="ml-auto flex items-center gap-2">
              <AdminCommandPalette />
              <NotificationBell />
              {actions}
            </div>
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
