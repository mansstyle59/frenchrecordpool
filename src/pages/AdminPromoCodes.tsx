import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Copy, Ticket, Search, X, TrendingUp, CheckCircle2, Power } from "lucide-react";
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

const TYPE_HINT: Record<DiscountType, string> = {
  percent: "Pourcentage de remise (0-100)",
  fixed: "Montant fixe à déduire (en centimes)",
  free_period: "Durée d'accès gratuit (en mois)",
  full_access: "Accès complet à vie, sans paiement",
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
  const [search, setSearch] = useState("");

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

  const stats = useMemo(() => {
    const active = codes.filter((c) => c.is_active).length;
    const totalUses = codes.reduce((sum, c) => sum + (c.uses_count ?? 0), 0);
    const expired = codes.filter((c) => c.expires_at && new Date(c.expires_at) < new Date()).length;
    return { total: codes.length, active, totalUses, expired };
  }, [codes]);

  const filtered = useMemo(() => {
    if (!search) return codes;
    const q = search.toLowerCase();
    return codes.filter((c) => c.code.toLowerCase().includes(q) || (c.notes ?? "").toLowerCase().includes(q));
  }, [codes, search]);

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

  const toggleActive = async (c: PromoCode) => {
    const { error } = await supabase.from("promo_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
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
    setForm((f) => ({
      ...f,
      allowed_plan_ids: f.allowed_plan_ids.includes(id)
        ? f.allowed_plan_ids.filter((x) => x !== id)
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
      subtitle="Créez des codes de réduction, d'essai ou d'accès total."
      actions={<Button onClick={openAdd} variant="hero"><Plus className="h-4 w-4 mr-2" />Nouveau code</Button>}
    >
      <AdminStatsRow
        stats={[
          { icon: <Ticket className="h-4 w-4" />, label: "Total", value: stats.total, hint: "codes créés" },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: "Actifs", value: stats.active, hint: "utilisables", accent: "primary" },
          { icon: <TrendingUp className="h-4 w-4" />, label: "Utilisations", value: stats.totalUses, hint: "cumulées", accent: "accent" },
          { icon: <Power className="h-4 w-4" />, label: "Expirés", value: stats.expired, hint: "à nettoyer", accent: "muted" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 shadow-xl shadow-primary/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un code ou une note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-secondary/60 border-border/60"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 backdrop-blur-xl p-12 text-center">
          <Ticket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">Aucun code promo pour le moment.</p>
          <Button onClick={openAdd} variant="hero"><Plus className="h-4 w-4 mr-2" />Créer le premier code</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden shadow-lg shadow-primary/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Valeur</th>
                  <th className="px-4 py-3">Utilisations</th>
                  <th className="px-4 py-3">Expire</th>
                  <th className="px-4 py-3">Visible</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((c) => {
                  const usagePct = c.max_uses ? Math.min(100, ((c.uses_count ?? 0) / c.max_uses) * 100) : 0;
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-wider text-primary">{c.code}</span>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copié !" }); }}
                          ><Copy className="h-3 w-3" /></Button>
                        </div>
                        {c.notes && <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{c.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[c.discount_type]}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatValue(c)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono">
                          {c.uses_count}{c.max_uses ? <span className="text-muted-foreground"> / {c.max_uses}</span> : <span className="text-muted-foreground"> / ∞</span>}
                        </div>
                        {c.max_uses && (
                          <div className="mt-1 h-1 w-20 rounded-full bg-secondary/60 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${usagePct}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {c.expires_at ? (
                          <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                            {new Date(c.expires_at).toLocaleDateString("fr-FR")}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(c)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le code" : "Nouveau code promo"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input className="font-mono uppercase tracking-wider" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                <Button variant="outline" type="button" onClick={() => setForm({ ...form, code: randomCode() })}>
                  Générer
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type de remise</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as DiscountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Réduction %</SelectItem>
                  <SelectItem value="fixed">Réduction fixe (centimes)</SelectItem>
                  <SelectItem value="free_period">Période gratuite (mois)</SelectItem>
                  <SelectItem value="full_access">Accès total gratuit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{TYPE_HINT[form.discount_type]}</p>
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
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Utilisations max (total)</Label>
              <Input type="number" placeholder="illimité" value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value as any })} />
            </div>
            <div className="space-y-2">
              <Label>Limite par utilisateur</Label>
              <Input type="number" value={form.per_user_limit}
                onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Expire le (optionnel)</Label>
              <Input type="datetime-local" value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Plans autorisés <span className="text-muted-foreground font-normal">(vide = tous les plans)</span></Label>
              <div className="flex flex-wrap gap-2">
                {plans.length === 0 && <span className="text-xs text-muted-foreground">Aucun plan défini.</span>}
                {plans.map((p: any) => {
                  const on = form.allowed_plan_ids.includes(p.id);
                  return (
                    <Badge key={p.id} variant={on ? "default" : "outline"}
                      className="cursor-pointer select-none" onClick={() => togglePlan(p.id)}>
                      {p.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes internes</Label>
              <Textarea rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Campagne newsletter, partenaire X, etc." />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Code actif (utilisable immédiatement)</Label>
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
