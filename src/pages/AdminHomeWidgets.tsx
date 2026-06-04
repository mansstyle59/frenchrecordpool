import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Save, X, Mail, Clock, Megaphone, Users, Code as CodeIcon,
  GripVertical, Image as ImageIcon, ListMusic, Sparkles, MousePointerClick,
  Type, Video, Eye, EyeOff, Smartphone, Monitor, Pencil, Undo2, CheckCircle2,
  BarChart3, Tag, Star, HelpCircle, Minus, Quote, Columns, Columns3, Copy, Layout,
  Palette, Wand2, TrendingUp, Disc3, Radio, Download, Newspaper, Instagram,
  Images, Megaphone as MegaphoneIcon, Repeat, Music2, Trophy, Heart, History,
  LayoutTemplate,
} from "lucide-react";

import IconPicker from "@/components/admin/IconPicker";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import HomeWidgets, { type Widget as HWidget } from "@/components/HomeWidgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Widget {
  id?: string;
  type: string;
  position: number;
  config: Record<string, any>;
  is_active: boolean;
  audience?: string | null;
  devices?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  parent_id?: string | null;
  depth?: number;
}

const TYPE_META: Record<string, { label: string; icon: any; desc: string; defaults: any; group: string }> = {
  /* ─── Structure (Page Builder hiérarchique) ─── */
  section: {
    label: "Section", icon: LayoutTemplate, group: "Structure",
    desc: "Conteneur racine avec colonnes (1, 2, 3, 4… ou layouts mixtes 2-1, 1-2)",
    defaults: { layout: "1-1", gap: "md", stack_at: "md" },
  },
  column: {
    label: "Colonne", icon: Columns, group: "Structure",
    desc: "Cellule d'une section. Les widgets glissés dedans s'empilent verticalement.",
    defaults: {},
  },
  hero: {
    label: "Hero / Bannière", icon: Sparkles, group: "Mise en avant",
    desc: "Bannière principale avec titre, sous-titre, CTAs",
    defaults: { title: "Le pool des DJs", highlight: "francophones", subtitle: "Découvre les exclus du moment.", cta_primary_label: "Découvrir", cta_primary_url: "/new" },
  },
  track_grid: {
    label: "Grille de tracks", icon: ListMusic, group: "Catalogue",
    desc: "Liste filtrable de morceaux (récents, populaires, par genre/tag)",
    defaults: { title: "Nouveautés", sort_by: "recent", limit: 8, see_all_url: "/new" },
  },
  artist_carousel: {
    label: "Carrousel d'artistes", icon: Users, group: "Catalogue",
    desc: "Grille d'artistes / remixers (featured ou tous)",
    defaults: { title: "DJs à la une", featured_only: true, limit: 8 },
  },
  cta: {
    label: "CTA / Call to Action", icon: MousePointerClick, group: "Marketing",
    desc: "Bloc de conversion avec gradient + boutons",
    defaults: { title: "Prêt à jouer en live ?", body: "Active ton accès aujourd'hui.", cta_label: "Commencer", cta_url: "/pricing" },
  },
  rich_text: {
    label: "Texte riche", icon: Type, group: "Contenu",
    desc: "Titre + paragraphe libre",
    defaults: { title: "À propos", body: "Texte libre…", align: "center" },
  },
  video_embed: {
    label: "Vidéo (YouTube)", icon: Video, group: "Contenu",
    desc: "Intégration vidéo responsive",
    defaults: { title: "", url: "" },
  },
  dj_shorts: {
    label: "Shorts DJ (carrousel)", icon: Video, group: "Mise en avant",
    desc: "Carrousel horizontal des Shorts DJ — lien vers /shorts",
    defaults: { title: "Shorts DJ", limit: 8, see_all_url: "/shorts" },
  },
  newsletter: {
    label: "Newsletter", icon: Mail, group: "Marketing",
    desc: "Capture e-mails", defaults: { title: "Reste informé", body: "Nos exclus par e-mail.", cta_label: "S'inscrire" },
  },
  countdown: {
    label: "Compte à rebours", icon: Clock, group: "Marketing",
    desc: "Décompte vers une date",
    defaults: { title: "Drop exclusif", tag: "Bientôt", end_date: new Date(Date.now() + 7 * 86400000).toISOString() },
  },
  promo_banner: {
    label: "Bannière promo", icon: Megaphone, group: "Marketing",
    desc: "Bandeau avec image et CTA",
    defaults: { title: "Offre limitée", body: "-50 % le premier mois", tag: "Promo", cta_label: "En profiter", cta_url: "/pricing", bg_color: "220 80% 25%", text_color: "0 0% 100%" },
  },
  stats: {
    label: "Statistiques / Compteurs", icon: BarChart3, group: "Mise en avant",
    desc: "Bandeau de chiffres clés (auto ou manuel)",
    defaults: { title: "La plateforme en chiffres", auto_fetch: true, items: [] },
  },
  genres_cloud: {
    label: "Nuage de genres", icon: Tag, group: "Catalogue",
    desc: "Liens cliquables vers les genres les plus actifs",
    defaults: { title: "Explore par genre", limit: 16 },
  },
  featured_track: {
    label: "Track vedette", icon: Star, group: "Catalogue",
    desc: "Un morceau mis en avant avec cover XL",
    defaults: { tag: "Track de la semaine", track_id: "" },
  },
  testimonials: {
    label: "Témoignages", icon: Quote, group: "Marketing",
    desc: "Citations de DJs / clients",
    defaults: { title: "Ils nous font confiance", items: [{ quote: "Top !", author: "DJ X", role: "Paris" }] },
  },
  faq: {
    label: "FAQ", icon: HelpCircle, group: "Contenu",
    desc: "Accordéon de questions / réponses",
    defaults: { title: "Questions fréquentes", items: [{ question: "Comment ça marche ?", answer: "Inscris-toi puis souscris un plan." }] },
  },
  logos_strip: {
    label: "Logos partenaires", icon: ImageIcon, group: "Marketing",
    desc: "Bande de logos en niveaux de gris",
    defaults: { title: "Ils nous suivent", logos: [] },
  },
  divider: {
    label: "Séparateur / Espacement", icon: Minus, group: "Avancé",
    desc: "Ligne ou espace vide entre deux blocs",
    defaults: { style: "line", label: "" },
  },
  two_columns: {
    label: "2 colonnes (image + texte)", icon: Columns, group: "Contenu",
    desc: "Bloc split avec une image et un texte CTA",
    defaults: { title: "Une histoire à raconter", body: "Texte court qui appuie l'image.", image_position: "left", cta_label: "En savoir plus", cta_url: "/about" },
  },
  html_block: {
    label: "HTML libre", icon: CodeIcon, group: "Avancé",
    desc: "HTML personnalisé", defaults: { html: "<h2>Mon bloc</h2><p>Texte libre.</p>" },
  },
  /* ── Catalogue pack ── */
  top_downloads: {
    label: "Top téléchargements", icon: TrendingUp, group: "Catalogue",
    desc: "Classement par téléchargements (auto)",
    defaults: { title: "Top téléchargements", limit: 8 },
  },
  new_releases: {
    label: "Nouveautés", icon: Sparkles, group: "Catalogue",
    desc: "Derniers morceaux ajoutés",
    defaults: { title: "Nouveautés", limit: 8 },
  },
  top_genre: {
    label: "Top par genre", icon: ListMusic, group: "Catalogue",
    desc: "Meilleurs morceaux d'un genre (auto si vide)",
    defaults: { title: "", genre: "", limit: 6 },
  },
  top_label: {
    label: "Labels en vogue", icon: Disc3, group: "Catalogue",
    desc: "Labels les plus téléchargés",
    defaults: { title: "Labels en vogue", limit: 8 },
  },
  top_artists: {
    label: "Top artistes", icon: Users, group: "Catalogue",
    desc: "Classement automatique par téléchargements cumulés",
    defaults: { title: "Top artistes", limit: 6 },
  },
  /* ── Engagement pack ── */
  slides_carousel: {
    label: "Carrousel slides", icon: Images, group: "Mise en avant",
    desc: "Carrousel plein largeur avec autoplay",
    defaults: { autoplay: true, duration: 5, slides: [{ title: "Slide 1", body: "", image_url: "", cta_label: "Découvrir", cta_url: "/new" }] },
  },
  image_gallery: {
    label: "Galerie d'images", icon: ImageIcon, group: "Contenu",
    desc: "Grille masonry d'images",
    defaults: { title: "Galerie", images: [] },
  },
  marquee: {
    label: "Bandeau marquee", icon: Repeat, group: "Mise en avant",
    desc: "Texte défilant en boucle",
    defaults: { items: "FRESH · NEW · HOT · EXCLUSIVE · 100% DJ" },
  },
  live_counter: {
    label: "Compteur live (inscrits)", icon: Radio, group: "Mise en avant",
    desc: "Compteur d'inscrits en temps réel",
    defaults: { label: "DJs inscrits", cta_label: "Rejoindre", cta_url: "/signup" },
  },
  /* ── Conversion pack ── */
  plans_compare: {
    label: "Comparatif de plans", icon: BarChart3, group: "Marketing",
    desc: "Affiche les plans avec mise en avant",
    defaults: { title: "Choisis ton plan", subtitle: "Sans engagement, résiliable à tout moment.", highlight_slug: "premium" },
  },
  features_grid: {
    label: "Grille de features", icon: Layout, group: "Marketing",
    desc: "Ic\u00f4nes + titre + description en grille",
    defaults: { title: "Pourquoi nous", subtitle: "", items: [
      { icon: "Download", title: "Téléchargements illimités", body: "Récupère tout en haute qualité." },
      { icon: "Sparkles", title: "Mises à jour hebdo", body: "Les exclus de la semaine direct dans ton pool." },
      { icon: "Radio", title: "100% DJ-ready", body: "BPM, key, version : tout est prêt à mixer." },
    ]},
  },
  video_testimonial: {
    label: "Témoignage vidéo", icon: Video, group: "Marketing",
    desc: "Vidéo + citation côte à côte",
    defaults: { quote: "Le pool indispensable de mes sets.", author: "DJ Example", role: "Résident, Paris", video_url: "" },
  },
  sticky_promo: {
    label: "Bandeau promo sticky", icon: MegaphoneIcon, group: "Marketing",
    desc: "Fin bandeau au-dessus du contenu (dismiss)",
    defaults: { title: "-50 % le premier mois", cta_label: "En profiter", cta_url: "/pricing", bg_color: "220 80% 25%", text_color: "0 0% 100%" },
  },
  /* ── Content pack ── */
  blog_cards: {
    label: "Cartes blog / news", icon: Newspaper, group: "Contenu",
    desc: "Articles avec image, catégorie et extrait",
    defaults: { title: "Actus", items: [] },
  },
  team_grid: {
    label: "Équipe / Résidents", icon: Users, group: "Contenu",
    desc: "Grille de membres avec rôle",
    defaults: { title: "L'équipe", items: [] },
  },
  audio_embed: {
    label: "Player Spotify / SoundCloud", icon: Music2, group: "Contenu",
    desc: "Embed audio externe",
    defaults: { title: "", url: "" },
  },
  instagram_feed: {
    label: "Instagram (cartes statiques)", icon: Instagram, group: "Contenu",
    desc: "Grille de visuels Instagram (sans API)",
    defaults: { title: "Sur Instagram", handle: "", items: [] },
  },
  /* ── Nouveaux widgets ── */
  top_downloads_period: {
    label: "Top téléchargements (période)", icon: TrendingUp, group: "Catalogue",
    desc: "Classement par téléchargements sur 7 j / 30 j / tout",
    defaults: { title: "Top téléchargements", period: "7d", limit: 8, see_all_url: "/popular" },
  },
  trending_artists: {
    label: "Artistes en hausse", icon: Users, group: "Catalogue",
    desc: "Carrousel des artistes les plus téléchargés (par période)",
    defaults: { title: "Artistes en hausse", period: "7d", limit: 10 },
  },
  featured_genres: {
    label: "Genres en vedette", icon: Tag, group: "Catalogue",
    desc: "Mosaïque de genres cliquables (auto ou manuel)",
    defaults: { title: "Genres en vedette", auto: true, limit: 8, genres: [] },
  },
  welcome_banner: {
    label: "Bannière de bienvenue", icon: Sparkles, group: "Mise en avant",
    desc: "Message personnalisé selon l'état de l'utilisateur (anon / inscrit / abonné)",
    defaults: {
      title_anon: "Le pool des DJs francophones",
      body_anon: "Crée ton compte gratuit et découvre les exclus.",
      cta_anon: "Créer un compte", cta_anon_url: "/signup",
      title_registered: "Active ton accès complet",
      body_registered: "Choisis ton plan pour télécharger toutes les exclus.",
      cta_registered: "Voir les abonnements", cta_registered_url: "/pricing",
      title_subscribed: "Bon retour, {name}",
      body_subscribed: "Profite de tes téléchargements illimités.",
      cta_subscribed: "Voir les nouveautés", cta_subscribed_url: "/new",
    },
  },
  playlists_carousel: {
    label: "Playlists (carrousel)", icon: ListMusic, group: "Mise en avant",
    desc: "Carrousel de playlists Spotify/Deezer/SoundCloud/internes",
    defaults: { title: "Playlists", auto: true, limit: 8, playlist_ids: [], see_all_url: "/playlists" },
  },
  dj_charts: {
    label: "DJ Charts (hebdo ↑↓)", icon: Trophy, group: "Catalogue",
    desc: "Top 10 hebdomadaire avec position et variation vs semaine précédente",
    defaults: { title: "DJ Charts", limit: 10, see_all_url: "/popular" },
  },
  most_favorited: {
    label: "Les plus likés", icon: Heart, group: "Catalogue",
    desc: "Morceaux les plus ajoutés en favoris par la communauté",
    defaults: { title: "Les + likés", limit: 8 },
  },
  recently_played: {
    label: "Écoutés récemment", icon: History, group: "Mise en avant",
    desc: "Historique des previews écoutés par le visiteur (local, masqué si vide)",
    defaults: { title: "Écoutés récemment", limit: 6, show_when_empty: false },
  },
};

