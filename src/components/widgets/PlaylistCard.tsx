import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ListMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PlaylistEmbedSheet from "./PlaylistEmbedSheet";
import { SOURCE_LABEL, type PlaylistSource } from "@/lib/playlistEmbed";

export interface PlaylistCardData {
  id: string;
  title: string;
  description?: string | null;
  source: PlaylistSource;
  source_url?: string | null;
  embed_id?: string | null;
  cover_url?: string | null;
  accent_color?: string | null;
  tags?: string[] | null;
  track_ids?: string[] | null;
}

const SOURCE_BG: Record<PlaylistSource, string> = {
  spotify: "bg-[#1DB954] text-black",
  deezer: "bg-[#a238ff] text-white",
  soundcloud: "bg-[#ff5500] text-white",
  custom: "bg-primary text-primary-foreground",
};

export default function PlaylistCard({ playlist, className = "" }: { playlist: PlaylistCardData; className?: string }) {
  const [open, setOpen] = useState(false);
  const accent = playlist.accent_color || "220 80% 58%";

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className={`group relative text-left rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-xl hover:border-primary/40 transition-all ${className}`}
        aria-label={`Écouter la playlist ${playlist.title}`}
      >
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{ background: `linear-gradient(135deg, hsl(${accent} / 0.85), hsl(${accent} / 0.35))` }}
        >
          {playlist.cover_url ? (
            <img
              src={playlist.cover_url}
              alt={playlist.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <ListMusic className="h-16 w-16 text-white/80" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${SOURCE_BG[playlist.source]}`}
          >
            {SOURCE_LABEL[playlist.source]}
          </span>
          <div className="absolute bottom-3 right-3 h-11 w-11 rounded-full bg-white text-black grid place-items-center shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-110 transition">
            <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
          </div>
          {playlist.source === "custom" && playlist.track_ids?.length ? (
            <span className="absolute bottom-3 left-3 text-xs font-semibold text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur">
              {playlist.track_ids.length} tracks
            </span>
          ) : null}
        </div>
        <div className="p-3">
          <h3 className="font-display font-bold text-sm md:text-base truncate">{playlist.title}</h3>
          {playlist.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{playlist.description}</p>
          ) : null}
          {playlist.tags?.length ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {playlist.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </motion.button>

      <PlaylistEmbedSheet open={open} onOpenChange={setOpen} playlist={playlist} />
    </>
  );
}
