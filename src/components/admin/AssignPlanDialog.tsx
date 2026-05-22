import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminAction } from "@/lib/auditLog";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  userLabel?: string | null;
  onAssigned?: () => void;
}

export default function AssignPlanDialog({ open, onOpenChange, userId, userLabel, onAssigned }: Props) {
  const { user } = useAuth();
  const [planId, setPlanId] = useState<string>("");
  const [months, setMonths] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["assignable-plans"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id,name,slug,interval,price_cents,currency,is_active")
        .order("sort_order");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (open) { setPlanId(""); setMonths(1); }
  }, [open]);

  const selectedPlan = plans.find((p: any) => p.id === planId);
  const isLifetime = selectedPlan?.interval === "lifetime";

  const handleAssign = async () => {
    if (!userId || !planId) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_assign_plan" as any, {
      _user_id: userId,
      _plan_id: planId,
      _months: isLifetime ? 0 : months,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminAction({
      actorId: user!.id,
      action: "subscription.update",
      entityType: "subscription",
      entityId: userId,
      entityLabel: userLabel ?? userId,
      details: { assigned_plan: selectedPlan?.slug, months: isLifetime ? "lifetime" : months },
    });
    toast({ title: "Abonnement attribué", description: `${selectedPlan?.name} • ${userLabel ?? ""}` });
    onAssigned?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Attribuer un abonnement
          </DialogTitle>
          <DialogDescription>
            {userLabel ? `Pour ${userLabel}` : "Choisis un plan et la durée"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {(p.price_cents / 100).toFixed(0)} {p.currency} / {p.interval}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && !isLifetime && (
            <div className="space-y-1.5">
              <Label>Durée ({selectedPlan.interval === "year" ? "années" : "mois"})</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={months}
                onChange={(e) => setMonths(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <p className="text-[11px] text-muted-foreground">
                L'accès sera valable jusqu'à dans ~{months} {selectedPlan.interval === "year" ? "an(s)" : "mois"}.
              </p>
            </div>
          )}
          {isLifetime && (
            <p className="text-xs text-muted-foreground italic">Accès à vie — aucune durée à choisir.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleAssign} disabled={!planId || saving}>
            {saving ? "Attribution..." : "Attribuer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
