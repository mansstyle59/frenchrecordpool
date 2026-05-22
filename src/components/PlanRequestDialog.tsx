import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, MessageCircle, Sparkles, Construction } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const ERROR_MSG: Record<string, string> = {
  not_authenticated: "Connecte-toi pour utiliser un code.",
  invalid_code: "Ce code n'existe pas.",
  inactive: "Ce code n'est plus actif.",
  expired: "Ce code a expiré.",
  max_uses_reached: "Ce code a atteint sa limite d'utilisations.",
  plan_not_allowed: "Ce code n'est pas valide pour ce plan.",
  already_used: "Tu as déjà utilisé ce code.",
};

interface Props {
  plan: { id: string; name: string };
  trigger: React.ReactNode;
}

export default function PlanRequestDialog({ plan, trigger }: Props) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(`Bonjour, je souhaite activer le plan « ${plan.name} ». Merci !`);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next && !user) {
      toast({ title: "Inscription requise", description: "Crée un compte pour pouvoir être activé par l'admin." });
      navigate("/signup");
      return;
    }
    setOpen(next);
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_promo_code", {
      _code: code.trim().toUpperCase(),
      _plan_id: plan.id,
    });
    setLoading(false);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    const res = data as any;
    if (!res?.success) {
      return toast({ title: "Code refusé", description: ERROR_MSG[res?.error] ?? "Code invalide.", variant: "destructive" });
    }
    toast({
      title: "Code appliqué !",
      description: res.granted_until
        ? `Abonnement actif jusqu'au ${new Date(res.granted_until).toLocaleDateString("fr-FR")}`
        : "Ta remise est enregistrée.",
    });
    setCode("");
    await refreshProfile?.();
    setOpen(false);
  };

  const sendRequest = async () => {
    if (!user) return;
    const text = message.trim();
    if (!text) return;
    setSending(true);
    const { data: existing } = await supabase
      .from("support_threads").select("id").eq("user_id", user.id).maybeSingle();
    let threadId = existing?.id;
    if (!threadId) {
      const { data: inserted, error } = await supabase
        .from("support_threads")
        .insert({ user_id: user.id, subject: `Demande de plan : ${plan.name}` })
        .select("id").single();
      if (error) { setSending(false); return toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
      threadId = inserted.id;
    }
    const { error: msgErr } = await supabase.from("support_messages").insert({
      thread_id: threadId, sender_id: user.id, is_admin: false,
      body: `[Demande plan : ${plan.name}]\n\n${text}`,
    });
    setSending(false);
    if (msgErr) return toast({ title: "Erreur", description: msgErr.message, variant: "destructive" });
    toast({ title: "Demande envoyée", description: "Un admin va te répondre via le chat support." });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Construction className="h-3.5 w-3.5" />
            <span>Site en construction · Paiement bientôt en ligne</span>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Activer {plan.name}
          </DialogTitle>
          <DialogDescription>
            Saisis un code promo, ou envoie une demande à l'admin pour activation manuelle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" /> Code promo
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="EX: WELCOME10"
              className="font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && redeem()}
            />
            <Button onClick={redeem} disabled={loading || !code.trim()}>
              {loading ? "…" : "Valider"}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Demande à l'admin
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Explique ta demande..."
            className="bg-secondary"
          />
          <Button onClick={sendRequest} disabled={sending || !message.trim()} className="w-full" variant="hero">
            {sending ? "Envoi…" : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
