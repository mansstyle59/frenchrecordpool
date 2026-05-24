import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";
import WidgetHeader from "./WidgetHeader";
import WidgetSkeleton from "./WidgetSkeleton";

export default function MostFavorited({ config }: { config: any }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = Math.min(config.limit || 8, 20);

  useEffect(() => {
    setLoading(true);
    supabase.rpc("top_favorited_tracks", { _limit: limit }).then(({ data }) => {
      setTracks((data as any[]) || []);
      setLoading(false);
    });
  }, [limit]);

  return (
    <div>
      <WidgetHeader
        icon={Heart}
        eyebrow="Communauté"
        title={config.title || "Les + likés"}
        seeAllUrl={config.see_all_url}
        typo={config.typo}
      />
      {loading ? (
        <WidgetSkeleton variant="list" count={Math.min(limit, 6)} />
      ) : tracks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Aucun favori pour l'instant — sois le premier !
        </div>
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
