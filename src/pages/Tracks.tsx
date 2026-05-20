import { useState, useMemo } from "react";
import { Search, LayoutGrid, List, Play } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    let result = [...tracks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.genre.toLowerCase().includes(q));
    }
    if (genre !== "all") result = result.filter((t) => t.genre === genre);
    switch (sort) {
      case "newest": result.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")); break;
      case "popular": result.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)); break;
      case "az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "bpm": result.sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0)); break;
    }
    return result;
  }, [tracks, search, genre, sort]);

  const playFrom = (idx: number) => {
    const t = filtered[idx];
    if (!t) return;
    play(
      { id: t.id, title: t.title, artist: t.artist, coverUrl: resolveCover(t), previewUrl: t.preview_url },
      filtered.map((x) => ({ id: x.id, title: x.title, artist: x.artist, coverUrl: resolveCover(x), previewUrl: x.preview_url })),
    );
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Catalogue</h1>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary border-border"><SelectValue placeholder="Genre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les genres</SelectItem>
              {Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))).sort().map((g: string) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Nouveautés</SelectItem>
              <SelectItem value="popular">Popularité</SelectItem>
              <SelectItem value="az">A → Z</SelectItem>
              <SelectItem value="bpm">BPM</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-border bg-secondary overflow-hidden">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("list")}
              className="rounded-none"
              title="Liste"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("grid")}
              className="rounded-none"
              title="Grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucune track disponible.</p>
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
                  className="block w-full aspect-square rounded-xl overflow-hidden border border-border group-hover:border-primary/60 transition-all group-hover:scale-[1.02] group-hover:shadow-lg"
                >
                  <img src={resolveCover(t)} alt={`${t.title} — ${t.artist}`} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
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
