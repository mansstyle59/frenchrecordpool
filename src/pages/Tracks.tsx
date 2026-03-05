import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTracks } from "@/hooks/useTracks";
type SortOption = "newest" | "popular" | "az" | "bpm";

export default function Tracks() {
  const { data: tracks = [], isLoading } = useTracks();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("newest");

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
        </div>

        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Aucune track disponible.</p>
          ) : (
            filtered.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{filtered.length} track{filtered.length > 1 ? "s" : ""}</p>
      </div>
    </Layout>
  );
}
