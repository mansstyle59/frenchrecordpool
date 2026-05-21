import { useState } from "react";
import { Plus, Pencil, Trash2, Copy, Ticket } from "lucide-react";
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

type DiscountType = "percent" | "fixed" | "free_period" | "full_access";

type PromoCode = {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number | null;
  max_uses: number | null;
  uses_count: number;
  per_user_limit: number;
  expires_at: string | null;
  allowed_plan_ids: string[] | null;
  is_active: boolean;
  notes: string | null;
};

const empty = {
  code: "", discount_type: "percent" as DiscountType, discount_value: 10,
  max_uses: "" as any, per_user_limit: 1,
  expires_at: "", allowed_plan_ids: [] as string[],
  is_active: true, notes: "",
};

const TYPE_LABEL: Record<DiscountType, string> = {
  percent: "Réduction %", fixed: "Réduction fixe",
  free_period: "Période gratuite", full_access: "Accès total",
};

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function AdminPromoCodes() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: codes = [] } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
      return (data ?? []) as PromoCode[];
    },
    enabled: isAdmin,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans-min"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("id,name").order("sort_order");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const openAdd = () => { setEditing(null); setForm({ ...empty, code: randomCode() }); setOpen(true); };
  const openEdit = (c: PromoCode) => {
    setEditing(c);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: c.discount_value ?? 0,
      max_uses: c.max_uses ?? ("" as any), per_user_limit: c.per_user_limit,
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      allowed_plan_ids: c.allowed_plan_ids ?? [],
      is_active: c.is_active, notes: c.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) { toast({ title: "Code requis", variant: "destructive" }); return; }
    if (form.discount_type !== "full_access" && (form.discount_value === null || form.discount_value === undefined)) {
      toast({ title: "Valeur requise pour ce type", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === "full_access" ? null : Number(form.discount_value),
      max_uses: form.max_uses === "" || form.max_uses === null ? null : Number(form.max_uses),
      per_user_limit: Number(form.per_user_limit) || 1,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      allowed_plan_ids: form.allowed_plan_ids.length > 0 ? form.allowed_plan_ids : null,
      is_active: form.is_active,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("promo_codes").update(payload).eq("id", editing.id)
      : await supabase.from("promo_codes").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Code modifié" : "Code créé" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
  };

  const remove = async (c: PromoCode) => {
    if (!confirm(`Supprimer le code ${c.code} ?`)) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", c.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Code supprimé" });
    qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
  };

  const togglePlan = (id: string) => {
    setForm(f => ({
      ...f,
      allowed_plan_ids: f.allowed_plan_ids.includes(id)
        ? f.allowed_plan_ids.filter(x => x !== id)
        : [...f.allowed_plan_ids, id],
    }));
  };

  const formatValue = (c: PromoCode) => {
    switch (c.discount_type) {
      case "percent": return `-${c.discount_value}%`;
      case "fixed": return `-${((c.discount_value ?? 0) / 100).toFixed(2)} €`;
      case "free_period": return `${c.discount_value} mois offert${(c.discount_value ?? 0) > 1 ? "s" : ""}`;
      case "full_access": return "Accès total";
    }
  };

  return (
    <AdminLayout
      wide
      title="Codes promo"
      subtitle={`${codes.length} code${codes.length > 1 ? "s" : ""}`}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Nouveau code</Button>}
    >
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Valeur</th>
              <th className="px-4 py-3">Utilisations</th>
              <th className="px-4 py-3">Expire</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {codes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Aucun code promo. Crée le premier !
              </td></tr>
            ) : codes.map(c => (
              <tr key={c.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{c.code}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copié !" }); }}
                    ><Copy className="h-3 w-3" /></Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[c.discount_type]}</td>
                <td className="px-4 py-3 font-medium">{formatValue(c)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={c.is_active ? "default" : "secondary"} className="text-xs">
                    {c.is_active ? "Actif" : "Désactivé"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(c)}>
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
            <DialogTitle>{editing ? "Modifier le code" : "Nouveau code promo"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input className="font-mono uppercase" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                <Button variant="outline" type="button" onClick={() => setForm({ ...form, code: randomCode() })}>
                  Générer
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type de remise</Label>
              <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v as DiscountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Réduction %</SelectItem>
                  <SelectItem value="fixed">Réduction fixe (centimes)</SelectItem>
                  <SelectItem value="free_period">Période gratuite (mois)</SelectItem>
                  <SelectItem value="full_access">Accès total gratuit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {form.discount_type === "percent" && "Pourcentage (0-100)"}
                {form.discount_type === "fixed" && "Montant en centimes"}
                {form.discount_type === "free_period" && "Nombre de mois"}
                {form.discount_type === "full_access" && "—"}
              </Label>
              <Input type="number" value={form.discount_value ?? 0}
                disabled={form.discount_type === "full_access"}
                onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Utilisations max (total)</Label>
              <Input type="number" placeholder="illimité" value={form.max_uses}
                onChange={e => setForm({ ...form, max_uses: e.target.value as any })} />
            </div>
            <div className="space-y-2">
              <Label>Limite par utilisateur</Label>
              <Input type="number" value={form.per_user_limit}
                onChange={e => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Expire le (optionnel)</Label>
              <Input type="datetime-local" value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Plans autorisés (vide = tous)</Label>
              <div className="flex flex-wrap gap-2">
                {plans.length === 0 && <span className="text-xs text-muted-foreground">Aucun plan défini.</span>}
                {plans.map((p: any) => {
                  const on = form.allowed_plan_ids.includes(p.id);
                  return (
                    <Badge key={p.id} variant={on ? "default" : "outline"}
                      className="cursor-pointer" onClick={() => togglePlan(p.id)}>
                      {p.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes internes</Label>
              <Textarea rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Code actif</Label>
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
