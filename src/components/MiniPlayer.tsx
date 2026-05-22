import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, ListMusic, X, Loader2, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";

// Deterministic pseudo-waveform shape per track id
function buildBars(seed: string, count = 64): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 1000) / 1000;
    const wave = 0.4 + Math.sin((i / count) * Math.PI) * 0.5;
    bars.push(Math.max(0.12, Math.min(1, v * 0.6 + wave * 0.5)));
  }
  return bars;
}

export default function MiniPlayer() {
  const {
    currentTrack, queue, isPlaying, volume, muted,
    toggle, next, prev, play, setVolume, toggleMute, clear, audioRef,
  } = usePlayer();
  const progressRef = useRef<HTMLInputElement>(null);
  const playedMirrorRef = useRef<HTMLDivElement>(null);
  const mobilePlayedRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const [loading, setLoading] = useState(false);

  // ----- Source switching -----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.previewUrl) return;
    if (audio.src !== currentTrack.previewUrl) {
      audio.src = currentTrack.previewUrl;
      audio.load();
      setLoading(true);
    }
    audio.volume = muted ? 0 : volume;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [currentTrack, isPlaying, audioRef, volume, muted]);

  // ----- Loading state + progress + ended -----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let raf = 0;
    const tick = () => {
      const d = audio.duration || 0;
      const c = audio.currentTime || 0;
      const pct = d ? (c / d) * 100 : 0;
      if (progressRef.current) progressRef.current.value = String(pct);
      if (playedMirrorRef.current) playedMirrorRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      if (mobilePlayedRef.current) mobilePlayedRef.current.style.width = `${pct}%`;
      if (timeRef.current) timeRef.current.textContent = `${formatTime(c)} / ${formatTime(d)}`;
      raf = requestAnimationFrame(tick);
    };
    const onEnded = () => next();
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPlaying = () => setLoading(false);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
    };
  }, [audioRef, next]);

  // ----- Media Session API (OS / lock-screen controls) -----
  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: currentTrack.coverUrl
          ? [{ src: currentTrack.coverUrl, sizes: "512x512", type: "image/jpeg" }]
          : [],
      });
      navigator.mediaSession.setActionHandler("play", () => !isPlaying && toggle());
      navigator.mediaSession.setActionHandler("pause", () => isPlaying && toggle());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    } catch { /* ignore */ }
  }, [currentTrack, isPlaying, toggle, next, prev]);

  // ----- Keyboard shortcuts (Space, ←/→ seek, ↑/↓ volume, M mute) -----
  useEffect(() => {
    if (!currentTrack) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const audio = audioRef.current;
      switch (e.code) {
        case "Space":
          e.preventDefault(); toggle(); break;
        case "ArrowRight":
          if (audio?.duration) { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); }
          break;
        case "ArrowLeft":
          if (audio) { audio.currentTime = Math.max(0, audio.currentTime - 5); }
          break;
        case "ArrowUp":
          e.preventDefault(); setVolume(Math.min(1, volume + 0.05)); break;
        case "ArrowDown":
          e.preventDefault(); setVolume(Math.max(0, volume - 0.05)); break;
        case "KeyM":
          toggleMute(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTrack, toggle, setVolume, toggleMute, volume, audioRef]);

  const bars = useMemo(() => buildBars(currentTrack?.id ?? "default", 56), [currentTrack?.id]);
  const isFull = !!currentTrack?.isFull;
  const { hasActiveSubscription } = useAuth();

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom safe-x">
        {/* Mobile progress bar */}
        <div className="sm:hidden relative h-0.5 w-full bg-muted/40 cursor-pointer"
          onClick={(e) => {
            const audio = audioRef.current;
            if (!audio?.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pct * audio.duration;
          }}
        >
          <div ref={mobilePlayedRef} className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: "0%" }} />
        </div>

        <div className="container flex items-center gap-2 h-12 sm:h-14">
          {/* Cover */}
          <div className="relative shrink-0">
            <img
              src={currentTrack.coverUrl || ""}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded object-cover ring-1 ring-border"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Title + Artist + Badge */}
          <div className="min-w-0 flex-1 sm:flex-none sm:w-44 lg:w-52">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-medium truncate leading-tight">{currentTrack.title}</p>
              {isFull ? (
                <span
                  className="shrink-0 inline-flex items-center gap-0.5 h-4 px-1 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  title="Lecture du titre complet"
                >
                  <Crown className="h-2.5 w-2.5" /> Full
                </span>
              ) : (
                <span
                  className="shrink-0 inline-flex items-center gap-0.5 h-4 px-1 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30"
                  title="Extrait limité — abonnez-vous pour le titre complet"
                >
                  <Lock className="h-2.5 w-2.5" /> Extrait
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{currentTrack.artist}</p>
          </div>

          {/* Transport */}
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 hidden sm:inline-flex" onClick={prev} title="Précédent">
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={toggle} title={isPlaying ? "Pause (Espace)" : "Lecture (Espace)"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 hidden sm:inline-flex" onClick={next} title="Suivant">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>

          {/* Waveform progress (desktop) */}
          <div className="flex-1 hidden sm:block relative h-8 group select-none">
            <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-0.5">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/50 transition-colors"
                  style={{ height: `${Math.round(b * 100)}%` }}
                />
              ))}
            </div>
            <div
              ref={playedMirrorRef}
              aria-hidden
              className="absolute inset-0 flex items-center justify-between gap-[2px] px-0.5 pointer-events-none transition-[clip-path] duration-100"
              style={{ clipPath: "inset(0 100% 0 0)" }}
            >
              {bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-gradient-to-t from-primary to-accent"
                  style={{ height: `${Math.round(b * 100)}%` }}
                />
              ))}
            </div>
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={100}
              step={0.1}
              defaultValue={0}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const audio = audioRef.current;
                if (audio && audio.duration) audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
              }}
              onInput={(e) => {
                const pct = Number((e.target as HTMLInputElement).value);
                if (playedMirrorRef.current) playedMirrorRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
              }}
              aria-label="Position de lecture"
            />
          </div>

          <span ref={timeRef} className="text-[11px] text-muted-foreground shrink-0 w-16 text-right hidden sm:block tabular-nums font-mono">
            0:00 / 0:00
          </span>

          {/* Upgrade CTA when listening to an extract while not subscribed */}
          {!isFull && !hasActiveSubscription && (
            <Button
              asChild
              size="sm"
              variant="hero"
              className="shrink-0 hidden md:inline-flex h-7 px-2.5 text-[11px] gap-1"
              title="Abonnez-vous pour écouter le titre complet"
            >
              <Link to="/pricing">
                <Crown className="h-3 w-3" /> Débloquer
              </Link>
            </Button>
          )}

          {/* Volume + Mute */}
          <div className="hidden lg:flex items-center gap-1.5 w-24 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={muted ? "Réactiver le son (M)" : "Couper le son (M)"}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5 text-destructive" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-full h-1 accent-primary cursor-pointer"
              aria-label="Volume"
            />
          </div>

          {/* Queue */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 relative h-8 w-8" title="File d'attente">
                <ListMusic className="h-3.5 w-3.5" />
                {queue.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {queue.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold">File d'attente</p>
                <span className="text-xs text-muted-foreground">{queue.length} titre{queue.length > 1 ? "s" : ""}</span>
              </div>
              <ScrollArea className="max-h-80">
                {queue.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">File vide</p>
                ) : (
                  <ul>
                    {queue.map((t, i) => {
                      const isCurr = currentTrack?.id === t.id;
                      return (
                        <li key={t.id}>
                          <button
                            onClick={() => play(t, queue)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/60 transition-colors ${isCurr ? "bg-primary/10" : ""}`}
                          >
                            <span className={`text-xs w-5 text-center ${isCurr ? "text-primary" : "text-muted-foreground"}`}>
                              {isCurr && isPlaying ? "▶" : i + 1}
                            </span>
                            <img src={t.coverUrl || ""} alt="" className="h-8 w-8 rounded object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium truncate ${isCurr ? "text-primary" : ""}`}>{t.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Close player */}
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={clear} title="Fermer le lecteur">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
