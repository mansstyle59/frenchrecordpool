import { supabase } from "@/integrations/supabase/client";
import type { TrackFormData } from "@/components/TrackForm";

async function uploadFile(file: File, bucket: string, path: string, step: string): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) {
    const e: any = new Error(`Upload ${step} échoué : ${error.message}`);
    e.step = step;
    throw e;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export interface BuildTrackPayloadOptions {
  data: TrackFormData;
  existingTrackId?: string;
  existing?: {
    cover_url: string | null;
    audio_url: string | null;
    preview_url: string | null;
    download_url?: string | null;
    acapella_url?: string | null;
    instrumental_url?: string | null;
  };
}

export async function buildTrackPayload({ data, existingTrackId, existing }: BuildTrackPayloadOptions) {
  const trackId = existingTrackId ?? crypto.randomUUID();
  let coverUrl: string | null = existing?.cover_url ?? null;
  let audioUrl: string | null = existing?.audio_url ?? null;
  let previewUrl: string | null = existing?.preview_url ?? null;

  if (data.coverFile) coverUrl = await uploadFile(data.coverFile, "track-covers", `${trackId}/cover.${data.coverFile.name.split(".").pop()}`, "pochette");
  else if (data.coverUrl) coverUrl = data.coverUrl;
  if (data.audioFile) audioUrl = await uploadFile(data.audioFile, "track-audio", `${trackId}/audio.${data.audioFile.name.split(".").pop()}`, "audio");
  else if (data.audioUrl) audioUrl = data.audioUrl;
  if (data.previewFile) previewUrl = await uploadFile(data.previewFile, "track-previews", `${trackId}/preview.${data.previewFile.name.split(".").pop()}`, "preview");
  else if (data.previewUrl) previewUrl = data.previewUrl;

  return {
    id: trackId,
    title: data.title,
    artist: data.artist,
    genre: data.genre || "",
    bpm: data.bpm || null,
    musical_key: data.musicalKey || null,
    version: data.version || "Original",
    label: data.label || null,
    duration: data.duration || null,
    tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    cover_url: coverUrl,
    audio_url: audioUrl,
    preview_url: previewUrl,
    download_url: data.downloadUrl || existing?.download_url || null,
    acapella_url: data.acapellaUrl || existing?.acapella_url || null,
    instrumental_url: data.instrumentalUrl || existing?.instrumental_url || null,
  };
}

export function friendlySubmitError(err: any): string {
  const msg = err?.message || "";
  if (/not_owner/i.test(msg)) return "Tu n'es pas le propriétaire de ce morceau.";
  if (/not_editable/i.test(msg)) return "Ce morceau ne peut plus être édité (déjà approuvé). Une demande de modification est à créer.";
  if (/not_authenticated/i.test(msg)) return "Session expirée. Reconnecte-toi puis réessaie.";
  if (err?.step) return `Échec à l'étape « ${err.step} » : ${msg}. Vérifie ton fichier et réessaie.`;
  if (/row-level security/i.test(msg)) return "Permission refusée par le serveur.";
  return msg || "Une erreur est survenue.";
}
