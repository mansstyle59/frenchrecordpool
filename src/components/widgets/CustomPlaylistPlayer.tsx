import { useEffect, useState } from "react";
import { Play, Pause, ListMusic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer, type PlayerTrack } from "@/contexts/PlayerContext";
import { resolveCover } from "@/lib/trackCover";
import type { PlaylistCardData } from "./PlaylistCard";

export default function CustomPlaylistPlayer({ playlist }: { playlist: PlaylistCardData }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, currentTrack, isPlaying, toggle } = usePlayer();

  useEffect(() => {
    const ids = playlist.track_ids ?? [];
    if (!ids.length) {
      setTracks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("tracks")
      .select("id, title, artist, cover_url, preview_url, audio_url")
      .in("id", ids)
      .eq("status", "approved")
      .then(({ data }) => {
        if (cancelled) return;
        // Preserve original order
        const ordered = ids
          .map((id) => (data ?? []).find((t: any) => t.id === id))
          .filter(Boolean) as any[];
        setTracks(ordered);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playlist.track_ids]);

  const toPlayerTrack = (t: any): PlayerTrack => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    coverUrl: resolveCover(t),
    previewUrl: t.preview_url || t.audio_url,
    isFull: !t.preview_url && !!t.audio_url,
  });

  const handlePlay = (t: any) => {
    const queue = tracks.map(toPlayerTrack);
    if (currentTrack?.id === t.id) toggle();
    else play(toPlayerTrack(t), queue);
  };

  return (
    <div className="flex flex-col max-h-[80vh]">
      <header className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <div
          className="h-14 w-14 rounded-lg grid place-items-center shrink-0 overflow-hidden"
          style={{ background: `hsl(${playlist.accent_color ?? "220 80% 58%"} / 0.25)` }}
        >
          {playlist.cover_url ? (
            <img src={playlist.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ListMusic className="h-7 w-7 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-bold truncate">{playlist.title}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {tracks.length} morceaux · Playlist interne
          </p>
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="p-3 flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 rounded bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-2.5 w-1/3 rounded bg-muted" />
              </div>
            </li>
          ))
        ) : tracks.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">Aucun morceau dans cette playlist.</li>
        ) : (
          tracks.map((t, i) => {
            const isCurrent = currentTrack?.id === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => handlePlay(t)}
                  className={`w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition ${isCurrent ? "bg-primary/5" : ""}`}
                >
                  <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <img
                    src={resolveCover(t)}
                    alt=""
                    className="h-10 w-10 rounded object-cover bg-muted shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isCurrent ? "text-primary" : ""}`}>{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                  </div>
                  <span className="h-9 w-9 rounded-full grid place-items-center bg-primary text-primary-foreground shadow">
                    {isCurrent && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
