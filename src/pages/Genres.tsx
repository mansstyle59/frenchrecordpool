import Layout from "@/components/Layout";
import GenreCard from "@/components/GenreCard";
import { useTracks } from "@/hooks/useTracks";
import { useMemo } from "react";

export default function Genres() {
  const { data: tracks = [] } = useTracks();

  const genres = useMemo(() => {
    const set = new Set(tracks.map((t) => t.genre).filter(Boolean));
    return Array.from(set).sort();
  }, [tracks]);

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Genres</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {genres.map((genre) => (
            <GenreCard key={genre} genre={genre} trackCount={tracks.filter((t) => t.genre === genre).length} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
