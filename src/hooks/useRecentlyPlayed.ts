import { useCallback, useEffect, useState } from "react";

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

/** Record a track id as just played (dedup, most-recent first). Call from PlayerProvider. */
export function recordRecentlyPlayed(id: string) {
  if (!id) return;
  const cur = read();
  const next = [id, ...cur.filter((x) => x !== id)].slice(0, MAX);
  write(next);
}

/** Reactive hook returning the list of recently-previewed track ids. */
export function useRecentlyPlayed(): { ids: string[]; clear: () => void } {
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : read()
  );

  useEffect(() => {
    const onChange = () => setIds(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const clear = useCallback(() => {
    write([]);
  }, []);

  return { ids, clear };
}
