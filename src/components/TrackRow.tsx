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
        coverUrl: track.cover_url,
        previewUrl: track.preview_url,
      });
    }
  };

  const handleDownload = () => downloadTrack(track.id, user, hasActiveSubscription);
  const resolvedUrl = (track as any).download_url || track.audio_url;
  const isExternalLink = resolvedUrl && !resolvedUrl.includes("/object/public/track-audio/");
  const DownloadIcon = isExternalLink ? ExternalLink : Download;

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="w-8 text-center shrink-0">
        <span className="group-hover:hidden text-sm text-muted-foreground">
          {index !== undefined ? index + 1 : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="hidden group-hover:inline-flex h-8 w-8 text-primary"
          onClick={handlePlay}
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>

      <img
        src={track.cover_url || "/placeholder.svg"}
        alt={track.title}
        className="h-10 w-10 rounded object-cover shrink-0"
        loading="lazy"
      />

      <div className="flex-1 min-w-0">
        <Link
          to={`/tracks/${track.id}`}
          className="text-sm font-medium truncate block hover:text-primary transition-colors"
        >
          {track.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      <Badge variant="outline" className="hidden sm:inline-flex text-xs shrink-0">
        {track.version || "Original"}
      </Badge>

      <span className="hidden md:block text-xs text-muted-foreground w-24 truncate">
        {track.genre}
      </span>

      <span className="hidden lg:block text-xs text-muted-foreground w-12 text-center">
        {track.bpm}
      </span>

      <span className="hidden lg:block text-xs text-muted-foreground w-10 text-center">
        {track.musical_key}
      </span>

      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
        {track.duration}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isFavorite(track.id) ? "text-red-500 hover:text-red-400" : "text-muted-foreground hover:text-accent"}`}
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
              className="h-8 w-8 text-muted-foreground hover:text-primary"
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
