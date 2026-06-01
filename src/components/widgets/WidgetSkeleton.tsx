/**
 * Reusable loading skeletons for HomePage widgets.
 * Editorial direction: dashed eyebrow, shimmer sweep, semantic tokens only.
 */
interface Props {
  variant?: "list" | "grid" | "carousel" | "banner" | "tracks" | "charts" | "artists";
  count?: number;
}

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`widget-shimmer rounded ${className}`} />
);

export default function WidgetSkeleton({ variant = "list", count = 6 }: Props) {
  if (variant === "banner") {
    return (
      <div className="widget-shimmer rounded-3xl border border-border/60 h-44 md:h-56" />
    );
  }

  if (variant === "carousel" || variant === "artists") {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="shrink-0 w-32 md:w-40 space-y-2">
            <div className="widget-shimmer aspect-square rounded-2xl border border-border/40" />
            <Bar className="h-3 w-3/4" />
            <Bar className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="widget-shimmer aspect-[4/3] rounded-2xl border border-border/40"
          />
        ))}
      </div>
    );
  }

  if (variant === "tracks") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 p-3 rounded-2xl border border-border/40 bg-card/30"
          >
            <div className="widget-shimmer h-24 w-24 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Bar className="h-3 w-2/3" />
              <Bar className="h-2.5 w-1/3" />
              <div className="flex gap-1.5 pt-2">
                <Bar className="h-4 w-12" />
                <Bar className="h-4 w-10" />
                <Bar className="h-4 w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "charts") {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/30 divide-y divide-border/40 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-[36px_48px_minmax(0,1fr)_auto] gap-3 items-center px-3 sm:px-4 py-2.5">
            <div className="font-display text-2xl font-black text-muted-foreground/30 text-center tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="widget-shimmer h-12 w-12 rounded-md" />
            <div className="space-y-1.5">
              <Bar className="h-3 w-1/2" />
              <Bar className="h-2.5 w-1/3" />
            </div>
            <Bar className="h-3 w-8" />
          </div>
        ))}
      </div>
    );
  }

  // default: list
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 divide-y divide-border/40 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="widget-shimmer h-14 w-14 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-2.5 w-1/4" />
          </div>
          <Bar className="h-2.5 w-8" />
        </div>
      ))}
    </div>
  );
}
