import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockTracks, GENRES } from "@/data/mockTracks";

type SortOption = "newest" | "popular" | "az" | "bpm";

export default function Tracks() {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...mockTracks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q)
      );
    }
    if (genre !== "all") result = result.filter((t) => t.genre === genre);
    switch (sort) {
      case "newest": result.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)); break;
      case "popular": result.sort((a, b) => b.downloads - a.downloads); break;
      case "az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "bpm": result.sort((a, b) => a.bpm - b.bpm); break;
    }
    return result;
  }, [search, genre, sort]);

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Catalogue</h1>

        {/* Search & filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary border-border">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les genres</SelectItem>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Nouveautés</SelectItem>
              <SelectItem value="popular">Popularité</SelectItem>
              <SelectItem value="az">A → Z</SelectItem>
              <SelectItem value="bpm">BPM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Track header */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border mb-1">
          <span className="w-8 text-center">#</span>
          <span className="w-10" />
          <span className="flex-1">Titre / Artiste</span>
          <span className="w-20">Version</span>
          <span className="w-24">Genre</span>
          <span className="w-12 text-center">BPM</span>
          <span className="w-10 text-center">Key</span>
          <span className="w-12 text-right">Durée</span>
          <span className="w-20" />
        </div>

        {/* Tracks */}
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Aucun résultat trouvé.</p>
          ) : (
            filtered.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{filtered.length} track{filtered.length > 1 ? "s" : ""}</p>
      </div>
    </Layout>
  );
}