/* ─── Presets : ready-to-use widget recipes ─── */
const PRESETS: { id: string; label: string; desc: string; types: string[] }[] = [
  { id: "landing-classic", label: "Landing classique", desc: "Hero + stats + features + plans + FAQ + CTA", types: ["hero", "stats", "features_grid", "plans_compare", "faq", "cta"] },
  { id: "dj-home", label: "Home DJ", desc: "Hero + nouveautés + top + artistes + newsletter", types: ["hero", "new_releases", "top_downloads", "artist_carousel", "newsletter"] },
  { id: "promo-launch", label: "Lancement promo", desc: "Sticky promo + hero + countdown + featured track + CTA", types: ["sticky_promo", "hero", "countdown", "featured_track", "cta"] },
  { id: "editorial", label: "Éditorial", desc: "Hero + 2 colonnes + carrousel slides + blog + témoignages", types: ["hero", "two_columns", "slides_carousel", "blog_cards", "testimonials"] },
];


export default function AdminHomeWidgets() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Widget | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"edit" | "user">("edit");
  // Local draft for composition (order + active flags); committed via "Publier"
  const [draft, setDraft] = useState<Widget[] | null>(null);

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["admin-home-widgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_widgets").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data as Widget[];
    },
  });

  // Sync draft when server data changes & no pending changes
  useEffect(() => {
    if (draft === null) return;
    // keep current draft; user must publish or discard
  }, [widgets]);

  const list: Widget[] = draft ?? widgets;
  const snap = (arr: Widget[]) => JSON.stringify(arr.map(w => ({ id: w.id, position: w.position, is_active: w.is_active, col_span: (w.config as any)?.col_span ?? 2 })));
  const isDirty = draft !== null && snap(draft) !== snap(widgets);

  const upsert = useMutation({
    mutationFn: async (w: Widget) => {
      const payload: any = { ...w };
      if (!payload.id) delete payload.id;
      const { error } = await supabase.from("home_widgets").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      qc.invalidateQueries({ queryKey: ["admin-home-hierarchy"] });
      toast.success("Widget enregistré");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_widgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      setDraft(null);
      toast.success("Widget supprimé");
    },
  });

  /* ─── Phase 1.2 : crée une Section + ses Colonnes en une transaction ─── */
  const createSectionPreset = useMutation({
    mutationFn: async (layout: "1" | "1-1" | "1-1-1" | "1-1-1-1" | "2-1" | "1-2") => {
      const colsCount = layout.split("-").length;
      const basePosition = widgets.length;
      // 1) Section
      const { data: section, error: sErr } = await supabase
        .from("home_widgets")
        .insert({
          type: "section",
          position: basePosition,
          depth: 0,
          parent_id: null,
          is_active: true,
          config: { layout, gap: "md", stack_at: "md" } as any,
        })
        .select()
        .single();
      if (sErr) throw sErr;
      // 2) Colonnes enfants
      const colRows = Array.from({ length: colsCount }, (_, i) => ({
        type: "column",
        position: i,
        depth: 1,
        parent_id: section.id,
        is_active: true,
        config: {} as any,
      }));
      const { error: cErr } = await supabase.from("home_widgets").insert(colRows);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      qc.invalidateQueries({ queryKey: ["admin-home-hierarchy"] });
      toast.success("Section ajoutée");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur"),
  });

  /* ─── Phase 1.2 : « Déplacer vers » — assigne un widget à une colonne ─── */
  const moveToParent = useMutation({
    mutationFn: async ({ id, parent_id }: { id: string; parent_id: string | null }) => {
      const { error } = await supabase
        .from("home_widgets")
        .update({ parent_id, depth: parent_id ? 2 : 0 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      qc.invalidateQueries({ queryKey: ["admin-home-hierarchy"] });
      toast.success("Widget déplacé");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur"),
  });

  /* ─── Phase 1.2 : Convertit le flat legacy en sections/colonnes ─── */
  const convertToSections = useMutation({
    mutationFn: async () => {
      // On groupe les widgets racine non-structure par "lignes" basées sur col_span (somme = 1).
      // col_span: 2 = pleine (1/1), 1 = 1/2, 3 = 1/3.
      const orphans = widgets
        .filter((w) => !w.parent_id && w.type !== "section" && w.type !== "column")
        .sort((a, b) => a.position - b.position);
      if (orphans.length === 0) {
        toast.info("Rien à convertir : pas de widget racine");
        return;
      }
      type Row = { layout: string; widgets: typeof orphans };
      const rows: Row[] = [];
      let buf: typeof orphans = [];
      let sum = 0;
      const fracOf = (w: typeof orphans[number]) => {
        const cs = (w.config as any)?.col_span;
        return cs === 1 ? 1 / 2 : cs === 3 ? 1 / 3 : 1;
      };
      const layoutFor = (chunk: typeof orphans): string => {
        if (chunk.length === 1) return "1";
        if (chunk.length === 2) return "1-1";
        if (chunk.length === 3) return "1-1-1";
        return "1-1-1-1";
      };
      for (const w of orphans) {
        const f = fracOf(w);
        if (sum + f > 1 + 1e-6) {
          if (buf.length) rows.push({ layout: layoutFor(buf), widgets: buf });
          buf = [w];
          sum = f;
        } else {
          buf.push(w);
          sum += f;
        }
        if (sum >= 1 - 1e-6) {
          rows.push({ layout: layoutFor(buf), widgets: buf });
          buf = [];
          sum = 0;
        }
      }
      if (buf.length) rows.push({ layout: layoutFor(buf), widgets: buf });

      let pos = widgets.length; // append after existing
      for (const row of rows) {
        const { data: section, error: sErr } = await supabase
          .from("home_widgets")
          .insert({
            type: "section", position: pos++, depth: 0, parent_id: null, is_active: true,
            config: { layout: row.layout, gap: "md", stack_at: "md" } as any,
          })
          .select()
          .single();
        if (sErr) throw sErr;

        // Colonnes
        const colsCount = row.layout.split("-").length;
        const { data: cols, error: cErr } = await supabase
          .from("home_widgets")
          .insert(
            Array.from({ length: colsCount }, (_, i) => ({
              type: "column", position: i, depth: 1, parent_id: section.id, is_active: true, config: {} as any,
            }))
          )
          .select();
        if (cErr) throw cErr;
        const colIds = (cols ?? []).sort((a, b) => a.position - b.position).map((c) => c.id);

        // Réaffecte chaque widget à sa colonne
        await Promise.all(
          row.widgets.map((w, i) =>
            supabase
              .from("home_widgets")
              .update({ parent_id: colIds[Math.min(i, colIds.length - 1)], depth: 2, position: i })
              .eq("id", w.id!)
          )
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      qc.invalidateQueries({ queryKey: ["admin-home-hierarchy"] });
      toast.success("Composition convertie en sections");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur de conversion"),
  });

  const publishDraft = useMutation({
    mutationFn: async (items: Widget[]) => {
      await Promise.all(items.map((w) =>
        supabase.from("home_widgets")
          .update({ position: w.position, is_active: w.is_active, config: w.config as any })
          .eq("id", w.id!)
      ));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      setDraft(null);
      toast.success("Modifications publiées");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur de publication"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeWidget = list.find((w) => w.id === active.id);
    const overId = String(over.id);

    // Phase 1.3 — drop direct dans une colonne ou à la racine
    if (activeWidget && activeWidget.type !== "section" && activeWidget.type !== "column") {
      if (overId.startsWith("drop-col:")) {
        const colId = overId.slice("drop-col:".length);
        if (activeWidget.parent_id !== colId) {
          moveToParent.mutate({ id: activeWidget.id!, parent_id: colId });
        }
        return;
      }
      if (overId === "drop-root") {
        if (activeWidget.parent_id != null) {
          moveToParent.mutate({ id: activeWidget.id!, parent_id: null });
        }
        return;
      }
    }

    const oldIdx = list.findIndex((w) => w.id === active.id);
    const newIdx = list.findIndex((w) => w.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(list, oldIdx, newIdx).map((w, i) => ({ ...w, position: i }));
    setDraft(next);
  };

  const toggleActiveLocal = (id: string, is_active: boolean) => {
    setDraft(list.map((w) => (w.id === id ? { ...w, is_active } : w)));
  };

  const setColSpanLocal = (id: string, col_span: 1 | 2 | 3) => {
    setDraft(list.map((w) => (w.id === id ? { ...w, config: { ...w.config, col_span } } : w)));
  };

  const addNew = (type: string) => {
    const meta = TYPE_META[type];
    setEditing({
      type, position: list.length, config: { ...meta.defaults }, is_active: true,
    });
  };

  const grouped = Object.entries(TYPE_META).reduce((acc, [k, m]) => {
    (acc[m.group] ??= []).push([k, m]);
    return acc;
  }, {} as Record<string, [string, typeof TYPE_META[string]][]>);

  const activePreview = list.filter((w) => w.is_active) as HWidget[];

  return (
    <AdminLayout title="Widgets Homepage" subtitle="La page d'accueil = des blocs modulaires." wide>
      {/* ─── Top toolbar : mode toggle + draft actions ─── */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 mb-4 bg-background/85 backdrop-blur-xl border-b border-border flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          <button
            onClick={() => setViewMode("edit")}
            className={`relative flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              viewMode === "edit" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" /> Édition
          </button>
          <button
            onClick={() => setViewMode("user")}
            className={`relative flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              viewMode === "user" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Voir comme user
          </button>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          <Button
            size="sm" variant={previewMode === "desktop" ? "secondary" : "ghost"}
            className="h-8 px-2" onClick={() => setPreviewMode("desktop")}
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant={previewMode === "mobile" ? "secondary" : "ghost"}
            className="h-8 px-2" onClick={() => setPreviewMode("mobile")}
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>

        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="ml-auto flex items-center gap-2"
            >
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border">
                Brouillon non publié
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setDraft(null)} disabled={publishDraft.isPending}>
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Annuler
              </Button>
              <Button size="sm" onClick={() => publishDraft.mutate(draft!)} disabled={publishDraft.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {publishDraft.isPending ? "Publication…" : "Publier"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {editing ? (
        <Editor
          widget={editing}
          onCancel={() => setEditing(null)}
          onSave={(w) => upsert.mutate(w)}
          saving={upsert.isPending}
        />
      ) : viewMode === "user" ? (
        /* ─── USER MODE : preview only, full width, no admin chrome ─── */
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-border bg-background overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2 px-4 h-9 border-b border-border bg-muted/40 text-[11px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-3 truncate">frenchrecordpool.com / — vu comme un visiteur</span>
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className={previewMode === "mobile" ? "max-w-[420px] mx-auto py-4" : "py-4"}>
              {activePreview.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-20">
                  Aucun widget actif. Revenez en mode Édition.
                </div>
              ) : (
                <HomeWidgets widgets={activePreview} preview />
              )}
            </div>
          </ScrollArea>
        </motion.div>
      ) : (
        /* ─── EDIT MODE : split list + live preview ─── */
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6 min-h-[700px]">
          {/* LEFT: List + add */}
          <div className="space-y-6">
            {/* ─── Sections : presets de layout 1 clic ─── */}
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-primary">
                    <LayoutTemplate className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
                    Sections (page builder)
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Crée une rangée multi-colonnes puis assigne tes widgets dedans.
                  </p>
                </div>
                <Button
                  size="sm" variant="outline"
                  onClick={() => {
                    if (confirm("Convertir tous les widgets racine en sections multi-colonnes ? L'ordre et les largeurs (col_span) seront préservés.")) {
                      convertToSections.mutate();
                    }
                  }}
                  disabled={convertToSections.isPending}
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  Convertir l'existant
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {([
                  { layout: "1", label: "1 colonne", spans: [12] },
                  { layout: "1-1", label: "2 colonnes", spans: [6, 6] },
                  { layout: "1-1-1", label: "3 colonnes", spans: [4, 4, 4] },
                  { layout: "1-1-1-1", label: "4 colonnes", spans: [3, 3, 3, 3] },
                  { layout: "2-1", label: "2/3 + 1/3", spans: [8, 4] },
                  { layout: "1-2", label: "1/3 + 2/3", spans: [4, 8] },
                ] as const).map((p) => (
                  <button
                    key={p.layout}
                    onClick={() => createSectionPreset.mutate(p.layout as any)}
                    disabled={createSectionPreset.isPending}
                    className="group flex flex-col items-stretch gap-1.5 p-2.5 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
                    title={`Ajouter une section ${p.label}`}
                  >
                    <div className="grid grid-cols-12 gap-1 h-6">
                      {p.spans.map((s, i) => (
                        <div key={i} className={`col-span-${s} rounded bg-primary/20 group-hover:bg-primary/40 transition`} style={{ gridColumn: `span ${s} / span ${s}` }} />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 group-hover:text-primary text-left">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ajouter un widget</Label>
              <div className="mt-3 space-y-3">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.filter(([key]) => key !== "section" && key !== "column").map(([key, meta]) => {
                        const Icon = meta.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => addNew(key)}
                            title={meta.desc}
                            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary/60 hover:bg-primary/5 transition text-xs"
                          >
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">{meta.label}</span>
                            <Plus className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Composition ({list.length})
                </Label>
                <p className="text-[10px] text-muted-foreground">Glisse un widget sur une colonne pour l'y déposer · ou sur la zone « Racine » pour l'en sortir</p>
              </div>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement…</p>
              ) : list.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed text-sm text-muted-foreground">
                  Aucun widget. Ajoute ton premier bloc.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={list.map((w) => w.id!)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-6 gap-2 auto-rows-min">
                      {list.map((w) => (
                        <SortableItem
                          key={w.id}
                          widget={w}
                          allWidgets={list}
                          onEdit={() => setEditing(w)}
                          onRemove={() => confirm("Supprimer ce widget ?") && remove.mutate(w.id!)}
                          onToggle={(v) => toggleActiveLocal(w.id!, v)}
                          onSpanChange={(span) => setColSpanLocal(w.id!, span)}
                          onMoveToParent={(pid) => moveToParent.mutate({ id: w.id!, parent_id: pid })}
                        />
                      ))}
                    </div>
                    <RootDropZone />
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>


          {/* RIGHT: Live preview */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-180px)]">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Aperçu en direct {isDirty && <span className="text-amber-500 normal-case">· brouillon</span>}
            </Label>
            <div className="rounded-2xl border border-border bg-background overflow-hidden h-[calc(100%-28px)]">
              <ScrollArea className="h-full">
                <div className={previewMode === "mobile" ? "max-w-[380px] mx-auto py-4" : "py-4"}>
                  {activePreview.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-20">
                      Active au moins un widget pour le voir ici.
                    </div>
                  ) : (
                    <HomeWidgets widgets={activePreview} preview />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}


/* ─── Sortable item ─── */
function SortableItem({
  widget, allWidgets, onEdit, onRemove, onToggle, onSpanChange, onMoveToParent,
}: {
  widget: Widget;
  allWidgets?: Widget[];
  onEdit: () => void;
  onRemove: () => void;
  onToggle: (v: boolean) => void;
  onSpanChange: (span: 1 | 2 | 3) => void;
  onMoveToParent?: (parentId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id! });
  const meta = TYPE_META[widget.type];
  const Icon = meta?.icon || CodeIcon;
  const raw = (widget.config as any)?.col_span;
  const colSpan: 1 | 2 | 3 = raw === 1 ? 1 : raw === 3 ? 3 : 2;
  // Admin display grid is 6 cols → full=6, half=3, third=2
  const gridSpan = colSpan === 2 ? 6 : colSpan === 1 ? 3 : 2;
  const style: any = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${gridSpan} / span ${gridSpan}`,
  };
  // Cycle: Full → Half → Third → Full
  const nextSpan: 1 | 2 | 3 = colSpan === 2 ? 1 : colSpan === 1 ? 3 : 2;
  const spanLabel = colSpan === 2 ? "Pleine" : colSpan === 1 ? "1/2" : "1/3";
  const SpanIcon = colSpan === 2 ? LayoutTemplate : colSpan === 1 ? Columns : Columns3;
  const nextLabel = nextSpan === 2 ? "pleine largeur" : nextSpan === 1 ? "1/2 (2 colonnes)" : "1/3 (3 colonnes)";

  // Indicateur visuel : section / colonne / widget enfant
  const isStructure = widget.type === "section" || widget.type === "column";
  const isChild = !!widget.parent_id;

  // Construit la liste des colonnes disponibles avec un label lisible
  const columnOptions = (() => {
    if (!allWidgets || isStructure) return [];
    const sections = allWidgets.filter((x) => x.type === "section");
    const cols = allWidgets.filter((x) => x.type === "column");
    return cols.map((c) => {
      const secIdx = sections.findIndex((s) => s.id === c.parent_id);
      const sibCols = cols.filter((x) => x.parent_id === c.parent_id);
      const colIdx = sibCols.findIndex((x) => x.id === c.id) + 1;
      const secLabel = secIdx >= 0 ? `S${secIdx + 1}` : "S?";
      return { id: c.id!, label: `${secLabel} › Colonne ${colIdx}` };
    });
  })();

  // Phase 1.3 — zone de dépôt sur les colonnes pour drop-into-column
  const { setNodeRef: setDropRef, isOver: isOverCol } = useDroppable({
    id: widget.type === "column" ? `drop-col:${widget.id}` : `noop:${widget.id}`,
    disabled: widget.type !== "column",
  });

  return (
    <div
      ref={(node) => { setNodeRef(node); if (widget.type === "column") setDropRef(node); }}
      style={style}
      className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition ${isDragging ? "opacity-50 ring-2 ring-primary" : "hover:border-primary/40"} ${
        widget.type === "section" ? "border-primary/40 bg-primary/[0.03]" :
        widget.type === "column" ? `border-accent/40 bg-accent/[0.03] ml-4 ${isOverCol ? "ring-2 ring-accent bg-accent/10" : ""}` :
        isChild ? "ml-8" : ""
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1" aria-label="Déplacer">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isStructure ? "bg-accent/15" : "bg-primary/10"}`}>
        <Icon className={`h-4 w-4 ${isStructure ? "text-accent" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">{meta?.label || widget.type}</h3>
          {widget.type === "section" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary uppercase">
              {widget.config?.layout || "1"}
            </Badge>
          )}
          {isChild && widget.type !== "section" && widget.type !== "column" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
              dans colonne
            </Badge>
          )}
          {!widget.is_active && <Badge variant="secondary" className="text-[10px] h-4 px-1">Masqué</Badge>}
          {!isStructure && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 gap-1">
              <SpanIcon className="h-2.5 w-2.5" /> {spanLabel}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{widget.config.title || meta?.desc}</p>
      </div>
      {!isStructure && onMoveToParent && columnOptions.length > 0 && (
        <Select
          value={widget.parent_id ?? "__root__"}
          onValueChange={(v) => onMoveToParent(v === "__root__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[150px] text-[11px]" title="Déplacer dans une colonne">
            <SelectValue placeholder="Déplacer…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__root__" className="text-[11px]">— Racine —</SelectItem>
            {columnOptions.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-[11px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!isStructure && (
        <button
          type="button"
          onClick={() => onSpanChange(nextSpan)}
          title={`Passer en ${nextLabel}`}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-background hover:border-primary/60 hover:bg-primary/5 text-[10px] font-bold uppercase tracking-wider"
        >
          <SpanIcon className="h-3 w-3" /> {spanLabel}
        </button>
      )}
      <Switch checked={widget.is_active} onCheckedChange={onToggle} />
      <Button variant="outline" size="sm" onClick={onEdit}>Modifier</Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} aria-label="Supprimer le widget">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}


/* ─── Typography editor (shared) ─── */
const TYPES_WITH_TYPOGRAPHY = new Set([
  "hero", "cta", "rich_text", "two_columns", "stats", "featured_track",
  "testimonials", "faq", "newsletter", "countdown", "promo_banner",
  "track_grid", "artist_carousel", "genres_cloud", "video_embed", "logos_strip",
  "top_downloads", "new_releases", "top_label", "top_artists", "top_downloads_period",
  "trending_artists", "featured_genres", "playlists_carousel", "dj_charts",
  "most_favorited", "recently_played", "dj_shorts",
]);

/** Widgets qui exposent un en-tête (titre + sous-titre admin-customisable). */
const TYPES_WITH_HEADER = new Set([
  "track_grid", "artist_carousel", "genres_cloud", "top_downloads", "new_releases",
  "top_label", "top_artists", "top_downloads_period", "trending_artists",
  "featured_genres", "playlists_carousel", "dj_charts", "most_favorited",
  "recently_played", "dj_shorts", "rich_text", "newsletter", "countdown",
  "promo_banner", "stats", "faq", "testimonials", "logos_strip", "blog_cards",
  "team_grid", "instagram_feed", "image_gallery", "features_grid", "plans_compare",
]);

const FONT_OPTIONS = [
  { value: "display", label: "Display (Space Grotesk)" },
  { value: "body", label: "Body (DM Sans)" },
  { value: "serif", label: "Serif (Instrument)" },
  { value: "mono", label: "Mono (JetBrains)" },
];

/** Token presets users can apply with a single click (HSL tokens). */
const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Primary",     value: "var(--primary)" },
  { label: "Accent",      value: "var(--accent)"  },
  { label: "Foreground",  value: "var(--foreground)" },
  { label: "Muted",       value: "var(--muted-foreground)" },
  { label: "Destructive", value: "var(--destructive)" },
];

function tokenToCss(v?: string) {
  if (!v) return "transparent";
  const t = v.trim();
  if (t.startsWith("var(")) return `hsl(${t})`;
  if (/^\d+\s+\d+%\s+\d+%$/.test(t)) return `hsl(${t})`;
  return t;
}

function ColorField({
  label, value, onChange, placeholder,
}: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  const isHex = !!value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="h-9 w-9 rounded-md border border-border shrink-0 relative overflow-hidden"
          style={{ background: tokenToCss(value) }}
        >
          <input
            type="color"
            value={isHex ? value! : "#3b82f6"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label={`${label} (picker)`}
          />
        </div>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "var(--primary) | #hex | 220 80% 58%"}
          className="font-mono text-xs"
        />
        {value && (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => onChange("")} aria-label="Réinitialiser">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-border bg-background hover:border-primary/60 text-[10px] font-bold uppercase tracking-wider"
            title={p.label}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: tokenToCss(p.value) }} />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const TYPO_PRESETS: { id: string; label: string; desc: string; value: any }[] = [
  {
    id: "default", label: "Défaut", desc: "Display Bebas, accent dégradé",
    value: {},
  },
  {
    id: "bold-xl", label: "Bold XL", desc: "Très gros titre, sous-titre clair",
    value: { title_size: 44, title_weight: 900, title_font: "display", uppercase: true, letter_spacing: 1, body_size: 15 },
  },
  {
    id: "gradient", label: "Gradient", desc: "Titre dégradé primary → accent",
    value: { title_size: 36, title_weight: 800, title_gradient: true, eyebrow_color: "var(--accent)" },
  },
  {
    id: "editorial", label: "Éditorial", desc: "Serif élégant, contraste doux",
    value: { title_font: "serif", title_size: 38, title_weight: 600, body_font: "body", body_size: 14, align: "left" },
  },
  {
    id: "neon", label: "Néon", desc: "Accent rouge vif, titre majuscule",
    value: { title_color: "var(--accent)", title_weight: 900, uppercase: true, letter_spacing: 3, accent_color: "var(--accent)", eyebrow_color: "var(--accent)" },
  },
  {
    id: "minimal", label: "Minimal", desc: "Petit titre net, eyebrow masqué",
    value: { title_size: 22, title_weight: 600, eyebrow_hidden: true, accent_hidden: true, body_size: 13 },
  },
  {
    id: "mono", label: "Mono tech", desc: "JetBrains Mono, ambiance code",
    value: { title_font: "mono", title_size: 24, title_weight: 700, body_font: "mono", body_size: 12, uppercase: true, letter_spacing: 2 },
  },
];

function TypographyEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const v = value || {};
  const set = (k: string, val: any) => onChange({ ...v, [k]: val });
  const applyPreset = (preset: any) => onChange({ ...preset });
  return (
    <details className="rounded-xl border border-border bg-background/60 overflow-hidden group" open>
      <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:bg-muted/30">
        <span className="flex items-center gap-2"><Type className="h-3.5 w-3.5 text-primary" /> Typographie & couleurs</span>
        <span className="text-[10px] normal-case opacity-60 group-open:hidden">Cliquer pour ouvrir</span>
      </summary>
      <div className="p-4 space-y-5 border-t border-border">

        {/* ─── Style presets ─── */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Wand2 className="h-3 w-3" /> Styles prêts à l'emploi
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TYPO_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.value)}
                className="text-left rounded-lg border border-border bg-card/60 hover:border-primary/60 hover:bg-primary/5 p-2.5 transition group/preset"
                title={p.desc}
              >
                <div className="text-xs font-bold leading-none mb-1 group-hover/preset:text-primary">
                  {p.label}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>



        {/* ─── Live preview ─── */}
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Aperçu</div>
          <div className="flex items-start gap-3">
            <div
              className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent mt-0.5"
              style={v.accent_color ? { background: tokenToCss(v.accent_color) } : undefined}
              hidden={v.accent_hidden}
            />
            <div>
              {!v.eyebrow_hidden && (v.eyebrow_text || "Eyebrow") && (
                <div className="text-[10px] uppercase tracking-[0.2em] font-mono mb-0.5" style={{ color: tokenToCss(v.eyebrow_color) || undefined }}>
                  {v.eyebrow_text || "Eyebrow"}
                </div>
              )}
              <h3 className="font-display text-2xl font-bold leading-none" style={{
                fontSize: v.title_size ? `${v.title_size}px` : undefined,
                fontWeight: v.title_weight,
                textTransform: v.uppercase ? "uppercase" : undefined,
                letterSpacing: v.letter_spacing != null ? `${v.letter_spacing/100}em` : undefined,
                ...(v.title_gradient
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${tokenToCss(v.title_gradient_from) || "hsl(var(--primary))"}, ${tokenToCss(v.title_gradient_to) || "hsl(var(--accent))"})`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }
                  : { color: tokenToCss(v.title_color) || undefined }),
              }}>
                Titre exemple
              </h3>
              <p className="text-sm mt-1" style={{ color: tokenToCss(v.body_color) || "hsl(var(--muted-foreground))", fontSize: v.body_size ? `${v.body_size}px` : undefined }}>
                Sous-titre d'exemple pour visualiser le rendu.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Eyebrow ─── */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Eyebrow (petit label)</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texte (laisser vide = défaut)">
              <Input value={v.eyebrow_text ?? ""} onChange={(e) => set("eyebrow_text", e.target.value)} placeholder="ex: Communauté" />
            </Field>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={!!v.eyebrow_hidden} onCheckedChange={(x) => set("eyebrow_hidden", x)} />
              <span className="text-sm">Masquer l'eyebrow</span>
            </div>
          </div>
          {!v.eyebrow_hidden && (
            <ColorField label="Couleur eyebrow" value={v.eyebrow_color} onChange={(x) => set("eyebrow_color", x)} />
          )}
        </div>

        {/* ─── Titre ─── */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Titre</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Taille (${v.title_size ?? "auto"} px)`}>
              <Input type="number" min={12} max={120} value={v.title_size ?? ""} placeholder="auto"
                onChange={(e) => set("title_size", e.target.value ? parseInt(e.target.value) : undefined)} />
            </Field>
            <Field label="Police">
              <Select value={v.title_font ?? "display"} onValueChange={(x) => set("title_font", x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Graisse">
              <Select value={String(v.title_weight ?? 800)} onValueChange={(x) => set("title_weight", parseInt(x))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Alignement">
              <Select value={v.align ?? "left"} onValueChange={(x) => set("align", x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={!!v.title_gradient} onCheckedChange={(x) => set("title_gradient", x)} />
            <span className="text-sm">Titre en dégradé</span>
          </div>

          {v.title_gradient ? (
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Dégradé — début" value={v.title_gradient_from} onChange={(x) => set("title_gradient_from", x)} placeholder="var(--primary)" />
              <ColorField label="Dégradé — fin" value={v.title_gradient_to} onChange={(x) => set("title_gradient_to", x)} placeholder="var(--accent)" />
            </div>
          ) : (
            <ColorField label="Couleur titre" value={v.title_color} onChange={(x) => set("title_color", x)} />
          )}

          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="flex items-center gap-2">
              <Switch checked={!!v.uppercase} onCheckedChange={(x) => set("uppercase", x)} />
              <span className="text-sm">Tout en MAJUSCULES</span>
            </div>
            <Field label={`Espacement lettres (${v.letter_spacing ?? 0})`}>
              <Input type="number" min={-5} max={30} value={v.letter_spacing ?? 0}
                onChange={(e) => set("letter_spacing", parseInt(e.target.value) || 0)} />
            </Field>
          </div>
        </div>

        {/* ─── Sous-titre ─── */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sous-titre / corps</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Taille (${v.body_size ?? "auto"} px)`}>
              <Input type="number" min={10} max={48} value={v.body_size ?? ""} placeholder="auto"
                onChange={(e) => set("body_size", e.target.value ? parseInt(e.target.value) : undefined)} />
            </Field>
            <Field label="Police">
              <Select value={v.body_font ?? "body"} onValueChange={(x) => set("body_font", x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <ColorField label="Couleur texte" value={v.body_color} onChange={(x) => set("body_color", x)} />
        </div>

        {/* ─── Barre d'accent ─── */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Barre d'accent (à gauche du titre)</div>
          <div className="flex items-center gap-2">
            <Switch checked={!!v.accent_hidden} onCheckedChange={(x) => set("accent_hidden", x)} />
            <span className="text-sm">Masquer la barre</span>
          </div>
          {!v.accent_hidden && (
            <ColorField label="Couleur barre" value={v.accent_color} onChange={(x) => set("accent_color", x)} />
          )}
        </div>

        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onChange({})}>
          Réinitialiser toute la typographie
        </Button>
      </div>
    </details>
  );
}


/* ─── Editor ─── */
function Editor({ widget, onCancel, onSave, saving }: { widget: Widget; onCancel: () => void; onSave: (w: Widget) => void; saving: boolean }) {
  const [w, setW] = useState<Widget>(widget);
  const meta = TYPE_META[w.type];
  const Icon = meta?.icon || CodeIcon;
  const setC = (k: string, v: any) => setW((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  const setCommon = (k: string, v: any) =>
    setW((s) => ({ ...s, config: { ...s.config, common: { ...(s.config.common || {}), [k]: v } } }));

  // Liste des parents possibles (sections + colonnes), pour le sélecteur de hiérarchie
  const { data: hierarchyOptions = [] } = useQuery({
    queryKey: ["admin-home-hierarchy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("home_widgets")
        .select("id,type,config,position,parent_id")
        .in("type", ["section", "column"])
        .order("position", { ascending: true });
      return (data ?? []) as Widget[];
    },
  });

  // Construit des labels lisibles : "Section 1 › Colonne 2" pour chaque colonne
  const parentLabel = (id: string): string => {
    const node = hierarchyOptions.find((n) => n.id === id);
    if (!node) return "—";
    if (node.type === "section") {
      const idx = hierarchyOptions.filter((n) => n.type === "section").findIndex((n) => n.id === id) + 1;
      return `Section ${idx} (${node.config?.layout || "1"})`;
    }
    // Colonne
    const parent = node.parent_id ? hierarchyOptions.find((n) => n.id === node.parent_id) : null;
    const siblings = hierarchyOptions.filter((n) => n.type === "column" && n.parent_id === node.parent_id);
    const colIdx = siblings.findIndex((n) => n.id === id) + 1;
    const sectionLabel = parent ? parentLabel(parent.id!) : "Section ?";
    return `${sectionLabel} › Colonne ${colIdx}`;
  };

  // Les widgets peuvent être enfants de colonnes uniquement.
  // Les colonnes peuvent être enfants de sections uniquement.
  // Les sections n'ont pas de parent.
  const parentChoices: Widget[] = w.type === "section"
    ? []
    : w.type === "column"
      ? hierarchyOptions.filter((n) => n.type === "section")
      : hierarchyOptions.filter((n) => n.type === "column");


  return (
    <div className="grid lg:grid-cols-[480px_1fr] gap-6">
      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{w.id ? "Modifier" : "Créer"} · {meta?.label}</h2>
              <p className="text-xs text-muted-foreground">{meta?.desc}</p>
            </div>
          </div>
        </div>

        <TypeFields w={w} setC={setC} />

        {/* ─── Parent dans la hiérarchie Section/Colonne ─── */}
        {w.type !== "section" && parentChoices.length > 0 && (
          <Field label={w.type === "column" ? "Section parente" : "Colonne parente (optionnel)"}>
            <Select
              value={w.parent_id ?? "__root__"}
              onValueChange={(v) => setW((s) => ({ ...s, parent_id: v === "__root__" ? null : v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">— Racine (rendu autonome) —</SelectItem>
                {parentChoices.map((p) => (
                  <SelectItem key={p.id} value={p.id!}>{parentLabel(p.id!)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}


        {TYPES_WITH_HEADER.has(w.type) && (
          <Field label="Sous-titre / accroche (optionnel)">
            <Input
              value={w.config.subtitle ?? ""}
              placeholder="Court texte affiché sous le titre du widget"
              onChange={(e) => setC("subtitle", e.target.value)}
            />
          </Field>
        )}

        {TYPES_WITH_TYPOGRAPHY.has(w.type) && (
          <TypographyEditor value={w.config.typo ?? {}} onChange={(v) => setC("typo", v)} />
        )}

        <DimensionsEditor value={w.config.common ?? {}} onChange={setCommon} />

        <SpacingEditor value={w.config.common ?? {}} onChange={setCommon} />

        <TargetingEditor
          value={{ audience: w.audience, devices: w.devices, starts_at: w.starts_at, ends_at: w.ends_at }}
          onChange={(patch) => setW((s) => ({ ...s, ...patch }))}
        />

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Switch checked={w.is_active} onCheckedChange={(v) => setW((s) => ({ ...s, is_active: v }))} />
          <span className="text-sm">Actif</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-1" />Annuler</Button>
            <Button onClick={() => onSave(w)} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Aperçu</Label>
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          <ScrollArea className="max-h-[700px]">
            <div className="py-4">
              <HomeWidgets widgets={[{ ...w, id: "preview" } as HWidget]} preview />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function TypeFields({ w, setC }: { w: Widget; setC: (k: string, v: any) => void }) {
  const c = w.config;
  switch (w.type) {
    case "section":
      return (
        <>
          <Field label="Layout de la section">
            <Select value={c.layout ?? "1-1"} onValueChange={(v) => setC("layout", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 colonne (pleine largeur)</SelectItem>
                <SelectItem value="1-1">2 colonnes égales (1/1)</SelectItem>
                <SelectItem value="1-1-1">3 colonnes égales (1/1/1)</SelectItem>
                <SelectItem value="1-1-1-1">4 colonnes égales</SelectItem>
                <SelectItem value="2-1">2/3 + 1/3</SelectItem>
                <SelectItem value="1-2">1/3 + 2/3</SelectItem>
                <SelectItem value="1-1-2">1/4 + 1/4 + 2/4</SelectItem>
                <SelectItem value="2-1-1">2/4 + 1/4 + 1/4</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Espacement entre colonnes">
              <Select value={c.gap ?? "md"} onValueChange={(v) => setC("gap", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="sm">Petit</SelectItem>
                  <SelectItem value="md">Moyen</SelectItem>
                  <SelectItem value="lg">Grand</SelectItem>
                  <SelectItem value="xl">Très grand</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Empiler à partir de">
              <Select value={c.stack_at ?? "md"} onValueChange={(v) => setC("stack_at", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="md">Tablette (≤ 768 px)</SelectItem>
                  <SelectItem value="lg">Desktop (≤ 1024 px)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground border-l-2 border-primary/50 pl-3">
            Crée des colonnes enfants depuis le bouton « + Ajouter une colonne » dans la liste, puis assigne chaque widget à une colonne via le champ « Parent » de son éditeur.
          </p>
        </>
      );
    case "column":
      return (
        <p className="text-[11px] text-muted-foreground border-l-2 border-primary/50 pl-3">
          Une colonne n'a pas de réglages propres : elle hérite du layout de sa section parente. Glisse des widgets dedans (ou choisis cette colonne comme « Parent » dans l'éditeur d'un widget).
        </p>
      );
    case "hero":
      return (
        <>
          <Field label="Eyebrow (petit texte au-dessus)"><Input value={c.eyebrow ?? ""} onChange={(e) => setC("eyebrow", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
            <Field label="Mot surligné"><Input value={c.highlight ?? ""} onChange={(e) => setC("highlight", e.target.value)} /></Field>
          </div>
          <Field label="Sous-titre"><Textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => setC("subtitle", e.target.value)} /></Field>
          <Field label="Image de fond (URL)"><Input value={c.bg_url ?? ""} onChange={(e) => setC("bg_url", e.target.value)} placeholder="https://..." /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Layout">
              <Select value={c.layout ?? "center"} onValueChange={(v) => setC("layout", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centré</SelectItem>
                  <SelectItem value="left">Aligné à gauche</SelectItem>
                  <SelectItem value="split">Split (image à droite)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hauteur">
              <Select value={c.height ?? "standard"} onValueChange={(v) => setC("height", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="full">Plein écran</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Overlay (${c.overlay_opacity ?? 75}%)`}>
              <Input type="number" min={0} max={100} value={c.overlay_opacity ?? 75} onChange={(e) => setC("overlay_opacity", parseInt(e.target.value) || 0)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA principal"><Input value={c.cta_primary_label ?? ""} onChange={(e) => setC("cta_primary_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_primary_url ?? ""} onChange={(e) => setC("cta_primary_url", e.target.value)} /></Field>
            <Field label="CTA secondaire"><Input value={c.cta_secondary_label ?? ""} onChange={(e) => setC("cta_secondary_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_secondary_url ?? ""} onChange={(e) => setC("cta_secondary_url", e.target.value)} /></Field>
          </div>
          <Field label="Trust badges (séparés par virgule)">
            <Input
              value={(c.trust_badges ?? []).join(", ")}
              onChange={(e) => setC("trust_badges", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="Sans engagement, +1200 tracks, Mise à jour hebdo"
            />
          </Field>
        </>
      );
    case "track_grid":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tri">
              <Select value={c.sort_by ?? "recent"} onValueChange={(v) => setC("sort_by", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Récents</SelectItem>
                  <SelectItem value="popular">Populaires</SelectItem>
                  <SelectItem value="alphabetical">Alphabétique</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nombre max"><Input type="number" min={1} max={24} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
            <Field label="Filtre genre (optionnel)"><Input value={c.genre ?? ""} onChange={(e) => setC("genre", e.target.value)} placeholder="House, Techno..." /></Field>
            <Field label="Filtre tag (optionnel)"><Input value={c.tag ?? ""} onChange={(e) => setC("tag", e.target.value)} /></Field>
          </div>
          <Field label='URL "Tout voir" (optionnel)'><Input value={c.see_all_url ?? ""} onChange={(e) => setC("see_all_url", e.target.value)} placeholder="/new" /></Field>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
            <Switch checked={!!c.genre_tabs} onCheckedChange={(v) => setC("genre_tabs", v)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Menu roulant de genres</p>
              <p className="text-xs text-muted-foreground">Affiche un sélecteur horizontal de genres au-dessus de la liste (filtrage en direct).</p>
            </div>
          </div>
        </>
      );
    case "artist_carousel":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={c.kind ?? "all"} onValueChange={(v) => setC("kind", v === "all" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="artist">Artistes</SelectItem>
                  <SelectItem value="remixer">Remixers</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Limite"><Input type="number" min={1} max={24} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!c.featured_only} onCheckedChange={(v) => setC("featured_only", v)} />
            <span className="text-sm">Uniquement les "featured"</span>
          </div>
        </>
      );
    case "cta":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Texte"><Textarea rows={2} value={c.body ?? ""} onChange={(e) => setC("body", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA principal"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
            <Field label="CTA secondaire"><Input value={c.cta_secondary_label ?? ""} onChange={(e) => setC("cta_secondary_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_secondary_url ?? ""} onChange={(e) => setC("cta_secondary_url", e.target.value)} /></Field>
          </div>
        </>
      );
    case "rich_text":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Texte"><Textarea rows={6} value={c.body ?? ""} onChange={(e) => setC("body", e.target.value)} /></Field>
          <Field label="Alignement">
            <Select value={c.align ?? "center"} onValueChange={(v) => setC("align", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    case "video_embed":
      return (
        <>
          <Field label="Titre (optionnel)"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="URL YouTube ou embed"><Input value={c.url ?? ""} onChange={(e) => setC("url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></Field>
        </>
      );
    case "newsletter":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Message"><Textarea rows={2} value={c.body ?? ""} onChange={(e) => setC("body", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texte du bouton"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
            <Field label="Placeholder"><Input value={c.placeholder ?? ""} onChange={(e) => setC("placeholder", e.target.value)} /></Field>
          </div>
          <Field label="Message de confirmation"><Input value={c.success_message ?? ""} onChange={(e) => setC("success_message", e.target.value)} /></Field>
        </>
      );
    case "countdown":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Sous-titre"><Input value={c.subtitle ?? ""} onChange={(e) => setC("subtitle", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag"><Input value={c.tag ?? ""} onChange={(e) => setC("tag", e.target.value)} /></Field>
            <Field label="Date cible">
              <Input type="datetime-local"
                value={c.end_date ? new Date(c.end_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => setC("end_date", e.target.value ? new Date(e.target.value).toISOString() : "")} />
            </Field>
            <Field label="Texte CTA"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
            <Field label="URL CTA"><Input value={c.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
          </div>
        </>
      );
    case "promo_banner":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Texte"><Textarea rows={2} value={c.body ?? ""} onChange={(e) => setC("body", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag"><Input value={c.tag ?? ""} onChange={(e) => setC("tag", e.target.value)} /></Field>
            <Field label="Image (URL)"><Input value={c.image_url ?? ""} onChange={(e) => setC("image_url", e.target.value)} /></Field>
            <Field label="Texte CTA"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
            <Field label="URL CTA"><Input value={c.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
            <Field label="Couleur fond (HSL)"><Input value={c.bg_color ?? ""} onChange={(e) => setC("bg_color", e.target.value)} placeholder="220 80% 25%" /></Field>
            <Field label="Couleur texte (HSL)"><Input value={c.text_color ?? ""} onChange={(e) => setC("text_color", e.target.value)} placeholder="0 0% 100%" /></Field>
          </div>
        </>
      );
    case "html_block":
      return (
        <Field label="HTML"><Textarea rows={10} className="font-mono text-xs" value={c.html ?? ""} onChange={(e) => setC("html", e.target.value)} /></Field>
      );
    case "stats":
      return (
        <>
          <Field label="Titre (optionnel)"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={!!c.auto_fetch} onCheckedChange={(v) => setC("auto_fetch", v)} />
            <span className="text-sm">Calculer automatiquement depuis la base</span>
          </div>
          {!c.auto_fetch && (
            <RepeaterField label="Compteurs" items={c.items ?? []} empty={{ label: "Nouveau", value: "0" }} onChange={(v) => setC("items", v)}
              render={(it, set) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Libellé" value={it.label ?? ""} onChange={(e) => set({ ...it, label: e.target.value })} />
                  <Input placeholder="Valeur" value={it.value ?? ""} onChange={(e) => set({ ...it, value: e.target.value })} />
                </div>
              )}
            />
          )}
        </>
      );
    case "genres_cloud":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Nombre max de genres"><Input type="number" min={4} max={40} value={c.limit ?? 16} onChange={(e) => setC("limit", parseInt(e.target.value) || 16)} /></Field>
        </>
      );
    case "featured_track":
      return (
        <>
          <Field label="Tag (badge)"><Input value={c.tag ?? ""} onChange={(e) => setC("tag", e.target.value)} placeholder="Track de la semaine" /></Field>
          <Field label="ID du track (vide = plus populaire)"><Input value={c.track_id ?? ""} onChange={(e) => setC("track_id", e.target.value)} placeholder="uuid…" /></Field>
        </>
      );
    case "testimonials":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <RepeaterField label="Témoignages" items={c.items ?? []} empty={{ quote: "", author: "", role: "" }} onChange={(v) => setC("items", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Textarea rows={2} placeholder="Citation" value={it.quote ?? ""} onChange={(e) => set({ ...it, quote: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Auteur" value={it.author ?? ""} onChange={(e) => set({ ...it, author: e.target.value })} />
                  <Input placeholder="Rôle / lieu" value={it.role ?? ""} onChange={(e) => set({ ...it, role: e.target.value })} />
                </div>
                <Input placeholder="URL avatar (optionnel)" value={it.avatar ?? ""} onChange={(e) => set({ ...it, avatar: e.target.value })} />
              </div>
            )}
          />
        </>
      );
    case "faq":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <RepeaterField label="Questions" items={c.items ?? []} empty={{ question: "", answer: "" }} onChange={(v) => setC("items", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Input placeholder="Question" value={it.question ?? ""} onChange={(e) => set({ ...it, question: e.target.value })} />
                <Textarea rows={3} placeholder="Réponse" value={it.answer ?? ""} onChange={(e) => set({ ...it, answer: e.target.value })} />
              </div>
            )}
          />
        </>
      );
    case "logos_strip":
      return (
        <>
          <Field label="Titre (optionnel)"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <RepeaterField label="Logos" items={c.logos ?? []} empty={{ image_url: "", url: "", alt: "" }} onChange={(v) => setC("logos", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Input placeholder="URL image" value={it.image_url ?? ""} onChange={(e) => set({ ...it, image_url: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Lien (optionnel)" value={it.url ?? ""} onChange={(e) => set({ ...it, url: e.target.value })} />
                  <Input placeholder="Texte alt" value={it.alt ?? ""} onChange={(e) => set({ ...it, alt: e.target.value })} />
                </div>
              </div>
            )}
          />
        </>
      );
    case "divider":
      return (
        <>
          <Field label="Style">
            <Select value={c.style ?? "line"} onValueChange={(v) => setC("style", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Ligne</SelectItem>
                <SelectItem value="gradient">Dégradé</SelectItem>
                <SelectItem value="spacer">Espace vide</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {c.style === "line" && (
            <Field label="Libellé (optionnel)"><Input value={c.label ?? ""} onChange={(e) => setC("label", e.target.value)} /></Field>
          )}
          {c.style === "spacer" && (
            <Field label="Hauteur (px)"><Input type="number" min={8} max={400} value={c.height ?? 40} onChange={(e) => setC("height", parseInt(e.target.value) || 40)} /></Field>
          )}
        </>
      );
    case "two_columns":
      return (
        <>
          <Field label="Eyebrow (optionnel)"><Input value={c.eyebrow ?? ""} onChange={(e) => setC("eyebrow", e.target.value)} /></Field>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Texte"><Textarea rows={4} value={c.body ?? ""} onChange={(e) => setC("body", e.target.value)} /></Field>
          <Field label="Image (URL)"><Input value={c.image_url ?? ""} onChange={(e) => setC("image_url", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position image">
              <Select value={c.image_position ?? "left"} onValueChange={(v) => setC("image_position", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Texte CTA"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
          </div>
          <Field label="URL CTA"><Input value={c.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
        </>
      );
    case "top_downloads":
    case "new_releases":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Nombre"><Input type="number" min={1} max={24} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
          <Field label='URL "Tout voir"'><Input value={c.see_all_url ?? ""} onChange={(e) => setC("see_all_url", e.target.value)} /></Field>
        </>
      );
    case "top_genre":
      return (
        <>
          <Field label="Titre (vide = auto)"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Genre forcé (vide = top auto)"><Input value={c.genre ?? ""} onChange={(e) => setC("genre", e.target.value)} placeholder="House, Techno..." /></Field>
          <Field label="Nombre"><Input type="number" min={1} max={20} value={c.limit ?? 6} onChange={(e) => setC("limit", parseInt(e.target.value) || 6)} /></Field>
        </>
      );
    case "top_label":
    case "top_artists":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Nombre"><Input type="number" min={2} max={24} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
        </>
      );
    case "slides_carousel":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={!!c.autoplay} onCheckedChange={(v) => setC("autoplay", v)} />
              <span className="text-sm">Autoplay</span>
            </div>
            <Field label="Durée (s)"><Input type="number" min={2} max={30} value={c.duration ?? 5} onChange={(e) => setC("duration", parseInt(e.target.value) || 5)} /></Field>
          </div>
          <RepeaterField label="Slides" items={c.slides ?? []} empty={{ title: "", body: "", image_url: "", cta_label: "", cta_url: "" }} onChange={(v) => setC("slides", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Input placeholder="Eyebrow" value={it.eyebrow ?? ""} onChange={(e) => set({ ...it, eyebrow: e.target.value })} />
                <Input placeholder="Titre" value={it.title ?? ""} onChange={(e) => set({ ...it, title: e.target.value })} />
                <Textarea rows={2} placeholder="Texte" value={it.body ?? ""} onChange={(e) => set({ ...it, body: e.target.value })} />
                <Input placeholder="Image URL" value={it.image_url ?? ""} onChange={(e) => set({ ...it, image_url: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="CTA label" value={it.cta_label ?? ""} onChange={(e) => set({ ...it, cta_label: e.target.value })} />
                  <Input placeholder="CTA URL" value={it.cta_url ?? ""} onChange={(e) => set({ ...it, cta_url: e.target.value })} />
                </div>
              </div>
            )} />
        </>
      );
    case "image_gallery":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <RepeaterField label="Images" items={c.images ?? []} empty={{ image_url: "", url: "", alt: "" }} onChange={(v) => setC("images", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Input placeholder="Image URL" value={it.image_url ?? ""} onChange={(e) => set({ ...it, image_url: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Lien (optionnel)" value={it.url ?? ""} onChange={(e) => set({ ...it, url: e.target.value })} />
                  <Input placeholder="Alt" value={it.alt ?? ""} onChange={(e) => set({ ...it, alt: e.target.value })} />
                </div>
              </div>
            )} />
        </>
      );
    case "marquee":
      return (
        <Field label="Texte (séparé par ·)"><Input value={c.items ?? ""} onChange={(e) => setC("items", e.target.value)} placeholder="FRESH · NEW · HOT" /></Field>
      );
    case "live_counter":
      return (
        <>
          <Field label="Libellé"><Input value={c.label ?? ""} onChange={(e) => setC("label", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
          </div>
        </>
      );
    case "plans_compare":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Sous-titre"><Textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => setC("subtitle", e.target.value)} /></Field>
          <Field label="Slug du plan mis en avant"><Input value={c.highlight_slug ?? ""} onChange={(e) => setC("highlight_slug", e.target.value)} placeholder="premium" /></Field>
        </>
      );
    case "features_grid":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="Sous-titre"><Textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => setC("subtitle", e.target.value)} /></Field>
          <RepeaterField label="Features" items={c.items ?? []} empty={{ icon: "Sparkles", title: "", body: "" }} onChange={(v) => setC("items", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <IconPicker value={it.icon ?? ""} onChange={(name) => set({ ...it, icon: name })} />
                  <Input placeholder="Titre" value={it.title ?? ""} onChange={(e) => set({ ...it, title: e.target.value })} />
                </div>
                <Textarea rows={2} placeholder="Description" value={it.body ?? ""} onChange={(e) => set({ ...it, body: e.target.value })} />
              </div>
            )} />
        </>
      );
    case "video_testimonial":
      return (
        <>
          <Field label="URL vidéo YouTube"><Input value={c.video_url ?? ""} onChange={(e) => setC("video_url", e.target.value)} /></Field>
          <Field label="Citation"><Textarea rows={3} value={c.quote ?? ""} onChange={(e) => setC("quote", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Auteur"><Input value={c.author ?? ""} onChange={(e) => setC("author", e.target.value)} /></Field>
            <Field label="Rôle"><Input value={c.role ?? ""} onChange={(e) => setC("role", e.target.value)} /></Field>
          </div>
          <Field label="Avatar URL"><Input value={c.avatar ?? ""} onChange={(e) => setC("avatar", e.target.value)} /></Field>
        </>
      );
    case "sticky_promo":
      return (
        <>
          <Field label="Titre / message"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA"><Input value={c.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
            <Field label="Fond (HSL)"><Input value={c.bg_color ?? ""} onChange={(e) => setC("bg_color", e.target.value)} placeholder="220 80% 25%" /></Field>
            <Field label="Texte (HSL)"><Input value={c.text_color ?? ""} onChange={(e) => setC("text_color", e.target.value)} placeholder="0 0% 100%" /></Field>
          </div>
        </>
      );
    case "blog_cards":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <RepeaterField label="Articles" items={c.items ?? []} empty={{ title: "", excerpt: "", image_url: "", category: "", date: "", url: "" }} onChange={(v) => setC("items", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Input placeholder="Titre" value={it.title ?? ""} onChange={(e) => set({ ...it, title: e.target.value })} />
                <Textarea rows={2} placeholder="Extrait" value={it.excerpt ?? ""} onChange={(e) => set({ ...it, excerpt: e.target.value })} />
                <Input placeholder="Image URL" value={it.image_url ?? ""} onChange={(e) => set({ ...it, image_url: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Catégorie" value={it.category ?? ""} onChange={(e) => set({ ...it, category: e.target.value })} />
                  <Input placeholder="Date" value={it.date ?? ""} onChange={(e) => set({ ...it, date: e.target.value })} />
                  <Input placeholder="Lien" value={it.url ?? ""} onChange={(e) => set({ ...it, url: e.target.value })} />
                </div>
              </div>
            )} />
        </>
      );
    case "team_grid":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <RepeaterField label="Membres" items={c.items ?? []} empty={{ name: "", role: "", avatar: "" }} onChange={(v) => setC("items", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nom" value={it.name ?? ""} onChange={(e) => set({ ...it, name: e.target.value })} />
                  <Input placeholder="Rôle" value={it.role ?? ""} onChange={(e) => set({ ...it, role: e.target.value })} />
                </div>
                <Input placeholder="Avatar URL" value={it.avatar ?? ""} onChange={(e) => set({ ...it, avatar: e.target.value })} />
              </div>
            )} />
        </>
      );
    case "audio_embed":
      return (
        <>
          <Field label="Titre (optionnel)"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <Field label="URL Spotify ou SoundCloud"><Input value={c.url ?? ""} onChange={(e) => setC("url", e.target.value)} placeholder="https://open.spotify.com/..." /></Field>
        </>
      );
    case "instagram_feed":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
            <Field label="@handle"><Input value={c.handle ?? ""} onChange={(e) => setC("handle", e.target.value)} placeholder="frenchrecordpool" /></Field>
          </div>
          <RepeaterField label="Posts" items={c.items ?? []} empty={{ image_url: "", url: "" }} onChange={(v) => setC("items", v)}
            render={(it, set) => (
              <div className="space-y-2">
                <Input placeholder="Image URL" value={it.image_url ?? ""} onChange={(e) => set({ ...it, image_url: e.target.value })} />
                <Input placeholder="Lien post" value={it.url ?? ""} onChange={(e) => set({ ...it, url: e.target.value })} />
              </div>
            )} />
        </>
      );
    case "top_downloads_period":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Période par défaut">
              <Select value={c.period ?? "7d"} onValueChange={(v) => setC("period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Limite"><Input type="number" min={3} max={24} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
            <Field label="URL « Tout voir »"><Input value={c.see_all_url ?? ""} onChange={(e) => setC("see_all_url", e.target.value)} placeholder="/popular" /></Field>
          </div>
        </>
      );
    case "trending_artists":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Période par défaut">
              <Select value={c.period ?? "7d"} onValueChange={(v) => setC("period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Limite"><Input type="number" min={3} max={24} value={c.limit ?? 10} onChange={(e) => setC("limit", parseInt(e.target.value) || 10)} /></Field>
          </div>
        </>
      );
    case "featured_genres":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={c.auto !== false} onCheckedChange={(v) => setC("auto", v)} />
            <span className="text-sm">Auto (top genres par téléchargements)</span>
          </div>
          {c.auto !== false ? (
            <Field label="Limite"><Input type="number" min={3} max={16} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
          ) : (
            <RepeaterField
              label="Genres (manuel)"
              items={c.genres ?? []}
              empty={{ name: "", image_url: "", url: "", accent: "" }}
              onChange={(v) => setC("genres", v)}
              render={(it, set) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nom (ex: House)" value={it.name ?? ""} onChange={(e) => set({ ...it, name: e.target.value })} />
                  <Input placeholder="Lien (optionnel)" value={it.url ?? ""} onChange={(e) => set({ ...it, url: e.target.value })} />
                  <Input placeholder="Image URL (optionnel)" value={it.image_url ?? ""} onChange={(e) => set({ ...it, image_url: e.target.value })} className="col-span-2" />
                  <Input placeholder="Accent HSL ex: 220 80% 50%" value={it.accent ?? ""} onChange={(e) => set({ ...it, accent: e.target.value })} className="col-span-2" />
                </div>
              )}
            />
          )}
        </>
      );
    case "welcome_banner":
      return (
        <>
          <Field label="Image de fond (optionnel)"><Input value={c.bg_url ?? ""} onChange={(e) => setC("bg_url", e.target.value)} placeholder="https://..." /></Field>
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Visiteur anonyme</p>
            <Input placeholder="Eyebrow" value={c.eyebrow_anon ?? ""} onChange={(e) => setC("eyebrow_anon", e.target.value)} />
            <Input placeholder="Titre" value={c.title_anon ?? ""} onChange={(e) => setC("title_anon", e.target.value)} />
            <Textarea rows={2} placeholder="Texte" value={c.body_anon ?? ""} onChange={(e) => setC("body_anon", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="CTA label" value={c.cta_anon ?? ""} onChange={(e) => setC("cta_anon", e.target.value)} />
              <Input placeholder="CTA URL" value={c.cta_anon_url ?? ""} onChange={(e) => setC("cta_anon_url", e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Inscrit sans abonnement</p>
            <Input placeholder="Titre" value={c.title_registered ?? ""} onChange={(e) => setC("title_registered", e.target.value)} />
            <Textarea rows={2} placeholder="Texte" value={c.body_registered ?? ""} onChange={(e) => setC("body_registered", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="CTA label" value={c.cta_registered ?? ""} onChange={(e) => setC("cta_registered", e.target.value)} />
              <Input placeholder="CTA URL" value={c.cta_registered_url ?? ""} onChange={(e) => setC("cta_registered_url", e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Abonné actif</p>
            <Input placeholder="Titre (utilise {name})" value={c.title_subscribed ?? ""} onChange={(e) => setC("title_subscribed", e.target.value)} />
            <Textarea rows={2} placeholder="Texte" value={c.body_subscribed ?? ""} onChange={(e) => setC("body_subscribed", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="CTA label" value={c.cta_subscribed ?? ""} onChange={(e) => setC("cta_subscribed", e.target.value)} />
              <Input placeholder="CTA URL" value={c.cta_subscribed_url ?? ""} onChange={(e) => setC("cta_subscribed_url", e.target.value)} />
            </div>
          </div>
        </>
      );
    case "playlists_carousel":
      return (
        <>
          <Field label="Titre"><Input value={c.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={c.auto !== false} onCheckedChange={(v) => setC("auto", v)} />
            <span className="text-sm">Auto (toutes les playlists actives)</span>
          </div>
          {c.auto !== false ? (
            <Field label="Limite"><Input type="number" min={3} max={24} value={c.limit ?? 8} onChange={(e) => setC("limit", parseInt(e.target.value) || 8)} /></Field>
          ) : (
            <Field label="IDs des playlists (un par ligne)">
              <Textarea
                rows={4}
                value={(c.playlist_ids ?? []).join("\n")}
                onChange={(e) => setC("playlist_ids", e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="uuid-1&#10;uuid-2"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Récupère les IDs depuis /admin/playlists.</p>
            </Field>
          )}
          <Field label="URL « Tout voir »"><Input value={c.see_all_url ?? "/playlists"} onChange={(e) => setC("see_all_url", e.target.value)} /></Field>
        </>
      );
    default:
      return null;
  }
}

function RepeaterField({ label, items, empty, onChange, render }: {
  label: string; items: any[]; empty: any; onChange: (items: any[]) => void;
  render: (item: any, set: (v: any) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-2">
            {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3 mr-1" /> Retirer
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...empty }])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
      </Button>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ─── Dimensions editor (largeur + hauteur du bloc) ─── */
const CONTAINER_PRESETS: Array<{ value: string; label: string; hint: string }> = [
  { value: "narrow",  label: "Étroit",   hint: "~768 px" },
  { value: "default", label: "Standard", hint: "~1200 px" },
  { value: "wide",    label: "Large",    hint: "~1440 px" },
  { value: "full",    label: "Pleine largeur", hint: "100%" },
];

function DimensionsEditor({ value, onChange }: { value: any; onChange: (k: string, v: any) => void }) {
  return (
    <details className="group rounded-lg border border-border/60 bg-card/40" open>
      <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-2 text-sm font-medium">
        <span className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Dimensions du bloc (largeur · hauteur)
        </span>
        <span className="text-xs text-muted-foreground group-open:hidden">Régler</span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3">
        <Field label="Largeur (préréglage)">
          <Select
            value={value.container ?? "default"}
            onValueChange={(v) => onChange("container", v)}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTAINER_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label} <span className="text-muted-foreground">· {p.hint}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={`Largeur personnalisée (px) — laisse vide pour utiliser le préréglage`}>
          <Input
            type="number" min={320} max={2560} step={10}
            placeholder="ex. 960"
            value={value.max_width_px ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value);
              onChange("max_width_px", Number.isFinite(n) && n > 0 ? n : undefined);
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hauteur min. (px)">
            <Input
              type="number" min={0} max={2000} step={10}
              placeholder="ex. 400"
              value={value.min_height_px ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                onChange("min_height_px", Number.isFinite(n) && n > 0 ? n : undefined);
              }}
            />
          </Field>
          <Field label="ou hauteur min. (vh)">
            <Input
              type="number" min={0} max={100} step={1}
              placeholder="ex. 60"
              value={value.min_height_vh ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                onChange("min_height_vh", Number.isFinite(n) && n > 0 ? n : undefined);
              }}
            />
          </Field>
        </div>

        <Field label="Alignement vertical du contenu (quand une hauteur est fixée)">
          <Select
            value={value.align_y ?? "center"}
            onValueChange={(v) => onChange("align_y", v)}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Haut</SelectItem>
              <SelectItem value="center">Centre</SelectItem>
              <SelectItem value="end">Bas</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Button
          variant="ghost" size="sm" className="text-xs h-7"
          onClick={() => {
            ["max_width_px", "min_height_px", "min_height_vh", "align_y"].forEach((k) => onChange(k, undefined));
          }}
        >
          Réinitialiser dimensions
        </Button>
      </div>
    </details>
  );
}

/* ─── Spacing editor (responsive top/bottom padding) ─── */
const PAD_SIZES: Array<{ value: string; label: string }> = [
  { value: "none", label: "Aucun" },
  { value: "sm",   label: "Petit" },
  { value: "md",   label: "Moyen" },
  { value: "lg",   label: "Grand" },
  { value: "xl",   label: "Très grand" },
];

function SpacingEditor({ value, onChange }: { value: any; onChange: (k: string, v: any) => void }) {
  const fallback = value.pad_y ?? "none";
  const row = (
    bp: "mobile" | "tablet" | "desktop",
    label: string,
    icon: any,
  ) => {
    const Icon = icon;
    const topKey = `pad_top_${bp}`;
    const bottomKey = `pad_bottom_${bp}`;
    return (
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-20">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <Select value={value[topKey] ?? fallback} onValueChange={(v) => onChange(topKey, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Haut" /></SelectTrigger>
          <SelectContent>
            {PAD_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>↑ {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value[bottomKey] ?? fallback} onValueChange={(v) => onChange(bottomKey, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Bas" /></SelectTrigger>
          <SelectContent>
            {PAD_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>↓ {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <details className="group rounded-lg border border-border/60 bg-card/40">
      <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-2 text-sm font-medium">
        <span className="flex items-center gap-2">
          <Layout className="h-4 w-4 text-primary" />
          Espacement (responsive)
        </span>
        <span className="text-xs text-muted-foreground group-open:hidden">Régler</span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3">
        <p className="text-[11px] text-muted-foreground">
          Définis le padding haut/bas pour chaque format. Une valeur vide hérite du palier précédent
          (ou de l'espacement global ci-dessous).
        </p>
        <Field label="Espacement global (fallback)">
          <Select value={value.pad_y ?? "none"} onValueChange={(v) => onChange("pad_y", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAD_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="space-y-2">
          {row("mobile",  "Mobile",  Smartphone)}
          {row("tablet",  "Tablette", Layout)}
          {row("desktop", "Desktop", Monitor)}
        </div>
        <Button
          variant="ghost" size="sm" className="text-xs h-7"
          onClick={() => {
            ["pad_top_mobile","pad_top_tablet","pad_top_desktop",
             "pad_bottom_mobile","pad_bottom_tablet","pad_bottom_desktop"]
              .forEach((k) => onChange(k, undefined));
          }}
        >
          Réinitialiser
        </Button>
      </div>
    </details>
  );
}

/* ─── Targeting editor (audience / device / date window) ─── */
function TargetingEditor({
  value,
  onChange,
}: {
  value: { audience?: string | null; devices?: string | null; starts_at?: string | null; ends_at?: string | null };
  onChange: (patch: Partial<{ audience: string; devices: string; starts_at: string | null; ends_at: string | null }>) => void;
}) {
  const toLocalInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
  return (
    <details className="group rounded-lg border border-border/60 bg-card/40">
      <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-2 text-sm font-medium">
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Ciblage (audience · device · dates)
        </span>
        <span className="text-xs text-muted-foreground group-open:hidden">Régler</span>
      </summary>
      <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-3">
        <Field label="Audience">
          <Select value={value.audience ?? "all"} onValueChange={(v) => onChange({ audience: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="anon">Visiteurs anonymes</SelectItem>
              <SelectItem value="registered">Inscrits (tous)</SelectItem>
              <SelectItem value="subscribed">Abonnés actifs</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Appareil">
          <Select value={value.devices ?? "all"} onValueChange={(v) => onChange({ devices: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="mobile">Mobile uniquement</SelectItem>
              <SelectItem value="desktop">Desktop uniquement</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Démarre le (optionnel)">
          <Input type="datetime-local" value={toLocalInput(value.starts_at)}
            onChange={(e) => onChange({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="h-8 text-xs" />
        </Field>
        <Field label="Termine le (optionnel)">
          <Input type="datetime-local" value={toLocalInput(value.ends_at)}
            onChange={(e) => onChange({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="h-8 text-xs" />
        </Field>
      </div>
    </details>
  );
}



/* ─── Phase 1.3 : zone de dépôt « Racine » (sortir un widget d'une colonne) ─── */
function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "drop-root" });
  return (
    <div
      ref={setNodeRef}
      className={`col-span-6 mt-3 rounded-xl border border-dashed py-4 text-center text-[11px] uppercase tracking-wider transition ${
        isOver ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
      }`}
    >
      Déposer ici pour sortir le widget de sa colonne
    </div>
  );
}
