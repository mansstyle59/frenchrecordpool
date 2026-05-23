import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import PlaylistCard, { type PlaylistCardData } from "@/components/widgets/PlaylistCard";
import { SOURCE_LABEL, type PlaylistSource } from "@/lib/playlistEmbed";

const SOURCES: PlaylistSource[] = ["spotify", "deezer", "soundcloud", "custom"];

export default function Playlists() {
  const [source, setSource] = useState<PlaylistSource | "all">("all");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public-playlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id,title,description,source,source_url,embed_id,cover_url,accent_color,tags,track_ids")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlaylistCardData[];
    },
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (source !== "all" && p.source !== source) return false;
      if (tag && !p.tags?.includes(tag)) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (
          !p.title.toLowerCase().includes(needle) &&
          !(p.description?.toLowerCase().includes(needle))
        )
          return false;
      }
      return true;
    });
  }, [items, source, tag, q]);

  useEffect(() => {
    document.title = "Playlists DJ — French Record Pool";
  }, []);

  return (
    <Layout>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight">Playlists</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Sélections curatées par notre équipe — Spotify, Deezer, SoundCloud et nos playlists internes du catalogue.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une playlist…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <SourceChip active={source === "all"} onClick={() => setSource("all")} label="Toutes" />
            {SOURCES.map((s) => (
              <SourceChip key={s} active={source === s} onClick={() => setSource(s)} label={SOURCE_LABEL[s]} />
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            <SourceChip active={tag === null} onClick={() => setTag(null)} label="Tous les tags" small />
            {allTags.map((t) => (
              <SourceChip key={t} active={tag === t} onClick={() => setTag(t)} label={t} small />
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucune playlist trouvée.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

function SourceChip({ active, onClick, label, small }: { active: boolean; onClick: () => void; label: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border transition-all font-semibold uppercase tracking-wider ${
        small ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs"
      } ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
          : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}
