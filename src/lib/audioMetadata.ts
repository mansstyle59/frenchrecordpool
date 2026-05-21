// Lit la durée et les tags ID3 d'un fichier audio côté client.
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import { analyze } from "web-audio-beat-detector";

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
  version?: string;
  pictureFile?: File;
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
          // jsmediatags exposes both human keys (title, artist, genre) AND frame keys (TBPM, TKEY, TIT2...)
          const bpmRaw =
            tags.TBPM?.data ?? tags.bpm ?? tags.TBP?.data ?? tags.tempo;
          const keyRaw = tags.TKEY?.data ?? tags.key ?? tags.initialKey;
          const bpmNum = bpmRaw ? parseInt(String(bpmRaw).replace(/[^\d.]/g, ""), 10) : NaN;
          resolve({
            title: tags.title || tags.TIT2?.data || undefined,
            artist: tags.artist || tags.TPE1?.data || undefined,
            album: tags.album || tags.TALB?.data || undefined,
            genre: tags.genre || tags.TCON?.data || undefined,
            comment: tags.comment?.text || undefined,
            bpm: Number.isFinite(bpmNum) && bpmNum > 0 ? bpmNum : undefined,
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

// Devine BPM et tonalité depuis le nom de fichier (ex: "Track - 128 BPM - Am.mp3")
function parseFromFilename(name: string): { bpm?: number; key?: string } {
  const cleaned = name.replace(/\.[^.]+$/, "");
  const out: { bpm?: number; key?: string } = {};
  const bpmMatch = cleaned.match(/(\d{2,3})\s*(?:bpm|BPM)/);
  if (bpmMatch) {
    const v = parseInt(bpmMatch[1], 10);
    if (v >= 40 && v <= 260) out.bpm = v;
  }
  const keyMatch = cleaned.match(/\b([A-G](?:#|b)?(?:m|maj|min)?)\b(?!\w)/);
  if (keyMatch && /[A-G]/.test(keyMatch[1])) out.key = keyMatch[1];
  return out;
}

// Analyse réelle du BPM via Web Audio API (fallback si tag absent)
async function analyzeBpm(file: File): Promise<number | undefined> {
  try {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return undefined;
    const ctx = new Ctx();
    const arrayBuf = await file.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
    const tempo = await analyze(audioBuf);
    ctx.close?.();
    if (!Number.isFinite(tempo)) return undefined;
    return Math.round(tempo);
  } catch {
    return undefined;
  }
}

// Valide qu'un BPM est dans une plage musicale plausible
function isPlausibleBpm(bpm: number | undefined): bpm is number {
  return typeof bpm === "number" && Number.isFinite(bpm) && bpm >= 60 && bpm <= 200;
}

// Extraction rapide : tags ID3 + durée + parsing nom de fichier (sans analyse BPM lourde)
export async function extractAudioMetadataFast(file: File): Promise<AudioMetadata> {
  const [dur, tags] = await Promise.all([readAudioDuration(file), readId3Tags(file)]);
  const filename = parseFromFilename(file.name);
  const tagBpm = isPlausibleBpm(tags.bpm) ? tags.bpm : undefined;
  const fileBpm = isPlausibleBpm(filename.bpm) ? filename.bpm : undefined;
  return {
    ...tags,
    ...(dur ?? {}),
    bpm: tagBpm ?? fileBpm,
    key: tags.key ?? filename.key,
  };
}

export function needsBpmAnalysis(meta: AudioMetadata): boolean {
  return !isPlausibleBpm(meta.bpm);
}

// Analyse BPM asynchrone — à lancer en tâche de fond après l'extraction rapide
export async function analyzeBpmAsync(file: File): Promise<number | undefined> {
  const detected = await analyzeBpm(file);
  return isPlausibleBpm(detected) ? detected : undefined;
}

// Version complète (rapide + analyse BPM en cascade si besoin) — conservée pour compat
export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  const fast = await extractAudioMetadataFast(file);
  if (!needsBpmAnalysis(fast)) return fast;
  const detected = await analyzeBpmAsync(file);
  if (detected) fast.bpm = detected;
  return fast;
}

