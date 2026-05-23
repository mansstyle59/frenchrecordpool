import {
  LayoutDashboard, Music, Inbox, Clapperboard, ListMusic, Mic2,
  Users, MessageSquare, CreditCard, Layers, Ticket,
  Palette, Camera, Blocks, MessageCircle, ScrollText, Sparkles, type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  desc?: string;
  end?: boolean;
  keywords?: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Pilotage",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, desc: "Vue d'ensemble", keywords: "accueil home stats" },
    ],
  },
  {
    label: "Contenu",
    items: [
      { to: "/admin/tracks", label: "Tracks", icon: Music, desc: "Catalogue audio", keywords: "musique chansons upload" },
      { to: "/admin/queue", label: "File de modération", icon: Inbox, desc: "Soumissions DJ en attente", keywords: "moderation pending review" },
      { to: "/admin/shorts", label: "Shorts DJ", icon: Clapperboard, desc: "Vidéos YouTube courtes", keywords: "video youtube" },
      { to: "/admin/playlists", label: "Playlists", icon: ListMusic, desc: "Spotify, Deezer, internes", keywords: "spotify deezer soundcloud" },
      { to: "/admin/artists", label: "DJs & Remixers", icon: Mic2, desc: "Fiches artistes", keywords: "artistes producteurs" },
    ],
  },
  {
    label: "Communauté",
    items: [
      { to: "/admin/users", label: "Utilisateurs", icon: Users, desc: "Comptes et rôles", keywords: "membres dj clients" },
      { to: "/admin/support", label: "Support", icon: MessageSquare, desc: "Conversations clients", keywords: "tickets messages aide" },
    ],
  },
  {
    label: "Monétisation",
    items: [
      { to: "/admin/plans", label: "Plans", icon: Layers, desc: "Offres d'abonnement", keywords: "tarifs prix" },
      { to: "/admin/subscriptions", label: "Abonnements", icon: CreditCard, desc: "Statuts Stripe", keywords: "stripe paiements" },
      { to: "/admin/promo-codes", label: "Codes promo", icon: Ticket, desc: "Réductions et offres", keywords: "discount coupon" },
    ],
  },
  {
    label: "Personnalisation",
    items: [
      { to: "/admin/personnalisation", label: "Vue d'ensemble", icon: Sparkles, desc: "Hub thème, widgets, popups", keywords: "personnalisation hub overview apercu" },
      { to: "/admin/branding", label: "Branding", icon: Palette, desc: "Couleurs, logos, typo", keywords: "theme design couleurs" },
      { to: "/admin/widgets", label: "Widgets Home", icon: Blocks, desc: "Sections de l'accueil", keywords: "homepage modules" },
      { to: "/admin/popups", label: "Popups", icon: MessageCircle, desc: "Messages contextuels", keywords: "modal annonce" },
      { to: "/admin/screenshot-studio", label: "Screenshot Studio", icon: Camera, desc: "Captures marketing", keywords: "screenshot capture" },
    ],
  },
  {
    label: "Système",
    items: [
      { to: "/admin/audit", label: "Journal d'audit", icon: ScrollText, desc: "Historique des actions", keywords: "logs historique audit" },
    ],
  },
];

export const ALL_ADMIN_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((g) => g.items);

export function findAdminItem(pathname: string): AdminNavItem | undefined {
  // exact first, then longest prefix match
  const exact = ALL_ADMIN_ITEMS.find((i) => i.to === pathname);
  if (exact) return exact;
  return [...ALL_ADMIN_ITEMS]
    .filter((i) => !i.end && pathname.startsWith(i.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

export function findAdminGroup(item?: AdminNavItem): AdminNavGroup | undefined {
  if (!item) return undefined;
  return ADMIN_NAV.find((g) => g.items.includes(item));
}
