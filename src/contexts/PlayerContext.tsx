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
  isPlaying: boolean;
  progress: number;
  duration: number;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null, isPlaying: false, progress: 0, duration: 0,
  play: () => {}, pause: () => {}, toggle: () => {}, seek: () => {},
  audioRef: { current: null },
});

export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null!);

  const play = useCallback((track: PlayerTrack) => {
    if (!track.previewUrl) return;
    setCurrentTrack(track);
    setIsPlaying(true);
    // Audio element will handle playback via effect in MiniPlayer
  }, []);

  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);
  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, progress, duration, play, pause, toggle, seek, audioRef }}>
      {children}
    </PlayerContext.Provider>
  );
}
