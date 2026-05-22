import { motion } from "framer-motion";
import { Check, Sparkles, CreditCard, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CmsText from "@/components/cms/CmsText";
import RedeemPromoCard from "@/components/RedeemPromoCard";
import PlanRequestDialog from "@/components/PlanRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";


const INTERVAL_LABEL: Record<string, string> = {
  month: "/mois", year: "/an", lifetime: " à vie",
};

export default function Pricing() {
  const { user } = useAuth();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <Layout>
      <PageHero
        eyebrow={<CmsText editKey="pricing.eyebrow">Sans engagement</CmsText>}
        title={<CmsText editKey="pricing.title">Choisis ton</CmsText>}
        highlight={<CmsText editKey="pricing.highlight">abonnement</CmsText>}
        description={<CmsText editKey="pricing.description">Accède aux exclus, edits et remixes du pool. Annule à tout moment, en un clic.</CmsText>}
        stats={[
          { icon: <CreditCard className="h-3.5 w-3.5 text-primary" />, label: `${plans.length} formules` },
          { icon: <Shield className="h-3.5 w-3.5 text-accent" />, label: "Paiement sécurisé" },
          { icon: <Sparkles className="h-3.5 w-3.5 text-primary" />, label: "Activation immédiate" },
        ]}
      />

      <section className="container py-10">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">Chargement…</div>
        ) : plans.length === 0 ? (
          <div className="text-center text-muted-foreground py-20 rounded-2xl border border-dashed border-border">
            Aucun plan disponible pour le moment.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p: any, i: number) => {
              const featured = i === Math.floor(plans.length / 2);
              const features: string[] = Array.isArray(p.features) ? p.features : [];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`p-6 h-full flex flex-col relative bg-card/40 backdrop-blur-xl ${featured ? "border-primary shadow-elegant ring-1 ring-primary/30" : ""}`}>
                    {featured && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Populaire
                      </Badge>
                    )}
                    <h3 className="font-display text-xl font-bold">{p.name}</h3>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    <div className="mt-4 mb-6">
                      <span className="text-4xl font-bold">{(p.price_cents / 100).toFixed(0)}</span>
                      <span className="text-lg text-muted-foreground"> {p.currency}</span>
                      <span className="text-sm text-muted-foreground">{INTERVAL_LABEL[p.interval] ?? ""}</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="w-full" variant={featured ? "hero" : "outline"}>
                      <Link to={user ? "/dashboard" : "/signup"}>
                        {user ? "Activer" : "Commencer"}
                      </Link>
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="max-w-md mx-auto mt-12">
          <RedeemPromoCard />
        </div>
      </section>
    </Layout>
  );
}
