import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Palette, Blocks, MessageCircle, Camera, ArrowRight, Eye, EyeOff,
  Type, Sparkles, Clock, Users, Smartphone, Monitor, Power, ExternalLink,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

function Swatch({ hsl, label }: { hsl: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="h-12 w-12 rounded-lg border border-border shadow-sm"
        style={{ background: `hsl(${hsl})` }}
        title={`hsl(${hsl})`}
      />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

function SectionCard({
  icon: Icon, title, desc, to, accent, children, action,
}: {
  icon: any; title: string; desc: string; to: string; accent?: string;
  children?: React.ReactNode; action?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="h-full flex flex-col overflow-hidden group hover:border-primary/40 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: accent ?? "hsl(var(--primary) / 0.12)" }}
              >
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{title}</CardTitle>
                <CardDescription className="text-xs line-clamp-1">{desc}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          <div className="flex-1">{children}</div>
          <Button asChild variant="outline" size="sm" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Link to={to}>
              {action ?? "Configurer"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminPersonalization() {
  const { branding } = useBranding();

  const { data: widgets = [] } = useQuery({
    queryKey: ["admin-perso-widgets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("home_widgets")
        .select("id,type,is_active,position,audience,devices,config")
        .order("position");
      return data ?? [];
    },
  });

  const { data: popups = [] } = useQuery({
    queryKey: ["admin-perso-popups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("popups")
        .select("id,name,title,is_active,starts_at,ends_at,audience,devices,trigger_type,priority")
        .order("priority", { ascending: false });
      return data ?? [];
    },
  });

  const activeWidgets = widgets.filter((w: any) => w.is_active);
  const activePopups = popups.filter((p: any) => {
    if (!p.is_active) return false;
    const now = Date.now();
    if (p.starts_at && new Date(p.starts_at).getTime() > now) return false;
    if (p.ends_at && new Date(p.ends_at).getTime() < now) return false;
    return true;
  });
  const scheduledPopups = popups.filter((p: any) =>
    p.is_active && p.starts_at && new Date(p.starts_at).getTime() > Date.now()
  );

  return (
    <AdminLayout
      title="Personnalisation"
      subtitle="Centre de contrôle visuel : thème, widgets de la home, popups et captures marketing."
      wide
      actions={
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Voir le site
          </Link>
        </Button>
      }
    >
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Widgets actifs", value: activeWidgets.length, total: widgets.length, icon: Blocks },
          { label: "Popups en cours", value: activePopups.length, total: popups.length, icon: MessageCircle },
          { label: "Popups planifiés", value: scheduledPopups.length, total: 0, icon: Clock },
          { label: "Thème", value: branding?.font_display ?? "—", total: 0, icon: Palette, isText: true },
        ].map((k, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">{k.label}</div>
                <div className="text-xl font-bold mt-1 truncate">
                  {k.isText ? k.value : k.value}
                  {!k.isText && k.total > 0 && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">/ {k.total}</span>
                  )}
                </div>
              </div>
              <k.icon className="h-5 w-5 text-primary shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Branding card */}
        <SectionCard
          icon={Palette}
          title="Branding"
          desc="Couleurs, typographies, logo"
          to="/admin/branding"
          action="Éditer le thème"
        >
          {branding && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <Swatch hsl={branding.light_primary} label="Primary" />
                <Swatch hsl={branding.light_accent} label="Accent" />
                <Swatch hsl={branding.light_background} label="BG" />
                <Swatch hsl={branding.light_foreground} label="Texte" />
              </div>
              <div className="rounded-lg border border-border p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                  <Type className="h-3 w-3" /> Typographies
                </div>
                <div
                  className="text-sm font-semibold truncate"
                  style={{ fontFamily: `"${branding.font_display}"` }}
                >
                  {branding.font_display}
                </div>
                <div
                  className="text-xs text-muted-foreground truncate"
                  style={{ fontFamily: `"${branding.font_body}"` }}
                >
                  {branding.font_body} · radius {branding.radius}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Widgets card */}
        <SectionCard
          icon={Blocks}
          title="Widgets Home"
          desc="Sections de la page d'accueil"
          to="/admin/widgets"
          action="Gérer les widgets"
        >
          {widgets.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun widget configuré.</p>
          ) : (
            <ul className="space-y-1.5">
              {widgets.slice(0, 6).map((w: any) => (
                <li key={w.id} className="flex items-center gap-2 text-xs">
                  {w.is_active ? (
                    <Power className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className={`truncate flex-1 ${w.is_active ? "" : "text-muted-foreground line-through"}`}>
                    {w.config?.title || w.type}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                    {w.type}
                  </Badge>
                </li>
              ))}
              {widgets.length > 6 && (
                <li className="text-[10px] text-muted-foreground italic pt-1">
                  + {widgets.length - 6} autre{widgets.length - 6 > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          )}
        </SectionCard>

        {/* Popups card */}
        <SectionCard
          icon={MessageCircle}
          title="Popups"
          desc="Messages contextuels et annonces"
          to="/admin/popups"
          action="Gérer les popups"
        >
          {popups.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun popup créé.</p>
          ) : (
            <ul className="space-y-1.5">
              {popups.slice(0, 5).map((p: any) => {
                const isLive = activePopups.some((ap: any) => ap.id === p.id);
                const isScheduled = scheduledPopups.some((sp: any) => sp.id === p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2 text-xs">
                    {isLive ? (
                      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                    ) : isScheduled ? (
                      <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
                    )}
                    <span className="truncate flex-1">{p.title || p.name}</span>
                    {p.ends_at && isLive && (
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        fin {formatDistanceToNow(new Date(p.ends_at), { locale: fr, addSuffix: false })}
                      </span>
                    )}
                  </li>
                );
              })}
              {popups.length > 5 && (
                <li className="text-[10px] text-muted-foreground italic pt-1">
                  + {popups.length - 5} autre{popups.length - 5 > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          )}
        </SectionCard>

        {/* Screenshot Studio card */}
        <SectionCard
          icon={Camera}
          title="Screenshot Studio"
          desc="Captures et visuels marketing"
          to="/admin/screenshot-studio"
          action="Ouvrir le studio"
        >
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <Sparkles className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p>Générez des visuels pour réseaux sociaux, presse et campagnes.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Live preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Aperçu en direct
            </CardTitle>
            <CardDescription>Rendu actuel de la page d'accueil avec le thème et les widgets actifs.</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1">
              <Monitor className="h-3 w-3" /> Desktop
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
            <iframe
              src="/"
              title="Aperçu home"
              className="w-full h-[600px] bg-background"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
