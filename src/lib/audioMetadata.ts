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
  energy?: number;  // 1..10
  mood?: string;    // FR label
  comment?: string;
  version?: string;
  pictureFile?: File;
}

export interface AudioFeatures {
  key?: string;
  energy?: number;
  mood?: string;
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
          const bpmRaw =
            tags.TBPM?.data ?? tags.bpm ?? tags.TBP?.data ?? tags.tempo;
          const keyRaw = tags.TKEY?.data ?? tags.key ?? tags.initialKey;
          const bpmNum = bpmRaw ? parseInt(String(bpmRaw).replace(/[^\d.]/g, ""), 10) : NaN;

          // Extract embedded cover art (APIC frame)
          let pictureFile: File | undefined;
          try {
            const pic = tags.picture || tags.APIC?.data;
            if (pic && Array.isArray(pic.data) && pic.data.length > 0) {
              const bytes = new Uint8Array(pic.data);
              const mime = pic.format || "image/jpeg";
              const ext = mime.includes("png") ? "png" : "jpg";
              const blob = new Blob([bytes], { type: mime });
              pictureFile = new File([blob], `cover.${ext}`, { type: mime });
            }
          } catch { /* ignore */ }

          resolve({
            title: tags.title || tags.TIT2?.data || undefined,
            artist: tags.artist || tags.TPE1?.data || undefined,
            album: tags.album || tags.TALB?.data || undefined,
            genre: tags.genre || tags.TCON?.data || undefined,
            comment: tags.comment?.text || undefined,
            bpm: Number.isFinite(bpmNum) && bpmNum > 0 ? bpmNum : undefined,
            key: keyRaw ? String(keyRaw).trim() : undefined,
            pictureFile,
          });
        },
        onError: () => resolve({}),
      });
    } catch {
      resolve({});
    }
  });
}

// Devine artiste / titre / version / BPM / tonalité depuis le nom de fichier
// Exemples: "Artist - Title (DJ Yass Remix) [128 BPM - Am].mp3"
function parseFromFilename(name: string): { bpm?: number; key?: string; artist?: string; title?: string; version?: string } {
  let cleaned = name.replace(/\.[^.]+$/, "").trim();
  const out: { bpm?: number; key?: string; artist?: string; title?: string; version?: string } = {};

  const bpmMatch = cleaned.match(/(\d{2,3})\s*(?:bpm|BPM)/);
  if (bpmMatch) {
    const v = parseInt(bpmMatch[1], 10);
    if (v >= 40 && v <= 260) out.bpm = v;
    cleaned = cleaned.replace(bpmMatch[0], "").trim();
  }
  const keyMatch = cleaned.match(/\b([A-G](?:#|b)?(?:m|maj|min)?)\b(?!\w)/);
  if (keyMatch && /[A-G]/.test(keyMatch[1])) out.key = keyMatch[1];

  // Extract version inside parentheses or brackets: (X Remix), [Extended Edit]…
  const versionMatch = cleaned.match(/[\(\[]([^\)\]]*?(?:remix|edit|mix|version|bootleg|mashup|flip|rework|vip|extended|intro|clean|dirty|acapella|instrumental)[^\)\]]*)[\)\]]/i);
  if (versionMatch) {
    out.version = versionMatch[1].trim();
    cleaned = cleaned.replace(versionMatch[0], "").trim();
  }
  // Remove residual bracketed segments (e.g. [www.site.com])
  cleaned = cleaned.replace(/[\(\[][^\)\]]*[\)\]]/g, "").replace(/\s{2,}/g, " ").trim();
  // Trim trailing separators
  cleaned = cleaned.replace(/[-–—_]+$/g, "").trim();

  // Split "Artist - Title"
  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    out.artist = parts[0].trim();
    out.title = parts.slice(1).join(" - ").trim();
  } else if (cleaned) {
    out.title = cleaned;
  }
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
    title: tags.title || filename.title,
    artist: tags.artist || filename.artist,
    version: filename.version,
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


// =====================================================================
// Detection audio "SoundCloud-like" — Clé musicale (Krumhansl-Schmuckler),
// énergie (RMS) et ambiance (combinaison énergie + centroïde spectral).
// 100% client-side via Web Audio API, sans dépendance lourde.
// =====================================================================

const KS_MAJOR = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const KS_MINOR = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const PITCHES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

function correlate(a: number[], b: number[]): number {
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < 12; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  return num / (Math.sqrt(da * db) || 1);
}

