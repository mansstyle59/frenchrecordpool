export interface InternalRoute {
  path: string;
  label: string;
  group: "Public" | "Compte" | "DJ" | "Admin";
}

export const INTERNAL_ROUTES: InternalRoute[] = [
  { path: "/", label: "Accueil", group: "Public" },
  { path: "/new", label: "Nouveautés", group: "Public" },
  { path: "/genres", label: "Genres", group: "Public" },
  { path: "/remixers", label: "Remixers", group: "Public" },
  { path: "/stems", label: "Stems / Acapellas", group: "Public" },
  { path: "/pricing", label: "Tarifs", group: "Public" },
  { path: "/login", label: "Connexion", group: "Compte" },
  { path: "/signup", label: "Inscription", group: "Compte" },
  { path: "/forgot-password", label: "Mot de passe oublié", group: "Compte" },
  { path: "/dashboard", label: "Tableau de bord", group: "Compte" },
  { path: "/downloads", label: "Téléchargements", group: "Compte" },
  { path: "/dj", label: "Espace DJ", group: "DJ" },
  { path: "/dj/tracks", label: "Mes morceaux (DJ)", group: "DJ" },
  { path: "/dj/upload", label: "Uploader (DJ)", group: "DJ" },
  { path: "/admin", label: "Admin – Dashboard", group: "Admin" },
  { path: "/admin/tracks", label: "Admin – Morceaux", group: "Admin" },
  { path: "/admin/users", label: "Admin – Utilisateurs", group: "Admin" },
  { path: "/admin/branding", label: "Admin – Branding", group: "Admin" },
  { path: "/admin/widgets", label: "Admin – Widgets", group: "Admin" },
  { path: "/admin/popups", label: "Admin – Popups", group: "Admin" },
];
