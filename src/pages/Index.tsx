import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import HomeWidgets from "@/components/HomeWidgets";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ["home-active-widgets-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("home_widgets")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return count ?? 0;
    },
  });

  return (
    <Layout>
      {!isLoading && count === 0 ? (
        <section className="container py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="h-3 w-3" /> French Record Pool
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight mb-4">
            La page d'accueil <span className="gradient-text">se compose</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Aucun widget actif. Va dans l'admin pour bâtir ton accueil bloc par bloc.
          </p>
          <Button asChild size="lg" variant="hero">
            <Link to="/admin/widgets">Composer la home</Link>
          </Button>
        </section>
      ) : (
        <div className="py-2 md:py-4">
          <HomeWidgets />
        </div>
      )}
    </Layout>
  );
}
