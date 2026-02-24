import Layout from "@/components/Layout";
import { mockTracks } from "@/data/mockTracks";
import { Link } from "react-router-dom";
import { User } from "lucide-react";

const artists = [...new Set(mockTracks.map((t) => t.artist))].map((name) => ({
  name,
  trackCount: mockTracks.filter((t) => t.artist === name).length,
  cover: mockTracks.find((t) => t.artist === name)!.coverUrl,
}));

export default function Artists() {
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Artistes</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artists.map((artist) => (
            <Link
              key={artist.name}
              to={`/tracks?artist=${encodeURIComponent(artist.name)}`}
              className="group bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 transition-all"
            >
              <img
                src={artist.cover}
                alt={artist.name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-border group-hover:border-primary transition-colors"
              />
              <p className="font-medium text-sm group-hover:text-primary transition-colors">{artist.name}</p>
              <p className="text-xs text-muted-foreground">{artist.trackCount} track{artist.trackCount > 1 ? "s" : ""}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
