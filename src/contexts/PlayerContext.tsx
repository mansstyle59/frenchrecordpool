import { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { recordRecentlyPlayed } from "@/hooks/useRecentlyPlayed";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  previewUrl: string | null;
  /** True if the source is the full track, false if only a short preview is streamed. */
  isFull?: boolean;
}

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  clear: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null, queue: [], isPlaying: false, progress: 0, duration: 0, volume: 1, muted: false,
  play: () => {}, pause: () => {}, toggle: () => {}, seek: () => {},
  next: () => {}, prev: () => {}, setVolume: () => {}, toggleMute: () => {}, clear: () => {},
  audioRef: { current: null },
});

export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(1);
  const [duration, setDuration] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null!);

  const play = useCallback((track: PlayerTrack, q?: PlayerTrack[]) => {
    if (!track.previewUrl) return;
    setCurrentTrack(track);
    setIsPlaying(true);
    if (q && q.length) setQueue(q);
    recordRecentlyPlayed(track.id);
  }, []);

  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);
  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (muted) setMuted(false);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const clear = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setQueue([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, []);

  const goTo = useCallback((dir: 1 | -1) => {
    if (!queue.length) return;
    setCurrentTrack((curr) => {
      if (!curr) return curr;
      const idx = queue.findIndex((t) => t.id === curr.id);
      if (idx === -1) return curr;
      const target = queue[(idx + dir + queue.length) % queue.length];
      return target?.previewUrl ? target : curr;
    });
    setIsPlaying(true);
  }, [queue]);

  const next = useCallback(() => goTo(1), [goTo]);
  const prev = useCallback(() => goTo(-1), [goTo]);

  const value = useMemo(() => ({
    currentTrack, queue, isPlaying, progress, duration, volume, muted,
    play, pause, toggle, seek, next, prev, setVolume, toggleMute, clear, audioRef,
  }), [currentTrack, queue, isPlaying, progress, duration, volume, muted, play, pause, toggle, seek, next, prev, setVolume, toggleMute, clear]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}
