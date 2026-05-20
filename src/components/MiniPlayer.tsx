import { useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/contexts/PlayerContext";

export default function MiniPlayer() {
  const { currentTrack, isPlaying, volume, toggle, next, prev, setVolume, audioRef } = usePlayer();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.previewUrl) return;

    if (audio.src !== currentTrack.previewUrl) {
      audio.src = currentTrack.previewUrl;
      audio.load();
    }
    audio.volume = volume;

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, audioRef, volume]);

  // Progress + time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      const timeEl = document.getElementById("player-time");
      if (timeEl) timeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    };
    const handleEnded = () => next();
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, next]);

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
        <div className="container flex items-center gap-3 h-16">
          <img
            src={currentTrack.coverUrl || ""}
            alt=""
            className="h-10 w-10 rounded object-cover shrink-0"
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

          {/* Progress */}
          <div className="flex-1 hidden sm:flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              className="w-full h-1 accent-primary cursor-pointer"
              onChange={(e) => {
                const audio = audioRef.current;
                if (audio && audio.duration) audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
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

          <span id="player-time" className="text-xs text-muted-foreground shrink-0 w-20 text-right hidden sm:block">
            0:00 / 0:00
          </span>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
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
