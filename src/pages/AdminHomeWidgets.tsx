import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Save, X, Mail, Clock, Megaphone, Users, Code as CodeIcon,
  GripVertical, Image as ImageIcon, ListMusic, Sparkles, MousePointerClick,
  Type, Video, Eye, EyeOff, Smartphone, Monitor, Pencil, Undo2, CheckCircle2,
  BarChart3, Tag, Star, HelpCircle, Minus, Quote, Columns, Copy, Layout,
  Palette, Wand2, TrendingUp, Disc3, Radio, Download, Newspaper, Instagram,
  Images, Megaphone as MegaphoneIcon, Repeat, Music2,
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
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Widget {
  id?: string;
  type: string;
  position: number;
  config: Record<string, any>;
  is_active: boolean;
}

const TYPE_META: Record<string, { label: string; icon: any; desc: string; defaults: any; group: string }> = {
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
  const isDirty = draft !== null && JSON.stringify(draft.map(w => ({ id: w.id, position: w.position, is_active: w.is_active })))
    !== JSON.stringify(widgets.map(w => ({ id: w.id, position: w.position, is_active: w.is_active })));

  const upsert = useMutation({
    mutationFn: async (w: Widget) => {
      const payload: any = { ...w };
      if (!payload.id) delete payload.id;
      const { error } = await supabase.from("home_widgets").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
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

  const publishDraft = useMutation({
    mutationFn: async (items: Widget[]) => {
      await Promise.all(items.map((w) =>
        supabase.from("home_widgets")
          .update({ position: w.position, is_active: w.is_active })
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
    const oldIdx = list.findIndex((w) => w.id === active.id);
    const newIdx = list.findIndex((w) => w.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(list, oldIdx, newIdx).map((w, i) => ({ ...w, position: i }));
    setDraft(next);
  };

  const toggleActiveLocal = (id: string, is_active: boolean) => {
    setDraft(list.map((w) => (w.id === id ? { ...w, is_active } : w)));
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
            <div className="rounded-2xl border bg-card p-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ajouter un widget</Label>
              <div className="mt-3 space-y-3">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map(([key, meta]) => {
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
                <p className="text-[10px] text-muted-foreground">Glisse pour réordonner · publie pour valider</p>
              </div>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement…</p>
              ) : list.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed text-sm text-muted-foreground">
                  Aucun widget. Ajoute ton premier bloc.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={list.map((w) => w.id!)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {list.map((w) => (
                        <SortableItem
                          key={w.id}
                          widget={w}
                          onEdit={() => setEditing(w)}
                          onRemove={() => confirm("Supprimer ce widget ?") && remove.mutate(w.id!)}
                          onToggle={(v) => toggleActiveLocal(w.id!, v)}
                        />
                      ))}
                    </div>
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
  widget, onEdit, onRemove, onToggle,
}: {
  widget: Widget;
  onEdit: () => void;
  onRemove: () => void;
  onToggle: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id! });
  const meta = TYPE_META[widget.type];
  const Icon = meta?.icon || CodeIcon;
  const style: any = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef} style={style}
      className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition ${isDragging ? "opacity-50 ring-2 ring-primary" : "hover:border-primary/40"}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">{meta?.label || widget.type}</h3>
          {!widget.is_active && <Badge variant="secondary" className="text-[10px] h-4 px-1">Masqué</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{widget.config.title || meta?.desc}</p>
      </div>
      <Switch checked={widget.is_active} onCheckedChange={onToggle} />
      <Button variant="outline" size="sm" onClick={onEdit}>Modifier</Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
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
]);

const FONT_OPTIONS = [
  { value: "display", label: "Display (Space Grotesk)" },
  { value: "body", label: "Body (DM Sans)" },
  { value: "serif", label: "Serif (Instrument)" },
  { value: "mono", label: "Mono (JetBrains)" },
];

function TypographyEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const v = value || {};
  const set = (k: string, val: any) => onChange({ ...v, [k]: val });
  return (
    <details className="rounded-xl border border-border bg-background/60 overflow-hidden group" open>
      <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:bg-muted/30">
        <span className="flex items-center gap-2"><Type className="h-3.5 w-3.5 text-primary" /> Typographie</span>
        <span className="text-[10px] normal-case opacity-60 group-open:hidden">Cliquer pour ouvrir</span>
      </summary>
      <div className="p-4 space-y-3 border-t border-border">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Taille titre (${v.title_size ?? "auto"} px)`}>
            <Input type="number" min={12} max={120} value={v.title_size ?? ""} placeholder="auto"
              onChange={(e) => set("title_size", e.target.value ? parseInt(e.target.value) : undefined)} />
          </Field>
          <Field label="Police titre">
            <Select value={v.title_font ?? "display"} onValueChange={(x) => set("title_font", x)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Graisse titre">
            <Select value={String(v.title_weight ?? 800)} onValueChange={(x) => set("title_weight", parseInt(x))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Couleur titre (HSL ou #hex)">
            <Input value={v.title_color ?? ""} onChange={(e) => set("title_color", e.target.value)} placeholder="220 80% 58%" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Taille texte (${v.body_size ?? "auto"} px)`}>
            <Input type="number" min={10} max={48} value={v.body_size ?? ""} placeholder="auto"
              onChange={(e) => set("body_size", e.target.value ? parseInt(e.target.value) : undefined)} />
          </Field>
          <Field label="Police texte">
            <Select value={v.body_font ?? "body"} onValueChange={(x) => set("body_font", x)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Couleur texte">
            <Input value={v.body_color ?? ""} onChange={(e) => set("body_color", e.target.value)} placeholder="ex: #ccc" />
          </Field>
          <Field label="Alignement">
            <Select value={v.align ?? "center"} onValueChange={(x) => set("align", x)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

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

        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onChange({})}>
          Réinitialiser
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

        {TYPES_WITH_TYPOGRAPHY.has(w.type) && (
          <TypographyEditor value={w.config.typo ?? {}} onChange={(v) => setC("typo", v)} />
        )}


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

