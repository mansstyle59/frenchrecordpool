import { useState, useMemo } from "react";
import { Pencil, Trash2, Search, X, CreditCard, CheckCircle2, Clock, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminStatsRow from "@/components/admin/AdminStatsRow";

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  canceled: { label: "Annulé", variant: "secondary" },
  expired: { label: "Expiré", variant: "secondary" },
  blocked: { label: "Bloqué", variant: "destructive" },
  revoked: { label: "Révoqué", variant: "destructive" },
};

export default function AdminSubscriptions() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, profiles!subscriptions_user_id_fkey(dj_name, email)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans-min"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("id,name,slug").order("sort_order");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const plansById = useMemo(() => Object.fromEntries(plans.map((p: any) => [p.id, p])), [plans]);

  const stats = useMemo(() => {
    const total = subs.length;
    const active = subs.filter((s: any) => s.status === "active").length;
    const expiringSoon = subs.filter((s: any) => {
      if (s.status !== "active" || !s.current_period_end) return false;
      const days = (new Date(s.current_period_end).getTime() - Date.now()) / 86_400_000;
      return days > 0 && days <= 7;
    }).length;
    const blocked = subs.filter((s: any) => s.status === "blocked" || s.status === "revoked").length;
    return { total, active, expiringSoon, blocked };
  }, [subs]);

  const filtered = useMemo(() => {
    let r = subs as any[];
    if (statusFilter !== "all") r = r.filter((s) => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) => {
        const p = s.profiles ?? {};
        return (p.email ?? "").toLowerCase().includes(q) || (p.dj_name ?? "").toLowerCase().includes(q);
      });
    }
    return r;
  }, [subs, statusFilter, search]);

  const updateField = async (sub: any, patch: Record<string, any>) => {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", sub.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction({
      actorId: user!.id, action: "subscription.update",
      entityType: "subscription", entityId: sub.id,
      entityLabel: sub.profiles?.email ?? sub.user_id,
      details: { before: { plan: sub.plan, status: sub.status }, after: patch },
    });
    toast({ title: "Abonnement mis à jour" });
    qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  const handleDelete = async (sub: any) => {
    if (!confirm("Supprimer cet abonnement ?")) return;
    const { error } = await supabase.from("subscriptions").delete().eq("id", sub.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction({
      actorId: user!.id, action: "subscription.delete",
      entityType: "subscription", entityId: sub.id,
      entityLabel: sub.profiles?.email ?? sub.user_id,
      details: { plan: sub.plan, status: sub.status },
    });
    toast({ title: "Abonnement supprimé" });
    qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  return (
    <AdminLayout wide title="Abonnements" subtitle="Suivi en temps réel des accès payants.">
      <AdminStatsRow
        stats={[
          { icon: <CreditCard className="h-4 w-4" />, label: "Total", value: stats.total, hint: "abonnements" },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: "Actifs", value: stats.active, hint: "accès en cours", accent: "primary" },
          { icon: <Clock className="h-4 w-4" />, label: "À renouveler", value: stats.expiringSoon, hint: "≤ 7 jours", accent: "accent" },
          { icon: <Ban className="h-4 w-4" />, label: "Bloqués", value: stats.blocked, hint: "ou révoqués", accent: "muted" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 shadow-xl shadow-primary/5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email ou DJ name..."
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 sm:w-44 bg-secondary/60 border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="canceled">Annulés</SelectItem>
              <SelectItem value="expired">Expirés</SelectItem>
              <SelectItem value="blocked">Bloqués</SelectItem>
              <SelectItem value="revoked">Révoqués</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden shadow-lg shadow-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Fin de période</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Aucun abonnement à afficher.
                </td></tr>
              ) : filtered.map((sub: any) => {
                const isEditing = editing === sub.id;
                const planName = sub.plan_id ? plansById[sub.plan_id]?.name : sub.plan;
                const meta = STATUS_META[sub.status] ?? { label: sub.status, variant: "secondary" as const };
                const expiring = sub.status === "active" && sub.current_period_end &&
                  (new Date(sub.current_period_end).getTime() - Date.now()) / 86_400_000 <= 7;
                return (
                  <tr key={sub.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{sub.profiles?.dj_name || "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sub.profiles?.email ?? sub.user_id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing && plans.length > 0 ? (
                        <Select defaultValue={sub.plan_id ?? ""} onValueChange={(v) => updateField(sub, { plan_id: v, plan: plansById[v]?.slug ?? sub.plan })}>
                          <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Plan" /></SelectTrigger>
                          <SelectContent>
                            {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{planName ?? sub.plan ?? "—"}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Select defaultValue={sub.status} onValueChange={(v) => updateField(sub, { status: v })}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="canceled">Annulé</SelectItem>
                            <SelectItem value="expired">Expiré</SelectItem>
                            <SelectItem value="blocked">Bloqué</SelectItem>
                            <SelectItem value="revoked">Révoqué</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {sub.current_period_end ? (
                        <span className={expiring ? "text-accent font-semibold" : ""}>
                          {new Date(sub.current_period_end).toLocaleDateString("fr-FR")}
                          {expiring && " ⚠"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(isEditing ? null : sub.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(sub)}>
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

      <p className="text-xs text-muted-foreground font-mono text-center">
        {filtered.length} / {subs.length} abonnement{subs.length > 1 ? "s" : ""}
      </p>
    </AdminLayout>
  );
}
