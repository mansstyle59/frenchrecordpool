import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  previewUrl: string | null;
}

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null, queue: [], isPlaying: false, progress: 0, duration: 0, volume: 1,
  play: () => {}, pause: () => {}, toggle: () => {}, seek: () => {},
  next: () => {}, prev: () => {}, setVolume: () => {},
  audioRef: { current: null },
});

export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null!);

  const play = useCallback((track: PlayerTrack, q?: PlayerTrack[]) => {
    if (!track.previewUrl) return;
    setCurrentTrack(track);
    setIsPlaying(true);
    if (q && q.length) setQueue(q);
  }, []);

  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);
  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const goTo = useCallback((dir: 1 | -1) => {
    setCurrentTrack((curr) => {
      if (!curr || queue.length === 0) return curr;
      const idx = queue.findIndex((t) => t.id === curr.id);
      if (idx === -1) return curr;
      const next = queue[(idx + dir + queue.length) % queue.length];
      if (next?.previewUrl) {
        setIsPlaying(true);
        return next;
      }
      return curr;
    });
  }, [queue]);

  const next = useCallback(() => goTo(1), [goTo]);
  const prev = useCallback(() => goTo(-1), [goTo]);

  return (
    <PlayerContext.Provider value={{ currentTrack, queue, isPlaying, progress, duration, volume, play, pause, toggle, seek, next, prev, setVolume, audioRef }}>
      {children}
    </PlayerContext.Provider>
  );
}
