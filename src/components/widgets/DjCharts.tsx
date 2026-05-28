import { useEffect, useState } from "react";
import { Trophy, ArrowUp, ArrowDown, Minus, Sparkles, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { resolveCover } from "@/lib/trackCover";
import { usePlayer } from "@/contexts/PlayerContext";
import WidgetHeader from "./WidgetHeader";
import WidgetSkeleton from "./WidgetSkeleton";

type Row = {
  id: string; title: string; artist: string; genre: string;
  cover_url: string | null; preview_url: string | null; audio_url: string | null;
  bpm: number | null; musical_key: string | null;
  current_count: number; previous_count: number;
  current_rank: number; previous_rank: number | null;
};

function Delta({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev == null) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-bold uppercase tracking-wider">
        <Sparkles className="h-2.5 w-2.5" /> New
      </span>
    );
  }
  const diff = prev - cur; // positive = climbed up
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px] font-mono">
        <Minus className="h-3 w-3" />0
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-bold ${up ? "text-primary" : "text-destructive"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(diff)}
    </span>
  );
}

export default function DjCharts({ config }: { config: any }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = Math.min(config.limit || 10, 20);
  const { play, currentTrack, isPlaying, toggle } = usePlayer();

  useEffect(() => {
    setLoading(true);
    supabase.rpc("dj_charts_weekly", { _limit: limit }).then(({ data }) => {
      setRows((data as Row[]) || []);
      setLoading(false);
    });
  }, [limit]);

  return (
    <div>
      <WidgetHeader
        icon={Trophy}
        eyebrow="Cette semaine"
        title={config.title || "DJ Charts"}
        subtitle={config.subtitle}
        seeAllUrl={config.see_all_url || "/popular"}
        typo={config.typo}
      />

      {loading ? (
        <WidgetSkeleton variant="list" count={Math.min(limit, 6)} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Pas encore de téléchargements cette semaine.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden divide-y divide-border/40">
          {rows.map((r, i) => {
            const isCurrent = currentTrack?.id === r.id;
            const playable = r.preview_url || r.audio_url;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="grid grid-cols-[36px_48px_minmax(0,1fr)_auto_auto] gap-3 items-center px-3 sm:px-4 py-2.5 hover:bg-primary/5 transition-colors group"
              >
                <div className="font-display text-2xl font-black text-muted-foreground/60 group-hover:text-primary transition-colors text-center leading-none">
                  {String(r.current_rank).padStart(2, "0")}
                </div>
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                  <img src={resolveCover(r as any)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {playable && (
                    <button
                      onClick={() =>
                        isCurrent
                          ? toggle()
                          : play({
                              id: r.id,
                              title: r.title,
                              artist: r.artist,
                              coverUrl: resolveCover(r as any),
                              previewUrl: r.preview_url || r.audio_url,
                            })
                      }
                      className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="h-4 w-4 text-foreground" />
                      ) : (
                        <Play className="h-4 w-4 text-foreground" />
                      )}
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <Link to={`/track/${r.id}`} className="block font-semibold text-sm truncate hover:text-primary transition-colors">
                    {r.title}
                  </Link>
                  <div className="text-xs text-muted-foreground truncate">{r.artist}</div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-[10px] text-muted-foreground font-mono leading-tight">
                  {r.bpm ? <span>{r.bpm} BPM</span> : null}
                  {r.musical_key ? <span>{r.musical_key}</span> : null}
                </div>
                <Delta cur={r.current_rank} prev={r.previous_rank} />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