function detectKeyFromChroma(chroma: number[]): string {
  let best = { score: -Infinity, key: "" };
  for (let i = 0; i < 12; i++) {
    const rotated = chroma.slice(i).concat(chroma.slice(0, i));
    const maj = correlate(rotated, KS_MAJOR);
    const min = correlate(rotated, KS_MINOR);
    if (maj > best.score) best = { score: maj, key: `${PITCHES[i]}` };
    if (min > best.score) best = { score: min, key: `${PITCHES[i]}m` };
  }
  return best.key;
}

function energyToScale(rms: number): number {
  // rms typique 0.02 (calme) → 0.30 (saturé). Mappage vers 1..10.
  const n = Math.max(0, Math.min(1, (rms - 0.02) / 0.22));
  return Math.max(1, Math.min(10, Math.round(1 + n * 9)));
}

function inferMood(energy: number, brightness: number): string {
  // brightness ∈ [0,1] (centroïde normalisé), energy ∈ [1,10]
  if (energy >= 7 && brightness >= 0.55) return "Énergique";
  if (energy >= 7 && brightness < 0.45) return "Sombre";
  if (energy >= 5 && brightness >= 0.55) return "Festif";
  if (energy <= 4 && brightness >= 0.55) return "Apaisant";
  if (energy <= 4 && brightness < 0.45) return "Mélancolique";
  return "Groovy";
}

export async function analyzeAudioFeaturesAsync(file: File): Promise<AudioFeatures> {
  try {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return {};
    const ctx = new Ctx();
    const buf = await ctx.decodeAudioData((await file.arrayBuffer()).slice(0));
    const sr = buf.sampleRate;
    const data = buf.getChannelData(0);
    // Fenêtre centrale de 30 s pour éviter les intros/outros
    const len = data.length;
    const targetSec = Math.min(30, buf.duration);
    const start = Math.max(0, Math.floor(len / 2 - (targetSec * sr) / 2));
    const end = Math.min(len, start + Math.floor(targetSec * sr));
    const slice = data.subarray(start, end);

    // RMS énergie
    let sumSq = 0;
    for (let i = 0; i < slice.length; i++) sumSq += slice[i] * slice[i];
    const rms = Math.sqrt(sumSq / slice.length);

    // FFT par fenêtres → chroma + centroïde spectral
    const N = 4096;
    const hop = N;
    const chroma = new Array(12).fill(0);
    let centroidSum = 0, centroidWeight = 0, frames = 0;

    // FFT naïf via DFT pondéré sur magnitudes — assez précis pour la clé/centroïde
    // On évite l'import d'une lib FFT en restant raisonnable: max 30 fenêtres.
    const maxFrames = Math.min(30, Math.floor(slice.length / hop));
    const re = new Float32Array(N);
    const im = new Float32Array(N);

    for (let f = 0; f < maxFrames; f++) {
      const off = f * hop;
      for (let i = 0; i < N; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)); // Hann
        re[i] = (slice[off + i] || 0) * w;
        im[i] = 0;
      }
      fftInPlace(re, im);
      // Garde la moitié utile
      for (let k = 1; k < N / 2; k++) {
        const mag = Math.hypot(re[k], im[k]);
        const freq = (k * sr) / N;
        if (freq < 60 || freq > 5000) continue;
        // Convertit fréquence → pitch class
        const midi = 69 + 12 * Math.log2(freq / 440);
        const pc = ((Math.round(midi) % 12) + 12) % 12;
        chroma[pc] += mag;
        centroidSum += freq * mag;
        centroidWeight += mag;
      }
      frames++;
    }

    ctx.close?.();
    const key = frames > 0 ? detectKeyFromChroma(chroma) : undefined;
    const centroid = centroidWeight > 0 ? centroidSum / centroidWeight : 0;
    // 200 Hz → sombre, 3500 Hz → brillant
    const brightness = Math.max(0, Math.min(1, (centroid - 200) / 3300));
    const energy = energyToScale(rms);
    const mood = inferMood(energy, brightness);
    return { key, energy, mood };
  } catch {
    return {};
  }
}

// FFT itérative Cooley-Tukey en place (N puissance de 2)
function fftInPlace(re: Float32Array, im: Float32Array) {
  const n = re.length;
  // bit-reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const tRe = cRe * re[i + k + len / 2] - cIm * im[i + k + len / 2];
        const tIm = cRe * im[i + k + len / 2] + cIm * re[i + k + len / 2];
        re[i + k] = uRe + tRe; im[i + k] = uIm + tIm;
        re[i + k + len / 2] = uRe - tRe; im[i + k + len / 2] = uIm - tIm;
        const nRe = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = nRe;
      }
    }
  }
}
