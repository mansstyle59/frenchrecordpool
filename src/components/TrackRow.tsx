import { Play, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Track } from "@/data/mockTracks";
import { Badge } from "@/components/ui/badge";

interface TrackRowProps {
  track: Track;
  index?: number;
}

export default function TrackRow({ track, index }: TrackRowProps) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors">
      {/* Index / Play */}
      <div className="w-8 text-center shrink-0">
        <span className="group-hover:hidden text-sm text-muted-foreground">
          {index !== undefined ? index + 1 : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="hidden group-hover:inline-flex h-8 w-8 text-primary"
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>

      {/* Cover */}
      <img
        src={track.coverUrl}
        alt={track.title}
        className="h-10 w-10 rounded object-cover shrink-0"
        loading="lazy"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/tracks/${track.id}`}
          className="text-sm font-medium truncate block hover:text-primary transition-colors"
        >
          {track.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Version Badge */}
      <Badge variant="outline" className="hidden sm:inline-flex text-xs shrink-0">
        {track.version}
      </Badge>

      {/* Genre */}
      <span className="hidden md:block text-xs text-muted-foreground w-24 truncate">
        {track.genre}
      </span>

      {/* BPM */}
      <span className="hidden lg:block text-xs text-muted-foreground w-12 text-center">
        {track.bpm}
      </span>

      {/* Key */}
      <span className="hidden lg:block text-xs text-muted-foreground w-10 text-center">
        {track.musicalKey}
      </span>

      {/* Duration */}
      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
        {track.duration}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
          <Heart className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
