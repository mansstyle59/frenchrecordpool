import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Disc3, X } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export default function Remixers() {
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string>("all");

  const { data: remixers = [], isLoading } = useQuery({
    queryKey: ["remixers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("id, name, slug, photo_url, kind")
        .in("kind", ["remixer", "both"])
        .order("name", { ascending: true });

      // Count tracks per remixer
      const ids = (data ?? []).map((d) => d.id);
      let counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: trackData } = await supabase
          .from("tracks")
          .select("remixer_ids")
          .eq("status", "approved");
        (trackData ?? []).forEach((t: any) => {
          (t.remixer_ids ?? []).forEach((id: string) => {
            counts[id] = (counts[id] ?? 0) + 1;
          });
        });
      }
      return (data ?? []).map((d) => ({ ...d, trackCount: counts[d.id] ?? 0 }));
    },
  });

  const filtered = useMemo(() => {
    let r = remixers;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (letter !== "all") {
      r = r.filter((a) => {
        const first = a.name[0]?.toUpperCase() ?? "";
        if (letter === "#") return !/[A-Z]/.test(first);
        return first === letter;
      });
    }
    return r;
  }, [remixers, search, letter]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    remixers.forEach((a) => {
      const first = a.name[0]?.toUpperCase() ?? "";
      set.add(/[A-Z]/.test(first) ? first : "#");
    });
    return set;
  }, [remixers]);

  return (
    <Layout>
      <PageHero
        eyebrow="Remixers du pool"
        title="Les"
        highlight="Remixers"
        description="Découvrez tous les remixers ayant publié un edit sur la plateforme."
        stats={[
          { icon: <Users className="h-3.5 w-3.5 text-primary" />, label: `${remixers.length} remixers` },
          { icon: <Disc3 className="h-3.5 w-3.5 text-accent" />, label: `${remixers.reduce((s, r) => s + r.trackCount, 0)} remix` },
        ]}
      />
      <div className="container py-6">
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un remixer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-12 bg-secondary/60 border-border/60 text-base"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-3 mb-6 -mx-2 px-2">
          <button
            onClick={() => setLetter("all")}
            className={`shrink-0 px-3 h-9 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
              letter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground"
            }`}
          >Tous</button>
          {ALPHABET.map((l) => {
            const enabled = availableLetters.has(l);
            return (
              <button
                key={l}
                disabled={!enabled}
                onClick={() => setLetter(l)}
                className={`shrink-0 w-9 h-9 rounded-md text-xs font-bold border transition-all ${
                  letter === l ? "bg-primary text-primary-foreground border-primary"
                    : enabled ? "bg-secondary/40 text-foreground border-border/50 hover:border-primary/40 hover:text-primary"
                    : "bg-transparent text-muted-foreground/30 border-border/30 cursor-not-allowed"
                }`}
              >{l}</button>
            );
          })}
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">Aucun remixer. Les remixers sont créés automatiquement à la première soumission.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setLetter("all"); }}>Réinitialiser</Button>
          </div>
        ) : (
          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
          >
            {filtered.map((r) => (
              <motion.div key={r.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <Link to={`/artists/${r.slug}`} className="group block text-center">
                  <div className="relative mx-auto w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gradient-to-br from-accent/80 to-primary/80 ring-2 ring-border group-hover:ring-primary group-hover:shadow-2xl group-hover:shadow-primary/30 transition-all">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl font-display font-black text-background">{r.name[0]?.toUpperCase()}</div>
                    )}
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md whitespace-nowrap ${
                      r.kind === "both" ? "bg-primary/90 text-primary-foreground" : "bg-accent/90 text-accent-foreground"
                    }`}>
                      {r.kind === "both" ? "DJ + Remixer" : "Remixer"}
                    </span>
                  </div>
                  <p className="mt-3 font-display font-bold text-base group-hover:text-primary transition-colors truncate">{r.name}</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {r.trackCount} remix
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
