import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Music2, Construction, ArrowLeft, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Stems() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl rounded-full" />
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl"
            >
              <Construction className="h-12 w-12 text-primary-foreground" />
            </motion.div>
          </div>

          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3" />
            Bientôt disponible
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Stems en construction
          </h1>

          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Nous préparons une bibliothèque exclusive d'<strong className="text-foreground">acapellas</strong> et d'<strong className="text-foreground">instrumentals</strong> haute qualité pour booster tes remix et tes sets. Reviens très vite !
          </p>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="rounded-2xl border bg-card/50 backdrop-blur p-6">
              <Mic className="h-8 w-8 mx-auto mb-3 text-primary" />
              <div className="font-semibold">Acapellas</div>
              <div className="text-sm text-muted-foreground">Voix isolées</div>
            </div>
            <div className="rounded-2xl border bg-card/50 backdrop-blur p-6">
              <Music2 className="h-8 w-8 mx-auto mb-3 text-accent" />
              <div className="font-semibold">Instrumentals</div>
              <div className="text-sm text-muted-foreground">Pistes sans voix</div>
            </div>
          </div>

          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Retour aux titres
            </Link>
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}
