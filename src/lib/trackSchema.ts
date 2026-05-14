import { z } from "zod";

// Aucune restriction d'upload : tout fichier accepté, pas de limite de taille,
// pas de validation stricte des champs. Seuls le titre et l'artiste restent requis.

export const MAX_AUDIO_SIZE = Number.POSITIVE_INFINITY;
export const MAX_COVER_SIZE = Number.POSITIVE_INFINITY;

export const trackSchema = z.object({
  title: z.string().trim().min(1, "Titre requis"),
  artist: z.string().trim().min(1, "Artiste requis"),
  genre: z.string().optional().or(z.literal("")),
  bpm: z.union([z.string(), z.number()]).optional(),
  musicalKey: z.string().optional().or(z.literal("")),
  version: z.string().optional().or(z.literal("")),
  label: z.string().optional().or(z.literal("")),
  duration: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  audioUrl: z.string().optional().or(z.literal("")),
  previewUrl: z.string().optional().or(z.literal("")),
  coverUrl: z.string().optional().or(z.literal("")),
  downloadUrl: z.string().optional().or(z.literal("")),
});

// Aucune validation : tous les fichiers sont acceptés.
export function validateAudioFile(_file: File): string | null {
  return null;
}

export function validateImageFile(_file: File): string | null {
  return null;
}
