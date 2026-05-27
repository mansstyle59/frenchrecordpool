import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

// Deterministic pseudo-waveform shape per track id (matches MiniPlayer)
function buildBars(seed: string, count = 140): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 1000) / 1000;
    const wave = 0.35 + Math.sin((i / count) * Math.PI) * 0.55;
    bars.push(Math.max(0.1, Math.min(1, v * 0.55 + wave * 0.55)));
  }
  return bars;
}

function fmt(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface Props {
  trackId: string;
  onSeekIfNotCurrent?: () => void;
  bars?: number;
  className?: string;
}

/**
 * SoundCloud-inspired large waveform.
 * - Click any bar to seek (when the track is currently loaded in the player).
 * - If the track is not the current one, click invokes onSeekIfNotCurrent (typically start playback).
 * - Live progress overlay synced with the global audio element.
 */
export default function TrackWaveform({ trackId, onSeekIfNotCurrent, bars: count = 140, className }: Props) {
  const { currentTrack, audioRef, isPlaying } = usePlayer();
  const bars = useMemo(() => buildBars(trackId, count), [trackId, count]);
  const isCurrent = currentTrack?.id === trackId;
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCurrent) { setTime(0); setDuration(0); return; }
    const audio = audioRef.current;
    if (!audio) return;
    let raf = 0;
    const sync = () => {
      setTime(audio.currentTime || 0);
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(d);
    };
    const tick = () => { sync(); raf = requestAnimationFrame(tick); };
    sync();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isCurrent, audioRef, currentTrack?.id]);

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const audio = audioRef.current;
    if (isCurrent && audio?.duration) {
      audio.currentTime = p * audio.duration;
      setTime(audio.currentTime);
    } else {
      onSeekIfNotCurrent?.();
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPct(p * 100);
  };

  return (
    <div className={className}>
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverPct(null)}
        className="relative h-24 md:h-28 w-full cursor-pointer select-none group"
        role="slider"
        aria-label="Waveform — cliquez pour vous déplacer"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
      >
        {/* Base bars */}
        <div className="absolute inset-0 flex items-center justify-between gap-[2px]">
          {bars.map((b, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-muted-foreground/25 group-hover:bg-muted-foreground/35 transition-colors"
              style={{ height: `${Math.round(b * 100)}%` }}
            />
          ))}
        </div>
        {/* Played overlay */}
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-between gap-[2px] pointer-events-none transition-[clip-path] duration-100"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          {bars.map((b, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-gradient-to-t from-primary via-primary to-accent shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
              style={{ height: `${Math.round(b * 100)}%` }}
            />
          ))}
        </div>
        {/* Hover indicator */}
        {hoverPct !== null && (
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-accent/80 pointer-events-none"
            style={{ left: `${hoverPct}%` }}
          />
        )}
        {/* Playhead */}
        {isCurrent && duration > 0 && (
          <div
            aria-hidden
            className={`absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none ${isPlaying ? "shadow-[0_0_12px_hsl(var(--accent)/0.8)]" : ""}`}
            style={{ left: `${pct}%` }}
          />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-muted-foreground">
        <span>{fmt(isCurrent ? time : 0)}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          {isCurrent ? (isPlaying ? "● en lecture" : "en pause") : "cliquez pour vous déplacer"}
        </span>
        <span>{fmt(isCurrent ? duration : 0)}</span>
      </div>
    </div>
  );
}
