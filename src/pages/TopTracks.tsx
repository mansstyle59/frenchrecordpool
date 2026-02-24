import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { mockTracks } from "@/data/mockTracks";
import { TrendingUp } from "lucide-react";

const topTracks = [...mockTracks].sort((a, b) => b.downloads - a.downloads);

export default function TopTracks() {
  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">Top Téléchargements</h1>
        </div>
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {topTracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
