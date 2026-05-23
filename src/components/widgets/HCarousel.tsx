import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal scroll-snap carousel with desktop arrows + fade edges. */
export default function HCarousel({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };
  return (
    <div className="relative group">
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-px-1 px-1 pb-2 -mx-1"
      >
        {children}
      </div>
      {/* Desktop arrows */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Précédent"
        className="hidden md:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 border border-border shadow-md text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Suivant"
        className="hidden md:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 border border-border shadow-md text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
