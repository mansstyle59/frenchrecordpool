import { useState } from "react";
import { Ticket, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ERROR_MSG: Record<string, string> = {
  not_authenticated: "Connecte-toi pour utiliser un code.",
  invalid_code: "Ce code n'existe pas.",
  inactive: "Ce code n'est plus actif.",
  expired: "Ce code a expiré.",
  max_uses_reached: "Ce code a atteint sa limite d'utilisations.",
  plan_not_allowed: "Ce code n'est pas valide pour ce plan.",
  already_used: "Tu as déjà utilisé ce code.",
};

export default function RedeemPromoCard({ onSuccess }: { onSuccess?: () => void }) {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_promo_code", {
      _code: code.trim(),
      _plan_id: null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    const res = data as any;
    if (!res?.success) {
      toast({
        title: "Code refusé",
        description: ERROR_MSG[res?.error] ?? "Code invalide.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Code appliqué !",
      description: res.granted_until
        ? `Abonnement actif jusqu'au ${new Date(res.granted_until).toLocaleDateString("fr-FR")}`
        : "Ta remise est enregistrée.",
    });
    setCode("");
    await refreshProfile?.();
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" /> Code promo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tu as un code partenaire ? Saisis-le ici pour activer ton accès.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="EX: WELCOME10"
            className="font-mono uppercase"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && redeem()}
          />
          <Button onClick={redeem} disabled={loading || !code.trim()}>
            {loading ? "…" : <><CheckCircle2 className="h-4 w-4 mr-1" />Valider</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
