import { Link } from "react-router-dom";
import { Search, TrendingUp, Star, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import GenreCard from "@/components/GenreCard";
import { useTracks } from "@/hooks/useTracks";

import heroBg from "@/assets/hero-bg.jpg";

export default function Index() {
  const { data: tracks = [], isLoading } = useTracks();
  const topTracks = [...tracks].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)).slice(0, 5);
  const newTracks = [...tracks].sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")).slice(0, 5);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative container py-20 md:py-32 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">French Record Pool</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            La référence des DJs pour télécharger edits, remixes et exclusivités.
          </p>
          <div className="flex items-center max-w-lg mx-auto gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un titre, artiste, genre..." className="pl-10 h-12 bg-secondary/80 border-border text-base" />
            </div>
            <Link to="/tracks"><Button variant="hero" size="lg">Rechercher</Button></Link>
          </div>
        </div>
      </section>

      {/* Nouveautés */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold">Nouveautés</h2>
          </div>
          <Link to="/new" className="text-sm text-primary hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Chargement...</p>
          ) : newTracks.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucune track disponible. L'admin doit ajouter des musiques.</p>
          ) : (
            newTracks.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)
          )}
        </div>
      </section>

      {/* Top */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-bold">Top Téléchargements</h2>
          </div>
          <Link to="/top" className="text-sm text-primary hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          {!isLoading && topTracks.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucune track disponible.</p>
          ) : (
            topTracks.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)
          )}
        </div>
      </section>

      {/* Genres */}
      <section className="container py-12">
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-bold">Genres Populaires</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))).sort().map((genre) => (
            <GenreCard key={genre} genre={genre} trackCount={tracks.filter((t) => t.genre === genre).length} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
