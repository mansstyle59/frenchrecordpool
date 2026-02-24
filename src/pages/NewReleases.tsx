import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { mockTracks } from "@/data/mockTracks";
import { Clock } from "lucide-react";

const newTracks = [...mockTracks].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

export default function NewReleases() {
  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Nouveautés</h1>
        </div>
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {newTracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
