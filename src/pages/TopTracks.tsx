import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { useTracks } from "@/hooks/useTracks";
import { TrendingUp } from "lucide-react";

export default function TopTracks() {
  const { data: tracks = [], isLoading } = useTracks();
  const sorted = [...tracks].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">Top Téléchargements</h1>
        </div>
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {isLoading ? <p className="py-8 text-center text-muted-foreground">Chargement...</p> :
           sorted.length === 0 ? <p className="py-8 text-center text-muted-foreground">Aucune track.</p> :
           sorted.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)}
        </div>
      </div>
    </Layout>
  );
}
