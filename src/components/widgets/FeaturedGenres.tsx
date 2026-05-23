import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { titleStyle } from "@/lib/widgetTypography";
import WidgetSkeleton from "./WidgetSkeleton";

interface ManualGenre {
  name: string;
  image_url?: string;
  url?: string;
  accent?: string;
}

interface Tile {
  name: string;
  count: number;
  cover?: string | null;
  url: string;
  accent?: string;
}

export default function FeaturedGenres({ config }: { config: any }) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const manual: ManualGenre[] = Array.isArray(config.genres) ? config.genres : [];
  const auto = config.auto !== false && manual.length === 0;
  const limit = Math.min(config.limit || 8, 16);

  useEffect(() => {
    if (!auto) {
      // Resolve covers from DB for manual entries
      supabase
        .from("tracks")
        .select("genre, cover_url")
        .eq("status", "approved")
        .then(({ data }) => {
          const covers = new Map<string, string>();
          (data || []).forEach((t: any) => {
            if (t.genre && t.cover_url && !covers.has(t.genre)) {
              covers.set(t.genre, t.cover_url);
            }
          });
          setTiles(
            manual.map((g) => ({
              name: g.name,
              count: 0,
              cover: g.image_url || covers.get(g.name) || null,
              url: g.url || `/new?genre=${encodeURIComponent(g.name)}`,
              accent: g.accent,
            }))
          );
        });
      return;
    }
    supabase
      .from("tracks")
      .select("genre, cover_url, downloads")
      .eq("status", "approved")
      .then(({ data }) => {
        const map = new Map<string, { count: number; cover?: string }>();
        (data || []).forEach((t: any) => {
          if (!t.genre) return;
          const cur = map.get(t.genre) || { count: 0, cover: t.cover_url };
          map.set(t.genre, {
            count: cur.count + (t.downloads || 1),
            cover: cur.cover || t.cover_url,
          });
        });
        const sorted = [...map.entries()]
          .map(([name, v]) => ({
            name,
            count: v.count,
            cover: v.cover,
            url: `/new?genre=${encodeURIComponent(name)}`,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
        setTiles(sorted);
      });
  }, [auto, limit, JSON.stringify(manual)]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2
          className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2"
          style={titleStyle(config.typo)}
        >
          <Tag className="h-5 w-5 text-primary" />
          {config.title || "Genres en vedette"}
        </h2>
      </div>
      {!tiles ? (
        <WidgetSkeleton variant="grid" count={8} />
      ) : tiles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Aucun genre disponible.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tiles.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={t.url}
                className="group relative block aspect-[4/3] rounded-2xl overflow-hidden border border-border hover:border-primary/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t.cover ? (
                  <img
                    src={t.cover}
                    alt={t.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] opacity-70 group-hover:opacity-90 group-hover:scale-125 transition-all duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40" />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background: t.accent
                      ? `linear-gradient(135deg, hsl(${t.accent} / 0.6), hsl(var(--background) / 0.85))`
                      : "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--background) / 0.85))",
                  }}
                />
                <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                  <p className="font-display font-black text-lg md:text-2xl tracking-tight text-foreground drop-shadow">
                    {t.name}
                  </p>
                  {t.count > 0 && (
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      {t.count} dl
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
