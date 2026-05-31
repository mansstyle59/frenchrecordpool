import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import { titleStyle, bodyStyle } from "@/lib/widgetTypography";
import WidgetSkeleton from "./WidgetSkeleton";
import EditorialFrame from "./EditorialFrame";

type Period = "7d" | "30d" | "all";
const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: "7d", label: "7 jours", days: 7 },
  { id: "30d", label: "30 jours", days: 30 },
  { id: "all", label: "Tout", days: null },
];

export default function TopDownloadsPeriod({ config }: { config: any }) {
  const [period, setPeriod] = useState<Period>(config.period || "7d");
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = Math.min(config.limit || 8, 24);

  useEffect(() => {
    setLoading(true);
    const days = PERIODS.find((p) => p.id === period)?.days ?? null;
    supabase
      .rpc("top_downloads_period", { _days: days, _limit: limit })
      .then(({ data, error }) => {
        if (error) {
          // fallback: order by total downloads if RPC missing
          supabase
            .from("tracks")
            .select("*")
            .eq("status", "approved")
            .order("downloads", { ascending: false })
            .limit(limit)
            .then(({ data: d2 }) => {
              setTracks(d2 || []);
              setLoading(false);
            });
          return;
        }
        setTracks((data as any[]) || []);
        setLoading(false);
      });
  }, [period, limit]);

  return (
    <EditorialFrame wordmark="TOP DL">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2
              className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 truncate"
              style={titleStyle(config.typo)}
            >
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              {config.title || "Top téléchargements"}
            </h2>
            {config.subtitle && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl" style={bodyStyle(config.typo)}>
                {config.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card/60 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 h-7 text-[11px] font-bold uppercase tracking-wider rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  period === p.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={period === p.id}
              >
                {p.label}
              </button>
            ))}
          </div>
          {config.see_all_url && (
            <Button asChild variant="ghost" size="sm">
              <Link to={config.see_all_url}>
                Tout voir <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <WidgetSkeleton variant="list" count={Math.min(limit, 6)} />
      ) : tracks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Aucun téléchargement sur cette période.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
          <TrackListHeader />
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
