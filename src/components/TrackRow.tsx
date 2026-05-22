import { Play, Heart, Download, ExternalLink, Headphones, Clock, Music2, Lock, Crown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTrack, getFullStreamUrl } from "@/lib/downloadTrack";
import { useFavorites } from "@/hooks/useFavorites";
import type { DbTrack } from "@/hooks/useTracks";
import { resolveCover } from "@/lib/trackCover";

/* ─── Shared column template (header + rows MUST match) ─── */
//          cover  | title/artist | version | BPM | KEY  | GENRE | TIME | actions
const COLS = "48px minmax(0,1fr) 110px 56px 56px 120px 56px auto";
const COL_GAP = "gap-x-4";

interface TrackRowProps {
  track: DbTrack;
  index?: number;
}

/* ─── Header row (column labels) — shares the same grid template ─── */
export function TrackListHeader() {
  return (
    <div
      className={`hidden sm:grid items-center ${COL_GAP} px-3 sm:px-5 py-2 border-b border-border/40 bg-muted/30 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground`}
      style={{ gridTemplateColumns: COLS }}
    >
      <span />
      <span>Titre / Artiste</span>
      <span className="hidden md:block">Version</span>
      <span className="hidden md:block text-right">BPM</span>
      <span className="hidden lg:block text-right">Key</span>
      <span className="hidden lg:block">Genre</span>
      <span className="hidden xl:flex items-center gap-1 text-right justify-end">
        <Clock className="h-3 w-3" />
      </span>
      <span className="text-right">Actions</span>
    </div>
  );
}

