import { Link } from "react-router-dom";
import { Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { titleStyle, bodyStyle } from "@/lib/widgetTypography";

export default function WelcomeBanner({ config }: { config: any }) {
  const { user, profile, hasActiveSubscription } = useAuth();

  const variant = !user
    ? "anon"
    : hasActiveSubscription
    ? "subscribed"
    : "registered";

  const data =
    variant === "subscribed"
      ? {
          eyebrow: config.eyebrow_subscribed || "Bienvenue",
          title:
            config.title_subscribed?.replace("{name}", profile?.dj_name || profile?.email?.split("@")[0] || "DJ") ||
            `Bon retour, ${profile?.dj_name || profile?.email?.split("@")[0] || "DJ"}`,
          body: config.body_subscribed || "Profite de tes téléchargements illimités.",
          cta: config.cta_subscribed || "Voir les nouveautés",
          url: config.cta_subscribed_url || "/new",
          icon: Crown,
          accent: "bg-accent/15 text-accent",
        }
      : variant === "registered"
      ? {
          eyebrow: config.eyebrow_registered || "Bienvenue",
          title: config.title_registered || "Active ton accès complet",
          body: config.body_registered || "Choisis ton plan pour télécharger toutes les exclus.",
          cta: config.cta_registered || "Voir les abonnements",
          url: config.cta_registered_url || "/pricing",
          icon: Sparkles,
          accent: "bg-primary/15 text-primary",
        }
      : {
          eyebrow: config.eyebrow_anon || "Nouveau ici ?",
          title: config.title_anon || "Le pool des DJs francophones",
          body: config.body_anon || "Crée ton compte gratuit et découvre les exclus.",
          cta: config.cta_anon || "Créer un compte",
          url: config.cta_anon_url || "/signup",
          icon: Sparkles,
          accent: "bg-primary/15 text-primary",
        };

  const Icon = data.icon;
  const bg = config.bg_url;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 md:p-10">
      {bg && (
        <img
          src={bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative max-w-3xl">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${data.accent}`}
        >
          <Icon className="h-3 w-3" /> {data.eyebrow}
        </span>
        <h2
          className="font-display text-3xl md:text-5xl font-black tracking-tight mb-3"
          style={titleStyle(config.typo)}
        >
          {data.title}
        </h2>
        <p
          className="text-muted-foreground md:text-lg mb-6 max-w-2xl"
          style={bodyStyle(config.typo)}
        >
          {data.body}
        </p>
        <Button asChild size="lg">
          <Link to={data.url}>{data.cta}</Link>
        </Button>
      </div>
    </div>
  );
}
