import { useEffect, useState } from "react";
import { ListMusic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HCarousel from "./HCarousel";
import PlaylistCard, { type PlaylistCardData } from "./PlaylistCard";
import WidgetHeader from "./WidgetHeader";
import { itemStyle, itemClasses, LAYOUT_ASPECT_CLASS } from "@/lib/widgetCommon";

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
      <WidgetHeader
        icon={ListMusic}
        eyebrow="Sélections"
        title={config.title || "Playlists"}
        subtitle={config.subtitle}
        seeAllUrl={config.see_all_url || "/playlists"}
        typo={config.typo}
      />

      <HCarousel ariaLabel="Playlists">
        {(() => {
          const w = config.layout?.item_width_px;
          const widthStyle = w ? { width: `${w}px` } : undefined;
          const widthCls = w ? "snap-start shrink-0" : "snap-start shrink-0 w-44 md:w-56";
          const aspectCls = LAYOUT_ASPECT_CLASS[(config.layout?.aspect ?? "auto") as keyof typeof LAYOUT_ASPECT_CLASS];
          return loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={widthStyle}
                  className={`${widthCls} ${aspectCls || "aspect-square"} rounded-2xl bg-muted/40 animate-pulse`}
                />
              ))
            : items.map((p) => (
                <div
                  key={p.id}
                  style={{ ...widthStyle, ...itemStyle(config.items) }}
                  className={`${widthCls} ${aspectCls} ${itemClasses(config.items)}`}
                >
                  <PlaylistCard playlist={p} />
                </div>
              ));
        })()}
      </HCarousel>

    </div>
  );
}
