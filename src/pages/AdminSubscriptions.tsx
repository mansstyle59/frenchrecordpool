import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminSubscriptions() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);


  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, profiles!subscriptions_user_id_fkey(dj_name, email)");
      return data ?? [];
    },
    enabled: isAdmin,
  });

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
    <AdminLayout wide title="Gestion des Abonnements" subtitle={`${subs.length} abonnement${subs.length > 1 ? "s" : ""}`}>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Fin période</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun abonnement.</td></tr>
                ) : subs.map((sub: any) => {
                  const isEditing = editing === sub.id;
                  return (
                    <tr key={sub.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium">{sub.profiles?.dj_name || sub.profiles?.email || "-"}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Select defaultValue={sub.plan} onValueChange={(v) => updateField(sub, { plan: v })}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : <Badge variant="outline" className="text-xs">{sub.plan}</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Select defaultValue={sub.status} onValueChange={(v) => updateField(sub, { status: v })}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Actif</SelectItem>
                              <SelectItem value="canceled">Annulé</SelectItem>
                              <SelectItem value="expired">Expiré</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">
                            {sub.status === "active" ? "Actif" : sub.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("fr-FR") : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(isEditing ? null : sub.id)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(sub)}>
                            <Trash2 className="h-3 w-3" />
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
      </div>
    </AdminLayout>
  );
}
