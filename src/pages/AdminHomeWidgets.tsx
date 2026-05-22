import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Save, X, ArrowUp, ArrowDown, Mail, Clock, Megaphone, Users, Code as CodeIcon, Eye, EyeOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Widget {
  id?: string;
  type: string;
  position: number;
  config: Record<string, any>;
  is_active: boolean;
}

const TYPE_META: Record<string, { label: string; icon: any; desc: string; defaults: any }> = {
  newsletter: {
    label: "Newsletter", icon: Mail, desc: "Capture e-mails avec champ d'inscription",
    defaults: { title: "Reste informé", body: "Reçois nos exclus chaque semaine.", cta_label: "S'inscrire", placeholder: "ton@email.com" },
  },
  countdown: {
    label: "Compte à rebours", icon: Clock, desc: "Décompte vers une date (drop, événement)",
    defaults: { title: "Drop exclusif", tag: "Bientôt", end_date: new Date(Date.now() + 7 * 86400000).toISOString() },
  },
  promo_banner: {
    label: "Bannière promo", icon: Megaphone, desc: "Bandeau marketing avec CTA et image",
    defaults: { title: "Offre limitée", body: "-50 % le premier mois", tag: "Promo", cta_label: "En profiter", cta_url: "/pricing", bg_color: "220 80% 25%", text_color: "0 0% 100%" },
  },
  top_djs: {
    label: "DJs à la une", icon: Users, desc: "Grille des artistes featured (depuis BDD)",
    defaults: { title: "DJs à la une", limit: 8 },
  },
  html_block: {
    label: "Bloc HTML libre", icon: CodeIcon, desc: "Insère du HTML personnalisé (réservé admins)",
    defaults: { html: "<h2>Mon bloc</h2><p>Texte libre.</p>" },
  },
};

