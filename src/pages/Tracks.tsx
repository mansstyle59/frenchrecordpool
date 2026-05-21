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
      { id: t.id, title: t.title, artist: t.artist, coverUrl: resolveCover(t), previewUrl: t.preview_url },
      filtered.map((x) => ({ id: x.id, title: x.title, artist: x.artist, coverUrl: resolveCover(x), previewUrl: x.preview_url })),
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
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Catalogue</h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher titre, remixeur, genre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>

          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue placeholder="Genre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les genres</SelectItem>
              {Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))).sort().map((g: string) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={musicalKey} onValueChange={setMusicalKey}>
            <SelectTrigger className="w-full sm:w-32 bg-secondary border-border"><SelectValue placeholder="Tonalité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {allKeys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-secondary border-border gap-2">
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
            <SelectTrigger className="w-full sm:w-36 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Nouveautés</SelectItem>
              <SelectItem value="popular">Popularité</SelectItem>
              <SelectItem value="az">A → Z</SelectItem>
              <SelectItem value="bpm">BPM</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-md border border-border bg-secondary overflow-hidden">
            <Button variant={view === "list" ? "default" : "ghost"} size="icon" onClick={() => setView("list")} className="rounded-none" title="Liste">
              <List className="h-4 w-4" />
            </Button>
            <Button variant={view === "grid" ? "default" : "ghost"} size="icon" onClick={() => setView("grid")} className="rounded-none" title="Grille">
              <LayoutGrid className="h-4 w-4" />
            </Button>
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
          <p className="text-center text-muted-foreground py-12">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucune track ne correspond à ces filtres.</p>
        ) : view === "list" ? (
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
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
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">
                      {t.bpm} BPM{t.musical_key ? ` · ${t.musical_key}` : ""}
                    </div>
                  )}
                </button>
                <div className="mt-2 px-1 min-w-0">
                  <Link to={`/tracks/${t.id}`} className="text-sm font-medium truncate block hover:text-primary">{t.title}</Link>
                  <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">{filtered.length} track{filtered.length > 1 ? "s" : ""}</p>
      </div>
    </Layout>
  );
}
