import { z } from "zod";

export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10 MB

export const trackSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200),
  artist: z.string().trim().min(1, "Artiste requis").max(200),
  genre: z.string().trim().max(80).optional().or(z.literal("")),
  bpm: z
    .union([z.string(), z.number()])
    .optional()
    .refine((v) => v === undefined || v === "" || (!isNaN(Number(v)) && Number(v) >= 40 && Number(v) <= 220), {
      message: "BPM doit être entre 40 et 220",
    }),
  musicalKey: z.string().trim().max(10).optional().or(z.literal("")),
  version: z.string().trim().max(60).optional().or(z.literal("")),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  duration: z.string().trim().max(20).optional().or(z.literal("")),
  tags: z.string().max(500).optional().or(z.literal("")),
  audioUrl: z.string().trim().url("URL audio invalide").optional().or(z.literal("")),
  previewUrl: z.string().trim().url("URL preview invalide").optional().or(z.literal("")),
  coverUrl: z.string().trim().url("URL cover invalide").optional().or(z.literal("")),
  downloadUrl: z.string().trim().url("URL téléchargement invalide").optional().or(z.literal("")),
});

export function validateAudioFile(file: File): string | null {
  if (file.size > MAX_AUDIO_SIZE) return `Fichier trop volumineux (max ${MAX_AUDIO_SIZE / 1024 / 1024} MB)`;
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|flac|aac|ogg|m4a|aiff|wma)$/i.test(file.name)) {
    return "Format audio non supporté";
  }
  return null;
}

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_COVER_SIZE) return `Image trop volumineuse (max ${MAX_COVER_SIZE / 1024 / 1024} MB)`;
  if (!file.type.startsWith("image/")) return "Format image invalide";
  return null;
}
