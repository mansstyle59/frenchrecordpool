import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import WidgetHeader from "./WidgetHeader";
import WidgetSkeleton from "./WidgetSkeleton";
import WidgetEmptyState from "./WidgetEmptyState";
import EditorialFrame from "./EditorialFrame";
import { HeaderActions, Segmented } from "./WidgetHeaderActions";
import { itemStyle, itemClasses, itemCssVars, LAYOUT_DENSITY_CLASS } from "@/lib/widgetCommon";

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
    <EditorialFrame wordmark="TOP DL" kicker="TÉLÉCHARGEMENTS">
      <WidgetHeader
        icon={TrendingUp}
        eyebrow="Tendances"
        title={config.title || "Top téléchargements"}
        subtitle={config.subtitle}
        seeAllUrl={config.see_all_url}
        typo={config.typo}
        right={
          <HeaderActions>
            <Segmented<Period>
              ariaLabel="Période"
              value={period}
              onChange={setPeriod}
              options={PERIODS.map((p) => ({ id: p.id, label: p.label }))}
            />
          </HeaderActions>
        }
      />

      {loading ? (
        <WidgetSkeleton variant="list" count={Math.min(limit, 6)} />
      ) : tracks.length === 0 ? (
        <WidgetEmptyState
          icon={TrendingUp}
          title="Aucun téléchargement sur cette période"
          message="Change l'intervalle ou explore les sorties récentes pour découvrir ce qui tourne."
          ctaLabel="Voir les nouveautés"
          ctaUrl="/new"
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
          <TrackListHeader />
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} />
          ))}
        </div>
      )}
    </EditorialFrame>
  );
}
