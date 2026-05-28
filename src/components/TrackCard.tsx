import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Heart, Download, ExternalLink, Lock, Loader2, Music2, Gauge, KeyRound, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { downloadTrack, getFullStreamUrl } from "@/lib/downloadTrack";
import { resolveCover } from "@/lib/trackCover";
import ArtistCredit from "@/components/ArtistCredit";
import TrackWaveform from "@/components/TrackWaveform";
import type { DbTrack } from "@/hooks/useTracks";

interface Props {
  track: DbTrack & { energy?: number | null; mood?: string | null };
  className?: string;
}

/**
 * SoundCloud-inspired track card: large cover, inline waveform mini-player,
 * metadata badges (genre / BPM / key / mood) and a subscription-gated download.
 */
export default function TrackCard({ track, className }: Props) {
  const { play, currentTrack, isPlaying, toggle } = usePlayer();
  const { user, hasActiveSubscription } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [downloading, setDownloading] = useState(false);

  const fullSrc = track.audio_url || null;
  const shortSrc = track.preview_url || null;
  const isCurrent = currentTrack?.id === track.id;
  const isActive = isCurrent && isPlaying;
  const playbackSrc = hasActiveSubscription ? (fullSrc || shortSrc) : shortSrc;
  const isFullPlayback = hasActiveSubscription && !!fullSrc;
  const fav = isFavorite(track.id);

  const handlePlay = async () => {
    if (isCurrent) { toggle(); return; }
    if (!playbackSrc) {
      toast.info(hasActiveSubscription
        ? "Aucun extrait audio disponible."
        : "Aucun extrait. Abonnez-vous pour écouter le titre complet.");
      return;
    }
    let src = playbackSrc;
    if (isFullPlayback && fullSrc && fullSrc.includes("/object/public/track-audio/")) {
      const signed = await getFullStreamUrl(track.id);
      if (signed) src = signed;
    }
    play({
      id: track.id, title: track.title, artist: track.artist,
      coverUrl: resolveCover(track), previewUrl: src, isFull: isFullPlayback,
    });
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try { await downloadTrack(track.id, user, hasActiveSubscription); }
    finally { setDownloading(false); }
  };

  const resolvedUrl = (track as any).download_url || track.audio_url;
  const isExternal = resolvedUrl && !resolvedUrl.includes("/object/public/track-audio/");
  const DlIcon = isExternal ? ExternalLink : Download;
  const canDownload = !!user && hasActiveSubscription;

  return (
    <article
      className={`group relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden hover:border-primary/40 hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.35)] transition-all ${className ?? ""}`}
    >
      <div className="flex gap-4 p-4">
        {/* Cover + play overlay */}
        <div className="relative shrink-0">
          <Link to={`/tracks/${track.id}`} className="block h-32 w-32 sm:h-40 sm:w-40 rounded-xl overflow-hidden bg-secondary/50 ring-1 ring-border/40">
            <img
              src={resolveCover(track)}
              alt={track.title}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
            />
          </Link>
          <button
            onClick={handlePlay}
            aria-label={isActive ? "Pause" : "Lire"}
            className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.55)] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
            style={isActive ? { opacity: 1 } : undefined}
          >
            {isActive ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </button>
          {!isFullPlayback && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/60 text-white/95 backdrop-blur-sm">
              <Lock className="h-2.5 w-2.5" /> Extrait
            </span>
          )}
        </div>

        {/* Right side: title + waveform + actions */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/tracks/${track.id}`}
                className="block font-display text-base sm:text-lg font-bold truncate hover:text-primary transition-colors"
              >
                {track.title}
              </Link>
              <ArtistCredit
                name={track.artist}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate block"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className={`h-8 w-8 ${fav ? "text-accent hover:text-accent" : "text-muted-foreground hover:text-accent"}`}
                    onClick={() => {
                      if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return; }
                      toggleFavorite(track.id);
                    }}
                    aria-label="Favori"
                  >
                    <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{fav ? "Retirer des favoris" : "Ajouter aux favoris"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={canDownload ? "default" : "outline"}
                    size="sm"
                    onClick={handleDownload}
                    disabled={downloading}
                    aria-busy={downloading}
                    className={`gap-1.5 h-8 ${canDownload ? "" : "border-accent/40 text-accent hover:bg-accent/10"}`}
                  >
                    {downloading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : canDownload
                        ? <DlIcon className="h-3.5 w-3.5" />
                        : <Crown className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline text-xs font-semibold">
                      {canDownload ? (isExternal ? "Ouvrir" : "Télécharger") : "Premium"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {downloading ? "Traitement…"
                    : canDownload ? (isExternal ? "Ouvrir le lien externe" : "Télécharger le fichier")
                    : "Abonnement requis pour télécharger"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Compact waveform (mini-player). Falls back gracefully when no audio. */}
          {(shortSrc || fullSrc) ? (
            <div className="mt-2 -mx-1">
              <TrackWaveform
                trackId={track.id}
                bars={90}
                className="[&>div:first-child]:!h-14 sm:[&>div:first-child]:!h-16"
                onSeekIfNotCurrent={handlePlay}
              />
            </div>
          ) : (
            <div className="mt-2 h-14 sm:h-16 rounded-md bg-muted/30 flex items-center justify-center text-[11px] text-muted-foreground">
              Aucun extrait audio
            </div>
          )}

          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {track.genre && (
              <Link
                to={`/new?genre=${encodeURIComponent(track.genre)}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
              >
                <Music2 className="h-3 w-3" /> {track.genre}
              </Link>
            )}
            {track.bpm && (
              <Badge icon={Gauge} label={`${track.bpm} BPM`} tone="accent" />
            )}
            {track.musical_key && (
              <Badge icon={KeyRound} label={track.musical_key} tone="muted" />
            )}
            {track.mood && (
              <Badge icon={Sparkles} label={track.mood} tone="muted" />
            )}
            {track.version && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/30">
                {track.version}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Badge({ icon: Icon, label, tone }: { icon: any; label: string; tone: "accent" | "muted" }) {
  const cls = tone === "accent"
    ? "bg-accent/10 text-accent border-accent/30"
    : "bg-muted/40 text-foreground/80 border-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tabular-nums border ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}
