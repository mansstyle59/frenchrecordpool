import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const SUBSCRIPTION_REQUIRED_EVENT = "frp:require-subscription";

export type SubRequiredDetail = {
  title?: string;
  description?: string;
};

export function requireSubscription(detail: SubRequiredDetail = {}) {
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, { detail }));
}

export default function SubscriptionRequiredDialog() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SubRequiredDetail>({});

  useEffect(() => {
    const handler = (e: Event) => {
      setDetail((e as CustomEvent<SubRequiredDetail>).detail ?? {});
      setOpen(true);
    };
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md overflow-hidden border-border">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <DialogHeader className="text-center sm:text-center items-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-2">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {detail.title ?? "Abonnement requis"}
          </DialogTitle>
          <DialogDescription>
            {detail.description ??
              "Cette fonctionnalité est réservée aux membres actifs. Choisissez une offre pour télécharger toutes les exclusivités."}
          </DialogDescription>
        </DialogHeader>

        <ul className="my-2 space-y-2 text-sm">
          {[
            "Téléchargements illimités",
            "Accès aux acapellas et instrumentals",
            "Nouvelles sorties chaque semaine",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
            <X className="h-4 w-4 mr-1" /> Plus tard
          </Button>
          <Button asChild className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Link to="/pricing" onClick={() => setOpen(false)}>
              Voir les offres
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
