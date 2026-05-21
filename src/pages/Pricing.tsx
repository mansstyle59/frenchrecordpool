import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RedeemPromoCard from "@/components/RedeemPromoCard";
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
      <section className="container py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <Badge variant="outline" className="mb-4 gap-1">
            <Sparkles className="h-3 w-3" /> Sans engagement
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Choisis ton <span className="gradient-text">abonnement</span>
          </h1>
          <p className="text-muted-foreground">
            Accède aux exclus, edits et remixes du pool. Annule à tout moment.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Chargement…</div>
        ) : plans.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
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
                  <Card className={`p-6 h-full flex flex-col relative ${featured ? "border-primary shadow-elegant ring-1 ring-primary/30" : ""}`}>
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
                    <Button asChild className="w-full" variant={featured ? "default" : "outline"}>
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
