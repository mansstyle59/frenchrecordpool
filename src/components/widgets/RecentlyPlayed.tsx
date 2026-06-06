import { useEffect, useState } from "react";
import { History, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyPlayed } from "@/hooks/useRecentlyPlayed";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import WidgetHeader from "./WidgetHeader";
import WidgetSkeleton from "./WidgetSkeleton";
import WidgetEmptyState from "./WidgetEmptyState";
import { HeaderActions, ActionPill } from "./WidgetHeaderActions";

export default function RecentlyPlayed({ config }: { config: any }) {
  const { ids, clear } = useRecentlyPlayed();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const limit = Math.min(config.limit || 8, 20);
  const sliced = ids.slice(0, limit);

  useEffect(() => {
    if (sliced.length === 0) {
      setTracks([]);
      return;
    }
    setLoading(true);
    supabase
      .from("tracks")
      .select("*")
      .in("id", sliced)
      .eq("status", "approved")
      .then(({ data }) => {
        // preserve recency order
        const order = new Map(sliced.map((id, i) => [id, i]));
        const sorted = (data || []).slice().sort(
          (a: any, b: any) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)
        );
        setTracks(sorted);
        setLoading(false);
      });
  }, [sliced.join(",")]);

  // Hide the widget entirely when nothing has been played yet (avoid empty noise on /).
  if (ids.length === 0 && !config.show_when_empty) return null;

  return (
    <div>
      <WidgetHeader
        icon={History}
        eyebrow="Ton historique"
        title={config.title || "Écoutés récemment"}
        subtitle={config.subtitle}
        typo={config.typo}
        right={
          ids.length > 0 ? (
            <HeaderActions>
              <ActionPill icon={Trash2} tone="danger" onClick={clear} ariaLabel="Effacer l'historique">
                Effacer
              </ActionPill>
            </HeaderActions>
          ) : undefined
        }
      />
      {loading ? (
        <WidgetSkeleton variant="list" count={Math.min(limit, 4)} />
      ) : tracks.length === 0 ? (
        <WidgetEmptyState
          icon={History}
          title="Ton historique est vide"
          message="Lance un preview pour voir tes derniers titres écoutés apparaître ici."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden">
          <TrackListHeader />
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
