import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ListMusic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import HCarousel from "./HCarousel";
import PlaylistCard, { type PlaylistCardData } from "./PlaylistCard";
import { titleStyle, bodyStyle } from "@/lib/widgetTypography";

interface Config {
  title?: string;
  playlist_ids?: string[];
  auto?: boolean;
  limit?: number;
  see_all_url?: string;
  typo?: any;
}

export default function PlaylistsCarousel({ config }: { config: any }) {
  const [items, setItems] = useState<PlaylistCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ids = config.playlist_ids ?? [];
    const auto = config.auto !== false && ids.length === 0;
    const limit = Math.min(Math.max(config.limit ?? 8, 3), 24);

    const q = supabase
      .from("playlists")
      .select("id,title,description,source,source_url,embed_id,cover_url,accent_color,tags,track_ids")
      .eq("is_active", true);

    const exec = auto
      ? q.order("position", { ascending: true }).order("created_at", { ascending: false }).limit(limit)
      : q.in("id", ids);

    exec.then(({ data }) => {
      if (cancelled) return;
      let rows = (data ?? []) as any[];
      if (!auto) {
        // preserve order from ids
        rows = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
      }
      setItems(rows as PlaylistCardData[]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [config.playlist_ids, config.auto, config.limit]);

  if (!loading && items.length === 0) return null;

  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 truncate" style={titleStyle(config.typo)}>
              <ListMusic className="h-5 w-5 text-primary shrink-0" />
              {config.title || "Playlists"}
            </h2>
            {config.subtitle && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl" style={bodyStyle(config.typo)}>
                {config.subtitle}
              </p>
            )}
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to={config.see_all_url || "/playlists"}>
            Tout voir <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <HCarousel ariaLabel="Playlists">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-44 md:w-56 aspect-square rounded-2xl bg-muted/40 animate-pulse"
              />
            ))
          : items.map((p) => (
              <div key={p.id} className="snap-start shrink-0 w-44 md:w-56">
                <PlaylistCard playlist={p} />
              </div>
            ))}
      </HCarousel>
    </div>
  );
}
