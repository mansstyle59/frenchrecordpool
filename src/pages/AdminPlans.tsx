import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Layers, CheckCircle2, EyeOff, Sparkles, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminStatsRow from "@/components/admin/AdminStatsRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  features: string[] | any;
  is_active: boolean;
  sort_order: number;
};

const empty = {
  slug: "", name: "", description: "", price_cents: 0, currency: "EUR",
  interval: "month", features_text: "", is_active: true, sort_order: 0,
};

const INTERVAL_LABEL: Record<string, string> = {
  month: "/ mois", year: "/ an", lifetime: " à vie",
};

export default function AdminPlans() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").order("sort_order");
      return (data ?? []) as Plan[];
    },
    enabled: isAdmin,
  });

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.is_active).length;
    const cheapest = plans.filter((p) => p.is_active).reduce<Plan | null>((min, p) => (!min || p.price_cents < min.price_cents ? p : min), null);
    return { total: plans.length, active, hidden: plans.length - active, cheapest };
  }, [plans]);

  const openAdd = () => { setEditing(null); setForm({ ...empty, sort_order: plans.length }); setOpen(true); };
  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      slug: p.slug, name: p.name, description: p.description ?? "",
      price_cents: p.price_cents, currency: p.currency, interval: p.interval,
      features_text: (Array.isArray(p.features) ? p.features : []).join("\n"),
      is_active: p.is_active, sort_order: p.sort_order,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.slug || !form.name) {
      toast({ title: "Slug et nom requis", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      slug: form.slug.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description || null,
      price_cents: Number(form.price_cents) || 0,
      currency: form.currency,
      interval: form.interval,
      features: form.features_text.split("\n").map((s) => s.trim()).filter(Boolean),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("subscription_plans").update(payload).eq("id", editing.id)
      : await supabase.from("subscription_plans").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Plan modifié" : "Plan créé" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
  };

  const toggleActive = async (p: Plan) => {
    const { error } = await supabase.from("subscription_plans").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
  };

  const remove = async (p: Plan) => {
    if (!confirm(`Supprimer le plan "${p.name}" ?`)) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", p.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan supprimé" });
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
  };

  return (
    <AdminLayout
      wide
      title="Plans d'abonnement"
      subtitle="Définissez les formules visibles sur la page Tarifs."
      actions={<Button onClick={openAdd} variant="hero"><Plus className="h-4 w-4 mr-2" />Nouveau plan</Button>}
    >
      <AdminStatsRow
        stats={[
          { icon: <Layers className="h-4 w-4" />, label: "Total", value: stats.total, hint: "plans définis" },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: "Actifs", value: stats.active, hint: "visibles publiquement", accent: "primary" },
          { icon: <EyeOff className="h-4 w-4" />, label: "Masqués", value: stats.hidden, hint: "désactivés", accent: "muted" },
          { icon: <Sparkles className="h-4 w-4" />, label: "Entrée de gamme", value: stats.cheapest ? `${(stats.cheapest.price_cents / 100).toFixed(0)} €` : "—", hint: stats.cheapest?.name ?? "aucun", accent: "accent" },
        ]}
      />

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 backdrop-blur-xl p-12 text-center">
          <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">Aucun plan défini pour le moment.</p>
          <Button onClick={openAdd} variant="hero"><Plus className="h-4 w-4 mr-2" />Créer le premier plan</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => {
            const features: string[] = Array.isArray(p.features) ? p.features : [];
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-card/40 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all flex flex-col ${
                  p.is_active ? "border-border" : "border-dashed border-border/60 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold">{p.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mt-0.5">{p.slug}</p>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                    {p.is_active ? "Actif" : "Masqué"}
                  </Badge>
                </div>

                {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-display text-3xl font-bold gradient-text">{(p.price_cents / 100).toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">{p.currency}</span>
                  <span className="text-xs text-muted-foreground">{INTERVAL_LABEL[p.interval] ?? p.interval}</span>
                </div>

                {features.length > 0 && (
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {features.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                    {features.length > 5 && (
                      <li className="text-[11px] text-muted-foreground pl-5">+{features.length - 5} autres…</li>
                    )}
                  </ul>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    <span className="text-xs text-muted-foreground">Visible</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le plan" : "Nouveau plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Premium" />
            </div>
            <div className="space-y-2">
              <Label>Slug (unique)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="premium" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description courte</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Pour les DJs qui mixent toutes les semaines." />
            </div>
            <div className="space-y-2">
              <Label>Prix (centimes)</Label>
              <Input type="number" value={form.price_cents}
                onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} />
              <p className="text-[11px] text-muted-foreground">= {(Number(form.price_cents || 0) / 100).toFixed(2)} {form.currency}</p>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Intervalle</Label>
              <Select value={form.interval} onValueChange={(v) => setForm({ ...form, interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensuel</SelectItem>
                  <SelectItem value="year">Annuel</SelectItem>
                  <SelectItem value="lifetime">À vie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Fonctionnalités (une par ligne)</Label>
              <Textarea rows={5} value={form.features_text}
                onChange={(e) => setForm({ ...form, features_text: e.target.value })}
                placeholder={"Téléchargements illimités\nAccès aux exclus\nStems & acapellas"} />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Plan actif (visible publiquement)</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="hero" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
