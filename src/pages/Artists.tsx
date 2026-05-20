import Layout from "@/components/Layout";
import { useTracks } from "@/hooks/useTracks";
import { Link } from "react-router-dom";
import { generateTrackCover } from "@/lib/trackCover";

export default function Artists() {
  const { data: tracks = [], isLoading } = useTracks();

  const artists = [...new Set(tracks.map((t) => t.artist))].map((name) => {
    const t = tracks.find((x) => x.artist === name);
    return {
      name,
      trackCount: tracks.filter((x) => x.artist === name).length,
      cover: generateTrackCover(t?.title ?? name, name),
    };
  });

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Artistes</h1>
        {isLoading ? <p className="text-muted-foreground">Chargement...</p> :
         artists.length === 0 ? <p className="text-muted-foreground">Aucun artiste.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {artists.map((artist) => (
              <Link key={artist.name} to={`/tracks?artist=${encodeURIComponent(artist.name)}`} className="group bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 transition-all">
                <img src={artist.cover} alt={artist.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-border group-hover:border-primary transition-colors" />
                <p className="font-medium text-sm group-hover:text-primary transition-colors">{artist.name}</p>
                <p className="text-xs text-muted-foreground">{artist.trackCount} track{artist.trackCount > 1 ? "s" : ""}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
