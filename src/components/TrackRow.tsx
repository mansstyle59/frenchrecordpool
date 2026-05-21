import { Play, Heart, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTrack } from "@/lib/downloadTrack";
import { useFavorites } from "@/hooks/useFavorites";
import type { DbTrack } from "@/hooks/useTracks";
import { resolveCover } from "@/lib/trackCover";

interface TrackRowProps {
  track: DbTrack;
  index?: number;
}

export default function TrackRow({ track, index }: TrackRowProps) {
  const { play, currentTrack, isPlaying, toggle } = usePlayer();
  const { user, hasActiveSubscription } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isCurrentTrack) {
      toggle();
    } else {
      play({
        id: track.id,
        title: track.title,
        artist: track.artist,
        coverUrl: resolveCover(track),
        previewUrl: track.preview_url || track.audio_url,
      });
    }
  };

  const handleDownload = () => downloadTrack(track.id, user, hasActiveSubscription);
  const resolvedUrl = (track as any).download_url || track.audio_url;
  const isExternalLink = resolvedUrl && !resolvedUrl.includes("/object/public/track-audio/");
  const DownloadIcon = isExternalLink ? ExternalLink : Download;

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer"
      onDoubleClick={handlePlay}
      title="Double-cliquez pour lire"
    >
      <div className="w-8 text-center shrink-0 font-mono">
        <span className="group-hover:hidden text-xs text-muted-foreground">
          {index !== undefined ? String(index + 1).padStart(2, "0") : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="hidden group-hover:inline-flex h-8 w-8 text-primary"
          onClick={handlePlay}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <Play className="h-4 w-4 fill-current" />
        </Button>
      </div>

      <div className="relative h-11 w-11 shrink-0 rounded-md overflow-hidden ring-1 ring-border/60 shadow-sm">
        <img
          src={resolveCover(track)}
          alt={track.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Lire"
        >
          {isCurrentTrack && isPlaying ? (
            <span className="flex gap-0.5 items-end">
              <span className="w-0.5 h-3 bg-white animate-pulse" />
              <span className="w-0.5 h-2 bg-white animate-pulse [animation-delay:120ms]" />
              <span className="w-0.5 h-4 bg-white animate-pulse [animation-delay:240ms]" />
            </span>
          ) : (
            <Play className="h-4 w-4 fill-white text-white" />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <Link
          to={`/tracks/${track.id}`}
          className={`text-sm font-semibold truncate block hover:text-primary transition-colors ${isCurrentTrack ? "text-primary" : ""}`}
        >
          {track.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {track.version && (
        <Badge
          variant="outline"
          className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider shrink-0 border-primary/30 text-primary bg-primary/5"
        >
          {track.version}
        </Badge>
      )}

      <span className="hidden md:block text-xs text-muted-foreground/80 w-28 truncate">
        {track.genre}
      </span>

      {track.bpm ? (
        <span className="hidden lg:inline-flex items-center justify-center w-14 text-[11px] font-mono font-bold tabular-nums px-2 py-0.5 rounded bg-secondary text-foreground/90">
          {track.bpm}
        </span>
      ) : (
        <span className="hidden lg:block w-14" />
      )}

      {track.musical_key ? (
        <span className="hidden lg:inline-flex items-center justify-center w-12 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
          {track.musical_key}
        </span>
      ) : (
        <span className="hidden lg:block w-12" />
      )}

      <span className="text-xs text-muted-foreground/70 w-12 text-right shrink-0 font-mono tabular-nums">
        {track.duration}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isFavorite(track.id) ? "text-accent hover:text-accent" : "text-muted-foreground hover:text-accent"}`}
          onClick={() => {
            if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return; }
            toggleFavorite(track.id);
          }}
        >
          <Heart className={`h-4 w-4 ${isFavorite(track.id) ? "fill-current" : ""}`} />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={handleDownload}
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isExternalLink ? "Ouvrir le lien externe" : "Télécharger le fichier"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
