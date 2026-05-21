import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Music2, Construction, ArrowLeft, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";

export default function Stems() {
  return (
    <Layout>
      <PageHero
        eyebrow="Bientôt disponible"
        title="Acapellas &"
        highlight="Instrumentals"
        description="Une bibliothèque exclusive de stems haute qualité pour vos mashups, remix et transitions. En cours de préparation."
        stats={[
          { icon: <Mic className="h-3.5 w-3.5 text-primary" />, label: "Voix isolées" },
          { icon: <Music2 className="h-3.5 w-3.5 text-accent" />, label: "Pistes sans voix" },
          { icon: <Sparkles className="h-3.5 w-3.5 text-primary" />, label: "Lancement prochain" },
        ]}
      />

      <div className="container py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-10 md:p-14 shadow-xl shadow-primary/5 text-center max-w-3xl mx-auto"
        >
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl rounded-full" />
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl"
            >
              <Construction className="h-10 w-10 text-primary-foreground" />
            </motion.div>
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Section en construction</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Nous préparons une collection exclusive d'<strong className="text-foreground">acapellas</strong> et d'
            <strong className="text-foreground">instrumentals</strong> pour booster vos remix. Revenez très vite !
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
            <div className="rounded-2xl border border-border bg-secondary/40 p-5">
              <Mic className="h-7 w-7 mx-auto mb-2 text-primary" />
              <div className="font-semibold text-sm">Acapellas</div>
              <div className="text-xs text-muted-foreground">Voix isolées</div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-5">
              <Music2 className="h-7 w-7 mx-auto mb-2 text-accent" />
              <div className="font-semibold text-sm">Instrumentals</div>
              <div className="text-xs text-muted-foreground">Pistes sans voix</div>
            </div>
          </div>

          <Button asChild variant="hero" size="lg" className="gap-2">
            <Link to="/new">
              <ArrowLeft className="h-4 w-4" />
              Voir les nouveautés
            </Link>
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}
