import { Link } from "react-router-dom";
import { Search, TrendingUp, Star, Clock, ArrowRight, Play, Sparkles, Headphones, Users } from "lucide-react";
import { motion } from "framer-motion";
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

  const genres = Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))).sort();
  const artistsCount = new Set(tracks.map((t) => t.artist).filter(Boolean)).size;
  const totalDownloads = tracks.reduce((s, t) => s + (t.downloads ?? 0), 0);
  const marquee = [...genres, ...genres];

  const playFromFeatured = (idx: number) => {
    const t = featured[idx];
    if (!t) return;
    play(
      { id: t.id, title: t.title, artist: t.artist, coverUrl: resolveCover(t), previewUrl: t.preview_url || t.audio_url },
      featured.map((x) => ({ id: x.id, title: x.title, artist: x.artist, coverUrl: resolveCover(x), previewUrl: x.preview_url || x.audio_url })),
    );
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />

        {/* Animated glow blobs */}
        <motion.div
          className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/30 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/30 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative container py-20 md:py-32 text-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/90 mb-4 px-3 py-1 rounded-full border border-primary/30 bg-primary/5"
          >
            <Sparkles className="h-3 w-3" /> Pool exclusif · DJs francophones
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-5xl md:text-8xl font-bold mb-4 leading-[1.05] tracking-tight"
          >
            <span className="gradient-text">French Record Pool</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Edits, remixes & exclusivités. Mis à jour chaque semaine pour vos sets.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onSubmit={(e) => {
              e.preventDefault();
              const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
              window.location.href = `/tracks${q ? `?q=${encodeURIComponent(q)}` : ""}`;
            }}
            className="flex items-center max-w-lg mx-auto gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input name="q" placeholder="Titre, remixeur, genre..." className="pl-10 h-12 bg-secondary/80 border-border text-base" />
            </div>
            <Button type="submit" variant="hero" size="lg" className="shadow-lg shadow-primary/30">Rechercher</Button>
          </motion.form>

          {/* Stats counters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-3 max-w-xl mx-auto gap-2 sm:gap-6 mt-12"
          >
            {[
              { icon: Headphones, label: "Tracks", value: tracks.length },
              { icon: Users, label: "Remixeurs", value: artistsCount },
              { icon: TrendingUp, label: "Téléchargements", value: totalDownloads },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card/40 backdrop-blur px-3 py-4">
                <s.icon className="h-4 w-4 mx-auto text-primary mb-2" />
                <p className="font-display text-2xl sm:text-3xl font-bold gradient-text">{s.value.toLocaleString("fr-FR")}</p>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Marquee genres */}
        {genres.length > 0 && (
          <div className="relative border-y border-border/50 bg-card/30 backdrop-blur py-3 overflow-hidden">
            <motion.div
              className="flex gap-8 whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
              {marquee.map((g, i) => (
                <Link
                  key={`${g}-${i}`}
                  to={`/tracks?q=${encodeURIComponent(g)}`}
                  className="text-sm uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors"
                >
                  {g} <span className="text-primary/50 mx-4">•</span>
                </Link>
              ))}
            </motion.div>
          </div>
        )}
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
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {featured.map((t, i) => (
              <motion.button
                key={t.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                onClick={() => playFromFeatured(i)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/20 text-left"
              >
                <img
                  src={resolveCover(t)}
                  alt={`${t.title} — ${t.artist}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                    <p className="text-xs text-white/70 truncate">{t.artist}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              </motion.button>
            ))}
          </motion.div>
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
          {genres.map((genre) => (
            <GenreCard key={genre} genre={genre} trackCount={tracks.filter((t) => t.genre === genre).length} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
