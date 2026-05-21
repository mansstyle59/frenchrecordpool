import { useEffect, useMemo, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, ListMusic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    // shape: emphasize middle a bit
    const wave = 0.4 + Math.sin((i / count) * Math.PI) * 0.5;
    bars.push(Math.max(0.12, Math.min(1, v * 0.6 + wave * 0.5)));
  }
  return bars;
}

export default function MiniPlayer() {
  const { currentTrack, queue, isPlaying, volume, toggle, next, prev, play, setVolume, audioRef } = usePlayer();
  const progressRef = useRef<HTMLInputElement>(null);
  const playedRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.previewUrl) return;
    if (audio.src !== currentTrack.previewUrl) {
      audio.src = currentTrack.previewUrl;
      audio.load();
    }
    audio.volume = volume;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [currentTrack, isPlaying, audioRef, volume]);

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
      if (timeRef.current) timeRef.current.textContent = `${formatTime(c)} / ${formatTime(d)}`;
      raf = requestAnimationFrame(tick);
    };
    const handleEnded = () => next();
    audio.addEventListener("ended", handleEnded);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, next]);

  const bars = useMemo(() => buildBars(currentTrack?.id ?? "default"), [currentTrack?.id]);
  const currentIdx = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
        <div className="container flex items-center gap-3 h-16">
          <img
            src={currentTrack.coverUrl || ""}
            alt=""
            className="h-10 w-10 rounded object-cover shrink-0 ring-1 ring-border"
          />
          <div className="min-w-0 flex-shrink-0 w-32 sm:w-48">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>

          <Button variant="ghost" size="icon" className="shrink-0 hidden sm:inline-flex" onClick={prev} title="Précédent">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggle}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 hidden sm:inline-flex" onClick={next} title="Suivant">
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Waveform progress */}
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
            <div ref={playedRef} className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none" style={{ width: "0%" }}>
              <div className="h-full flex items-center justify-between gap-[2px] px-0.5" style={{ width: `${Math.round(bars.length * 6.5)}px` }}>
                {bars.map((b, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-primary to-accent"
                    style={{ height: `${Math.round(b * 100)}%`, minWidth: "2px" }}
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
              aria-label="Position de lecture"
            />
          </div>

          <span ref={timeRef} className="text-xs text-muted-foreground shrink-0 w-20 text-right hidden sm:block tabular-nums">
            0:00 / 0:00
          </span>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 w-28 shrink-0">
            <button
              type="button"
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={volume > 0 ? "Couper" : "Activer"}
            >
              {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-full h-1 accent-primary cursor-pointer"
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
