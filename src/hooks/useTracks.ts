import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number | null;
  musical_key: string | null;
  version: string | null;
  label: string | null;
  release_date: string | null;
  duration: string | null;
  cover_url: string | null;
  audio_url: string | null;
  preview_url: string | null;
  download_url?: string | null;
  acapella_url?: string | null;
  instrumental_url?: string | null;
  tags: string[] | null;
  downloads: number | null;
  created_at: string;
  status?: string | null;
  submitted_by?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
}

export function useTracks() {
  return useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbTrack[];
    },
  });
}

export function useTrack(id: string | undefined) {
  return useQuery({
    queryKey: ["track", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as DbTrack;
    },
    enabled: !!id,
  });
}

export function useMyTracks(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-tracks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("submitted_by", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbTrack[];
    },
  });
}

export function usePendingTracks() {
  return useQuery({
    queryKey: ["pending-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbTrack[];
    },
  });
}

/**
 * Related tracks for a given track: other versions (same title+artist),
 * remixes (same title, version != Original), and similar (same genre, BPM ±5).
 */
export function useRelatedTracks(track: DbTrack | null | undefined) {
  return useQuery({
    queryKey: ["related-tracks", track?.id, track?.title, track?.artist, track?.genre, track?.bpm],
    enabled: !!track,
    queryFn: async () => {
      if (!track) return { versions: [], remixes: [], similar: [] };
      const titleNorm = track.title.trim();
      const minBpm = track.bpm ? track.bpm - 5 : 0;
      const maxBpm = track.bpm ? track.bpm + 5 : 999;

      const [versionsRes, remixesRes, similarRes] = await Promise.all([
        supabase.from("tracks").select("*").eq("status", "approved").eq("title", titleNorm).neq("id", track.id).limit(8),
        supabase.from("tracks").select("*").eq("status", "approved").ilike("title", `%${titleNorm}%`).neq("version", "Original").neq("id", track.id).limit(8),
        track.genre
          ? supabase.from("tracks").select("*").eq("status", "approved").eq("genre", track.genre).gte("bpm", minBpm).lte("bpm", maxBpm).neq("id", track.id).order("downloads", { ascending: false }).limit(12)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const versions = ((versionsRes.data ?? []) as DbTrack[]);
      const remixIds = new Set(versions.map((v) => v.id));
      const remixes = ((remixesRes.data ?? []) as DbTrack[]).filter((r) => !remixIds.has(r.id));
      const exclude = new Set([track.id, ...versions.map((v) => v.id), ...remixes.map((r) => r.id)]);
      const similar = ((similarRes.data ?? []) as DbTrack[]).filter((s) => !exclude.has(s.id));
      return { versions, remixes, similar };
    },
  });
}

export function usePopularTracks(limit = 8) {
  return useQuery({
    queryKey: ["popular-tracks", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("status", "approved")
        .order("downloads", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as DbTrack[];
    },
  });
}

