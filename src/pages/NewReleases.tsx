import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowUpDown, Disc3, Calendar, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTracks, type DbTrack } from "@/hooks/useTracks";
import { groupTracks, type TrackGroup } from "@/lib/groupTracks";
import TrackGroupRow from "@/components/TrackGroupRow";

type SortOption = "newest" | "popular" | "az" | "bpm";

const PAGE_SIZE = 40;


/* ── Group track-groups by release day (DJCity-style date sections) ── */
function groupByDay(groups: TrackGroup[]): { day: string; label: string; items: TrackGroup[] }[] {
  const map = new Map<string, TrackGroup[]>();
  for (const g of groups) {
    const raw = g.primary.release_date || g.primary.created_at || "";
    const day = raw ? raw.slice(0, 10) : "unknown";
    const arr = map.get(day) ?? [];
    arr.push(g);
    map.set(day, arr);
  }
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => {
      let label = "Date inconnue";
      if (day !== "unknown") {
        const d = new Date(day);
        if (!isNaN(d.getTime())) label = fmt.format(d).toUpperCase();
      }
      return { day, label, items };
    });
}

export default function NewReleases() {
  const { data: tracks = [], isLoading } = useTracks();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-persistent filter state ──────────────────────────────────────
  const search = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "all";
  const version = searchParams.get("version") ?? "all";
  const musicalKey = searchParams.get("key") ?? "all";
  const sort = (searchParams.get("sort") ?? "newest") as SortOption;
  const bpmMin = Number(searchParams.get("bpmMin") ?? 60);
  const bpmMax = Number(searchParams.get("bpmMax") ?? 200);
  const bpmActive = searchParams.has("bpmMin") || searchParams.has("bpmMax");
  const bpmRange: [number, number] = [bpmMin, bpmMax];

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "" || v === "all") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSearch = (v: string) => update({ q: v || null });
  const setGenre = (v: string) => update({ genre: v });
  const setVersion = (v: string) => update({ version: v });
  const setMusicalKey = (v: string) => update({ key: v });
  const setSort = (v: SortOption) => update({ sort: v === "newest" ? null : v });
  const setBpmRange = (r: [number, number]) =>
    update({ bpmMin: String(r[0]), bpmMax: String(r[1]) });
  const setBpmActive = (on: boolean) => {
    if (!on) update({ bpmMin: null, bpmMax: null });
    else update({ bpmMin: String(bpmRange[0]), bpmMax: String(bpmRange[1]) });
  };

  const [visible, setVisible] = useState(PAGE_SIZE);

  // Reset visible window when filters change
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, genre, version, musicalKey, sort, bpmMin, bpmMax, bpmActive]);

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
  const groupedVisible = useMemo(() => groupTracks(visibleTracks), [visibleTracks]);
  const daySections = useMemo(
    () => (sort === "newest" ? groupByDay(groupedVisible) : [{ day: "all", label: "", items: groupedVisible }]),
    [groupedVisible, sort],
  );

  // ── Infinite scroll ────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visible < filtered.length;
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, filtered.length]);

  const activeFiltersCount =
    (genre !== "all" ? 1 : 0) +
    (version !== "all" ? 1 : 0) +
    (musicalKey !== "all" ? 1 : 0) +
    (bpmActive ? 1 : 0) +
    (search ? 1 : 0);

  const clearAll = () => {
    setSearchParams({}, { replace: true });
  };


  return (
    <Layout>
      {/* ── Compact header ── */}
      <div className="border-b border-border/40">
        <div className="container py-4 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-xl md:text-2xl font-bold uppercase tracking-tight leading-none">
              Nouveautés
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Disc3 className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono tabular-nums">{tracks.length}</span> titres
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent" />
                <span className="font-mono tabular-nums">{filtered.length}</span> résultats
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* ── Genre tabs (DJCity-style underlined pills) ── */}
        {genres.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-2 mb-5 -mx-2 px-2 border-b border-border/40 scrollbar-thin">
            <Tab active={genre === "all"} onClick={() => setGenre("all")}>
              Tous
            </Tab>
            {genres.map((g) => (
              <Tab key={g} active={genre === g} onClick={() => setGenre(g)}>
                {g}
              </Tab>
            ))}
          </div>
        )}

        {/* ── Filter dock ── */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 mb-4 shadow-xl shadow-primary/5">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher titre, remixeur, genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-secondary/60 border-border/60"
              />
            </div>

            <Select value={version} onValueChange={(v) => setVersion(v)}>
              <SelectTrigger className="h-11 w-full lg:w-40 bg-secondary/60 border-border/60"><SelectValue placeholder="Version" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes versions</SelectItem>
                {versions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={musicalKey} onValueChange={(v) => setMusicalKey(v)}>
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
              <Badge variant="secondary" className="gap-1">"{search}"<button type="button" onClick={() => setSearch("")} aria-label="Retirer le filtre recherche" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-3 w-3" /></button></Badge>
            )}
            {genre !== "all" && (
              <Badge variant="secondary" className="gap-1">{genre}<button type="button" onClick={() => setGenre("all")} aria-label="Retirer le filtre genre" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-3 w-3" /></button></Badge>
            )}
            {version !== "all" && (
              <Badge variant="secondary" className="gap-1">{version}<button type="button" onClick={() => setVersion("all")} aria-label="Retirer le filtre version" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-3 w-3" /></button></Badge>
            )}
            {musicalKey !== "all" && (
              <Badge variant="secondary" className="gap-1">Key {musicalKey}<button type="button" onClick={() => setMusicalKey("all")} aria-label="Retirer le filtre tonalité" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-3 w-3" /></button></Badge>
            )}
            {bpmActive && (
              <Badge variant="secondary" className="gap-1">{bpmRange[0]}–{bpmRange[1]} BPM<button type="button" onClick={() => setBpmActive(false)} aria-label="Retirer le filtre BPM" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-3 w-3" /></button></Badge>
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
            <div className="space-y-8">
              {daySections.map((section) => (
                <section key={section.day}>
                  {section.label && (
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/90 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {section.label}
                      </h2>
                      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                        {section.items.length} titre{section.items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden shadow-lg shadow-primary/5">
                    <TrackListHeader />
                    {section.items.map((g, i) => <TrackGroupRow key={g.key} group={g} index={i} />)}
                  </div>
                </section>
              ))}
            </div>

            {/* Infinite-scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center mt-8 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-xs font-mono uppercase tracking-wider">
                  Chargement… {visibleTracks.length} / {filtered.length}
                </span>
              </div>
            )}

            {!hasMore && (
              <p className="text-xs text-muted-foreground mt-6 font-mono text-center">
                {filtered.length} titre{filtered.length > 1 ? "s" : ""} — fin de la liste
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

/* DJCity-like underlined tab */
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      <span
        className={`absolute left-2 right-2 -bottom-px h-[3px] rounded-full transition-all ${
          active ? "bg-primary opacity-100" : "bg-transparent opacity-0"
        }`}
      />
    </button>
  );
}