export default function AdminHomeWidgets() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Widget | null>(null);

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["admin-home-widgets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("home_widgets").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data as Widget[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (w: Widget) => {
      const payload: any = { ...w };
      if (!payload.id) delete payload.id;
      const { error } = await (supabase as any).from("home_widgets").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      toast.success("Widget enregistré");
      setEditing(null);
    },
    onError: () => toast.error("Erreur d'enregistrement"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("home_widgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-widgets"] });
      toast.success("Widget supprimé");
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await (supabase as any).from("home_widgets").update({ position }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-home-widgets"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("home_widgets").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-home-widgets"] }),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const a = widgets[idx];
    const b = widgets[idx + dir];
    if (!a || !b) return;
    updatePosition.mutate({ id: a.id!, position: b.position });
    updatePosition.mutate({ id: b.id!, position: a.position });
  };

  const addNew = (type: string) => {
    const meta = TYPE_META[type];
    const maxPos = widgets.reduce((m, w) => Math.max(m, w.position), -1);
    setEditing({
      type, position: maxPos + 1, config: { ...meta.defaults }, is_active: true,
    });
  };

  return (
    <AdminLayout
      title="Widgets Homepage"
      subtitle="Blocs modulaires affichés sur la page d'accueil"
      wide
    >
      {editing ? (
        <Editor widget={editing} onCancel={() => setEditing(null)} onSave={(w) => upsert.mutate(w)} saving={upsert.isPending} />
      ) : (
        <div className="space-y-8">
          {/* Add buttons */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ajouter un widget</Label>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => addNew(key)}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition text-sm"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{meta.label}</span>
                    <Plus className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {isLoading && <p className="text-muted-foreground">Chargement…</p>}
            {!isLoading && widgets.length === 0 && (
              <div className="text-center py-16 rounded-2xl border border-dashed">
                <p className="text-muted-foreground">Aucun widget. Ajoute ton premier bloc ci-dessus.</p>
              </div>
            )}
            {widgets.map((w, i) => {
              const meta = TYPE_META[w.type];
              const Icon = meta?.icon || CodeIcon;
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40 transition"
                >
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={i === widgets.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{meta?.label || w.type}</h3>
                      <Badge variant="outline" className="text-xs">#{w.position}</Badge>
                      {!w.is_active && <Badge variant="secondary" className="text-xs">Masqué</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.config.title || meta?.desc}
                    </p>
                  </div>
                  <Switch
                    checked={w.is_active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: w.id!, is_active: v })}
                  />
                  <Button variant="outline" size="sm" onClick={() => setEditing(w)}>Modifier</Button>
                  <Button variant="ghost" size="icon" onClick={() => confirm("Supprimer ce widget ?") && remove.mutate(w.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Editor({
  widget, onCancel, onSave, saving,
}: { widget: Widget; onCancel: () => void; onSave: (w: Widget) => void; saving: boolean }) {
  const [w, setW] = useState<Widget>(widget);
  const meta = TYPE_META[w.type];
  const Icon = meta?.icon || CodeIcon;
  const setC = (k: string, v: any) => setW((s) => ({ ...s, config: { ...s.config, [k]: v } }));

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{w.id ? "Modifier" : "Créer"} : {meta?.label}</h2>
            <p className="text-xs text-muted-foreground">{meta?.desc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-1" />Annuler</Button>
          <Button onClick={() => onSave(w)} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "…" : "Enregistrer"}</Button>
        </div>
      </div>

      {/* Common */}
      {w.type !== "html_block" && w.type !== "top_djs" && (
        <>
          <Field label="Titre"><Input value={w.config.title ?? ""} onChange={(e) => setC("title", e.target.value)} /></Field>
          {(w.type === "newsletter" || w.type === "promo_banner" || w.type === "countdown") && (
            <Field label={w.type === "countdown" ? "Sous-titre" : "Message"}>
              <Textarea rows={3} value={w.config.body ?? w.config.subtitle ?? ""} onChange={(e) => setC(w.type === "countdown" ? "subtitle" : "body", e.target.value)} />
            </Field>
          )}
        </>
      )}

      {/* Type-specific */}
      {w.type === "newsletter" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Texte du bouton"><Input value={w.config.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
          <Field label="Placeholder"><Input value={w.config.placeholder ?? ""} onChange={(e) => setC("placeholder", e.target.value)} /></Field>
          <Field label="Message de confirmation" className="md:col-span-2"><Input value={w.config.success_message ?? ""} onChange={(e) => setC("success_message", e.target.value)} /></Field>
        </div>
      )}

      {w.type === "countdown" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Tag"><Input value={w.config.tag ?? ""} onChange={(e) => setC("tag", e.target.value)} /></Field>
          <Field label="Date cible">
            <Input
              type="datetime-local"
              value={w.config.end_date ? new Date(w.config.end_date).toISOString().slice(0, 16) : ""}
              onChange={(e) => setC("end_date", e.target.value ? new Date(e.target.value).toISOString() : "")}
            />
          </Field>
          <Field label="Texte CTA (optionnel)"><Input value={w.config.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
          <Field label="URL CTA"><Input value={w.config.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} placeholder="/pricing" /></Field>
        </div>
      )}

      {w.type === "promo_banner" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Tag"><Input value={w.config.tag ?? ""} onChange={(e) => setC("tag", e.target.value)} /></Field>
          <Field label="Image (URL)"><Input value={w.config.image_url ?? ""} onChange={(e) => setC("image_url", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Texte CTA"><Input value={w.config.cta_label ?? ""} onChange={(e) => setC("cta_label", e.target.value)} /></Field>
          <Field label="URL CTA"><Input value={w.config.cta_url ?? ""} onChange={(e) => setC("cta_url", e.target.value)} /></Field>
          <Field label="BG (HSL)"><Input value={w.config.bg_color ?? ""} onChange={(e) => setC("bg_color", e.target.value)} placeholder="220 80% 25%" /></Field>
          <Field label="Texte (HSL)"><Input value={w.config.text_color ?? ""} onChange={(e) => setC("text_color", e.target.value)} placeholder="0 0% 100%" /></Field>
        </div>
      )}

      {w.type === "top_djs" && (
        <Field label="Nombre max de DJs">
          <Input type="number" value={w.config.limit ?? 8} onChange={(e) => setC("limit", Number(e.target.value))} />
        </Field>
      )}

      {w.type === "html_block" && (
        <Field label="HTML">
          <Textarea rows={10} className="font-mono text-xs" value={w.config.html ?? ""} onChange={(e) => setC("html", e.target.value)} />
        </Field>
      )}

      <div className="grid md:grid-cols-2 gap-4 pt-2">
        <Field label="Position">
          <Input type="number" value={w.position} onChange={(e) => setW((s) => ({ ...s, position: Number(e.target.value) }))} />
        </Field>
        <div className="flex items-end gap-3 rounded-lg border p-3">
          <div className="flex-1">
            <Label>Actif</Label>
            <p className="text-xs text-muted-foreground">Décocher pour masquer le widget</p>
          </div>
          <Switch checked={w.is_active} onCheckedChange={(v) => setW((s) => ({ ...s, is_active: v }))} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
