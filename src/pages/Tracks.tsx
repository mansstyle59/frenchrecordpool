import { useState, useMemo } from "react";
import { Search, LayoutGrid, List, Play, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTracks } from "@/hooks/useTracks";
import { usePlayer } from "@/contexts/PlayerContext";
import { resolveCover } from "@/lib/trackCover";

type SortOption = "newest" | "popular" | "az" | "bpm";
type ViewMode = "list" | "grid";

export default function Tracks() {
  const { data: tracks = [], isLoading } = useTracks();
  const { play } = usePlayer();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [musicalKey, setMusicalKey] = useState<string>("all");
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 200]);
  const [bpmActive, setBpmActive] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>("list");

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
          t.genre.toLowerCase().includes(q),
      );
    }
    if (genre !== "all") result = result.filter((t) => t.genre === genre);
    if (musicalKey !== "all") result = result.filter((t) => t.musical_key === musicalKey);
    if (bpmActive) result = result.filter((t) => t.bpm != null && t.bpm >= bpmRange[0] && t.bpm <= bpmRange[1]);
    switch (sort) {
      case "newest": result.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")); break;
      case "popular": result.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)); break;
      case "az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "bpm": result.sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0)); break;
    }
    return result;
  }, [tracks, search, genre, musicalKey, bpmActive, bpmRange, sort]);

  const playFrom = (idx: number) => {
    const t = filtered[idx];
    if (!t) return;
    play(
      { id: t.id, title: t.title, artist: t.artist, coverUrl: resolveCover(t), previewUrl: t.preview_url || t.audio_url },
      filtered.map((x) => ({ id: x.id, title: x.title, artist: x.artist, coverUrl: resolveCover(x), previewUrl: x.preview_url || x.audio_url })),
    );
  };

  const activeFiltersCount = (genre !== "all" ? 1 : 0) + (musicalKey !== "all" ? 1 : 0) + (bpmActive ? 1 : 0);

  const clearFilters = () => {
    setGenre("all");
    setMusicalKey("all");
    setBpmActive(false);
    setBpmRange([60, 200]);
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
            Catalogue complet · {tracks.length} titre{tracks.length > 1 ? "s" : ""}
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mt-4">
            <span className="gradient-text">Catalogue</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-xl">
            Filtrez par genre, tonalité, BPM. Préécoutez et téléchargez instantanément.
          </p>
        </div>
      </section>

      <div className="container py-8">
        {/* Glassmorphic filter dock */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-4 shadow-xl shadow-primary/5">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher titre, remixeur, genre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-secondary/60 border-border/60" />
            </div>

            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="h-11 w-full lg:w-40 bg-secondary/60 border-border/60"><SelectValue placeholder="Genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les genres</SelectItem>
                {Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))).sort().map((g: string) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={musicalKey} onValueChange={setMusicalKey}>
              <SelectTrigger className="h-11 w-full lg:w-32 bg-secondary/60 border-border/60"><SelectValue placeholder="Tonalité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
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
              <SelectTrigger className="h-11 w-full lg:w-36 bg-secondary/60 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Nouveautés</SelectItem>
                <SelectItem value="popular">Popularité</SelectItem>
                <SelectItem value="az">A → Z</SelectItem>
                <SelectItem value="bpm">BPM</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex h-11 rounded-md border border-border/60 bg-secondary/60 overflow-hidden">
              <Button variant={view === "list" ? "default" : "ghost"} size="icon" onClick={() => setView("list")} className="h-full rounded-none" title="Liste">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === "grid" ? "default" : "ghost"} size="icon" onClick={() => setView("grid")} className="h-full rounded-none" title="Grille">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Filtres actifs :</span>
            {genre !== "all" && (
              <Badge variant="secondary" className="gap-1">{genre}<button onClick={() => setGenre("all")}><X className="h-3 w-3" /></button></Badge>
            )}
            {musicalKey !== "all" && (
              <Badge variant="secondary" className="gap-1">Key {musicalKey}<button onClick={() => setMusicalKey("all")}><X className="h-3 w-3" /></button></Badge>
            )}
            {bpmActive && (
              <Badge variant="secondary" className="gap-1">{bpmRange[0]}–{bpmRange[1]} BPM<button onClick={() => setBpmActive(false)}><X className="h-3 w-3" /></button></Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>Tout effacer</Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">Aucune track ne correspond à ces filtres.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>Réinitialiser les filtres</Button>
          </div>
        ) : view === "list" ? (
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden shadow-lg shadow-primary/5">
            <div className="hidden md:grid grid-cols-[32px_44px_1fr_auto_112px_56px_48px_48px_auto] gap-3 px-4 py-2.5 border-b border-border/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 bg-secondary/30">
              <span>#</span><span></span><span>Titre · Remixeur</span><span className="hidden sm:block">Version</span><span className="hidden md:block">Genre</span><span className="hidden lg:block text-center">BPM</span><span className="hidden lg:block text-center">Key</span><span className="text-right">Time</span><span></span>
            </div>
            {filtered.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((t, i) => (
              <div key={t.id} className="group relative">
                <button
                  onClick={() => playFrom(i)}
                  className="block w-full aspect-square rounded-xl overflow-hidden border border-border group-hover:border-primary/60 transition-all group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-primary/20"
                >
                  <img src={resolveCover(t)} alt={`${t.title} — ${t.artist}`} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                  {t.bpm && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold font-mono">
                      {t.bpm} BPM{t.musical_key ? ` · ${t.musical_key}` : ""}
                    </div>
                  )}
                </button>
                <div className="mt-2 px-1 min-w-0">
                  <Link to={`/tracks/${t.id}`} className="text-sm font-semibold truncate block hover:text-primary">{t.title}</Link>
                  <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4 font-mono">{filtered.length} track{filtered.length > 1 ? "s" : ""} · mis à jour quotidiennement</p>
      </div>
    </Layout>
  );
}
