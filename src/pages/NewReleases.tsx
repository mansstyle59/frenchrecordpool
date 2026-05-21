import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, Clock, Flame, ArrowUpDown, Disc3 } from "lucide-react";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTracks } from "@/hooks/useTracks";

type SortOption = "newest" | "popular" | "az" | "bpm";

const PAGE_SIZE = 40;

export default function NewReleases() {
  const { data: tracks = [], isLoading } = useTracks();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [version, setVersion] = useState<string>("all");
  const [musicalKey, setMusicalKey] = useState<string>("all");
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 200]);
  const [bpmActive, setBpmActive] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const genres = useMemo(
    () => Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean) as string[])).sort(),
    [tracks],
  );
  const versions = useMemo(
    () => Array.from(new Set(tracks.map((t) => t.version).filter(Boolean) as string[])).sort(),
    [tracks],
  );
  const allKeys = useMemo(
    () => Array.from(new Set(tracks.map((t) => t.musical_key).filter(Boolean) as string[])).sort(),
    [tracks],
  );

  const filtered = useMemo(() => {
    let result = [...tracks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.genre ?? "").toLowerCase().includes(q),
      );
    }
    if (genre !== "all") result = result.filter((t) => t.genre === genre);
    if (version !== "all") result = result.filter((t) => t.version === version);
    if (musicalKey !== "all") result = result.filter((t) => t.musical_key === musicalKey);
    if (bpmActive) result = result.filter((t) => t.bpm != null && t.bpm >= bpmRange[0] && t.bpm <= bpmRange[1]);
    switch (sort) {
      case "newest": result.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")); break;
      case "popular": result.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)); break;
      case "az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "bpm": result.sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0)); break;
    }
    return result;
  }, [tracks, search, genre, version, musicalKey, bpmActive, bpmRange, sort]);

  const visibleTracks = filtered.slice(0, visible);
  const activeFiltersCount =
    (genre !== "all" ? 1 : 0) +
    (version !== "all" ? 1 : 0) +
    (musicalKey !== "all" ? 1 : 0) +
    (bpmActive ? 1 : 0) +
    (search ? 1 : 0);

  const clearAll = () => {
    setSearch(""); setGenre("all"); setVersion("all"); setMusicalKey("all");
    setBpmActive(false); setBpmRange([60, 200]); setVisible(PAGE_SIZE);
  };

  return (
    <Layout>
      {/* Hero header */}
      <section className="relative border-b border-border/50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="relative container py-10 md:py-14">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Mis à jour quotidiennement
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mt-4">
            <span className="gradient-text">Nouveautés</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-xl">
            Les derniers edits, remixes et exclusivités pour vos sets. Filtrez par genre, version, BPM ou tonalité.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-xs text-muted-foreground font-mono">
            <span className="inline-flex items-center gap-1.5"><Disc3 className="h-3.5 w-3.5 text-primary" /> {tracks.length} titres</span>
            <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-accent" /> {genres.length} genres</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {filtered.length} résultats</span>
          </div>
        </div>
      </section>

      <div className="container py-6">
        {/* Genre pills row — djcity style */}
        {genres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-2 px-2 scrollbar-thin">
            <Chip active={genre === "all"} onClick={() => setGenre("all")}>Tous les genres</Chip>
            {genres.map((g) => (
              <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Chip>
            ))}
          </div>
        )}

        {/* Filter dock */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-4 shadow-xl shadow-primary/5">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher titre, remixeur, genre..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
                className="pl-10 h-11 bg-secondary/60 border-border/60"
              />
            </div>

            <Select value={version} onValueChange={(v) => { setVersion(v); setVisible(PAGE_SIZE); }}>
              <SelectTrigger className="h-11 w-full lg:w-40 bg-secondary/60 border-border/60"><SelectValue placeholder="Version" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes versions</SelectItem>
                {versions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={musicalKey} onValueChange={(v) => { setMusicalKey(v); setVisible(PAGE_SIZE); }}>
              <SelectTrigger className="h-11 w-full lg:w-32 bg-secondary/60 border-border/60"><SelectValue placeholder="Tonalité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes tonalités</SelectItem>
                {allKeys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 bg-secondary/60 border-border/60 gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  BPM {bpmActive && <Badge variant="secondary" className="ml-1">{bpmRange[0]}–{bpmRange[1]}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Plage BPM</span>
                  <span className="text-sm text-muted-foreground">{bpmRange[0]} – {bpmRange[1]}</span>
                </div>
                <Slider
                  min={40}
                  max={220}
                  step={1}
                  value={bpmRange}
                  onValueChange={(v) => { setBpmRange([v[0], v[1]] as [number, number]); setBpmActive(true); }}
                />
                <div className="flex gap-2 flex-wrap">
                  {[[60, 90, "Hip-Hop"], [90, 110, "Reggaeton"], [120, 130, "House"], [128, 140, "Techno"], [140, 160, "DnB"]].map(([lo, hi, label]) => (
                    <Button
                      key={label as string}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => { setBpmRange([lo as number, hi as number]); setBpmActive(true); }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button size="sm" variant="ghost" onClick={() => { setBpmActive(false); setBpmRange([60, 200]); }}>Réinitialiser</Button>
                  <Button size="sm" variant="hero" onClick={() => setBpmActive(true)}>Appliquer</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-11 w-full lg:w-44 bg-secondary/60 border-border/60">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus récents</SelectItem>
                <SelectItem value="popular">Plus téléchargés</SelectItem>
                <SelectItem value="az">A → Z</SelectItem>
                <SelectItem value="bpm">BPM (croissant)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Filtres :</span>
            {search && (
              <Badge variant="secondary" className="gap-1">"{search}"<button onClick={() => setSearch("")}><X className="h-3 w-3" /></button></Badge>
            )}
            {genre !== "all" && (
              <Badge variant="secondary" className="gap-1">{genre}<button onClick={() => setGenre("all")}><X className="h-3 w-3" /></button></Badge>
            )}
            {version !== "all" && (
              <Badge variant="secondary" className="gap-1">{version}<button onClick={() => setVersion("all")}><X className="h-3 w-3" /></button></Badge>
            )}
            {musicalKey !== "all" && (
              <Badge variant="secondary" className="gap-1">Key {musicalKey}<button onClick={() => setMusicalKey("all")}><X className="h-3 w-3" /></button></Badge>
            )}
            {bpmActive && (
              <Badge variant="secondary" className="gap-1">{bpmRange[0]}–{bpmRange[1]} BPM<button onClick={() => setBpmActive(false)}><X className="h-3 w-3" /></button></Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>Tout effacer</Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">Aucune nouveauté ne correspond à ces filtres.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={clearAll}>Réinitialiser</Button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden shadow-lg shadow-primary/5">
              <div className="hidden md:grid grid-cols-[32px_56px_1fr_auto_112px_56px_48px_48px_auto] gap-3 px-4 py-2.5 border-b border-border/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 bg-secondary/30">
                <span>#</span><span></span><span>Titre · Remixeur</span><span className="hidden sm:block">Version</span><span className="hidden md:block">Genre</span><span className="hidden lg:block text-center">BPM</span><span className="hidden lg:block text-center">Key</span><span className="text-right">Time</span><span></span>
              </div>
              {visibleTracks.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)}
            </div>

            {visible < filtered.length && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" size="lg" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Charger plus ({filtered.length - visible} restant{filtered.length - visible > 1 ? "s" : ""})
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4 font-mono text-center">
              Affichage {visibleTracks.length} / {filtered.length} titre{filtered.length > 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
          : "bg-secondary/40 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
