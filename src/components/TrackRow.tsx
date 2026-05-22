import { Play, Heart, Download, ExternalLink, Headphones } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // For audio playback: subscribers get the full audio_url, others ONLY get the short preview_url.
  // Non-subscribers must never stream the full file, even if no preview is uploaded.
  const fullSrc = track.audio_url || null;
  const shortSrc = track.preview_url || null;
  const playbackSrc = hasActiveSubscription ? (fullSrc || shortSrc) : shortSrc;
  const isFullPlayback = hasActiveSubscription && !!fullSrc;
  // Hover preview ALWAYS prefers the short clip; if missing and user is NOT subscribed, no hover preview.
  const previewSrc = shortSrc || (hasActiveSubscription ? fullSrc : null);
  const previewIsFull = !shortSrc && !!fullSrc && hasActiveSubscription;
  const stopAtRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      previewRef.current?.pause();
      previewRef.current = null;
    };
  }, []);

  const startPreview = () => {
    if (isCurrentTrack && isPlaying) return;
    if (!previewSrc) return;
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      try {
        const audio = previewRef.current ?? new Audio(previewSrc);
        audio.src = previewSrc;
        audio.volume = 0;
        audio.currentTime = 0;
        audio.preload = "auto";
        previewRef.current = audio;
        // Auto-stop after 30s if we are streaming the full track as preview
        if (previewIsFull) {
          stopAtRef.current = window.setTimeout(() => stopPreview(), 30_000) as unknown as number;
        }
        const fadeIn = () => {
          let v = 0;
          const id = window.setInterval(() => {
            v = Math.min(0.45, v + 0.05);
            if (previewRef.current) previewRef.current.volume = v;
            if (v >= 0.45) window.clearInterval(id);
          }, 40);
        };
        audio.play().then(() => { setPreviewing(true); fadeIn(); }).catch(() => {});
      } catch {}
    }, 450);
  };

  const stopPreview = () => {
    if (hoverTimer.current) { window.clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (stopAtRef.current) { window.clearTimeout(stopAtRef.current); stopAtRef.current = null; }
    const audio = previewRef.current;
    if (audio) {
      try { audio.pause(); audio.currentTime = 0; } catch {}
    }
    setPreviewing(false);
  };

  const handlePlay = () => {
    stopPreview();
    if (isCurrentTrack) {
      toggle();
      return;
    }
    if (!playbackSrc) {
      if (!hasActiveSubscription && fullSrc) {
        toast.info("Aucun extrait disponible. Abonnez-vous pour écouter le titre complet.");
      } else {
        toast.error("Aucun extrait audio disponible pour ce titre.");
      }
      return;
    }
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverUrl: resolveCover(track),
      previewUrl: playbackSrc,
      isFull: isFullPlayback,
    });
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
        <span className="text-xs text-muted-foreground">
          {index !== undefined ? String(index + 1).padStart(2, "0") : ""}
        </span>
      </div>

      <div
        className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden ring-1 ring-border/60 shadow-md shadow-black/20 group-hover:ring-primary/50 group-hover:shadow-primary/20 transition-all"
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
      >
        <img
          src={resolveCover(track)}
          alt={track.title}
          className={`h-full w-full object-cover transition-transform duration-500 ${previewing || (isCurrentTrack && isPlaying) ? "scale-110" : "group-hover:scale-105"}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 pointer-events-none" />
        {previewing && !(isCurrentTrack && isPlaying) && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-primary/90 backdrop-blur-sm">
            <Headphones className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
        <button
          onClick={handlePlay}
          onDoubleClick={(e) => e.stopPropagation()}
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
            <Play className="h-5 w-5 fill-white text-white drop-shadow" />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <Link
          to={`/tracks/${track.id}`}
          onDoubleClick={(e) => e.stopPropagation()}
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
          onDoubleClick={(e) => e.stopPropagation()}
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
              onDoubleClick={(e) => e.stopPropagation()}
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
