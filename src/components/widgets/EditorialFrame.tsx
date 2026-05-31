import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  /** Decorative wordmark printed faintly on the right side */
  wordmark?: string;
  /** Tighter padding for dense list widgets */
  dense?: boolean;
}

/**
 * Shared editorial frame matching the Hero direction ("Éditorial haut contraste"):
 * - Soft ambient gradient blobs (primary + accent)
 * - Dot-grid overlay
 * - Accent corner square (top-right)
 * - Subtle border + backdrop-blur surface using semantic tokens
 *
 * Pure presentation — no business logic, no token overrides.
 */
export default function EditorialFrame({ children, wordmark, dense }: Props) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-border/60 bg-card/30 backdrop-blur-xl ${
        dense ? "p-5 md:p-7" : "p-6 md:p-10"
      }`}
    >
      {/* Ambient blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-[120px]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-[120px]"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Accent corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-4 right-4 h-2 w-2 bg-accent"
      />

      {/* Vertical wordmark */}
      {wordmark && (
        <div
          aria-hidden
          className="hidden lg:block pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 origin-center font-display text-foreground/[0.05] text-6xl tracking-[0.5em] select-none whitespace-nowrap"
        >
          {wordmark}
        </div>
      )}

      <div className="relative">{children}</div>
    </section>
  );
}
