import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "frp.recentlyPlayed";
const MAX = 24;
const EVT = "frp:recently-played-changed";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* quota / SSR */
  }
}

/** Record a track id as just played. Persists locally AND, if logged in, on the server. */
export function recordRecentlyPlayed(id: string) {
  if (!id) return;
  // Local cache (instant UI for guests + optimistic for logged in users)
  const cur = read();
  const next = [id, ...cur.filter((x) => x !== id)].slice(0, MAX);
  write(next);
  // Server-side history (fire and forget) for logged-in users
  supabase.auth.getUser().then(({ data }) => {
    const uid = data.user?.id;
    if (!uid) return;
    supabase
      .from("play_history")
      .insert({ user_id: uid, track_id: id })
      .then(() => window.dispatchEvent(new Event(EVT)));
  });
}

async function fetchServerHistory(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("play_history")
    .select("track_id, played_at")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(200);
  if (!data) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data as any[]) {
    if (!seen.has(row.track_id)) {
      seen.add(row.track_id);
      out.push(row.track_id);
      if (out.length >= MAX) break;
    }
  }
  return out;
}

/** Reactive hook returning the list of recently-previewed track ids (server-backed when logged in). */
export function useRecentlyPlayed(): { ids: string[]; clear: () => void } {
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : read()
  );
  const [userId, setUserId] = useState<string | null>(null);

  // Track auth state
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Sync server -> state when logged in; local otherwise
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setIds(read());
      return;
    }
    fetchServerHistory(userId).then((srv) => {
      if (!cancelled) setIds(srv);
    });

    const onChange = () => {
      fetchServerHistory(userId).then((srv) => {
        if (!cancelled) setIds(srv);
      });
    };
    window.addEventListener(EVT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVT, onChange);
    };
  }, [userId]);

  // Local-only listeners for guests
  useEffect(() => {
    if (userId) return;
    const onChange = () => setIds(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [userId]);

  const clear = useCallback(() => {
    write([]);
    if (userId) {
      supabase
        .from("play_history")
        .delete()
        .eq("user_id", userId)
        .then(() => setIds([]));
    }
  }, [userId]);

  return { ids, clear };
}
