import { useParams, Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Play, Pause, Heart, Download, ExternalLink, ArrowLeft, Clock, Music, Tag, Disc3,
  Share2, QrCode, Copy, Calendar, Headphones, FileAudio, Mic2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useTrack, useRelatedTracks, type DbTrack } from "@/hooks/useTracks";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTrack } from "@/lib/downloadTrack";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { resolveCover } from "@/lib/trackCover";
import TrackRow, { TrackListHeader } from "@/components/TrackRow";

function inferFormat(url: string | null | undefined): string {
  if (!url) return "—";
  const m = url.match(/\.(mp3|wav|flac|aiff|m4a|ogg|aac)(?:\?|$)/i);
  return m ? m[1].toUpperCase() : "Audio";
}

export default function TrackDetail() {
  const { id } = useParams();
  const { data: track, isLoading } = useTrack(id);
  const { data: related } = useRelatedTracks(track);
  const { play, currentTrack, isPlaying, toggle } = usePlayer();
  const { user, hasActiveSubscription } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [qrOpen, setQrOpen] = useState(false);

  const isCurrent = currentTrack?.id === track?.id;
  const playbackSrc = useMemo(() => {
    if (!track) return null;
    return hasActiveSubscription ? (track.audio_url || track.preview_url) : (track.preview_url || track.audio_url);
  }, [track, hasActiveSubscription]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 text-center text-muted-foreground">Chargement…</div>
      </Layout>
    );
  }

  if (!track) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Track introuvable.</p>
          <Link to="/new"><Button variant="outline" className="mt-4">Retour aux nouveautés</Button></Link>
        </div>
      </Layout>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const format = inferFormat(track.audio_url || (track as any).download_url);
  const fullIsHosted = !!track.audio_url && !((track as any).download_url && (track as any).download_url.startsWith("http") && !track.audio_url.includes("/object/public/track-audio/"));
  const resolvedUrl = (track as any).download_url || track.audio_url;
  const isExternalLink = resolvedUrl && !resolvedUrl.includes("/object/public/track-audio/");
  const DownloadIcon = isExternalLink ? ExternalLink : Download;

  const handlePlay = () => {
    if (!playbackSrc) {
      toast.error("Aucun audio disponible");
      return;
    }
    if (isCurrent) { toggle(); return; }
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverUrl: resolveCover(track),
      previewUrl: playbackSrc,
      isFull: hasActiveSubscription && !!track.audio_url,
    });
  };

  const handleDownload = () => downloadTrack(track.id, user, hasActiveSubscription);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié dans le presse-papier");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: `${track.title} — ${track.artist}`, url: shareUrl });
        return;
      } catch { /* user cancelled */ }
    }
    handleCopyLink();
  };

  return (
    <Layout>
      <PageHero
        eyebrow={track.version || "Original"}
        title=""
        highlight={track.title}
        description={track.artist}
        stats={[
          { icon: <Disc3 className="h-3.5 w-3.5 text-primary" />, label: track.genre || "—" },
          { icon: <Clock className="h-3.5 w-3.5 text-accent" />, label: track.duration || "—" },
          { label: `${track.bpm ?? "—"} BPM` },
          { label: `Key ${track.musical_key || "—"}` },
        ]}
      />

      <div className="container py-6 md:py-8 space-y-6">
        <Link to="/new" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        {/* ===== MAIN CARD ===== */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-4 md:p-8 shadow-xl shadow-primary/5">
          <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-6 md:gap-8">
            {/* Cover */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-border shadow-2xl shadow-primary/10 group">
                <img
                  src={resolveCover(track)}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <button
                  onClick={handlePlay}
                  disabled={!playbackSrc}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Lire"
                >
                  <div className="h-16 w-16 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-xl">
                    {isCurrent && isPlaying ? <Pause className="h-7 w-7 text-primary-foreground" /> : <Play className="h-7 w-7 fill-primary-foreground text-primary-foreground ml-1" />}
                  </div>
                </button>
              </div>
              {/* Quick stats under cover */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat icon={Download} value={(track.downloads ?? 0).toLocaleString("fr-FR")} label="Téléch." />
                <MiniStat icon={Heart} value={isFavorite(track.id) ? "♥" : "0"} label="Likes" />
                <MiniStat icon={FileAudio} value={format} label="Format" />
              </div>
            </div>

            {/* Meta + actions */}
            <div className="flex flex-col min-w-0">
              <div className="mb-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/40 text-primary bg-primary/5">
                  {track.version || "Original"}
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">{track.title}</h1>
              <p className="text-base text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{track.artist}</span>
                {track.label ? <> · <span>{track.label}</span></> : null}
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-5">
                <Button variant="hero" size="lg" className="gap-2" onClick={handlePlay} disabled={!playbackSrc}>
                  {isCurrent && isPlaying ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Écouter</>}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="lg" className="gap-2" onClick={handleDownload}>
                      <DownloadIcon className="h-4 w-4" /> {isExternalLink ? "Ouvrir" : "Télécharger"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isExternalLink ? "Ouvre le lien externe" : "Télécharge le fichier complet (abonnement requis)"}
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="lg"
                  className={isFavorite(track.id) ? "text-accent border-accent/40" : ""}
                  onClick={() => {
                    if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return; }
                    toggleFavorite(track.id);
                  }}
                  aria-label="Favori"
                >
                  <Heart className={`h-4 w-4 ${isFavorite(track.id) ? "fill-current" : ""}`} />
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare} aria-label="Partager">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={handleCopyLink} aria-label="Copier le lien">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => setQrOpen(true)} aria-label="QR Code">
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>

              {!hasActiveSubscription && (
                <p className="text-xs text-muted-foreground mt-3 font-mono">
                  🔒 Connectez-vous avec un abonnement actif pour télécharger le titre complet.
                </p>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
                <InfoItem icon={Music} label="Genre" value={track.genre || "—"} />
                <InfoItem icon={Headphones} label="BPM" value={String(track.bpm ?? "—")} />
                <InfoItem icon={Mic2} label="Tonalité" value={track.musical_key || "—"} />
                <InfoItem icon={Clock} label="Durée" value={track.duration || "—"} />
                <InfoItem icon={Disc3} label="Label" value={track.label || "—"} />
                <InfoItem icon={Calendar} label="Sortie" value={track.release_date ? new Date(track.release_date).toLocaleDateString("fr-FR") : "—"} />
                <InfoItem icon={Calendar} label="Ajouté le" value={new Date(track.created_at).toLocaleDateString("fr-FR")} />
                <InfoItem icon={FileAudio} label="Format" value={format} />
              </div>

              {/* Tags */}
              {track.tags && track.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {track.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      <Tag className="h-2.5 w-2.5 mr-1" />{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Alt download links (acapella / instrumental) */}
              {(track.acapella_url || track.instrumental_url) && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {track.acapella_url && (
                    <a href={track.acapella_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-secondary text-xs gap-1">
                        <Mic2 className="h-3 w-3" /> Acapella
                      </Badge>
                    </a>
                  )}
                  {track.instrumental_url && (
                    <a href={track.instrumental_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-secondary text-xs gap-1">
                        <Music className="h-3 w-3" /> Instrumental
                      </Badge>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== RELATED (grid) ===== */}
        {related && (related.versions.length + related.remixes.length) > 0 && (
          <div className="space-y-6">
            {related.versions.length > 0 && (
              <RelatedSection title="Autres versions" icon={Disc3} tracks={related.versions} />
            )}
            {related.remixes.length > 0 && (
              <RelatedSection title="Remix associés" icon={Mic2} tracks={related.remixes} />
            )}
          </div>
        )}

        {/* ===== SIMILAR (DJ-style list) ===== */}
        {related && related.similar.length > 0 && (
          <SimilarTracksList
            tracks={related.similar}
            label={track.genre ? `Titres similaires · ${track.genre}` : "Titres similaires"}
          />
        )}
      </div>

      {/* QR dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Partage rapide</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={shareUrl} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all">{shareUrl}</p>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
              <Copy className="h-3.5 w-3.5" /> Copier le lien
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </p>
      <p className="text-sm font-medium truncate" title={value}>{value}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
      <p className="text-sm font-bold leading-none tabular-nums">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function RelatedSection({ title, icon: Icon, tracks }: { title: string; icon: any; tracks: DbTrack[] }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tracks.slice(0, 6).map((t) => (
          <RelatedCard key={t.id} track={t} />
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ track }: { track: DbTrack }) {
  const { play } = usePlayer();
  const { hasActiveSubscription } = useAuth();
  const src = hasActiveSubscription ? (track.audio_url || track.preview_url) : (track.preview_url || track.audio_url);

  return (
    <div className="group rounded-xl overflow-hidden border border-border bg-card/40 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10">
      <Link to={`/tracks/${track.id}`} className="block relative aspect-square overflow-hidden">
        <img
          src={resolveCover(track)}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (!src) return;
            play({
              id: track.id, title: track.title, artist: track.artist,
              coverUrl: resolveCover(track), previewUrl: src,
              isFull: hasActiveSubscription && !!track.audio_url,
            });
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Écouter"
        >
          <Play className="h-8 w-8 fill-white text-white drop-shadow" />
        </button>
        {track.version && track.version !== "Original" && (
          <Badge className="absolute top-1.5 left-1.5 text-[9px] bg-accent/90 border-0">{track.version}</Badge>
        )}
      </Link>
      <Link to={`/tracks/${track.id}`} className="block p-2.5">
        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{track.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground/80 tabular-nums">
          {track.bpm && <span>{track.bpm} BPM</span>}
          {track.musical_key && <span className="text-accent">· {track.musical_key}</span>}
        </div>
      </Link>
    </div>
  );
}
