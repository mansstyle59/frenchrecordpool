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
  tags: string[] | null;
  downloads: number | null;
  created_at: string;
}

export function useTracks() {
  return useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
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
