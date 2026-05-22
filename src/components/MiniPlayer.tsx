import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, ListMusic, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlayer } from "@/contexts/PlayerContext";

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
  const playedRef = useRef<HTMLDivElement>(null);
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
      if (playedRef.current) playedRef.current.style.width = `${pct}%`;
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

  const bars = useMemo(() => buildBars(currentTrack?.id ?? "default"), [currentTrack?.id]);
  const isFull = !!currentTrack?.isFull;

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom safe-x">
        {/* Mobile progress bar (thin, full width, above the controls) */}
        <div className="sm:hidden relative h-1 w-full bg-muted/40 cursor-pointer"
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

        <div className="container flex items-center gap-2 sm:gap-3 h-16">
          <div className="relative shrink-0">
            <img
              src={currentTrack.coverUrl || ""}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded object-cover ring-1 ring-border"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:flex-none sm:w-48 lg:w-56">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{currentTrack.title}</p>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-4 font-bold uppercase tracking-wider shrink-0 ${
                  isFull ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/5" : "border-primary/40 text-primary bg-primary/5"
                }`}
              >
                {isFull ? "Full" : "Extrait"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>

          <Button variant="ghost" size="icon" className="shrink-0 hidden sm:inline-flex" onClick={prev} title="Précédent">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggle} title={isPlaying ? "Pause (Espace)" : "Lecture (Espace)"}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 hidden sm:inline-flex" onClick={next} title="Suivant">
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Waveform progress (desktop) — uses clip-path so the colored layer is a perfect mirror */}
          <div className="flex-1 hidden sm:block relative h-10 group select-none">
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
              ref={playedRef}
              className="absolute inset-y-0 left-0 pointer-events-none overflow-hidden"
              style={{ width: "0%" }}
            >
              <div className="absolute inset-y-0 left-0 right-0 w-[calc(var(--full,100%))]"
                style={{ width: "var(--full-w, 100%)" }}
              />
            </div>
            {/* Colored mirror — width matches the container, masked by playedRef using sibling overflow trick */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
              <div
                ref={(el) => {
                  // mirror width to playedRef via CSS variable update on tick — simpler: use clip-path
                }}
                className="absolute inset-0 flex items-center justify-between gap-[2px] px-0.5 transition-[clip-path] duration-100"
                style={{ clipPath: "inset(0 100% 0 0)" }}
                id="mp-played-mirror"
              >
                {bars.map((b, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-primary to-accent"
                    style={{ height: `${Math.round(b * 100)}%` }}
                  />
                ))}
              </div>
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
                const mirror = document.getElementById("mp-played-mirror");
                if (mirror) mirror.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
              }}
              aria-label="Position de lecture"
            />
          </div>

          <span ref={timeRef} className="text-xs text-muted-foreground shrink-0 w-20 text-right hidden sm:block tabular-nums">
            0:00 / 0:00
          </span>

          {/* Volume + Mute */}
          <div className="hidden md:flex items-center gap-2 w-28 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={muted ? "Réactiver le son (M)" : "Couper le son (M)"}
            >
              {muted ? <VolumeX className="h-4 w-4 text-destructive" /> : <Volume2 className="h-4 w-4" />}
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
              <Button variant="ghost" size="icon" className="shrink-0 relative" title="File d'attente">
                <ListMusic className="h-4 w-4" />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
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
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={clear} title="Fermer le lecteur">
            <X className="h-4 w-4" />
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
