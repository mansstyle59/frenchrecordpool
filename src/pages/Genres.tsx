import Layout from "@/components/Layout";
import GenreCard from "@/components/GenreCard";
import PageHero from "@/components/PageHero";
import { useTracks } from "@/hooks/useTracks";
import { useMemo, useState } from "react";
import { Disc3, Flame, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Genres() {
  const { data: tracks = [], isLoading } = useTracks();
  const [search, setSearch] = useState("");

  const genres = useMemo(() => {
    const set = new Set(tracks.map((t) => t.genre).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [tracks]);

  const filtered = useMemo(() => {
    if (!search) return genres;
    const q = search.toLowerCase();
    return genres.filter((g) => g.toLowerCase().includes(q));
  }, [genres, search]);

  return (
    <Layout>
      <PageHero
        eyebrow="Explorer le catalogue"
        title="Tous les"
        highlight="genres"
        description="Naviguez par style musical. Trouvez l'ambiance parfaite pour votre prochain set."
        stats={[
          { icon: <Flame className="h-3.5 w-3.5 text-accent" />, label: `${genres.length} genres` },
          { icon: <Disc3 className="h-3.5 w-3.5 text-primary" />, label: `${tracks.length} titres` },
        ]}
      />

      <div className="container py-6">
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-6 shadow-xl shadow-primary/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-secondary/60 border-border/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">Aucun genre ne correspond.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSearch("")}>
              Réinitialiser
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((genre, i) => (
              <motion.div
                key={genre}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <GenreCard genre={genre} trackCount={tracks.filter((t) => t.genre === genre).length} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
