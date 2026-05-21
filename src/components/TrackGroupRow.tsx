import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import TrackRow from "./TrackRow";
import { Badge } from "@/components/ui/badge";
import type { TrackGroup } from "@/lib/groupTracks";

interface Props {
  group: TrackGroup;
  index: number;
}

export default function TrackGroupRow({ group, index }: Props) {
  const [open, setOpen] = useState(false);
  const count = group.variants.length;
  const hasVariants = count > 1;

  return (
    <div className="border-b border-border/40 last:border-0">
      <div className="relative">
        <TrackRow track={group.primary} index={index} />
        {hasVariants && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="absolute right-[120px] top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider transition-colors"
            aria-label={open ? "Masquer les versions" : "Voir les versions"}
          >
            <Layers className="h-3 w-3" />
            <span>{count - 1} version{count - 1 > 1 ? "s" : ""}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {hasVariants && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex items-center gap-2 px-4 py-2 w-full text-left text-[11px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/5 transition-colors"
        >
          <Layers className="h-3 w-3" />
          {count - 1} autre{count - 1 > 1 ? "s" : ""} version{count - 1 > 1 ? "s" : ""}
          <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {open && hasVariants && (
        <div className="bg-secondary/20 border-l-2 border-primary/40 ml-4">
          {group.variants.slice(1).map((v) => (
            <div key={v.id} className="pl-2">
              <TrackRow track={v} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
