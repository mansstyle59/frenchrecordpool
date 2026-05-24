import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Disc3, X, Headphones, Music2 } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRoles, roleLabel, roleClassName } from "@/lib/artistRoles";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

const ROLE_FILTERS = [
  { key: "dj", label: "DJ", icon: <Users className="h-3 w-3" /> },
  { key: "remixer", label: "Remixer", icon: <Headphones className="h-3 w-3" /> },
  { key: "producer", label: "Producer", icon: <Music2 className="h-3 w-3" /> },
] as const;

export default function Remixers() {
  const { pathname } = useLocation();
  const isArtistsPage = pathname === "/artists";
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string>("all");
  const [activeRoles, setActiveRoles] = useState<Set<string>>(new Set());

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ["remixers-list", isArtistsPage],
    queryFn: async () => {
      let query = supabase
        .from("artists")
        .select("id, name, slug, photo_url, kind, roles")
        .order("name", { ascending: true });

      if (!isArtistsPage) {
        query = (query as any).contains("roles", ["remixer"]);
      }

      const { data } = await query;

      // Count tracks per artist (remixes for remixers, originals for all)
      const ids = (data ?? []).map((d) => d.id);
      let counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: trackData } = await supabase
          .from("tracks")
          .select("remixer_ids, artist_id")
          .eq("status", "approved");
        (trackData ?? []).forEach((t: any) => {
          if (!isArtistsPage) {
            (t.remixer_ids ?? []).forEach((id: string) => {
              counts[id] = (counts[id] ?? 0) + 1;
            });
          } else {
            if (t.artist_id) counts[t.artist_id] = (counts[t.artist_id] ?? 0) + 1;
          }
        });
      }

      return (data ?? []).map((d: any) => ({
        ...d,
        trackCount: counts[d.id] ?? 0,
        normalizedRoles: normalizeRoles(d.roles, d.kind),
      }));
    },
  });

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
    if (activeRoles.size > 0) {
      const needed = Array.from(activeRoles);
      r = r.filter((a) => needed.some((role) => a.normalizedRoles.includes(role)));
    }
    return r;
  }, [artists, search, letter, activeRoles]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    artists.forEach((a) => {
      const first = a.name[0]?.toUpperCase() ?? "";
      set.add(/[A-Z]/.test(first) ? first : "#");
    });
    return set;
  }, [artists]);

  const toggleRole = (role: string) => {
    setActiveRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const pageTitle = isArtistsPage ? "Artistes" : "Remixers";
  const pageEyebrow = isArtistsPage ? "Artistes du pool" : "Remixers du pool";
  const pageDesc = isArtistsPage
    ? "Découvrez tous les artistes, DJs, remixers et producers de la plateforme."
    : "Découvrez tous les remixers ayant publié un edit sur la plateforme.";
  const totalLabel = isArtistsPage
    ? `${artists.length} artistes`
    : `${artists.length} remixers`;
  const trackLabel = isArtistsPage
    ? `${artists.reduce((s, r) => s + r.trackCount, 0)} tracks`
    : `${artists.reduce((s, r) => s + r.trackCount, 0)} remix`;

  return (
    <Layout>
      <PageHero
        eyebrow={pageEyebrow}
        title="Les"
        highlight={pageTitle}
        description={pageDesc}
        stats={[
          { icon: <Users className="h-3.5 w-3.5 text-primary" />, label: totalLabel },
          { icon: <Disc3 className="h-3.5 w-3.5 text-accent" />, label: trackLabel },
        ]}
      />
      <div className="container py-6">
        {/* Search */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Rechercher un ${isArtistsPage ? "artiste" : "remixer"}...`}
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

        {/* Role filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mr-1">Filtrer :</span>
          {ROLE_FILTERS.map((r) => {
            const active = activeRoles.has(r.key);
            return (
              <button
                key={r.key}
                onClick={() => toggleRole(r.key)}
                className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                  active
                    ? `${roleClassName(r.key)} ring-1 ring-offset-1 ring-offset-background`
                    : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground hover:border-border"
                }`}
              >
                {r.icon}
                {r.label}
              </button>
            );
          })}
          {activeRoles.size > 0 && (
            <button
              onClick={() => setActiveRoles(new Set())}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Alphabet */}
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
            <p className="text-muted-foreground">
              {isArtistsPage ? "Aucun artiste trouvé." : "Aucun remixer. Les remixers sont créés automatiquement à la première soumission."}
            </p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setLetter("all"); setActiveRoles(new Set()); }}>Réinitialiser</Button>
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
                    {/* Role badges */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                      {r.normalizedRoles.slice(0, 2).map((role: string) => (
                        <span
                          key={role}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md whitespace-nowrap ${roleClassName(role)}`}
                        >
                          {roleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 font-display font-bold text-base group-hover:text-primary transition-colors truncate">{r.name}</p>
                  <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5">
                    {r.normalizedRoles.map((role: string) => (
                      <span
                        key={role}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${roleClassName(role)}`}
                      >
                        {roleLabel(role)}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">
                    {r.trackCount} {isArtistsPage ? "track" : "remix"}{r.trackCount > 1 ? "s" : ""}
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
