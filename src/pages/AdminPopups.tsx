import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, Eye, Sparkles, Image as ImageIcon, Clock, MousePointerClick, ArrowDownToLine, LogOut as ExitIcon } from "lucide-react";
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

type Popup = {
  id?: string;
  name: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  bg_color: string;
  text_color: string;
  accent_color: string;
  layout: string;
  trigger_type: string;
  trigger_value: number;
  frequency: string;
  audience: string;
  devices: string;
  pages: string[];
  is_active: boolean;
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

const EMPTY: Popup = {
  name: "Nouvelle popup",
  title: "Une offre exclusive 🎧",
  body: "Rejoins la communauté DJ et accède aux dernières exclus.",
  image_url: null,
  cta_label: "Découvrir",
  cta_url: "/pricing",
  bg_color: "222 30% 10%",
  text_color: "210 20% 95%",
  accent_color: "220 80% 58%",
  layout: "center",
  trigger_type: "delay",
  trigger_value: 5,
  frequency: "session",
  audience: "all",
  devices: "all",
  pages: [],
  is_active: false,
  priority: 0,
};

const PRESETS = [
  { name: "Studio Glass", bg: "222 30% 10%", text: "210 20% 95%", accent: "220 80% 58%" },
  { name: "Neon Club", bg: "260 40% 8%", text: "0 0% 100%", accent: "320 90% 60%" },
  { name: "France Bleu", bg: "220 75% 18%", text: "0 0% 100%", accent: "0 80% 55%" },
  { name: "Gold Night", bg: "30 20% 8%", text: "45 90% 92%", accent: "42 85% 55%" },
  { name: "Sunset", bg: "16 60% 18%", text: "30 90% 95%", accent: "12 90% 60%" },
];

const TRIGGER_ICONS: Record<string, any> = {
  load: Sparkles, delay: Clock, scroll: ArrowDownToLine, exit: ExitIcon,
};

export default function AdminPopups() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Popup | null>(null);

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ["admin-popups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("popups").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Popup[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Popup) => {
      const payload: any = { ...p };
      if (!payload.id) delete payload.id;
      const { error } = await (supabase as any).from("popups").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popups"] });
      toast.success("Popup enregistrée");
      setEditing(null);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("popups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popups"] });
      toast.success("Popup supprimée");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("popups").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-popups"] }),
  });

  return (
    <AdminLayout
      title="Popup Studio"
      subtitle="Crée des popups marketing ciblées avec règles d'affichage"
      actions={
        <Button onClick={() => setEditing({ ...EMPTY })} className="gap-2">
          <Plus className="h-4 w-4" /> Nouvelle popup
        </Button>
      }
    >
      {editing ? (
        <Editor
          popup={editing}
          onCancel={() => setEditing(null)}
          onSave={(p) => upsert.mutate(p)}
          saving={upsert.isPending}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-muted-foreground">Chargement…</p>}
          {!isLoading && popups.length === 0 && (
            <div className="col-span-full text-center py-16 rounded-2xl border border-dashed">
              <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Aucune popup. Crée ta première campagne.</p>
            </div>
          )}
          {popups.map((p) => {
            const TIcon = TRIGGER_ICONS[p.trigger_type] || Clock;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-5 space-y-3 hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{p.title}</p>
                  </div>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: p.id!, is_active: v })}
                  />
                </div>
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{ background: `hsl(${p.bg_color})`, color: `hsl(${p.text_color})` }}
                >
                  <div className="font-semibold mb-1">{p.title || "Sans titre"}</div>
                  <div className="opacity-80 line-clamp-2">{p.body}</div>
                  {p.cta_label && (
                    <div
                      className="inline-block mt-2 px-2 py-1 rounded text-[10px] font-medium"
                      style={{ background: `hsl(${p.accent_color})` }}
                    >
                      {p.cta_label}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="gap-1"><TIcon className="h-3 w-3" />{p.trigger_type}</Badge>
                  <Badge variant="outline">{p.audience}</Badge>
                  <Badge variant="outline">{p.devices}</Badge>
                  <Badge variant="outline">{p.frequency}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}>
                    Modifier
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => confirm("Supprimer cette popup ?") && remove.mutate(p.id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

function Editor({
  popup, onCancel, onSave, saving,
}: { popup: Popup; onCancel: () => void; onSave: (p: Popup) => void; saving: boolean }) {
  const [p, setP] = useState<Popup>(popup);
  const set = <K extends keyof Popup>(k: K, v: Popup[K]) => setP((s) => ({ ...s, [k]: v }));

  const pagesText = useMemo(() => (p.pages || []).join(", "), [p.pages]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-5 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{p.id ? "Modifier" : "Créer"} la popup</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-1" />Annuler</Button>
            <Button onClick={() => onSave(p)} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "…" : "Enregistrer"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom interne">
            <Input value={p.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Priorité">
            <Input type="number" value={p.priority} onChange={(e) => set("priority", Number(e.target.value))} />
          </Field>
          <Field label="Titre" className="md:col-span-2">
            <Input value={p.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Message" className="md:col-span-2">
            <Textarea rows={3} value={p.body ?? ""} onChange={(e) => set("body", e.target.value)} />
          </Field>
          <Field label="Image (URL)" className="md:col-span-2">
            <div className="flex gap-2">
              <Input
                value={p.image_url ?? ""}
                onChange={(e) => set("image_url", e.target.value || null)}
                placeholder="https://…"
              />
              {p.image_url && (
                <Button variant="ghost" size="icon" onClick={() => set("image_url", null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Field>
          <Field label="Texte du bouton">
            <Input value={p.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
          </Field>
          <Field label="URL du bouton">
            <Input value={p.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} placeholder="/pricing" />
          </Field>
        </div>

        <div className="pt-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Thème</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setP((s) => ({ ...s, bg_color: preset.bg, text_color: preset.text, accent_color: preset.accent }))}
                className="px-3 py-1.5 rounded-lg border text-xs hover:border-primary/60 transition flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${preset.bg})` }} />
                <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${preset.accent})` }} />
                {preset.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Field label="BG (HSL)"><Input value={p.bg_color} onChange={(e) => set("bg_color", e.target.value)} /></Field>
            <Field label="Texte (HSL)"><Input value={p.text_color} onChange={(e) => set("text_color", e.target.value)} /></Field>
            <Field label="Accent (HSL)"><Input value={p.accent_color} onChange={(e) => set("accent_color", e.target.value)} /></Field>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 pt-2">
          <Field label="Déclencheur">
            <Select value={p.trigger_type} onValueChange={(v) => set("trigger_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="load">Au chargement</SelectItem>
                <SelectItem value="delay">Après délai (s)</SelectItem>
                <SelectItem value="scroll">Au scroll (%)</SelectItem>
                <SelectItem value="exit">Intention de sortie</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={p.trigger_type === "scroll" ? "Pourcentage" : "Valeur (s)"}>
            <Input
              type="number"
              value={p.trigger_value}
              onChange={(e) => set("trigger_value", Number(e.target.value))}
              disabled={p.trigger_type === "load" || p.trigger_type === "exit"}
            />
          </Field>
          <Field label="Fréquence">
            <Select value={p.frequency} onValueChange={(v) => set("frequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Une seule fois (par appareil)</SelectItem>
                <SelectItem value="session">Une fois par session</SelectItem>
                <SelectItem value="always">À chaque visite</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={p.audience} onValueChange={(v) => set("audience", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="guests">Visiteurs non connectés</SelectItem>
                <SelectItem value="users">Connectés</SelectItem>
                <SelectItem value="subscribers">Abonnés actifs</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Appareils">
            <Select value={p.devices} onValueChange={(v) => set("devices", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="desktop">Desktop uniquement</SelectItem>
                <SelectItem value="mobile">Mobile uniquement</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pages ciblées (vide = toutes)">
            <Input
              value={pagesText}
              onChange={(e) => set("pages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="/, /pricing, /new"
            />
          </Field>
          <Field label="Début">
            <Input type="datetime-local" value={p.starts_at?.slice(0, 16) ?? ""} onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </Field>
          <Field label="Fin">
            <Input type="datetime-local" value={p.ends_at?.slice(0, 16) ?? ""} onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Activer la popup</Label>
            <p className="text-xs text-muted-foreground">Inactive = invisible côté public</p>
          </div>
          <Switch checked={p.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </div>
      </div>

      <div className="lg:sticky lg:top-24 self-start space-y-3">
        <Label className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
          <Eye className="h-3 w-3" /> Prévisualisation
        </Label>
        <div className="rounded-2xl bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center min-h-[420px]">
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              background: `hsl(${p.bg_color})`,
              color: `hsl(${p.text_color})`,
              borderColor: `hsl(${p.accent_color} / 0.4)`,
            }}
          >
            {p.image_url ? (
              <div className="aspect-[16/9] w-full overflow-hidden">
                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full flex items-center justify-center opacity-30">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
            <div className="p-6 space-y-3">
              {p.title && <h3 className="text-2xl font-display font-bold leading-tight">{p.title}</h3>}
              {p.body && <p className="text-sm opacity-90 whitespace-pre-wrap">{p.body}</p>}
              {p.cta_label && (
                <button
                  className="w-full mt-2 rounded-md py-2 font-medium"
                  style={{ background: `hsl(${p.accent_color})`, color: `hsl(${p.text_color})` }}
                >
                  {p.cta_label}
                </button>
              )}
            </div>
          </div>
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
