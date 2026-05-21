import { createContext, useContext, useState, useRef, useCallback, useMemo, type ReactNode } from "react";

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
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const prevVolumeRef = useRef(1);
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
    if (clamped > 1 && muted) setMuted(false);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next) {
        prevVolumeRef.current = volume;
        setVolumeState(1);
        if (audioRef.current) audioRef.current.volume = 1;
      } else {
        const restore = prevVolumeRef.current || 1;
        setVolumeState(restore);
        if (audioRef.current) audioRef.current.volume = restore;
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
    setCurrentTrack((curr) => {
      if (!curr || queue.length === 1) return curr;
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
