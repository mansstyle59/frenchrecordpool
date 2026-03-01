import { useEffect, useRef } from "react";
import { Play, Pause, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/contexts/PlayerContext";

export default function MiniPlayer() {
  const { currentTrack, isPlaying, progress, duration, toggle, seek, audioRef } = usePlayer();
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.previewUrl) return;

    if (audio.src !== currentTrack.previewUrl) {
      audio.src = currentTrack.previewUrl;
      audio.load();
    }

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, audioRef]);

  // Update progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => {
      // Force re-render with new values by dispatching through context would be heavy,
      // so we use a simpler approach with DOM
    };

    const handleTimeUpdate = () => {
      const bar = document.getElementById("player-progress");
      const timeEl = document.getElementById("player-time");
      if (bar && audio.duration) {
        (bar as any).__setValue?.([audio.currentTime]);
      }
      if (timeEl) {
        const cur = formatTime(audio.currentTime);
        const dur = formatTime(audio.duration);
        timeEl.textContent = `${cur} / ${dur}`;
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", () => {
      const el = document.getElementById("player-time");
      if (el) el.textContent = formatTime(audio.duration) + " / " + formatTime(audio.duration);
    });

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef]);

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
        <div className="container flex items-center gap-3 h-16">
          {/* Cover + Info */}
          <img
            src={currentTrack.coverUrl || "/placeholder.svg"}
            alt=""
            className="h-10 w-10 rounded object-cover shrink-0"
          />
          <div className="min-w-0 flex-shrink-0 w-32 sm:w-48">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>

          {/* Controls */}
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggle}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          {/* Progress bar */}
          <div className="flex-1 hidden sm:flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              className="w-full h-1 accent-primary cursor-pointer"
              onChange={(e) => {
                const audio = audioRef.current;
                if (audio && audio.duration) {
                  audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
                }
              }}
              ref={(el) => {
                if (!el) return;
                const audio = audioRef.current;
                if (!audio) return;
                const update = () => {
                  if (audio.duration) el.value = String((audio.currentTime / audio.duration) * 100);
                  requestAnimationFrame(update);
                };
                update();
              }}
            />
          </div>

          {/* Time */}
          <span id="player-time" className="text-xs text-muted-foreground shrink-0 w-20 text-right hidden sm:block">
            0:00 / 0:00
          </span>

          {/* Volume */}
          <Volume2 className="h-4 w-4 text-muted-foreground hidden md:block" />
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