export default function TrackRow({ track }: TrackRowProps) {
  const { play, currentTrack, isPlaying, toggle } = usePlayer();
  const { user, hasActiveSubscription } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isCurrentTrack = currentTrack?.id === track.id;
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const fullSrc = track.audio_url || null;
  const shortSrc = track.preview_url || null;
  const playbackSrc = hasActiveSubscription ? (fullSrc || shortSrc) : shortSrc;
  const isFullPlayback = hasActiveSubscription && !!fullSrc;
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
    if (audio) { try { audio.pause(); audio.currentTime = 0; } catch {} }
    setPreviewing(false);
  };

  const handlePlay = async () => {
    stopPreview();
    if (isCurrentTrack) { toggle(); return; }
    if (!playbackSrc) {
      if (!hasActiveSubscription && fullSrc) {
        toast.info("Aucun extrait disponible. Abonnez-vous pour écouter le titre complet.");
      } else {
        toast.error("Aucun extrait audio disponible pour ce titre.");
      }
      return;
    }
    let src = playbackSrc;
    // For full playback from a private storage bucket, fetch a signed streaming URL
    if (isFullPlayback && fullSrc && fullSrc.includes("/object/public/track-audio/")) {
      const signed = await getFullStreamUrl(track.id);
      if (signed) src = signed;
    }
    play({
      id: track.id, title: track.title, artist: track.artist,
      coverUrl: resolveCover(track), previewUrl: src, isFull: isFullPlayback,
    });
  };

  /** Always play the short preview (or a 30s slice of full as fallback). */
  const handlePlayPreview = async () => {
    stopPreview();
    if (!shortSrc && !fullSrc) {
      toast.error("Aucun extrait audio disponible.");
      return;
    }
    let src = shortSrc || fullSrc!;
    // If only the full track exists (no dedicated preview), get a signed URL when it's private
    if (!shortSrc && fullSrc && fullSrc.includes("/object/public/track-audio/")) {
      const signed = await getFullStreamUrl(track.id);
      if (signed) src = signed;
    }
    play({
      id: track.id + "::preview",
      title: track.title,
      artist: track.artist,
      coverUrl: resolveCover(track),
      previewUrl: src,
      isFull: false,
    });
  };

  const handleDownload = () => downloadTrack(track.id, user, hasActiveSubscription);
  const resolvedUrl = (track as any).download_url || track.audio_url;
  const isExternalLink = resolvedUrl && !resolvedUrl.includes("/object/public/track-audio/");
  const DownloadIcon = isExternalLink ? ExternalLink : Download;

  const isActive = isCurrentTrack && isPlaying;
  const fav = isFavorite(track.id);

  return (
    <div
      className={`group grid items-center ${COL_GAP} px-3 sm:px-5 py-2 border-b border-border/30 last:border-0 hover:bg-foreground/[0.04] transition-colors cursor-pointer ${
        isCurrentTrack ? "bg-primary/[0.06]" : ""
      }`}
      style={{ gridTemplateColumns: COLS }}
      onDoubleClick={handlePlay}
      title="Double-cliquez pour lire"
    >
      {/* Cover + play overlay */}
      <div
        className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-secondary/50 ring-1 ring-border/40"
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
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/50 to-black/30 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label={isFullPlayback ? "Lire le titre complet" : "Lire l'extrait"}
          title={isFullPlayback ? "Lire le titre complet" : "Lire l'extrait (30s)"}
        >
          {isActive ? (
            <span className="flex gap-0.5 items-end">
              <span className="w-0.5 h-3 bg-primary animate-pulse" />
              <span className="w-0.5 h-2 bg-primary animate-pulse [animation-delay:120ms]" />
              <span className="w-0.5 h-4 bg-primary animate-pulse [animation-delay:240ms]" />
            </span>
          ) : isFullPlayback ? (
            <Play className="h-4 w-4 fill-white text-white drop-shadow" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-white/95 drop-shadow" />
          )}
        </button>
        {previewing && !isActive && (
          <div className="absolute top-0.5 right-0.5 p-0.5 rounded bg-primary/90">
            <Headphones className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
        {!isFullPlayback && !isActive && (
          <span className="pointer-events-none absolute bottom-0.5 left-0.5 right-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-white/90 bg-black/40 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
            Extrait
          </span>
        )}
      </div>

      {/* Title + artist */}
      <div className="min-w-0">
        <Link
          to={`/tracks/${track.id}`}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`block text-sm font-semibold truncate hover:text-primary transition-colors ${isCurrentTrack ? "text-primary" : "text-foreground"}`}
        >
          {track.title}
        </Link>
        <Link
          to={`/artists/${encodeURIComponent(track.artist)}`}
          onDoubleClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate block"
        >
          {track.artist}
        </Link>
      </div>

      {/* Version (badge) */}
      <div className="hidden md:flex min-w-0">
        {track.version ? (
          <span className="inline-flex items-center px-2 py-0.5 max-w-full rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/30 truncate">
            {track.version}
          </span>
        ) : null}
      </div>

      {/* BPM */}
      <div className="hidden md:block text-right text-sm font-mono tabular-nums text-foreground/90">
        {track.bpm || <span className="text-muted-foreground/40">—</span>}
      </div>

      {/* Musical key */}
      <div className="hidden lg:block text-right text-xs font-mono tabular-nums text-foreground/80">
        {track.musical_key || <span className="text-muted-foreground/40">—</span>}
      </div>

      {/* Genre */}
      <div className="hidden lg:flex min-w-0 items-center gap-1">
        {track.genre ? (
          <Link
            to={`/new?genre=${encodeURIComponent(track.genre)}`}
            onDoubleClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline truncate"
          >
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{track.genre}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        )}
      </div>

      {/* Duration */}
      <div className="hidden xl:block text-right text-xs font-mono tabular-nums text-muted-foreground">
        {track.duration || "—"}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 justify-end">
        {(shortSrc || fullSrc) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handlePlayPreview}
                onDoubleClick={(e) => e.stopPropagation()}
                className="hidden sm:inline-flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                aria-label="Écouter l'extrait"
              >
                <Headphones className="h-3 w-3" />
                Extrait
              </button>
            </TooltipTrigger>
            <TooltipContent>Écouter l'extrait (30s)</TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${fav ? "text-accent hover:text-accent" : "text-muted-foreground/70 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"}`}
          onClick={() => {
            if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return; }
            toggleFavorite(track.id);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          aria-label="Favori"
        >
          <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
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
