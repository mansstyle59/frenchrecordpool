// Génère un extrait audio (WAV mono 22050Hz) à partir d'un fichier audio.
// Utilisé pour créer automatiquement le preview public d'une track.

const PREVIEW_SECONDS = 30;
const TARGET_SAMPLE_RATE = 22050;

function encodeWav(channelData: Float32Array, sampleRate: number): Blob {
  const length = channelData.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const newLen = Math.floor(input.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = Math.floor(i * ratio);
    out[i] = input[idx];
  }
  return out;
}

export type PreviewStartMode = "intro" | "quarter" | "middle" | "drop";

export interface PreviewOptions {
  seconds?: number;
  startMode?: PreviewStartMode;
}

export async function generateAudioPreview(file: File, opts: PreviewOptions | number = {}): Promise<Blob | null> {
  // Rétrocompat: ancien appel generateAudioPreview(file, 30)
  const options: PreviewOptions = typeof opts === "number" ? { seconds: opts } : opts;
  const seconds = options.seconds ?? PREVIEW_SECONDS;
  const startMode: PreviewStartMode = options.startMode ?? "quarter";

  try {
    const arrayBuf = await file.arrayBuffer();
    const Ctx: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
    const sampleRate = audioBuf.sampleRate;
    const totalSec = audioBuf.duration;

    let startFrac = 0;
    switch (startMode) {
      case "intro": startFrac = 0; break;
      case "quarter": startFrac = 0.25; break;
      case "middle": startFrac = 0.45; break;
      case "drop": startFrac = 0.6; break;
    }
    let startSec = totalSec * startFrac;
    if (startSec + seconds > totalSec) startSec = Math.max(0, totalSec - seconds);
    const endSec = Math.min(startSec + seconds, totalSec);
    const startSample = Math.floor(startSec * sampleRate);
    const endSample = Math.floor(endSec * sampleRate);

    // Mix en mono
    const channels = audioBuf.numberOfChannels;
    const len = endSample - startSample;
    const mono = new Float32Array(len);
    for (let ch = 0; ch < channels; ch++) {
      const data = audioBuf.getChannelData(ch);
      for (let i = 0; i < len; i++) mono[i] += data[startSample + i] / channels;
    }

    const down = downsample(mono, sampleRate, TARGET_SAMPLE_RATE);

    // Fade in/out 200ms pour éviter les clics
    const fade = Math.floor(0.2 * TARGET_SAMPLE_RATE);
    for (let i = 0; i < fade && i < down.length; i++) {
      down[i] *= i / fade;
      down[down.length - 1 - i] *= i / fade;
    }

    ctx.close();
    return encodeWav(down, TARGET_SAMPLE_RATE);
  } catch (e) {
    console.warn("Preview generation failed:", e);
    return null;
  }
}
