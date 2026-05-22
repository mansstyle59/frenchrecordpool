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

  const isActive = isCurrentTrack && isPlaying;

  return (
    <div
      className="group grid items-center gap-3 px-3 sm:px-5 py-2.5 border-b border-border/30 last:border-0 hover:bg-foreground/[0.03] transition-colors cursor-pointer"
      style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}
      onDoubleClick={handlePlay}
      title="Double-cliquez pour lire"
    >
      {/* Cover + play button */}
      <div
        className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-secondary/50"
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
      >
        <img
          src={resolveCover(track)}
          alt={track.title}
          className={`h-full w-full object-cover transition-transform duration-500 ${previewing || isActive ? "scale-110" : "group-hover:scale-105"}`}
          loading="lazy"
        />
        <button
          onClick={handlePlay}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label="Lire"
        >
          {isActive ? (
            <span className="flex gap-0.5 items-end">
              <span className="w-0.5 h-3 bg-primary animate-pulse" />
              <span className="w-0.5 h-2 bg-primary animate-pulse [animation-delay:120ms]" />
              <span className="w-0.5 h-4 bg-primary animate-pulse [animation-delay:240ms]" />
            </span>
          ) : (
            <Play className="h-4 w-4 fill-white text-white" />
          )}
        </button>
        {previewing && !isActive && (
          <div className="absolute top-0.5 right-0.5 p-0.5 rounded bg-primary/90">
            <Headphones className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Title + artist */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={`/tracks/${track.id}`}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`text-sm font-semibold truncate hover:text-primary transition-colors ${isCurrentTrack ? "text-primary" : "text-foreground"}`}
          >
            {track.title}
          </Link>
          {track.version && (
            <span className="hidden sm:inline text-[11px] font-medium text-muted-foreground/70 truncate">
              · {track.version}
            </span>
          )}
        </div>
        <Link
          to={`/artists/${encodeURIComponent(track.artist)}`}
          onDoubleClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate block"
        >
          {track.artist}
        </Link>
      </div>

      {/* BPM */}
      <div className="hidden md:flex w-12 justify-end text-sm font-mono tabular-nums text-foreground/90">
        {track.bpm || ""}
      </div>

      {/* Genre / Key */}
      <div className="hidden lg:flex flex-col items-end w-24 leading-tight">
        <span className="text-xs font-semibold text-primary truncate max-w-full">
          {track.genre || ""}
        </span>
        {track.musical_key && (
          <span className="text-[10px] font-mono text-muted-foreground/80">
            {track.musical_key} · {track.duration}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isFavorite(track.id) ? "text-accent hover:text-accent" : "text-muted-foreground/70 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"}`}
          onClick={() => {
            if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return; }
            toggleFavorite(track.id);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          aria-label="Favori"
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
              aria-label="Télécharger"
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
