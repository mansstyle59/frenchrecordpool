import { Link } from "react-router-dom";
import { Search, TrendingUp, Star, Clock, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import GenreCard from "@/components/GenreCard";
import { useTracks } from "@/hooks/useTracks";
import { usePlayer } from "@/contexts/PlayerContext";
import { resolveCover } from "@/lib/trackCover";

import heroBg from "@/assets/hero-bg.jpg";

export default function Index() {
  const { data: tracks = [], isLoading } = useTracks();
  const { play } = usePlayer();
  const topTracks = [...tracks].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)).slice(0, 5);
  const newTracks = [...tracks].sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")).slice(0, 8);
  const featured = newTracks.slice(0, 6);

  const playFromFeatured = (idx: number) => {
    const t = featured[idx];
    if (!t) return;
    play(
      { id: t.id, title: t.title, artist: t.artist, coverUrl: resolveCover(t), previewUrl: t.preview_url },
      featured.map((x) => ({ id: x.id, title: x.title, artist: x.artist, coverUrl: resolveCover(x), previewUrl: x.preview_url })),
    );
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative container py-20 md:py-32 text-center">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary/80 mb-4">
            Pool exclusif · DJs francophones
          </span>
          <h1 className="font-display text-4xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="gradient-text">French Record Pool</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Edits, remixes & exclusivités. Mis à jour chaque semaine pour vos sets.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
              window.location.href = `/tracks${q ? `?q=${encodeURIComponent(q)}` : ""}`;
            }}
            className="flex items-center max-w-lg mx-auto gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input name="q" placeholder="Titre, artiste, genre..." className="pl-10 h-12 bg-secondary/80 border-border text-base" />
            </div>
            <Button type="submit" variant="hero" size="lg">Rechercher</Button>
          </form>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{tracks.length}</strong> tracks</span>
            <span>·</span>
            <span>Previews gratuites</span>
            <span>·</span>
            <span>HD MP3 / WAV</span>
          </div>
        </div>
      </section>

      {/* Featured covers grid */}
      {featured.length > 0 && (
        <section className="container py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">À la une</h2>
            </div>
            <Link to="/new" className="text-sm text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featured.map((t, i) => (
              <button
                key={t.id}
                onClick={() => playFromFeatured(i)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all hover:scale-[1.03] hover:shadow-xl text-left"
              >
                <img
                  src={resolveCover(t)}
                  alt={`${t.title} — ${t.artist}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                    <p className="text-xs text-white/70 truncate">{t.artist}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Nouveautés liste */}
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
