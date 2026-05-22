import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Save, X, Mail, Clock, Megaphone, Users, Code as CodeIcon,
  GripVertical, Image as ImageIcon, ListMusic, Sparkles, MousePointerClick,
  Type, Video, Eye, EyeOff, Smartphone, Monitor,
} from "lucide-react";
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
  html_block: {
    label: "HTML libre", icon: CodeIcon, group: "Avancé",
    desc: "HTML personnalisé", defaults: { html: "<h2>Mon bloc</h2><p>Texte libre.</p>" },
  },
};

export default function AdminHomeWidgets() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Widget | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["admin-home-widgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_widgets").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data as Widget[];
    },
  });

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
      toast.success("Widget supprimé");
    },
  });

  const reorder = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      await Promise.all(items.map(({ id, position }) =>
        supabase.from("home_widgets").update({ position }).eq("id", id)
      ));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-home-widgets"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("home_widgets").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-home-widgets"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = widgets.findIndex((w) => w.id === active.id);
    const newIdx = widgets.findIndex((w) => w.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(widgets, oldIdx, newIdx);
    qc.setQueryData(["admin-home-widgets"], next.map((w, i) => ({ ...w, position: i })));
    reorder.mutate(next.map((w, i) => ({ id: w.id!, position: i })));
  };

  const addNew = (type: string) => {
    const meta = TYPE_META[type];
    setEditing({
      type, position: widgets.length, config: { ...meta.defaults }, is_active: true,
    });
  };

  const grouped = Object.entries(TYPE_META).reduce((acc, [k, m]) => {
    (acc[m.group] ??= []).push([k, m]);
    return acc;
  }, {} as Record<string, [string, typeof TYPE_META[string]][]>);

  const activePreview = widgets.filter((w) => w.is_active) as HWidget[];

  return (
    <AdminLayout title="Widgets Homepage" subtitle="La page d'accueil = des blocs modulaires." wide>
      {editing ? (
        <Editor
          widget={editing}
          onCancel={() => setEditing(null)}
          onSave={(w) => upsert.mutate(w)}
          saving={upsert.isPending}
        />
      ) : (
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
                  Composition ({widgets.length})
                </Label>
                <p className="text-[10px] text-muted-foreground">Glisse pour réordonner</p>
              </div>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement…</p>
              ) : widgets.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed text-sm text-muted-foreground">
                  Aucun widget. Ajoute ton premier bloc.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={widgets.map((w) => w.id!)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {widgets.map((w) => (
                        <SortableItem
                          key={w.id}
                          widget={w}
                          onEdit={() => setEditing(w)}
                          onRemove={() => confirm("Supprimer ce widget ?") && remove.mutate(w.id!)}
                          onToggle={(v) => toggleActive.mutate({ id: w.id!, is_active: v })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* RIGHT: Live preview */}
          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-100px)]">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aperçu en direct</Label>
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                <Button
                  size="sm" variant={previewMode === "desktop" ? "secondary" : "ghost"}
                  className="h-7 px-2" onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant={previewMode === "mobile" ? "secondary" : "ghost"}
                  className="h-7 px-2" onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background overflow-hidden h-[calc(100%-40px)]">
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
          <Field label="Image de fond (URL)"><Input value={c.bg_url ?? ""} onChange={(e) => setC("bg_url", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA principal"><Input value={c.cta_primary_label ?? ""} onChange={(e) => setC("cta_primary_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_primary_url ?? ""} onChange={(e) => setC("cta_primary_url", e.target.value)} /></Field>
            <Field label="CTA secondaire"><Input value={c.cta_secondary_label ?? ""} onChange={(e) => setC("cta_secondary_label", e.target.value)} /></Field>
            <Field label="URL"><Input value={c.cta_secondary_url ?? ""} onChange={(e) => setC("cta_secondary_url", e.target.value)} /></Field>
          </div>
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
    default:
      return null;
  }
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
