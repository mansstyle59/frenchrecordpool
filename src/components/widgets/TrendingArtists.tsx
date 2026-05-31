import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { titleStyle, bodyStyle } from "@/lib/widgetTypography";
import HCarousel from "./HCarousel";
import WidgetSkeleton from "./WidgetSkeleton";

type Period = "7d" | "30d" | "all";
const DAYS: Record<Period, number | null> = { "7d": 7, "30d": 30, all: null };

interface Row {
  artist_id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  kind: string;
  downloads_count: number;
}

export default function TrendingArtists({ config }: { config: any }) {
  const [period, setPeriod] = useState<Period>(config.period || "7d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = Math.min(config.limit || 10, 24);

  useEffect(() => {
    setLoading(true);
    supabase
      .rpc("trending_artists", { _days: DAYS[period], _limit: limit })
      .then(({ data }) => {
        setRows((data as Row[]) || []);
        setLoading(false);
      });
  }, [period, limit]);

  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-accent to-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2
              className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2"
              style={titleStyle(config.typo)}
            >
              <Flame className="h-5 w-5 text-accent" />
              {config.title || "Artistes en hausse"}
            </h2>
            {config.subtitle && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl" style={bodyStyle(config.typo)}>
                {config.subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card/60 p-0.5">
          {(["7d", "30d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 h-7 text-[11px] font-bold uppercase tracking-wider rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                period === p
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={period === p}
            >
              {p === "all" ? "Tout" : p === "7d" ? "7 j" : "30 j"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <WidgetSkeleton variant="carousel" count={8} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Pas encore de données sur cette période.
        </div>
      ) : (
        <HCarousel ariaLabel="Artistes en hausse">
          {rows.map((a, i) => (
            <motion.div
              key={a.artist_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="snap-start shrink-0 w-32 md:w-40"
            >
              <Link
                to={`/artists/${a.slug}`}
                className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/60 transition-all duration-300 group-hover:scale-[1.03] group-hover:-translate-y-0.5 group-hover:shadow-[0_20px_40px_-20px_hsl(var(--accent)/0.5)]">
                  {a.photo_url ? (
                    <img
                      src={a.photo_url}
                      alt={a.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl font-bold text-foreground/40">
                      {a.name?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent" />
                  {/* Editorial accent corner on hover */}
                  <span
                    aria-hidden
                    className="absolute top-2 right-2 h-2 w-2 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs shadow">
                    {i + 1}
                  </div>
                  <div className="absolute top-2 right-5 inline-flex items-center gap-1 px-1.5 h-6 rounded-full bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                    <Flame className="h-3 w-3" />
                    {a.downloads_count}
                  </div>
                  <div className="absolute inset-0 p-3 flex flex-col justify-end gap-1">
                    <p className="text-white font-semibold text-sm truncate">{a.name}</p>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/70 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      Voir profil →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </HCarousel>
      )}
    </div>
  );
}
