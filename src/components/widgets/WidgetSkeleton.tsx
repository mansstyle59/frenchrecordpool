/** Reusable loading skeletons for widgets. */
export default function WidgetSkeleton({
  variant = "list",
  count = 6,
}: {
  variant?: "list" | "grid" | "carousel" | "banner";
  count?: number;
}) {
  if (variant === "banner") {
    return (
      <div className="rounded-3xl border border-border bg-card/60 animate-pulse h-44 md:h-56" />
    );
  }
  if (variant === "carousel") {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-32 md:w-40 aspect-square rounded-2xl bg-muted/40 animate-pulse"
          />
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
            className="aspect-square rounded-2xl bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    );
  }
  // list
  return (
    <div className="rounded-2xl border border-border bg-card/40 divide-y divide-border/40 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="h-14 w-14 rounded-lg bg-muted/50 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-muted/50 rounded" />
            <div className="h-2.5 w-1/4 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
