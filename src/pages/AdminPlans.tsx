import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
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

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
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
      features: form.features_text.split("\n").map(s => s.trim()).filter(Boolean),
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
      subtitle={`${plans.length} plan${plans.length > 1 ? "s" : ""}`}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Nouveau plan</Button>}
    >
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Intervalle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun plan. Crée le premier !</td></tr>
            ) : plans.map(p => (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.slug}</td>
                <td className="px-4 py-3">{(p.price_cents / 100).toFixed(2)} {p.currency}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.interval}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                    {p.is_active ? "Actif" : "Désactivé"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(p)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le plan" : "Nouveau plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug (unique)</Label>
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="basic" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Prix (centimes)</Label>
              <Input type="number" value={form.price_cents}
                onChange={e => setForm({ ...form, price_cents: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Intervalle</Label>
              <Select value={form.interval} onValueChange={v => setForm({ ...form, interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensuel</SelectItem>
                  <SelectItem value="year">Annuel</SelectItem>
                  <SelectItem value="lifetime">À vie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ordre</Label>
              <Input type="number" value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Fonctionnalités (une par ligne)</Label>
              <Textarea rows={5} value={form.features_text}
                onChange={e => setForm({ ...form, features_text: e.target.value })}
                placeholder="Téléchargements illimités&#10;Accès aux exclus&#10;Stems & acapellas" />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Plan actif (visible publiquement)</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
