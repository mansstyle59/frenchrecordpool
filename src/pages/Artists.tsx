import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Disc3, X } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTracks } from "@/hooks/useTracks";
import { generateTrackCover } from "@/lib/trackCover";
import { slugify } from "@/lib/slug";

type Artist = {
  name: string;
  trackCount: number;
  cover: string;
  topGenre: string | null;
  lastRelease: string | null;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export default function Artists() {
  const { data: tracks = [], isLoading } = useTracks();
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string>("all");

  const artists = useMemo<Artist[]>(() => {
    const map = new Map<string, Artist>();
    for (const t of tracks) {
      if (!t.artist) continue;
      const entry = map.get(t.artist) ?? {
        name: t.artist,
        trackCount: 0,
        cover: generateTrackCover(t.title ?? t.artist, t.artist),
        topGenre: null,
        lastRelease: null,
      };
      entry.trackCount += 1;
      if (t.genre && !entry.topGenre) entry.topGenre = t.genre;
      if (t.release_date && (!entry.lastRelease || t.release_date > entry.lastRelease)) {
        entry.lastRelease = t.release_date;
      }
      map.set(t.artist, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const filtered = useMemo(() => {
    let r = artists;
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
  }, [artists, search, letter]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    artists.forEach((a) => {
      const first = a.name[0]?.toUpperCase() ?? "";
      set.add(/[A-Z]/.test(first) ? first : "#");
    });
    return set;
  }, [artists]);

  const totalTracks = tracks.length;

  return (
    <Layout>
      <PageHero
        eyebrow="Artistes du pool"
        title="Les"
        highlight="Artistes"
        description="Tous les artistes dont les titres sont publiés sur la plateforme."
        stats={[
          { icon: <Users className="h-3.5 w-3.5 text-primary" />, label: `${artists.length} artistes` },
          { icon: <Disc3 className="h-3.5 w-3.5 text-accent" />, label: `${totalTracks} titres` },
        ]}
      />


      <div className="container py-6">
        {/* Search */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-4 shadow-xl shadow-primary/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un remixeur..."
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

        {/* Alphabet jump bar */}
        <div className="flex gap-1 overflow-x-auto pb-3 mb-6 -mx-2 px-2">
          <button
            onClick={() => setLetter("all")}
            className={`shrink-0 px-3 h-9 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
              letter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground"
            }`}
          >
            Tous
          </button>
          {ALPHABET.map((l) => {
            const enabled = availableLetters.has(l);
            return (
              <button
                key={l}
                disabled={!enabled}
                onClick={() => setLetter(l)}
                className={`shrink-0 w-9 h-9 rounded-md text-xs font-bold border transition-all ${
                  letter === l
                    ? "bg-primary text-primary-foreground border-primary"
                    : enabled
                    ? "bg-secondary/40 text-foreground border-border/50 hover:border-primary/40 hover:text-primary"
                    : "bg-transparent text-muted-foreground/30 border-border/30 cursor-not-allowed"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">Aucun remixeur trouvé.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setLetter("all"); }}>
              Réinitialiser
            </Button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
          >
            {filtered.map((artist) => (
              <motion.div
                key={artist.name}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              >
                <Link
                  to={`/new?q=${encodeURIComponent(artist.name)}`}
                  className="group block text-center"
                >
                  <div className="relative mx-auto w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gradient-to-br from-primary/80 to-accent/80 ring-2 ring-border group-hover:ring-primary group-hover:shadow-2xl group-hover:shadow-primary/30 transition-all">
                    <img
                      src={artist.cover}
                      alt={artist.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-mono font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {artist.trackCount} titre{artist.trackCount > 1 ? "s" : ""}
                    </div>
                  </div>
                  <p className="mt-3 font-display font-bold text-base group-hover:text-primary transition-colors truncate">
                    {artist.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {artist.topGenre ?? `${artist.trackCount} titre${artist.trackCount > 1 ? "s" : ""}`}
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-8 font-mono text-center">
            {filtered.length} remixeur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </Layout>
  );
}
