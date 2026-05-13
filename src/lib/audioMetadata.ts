// Lit la durée et les tags ID3 d'un fichier audio côté client.
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

export interface AudioMetadata {
  duration?: string; // formatted "m:ss"
  durationSec?: number;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  comment?: string;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function readAudioDuration(file: File): Promise<{ duration: string; durationSec: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onloadedmetadata = () => {
      const sec = audio.duration;
      cleanup();
      if (!isFinite(sec)) resolve(null);
      else resolve({ duration: formatDuration(sec), durationSec: sec });
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

export function readId3Tags(file: File): Promise<Partial<AudioMetadata>> {
  return new Promise((resolve) => {
    try {
      jsmediatags.read(file, {
        onSuccess: (result: any) => {
          const tags = result.tags || {};
          const bpmRaw = tags.TBPM?.data || tags.bpm;
          const keyRaw = tags.TKEY?.data || tags.key;
          resolve({
            title: tags.title || undefined,
            artist: tags.artist || undefined,
            album: tags.album || undefined,
            genre: tags.genre || undefined,
            comment: tags.comment?.text || undefined,
            bpm: bpmRaw ? parseInt(String(bpmRaw), 10) || undefined : undefined,
            key: keyRaw ? String(keyRaw).trim() : undefined,
          });
        },
        onError: () => resolve({}),
      });
    } catch {
      resolve({});
    }
  });
}

export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  const [dur, tags] = await Promise.all([readAudioDuration(file), readId3Tags(file)]);
  return { ...tags, ...(dur ?? {}) };
}
