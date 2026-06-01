import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  /** Decorative wordmark printed faintly on the right side */
  wordmark?: string;
  /** Tighter padding for dense list widgets */
  dense?: boolean;
  /** Optional section number printed top-left as an editorial folio (e.g. "01", "02"). */
  sectionNumber?: string;
  /** Optional kicker shown next to the section number (e.g. "RUBRIQUE"). */
  kicker?: string;
}

/**
 * Shared editorial frame matching the Hero direction ("Éditorial haut contraste"):
 * - Soft ambient gradient blobs (primary + accent)
 * - Dot-grid overlay
 * - Top-left folio (section number + kicker) — magazine-style
 * - Accent corner square (top-right)
 * - Faint vertical wordmark on the right
 * - Subtle border + backdrop-blur surface using semantic tokens
 *
 * Pure presentation — no business logic, no token overrides.
 */
export default function EditorialFrame({ children, wordmark, dense, sectionNumber, kicker }: Props) {
  // Derive a stable folio from the wordmark when no explicit number is given.
  const folio =
    sectionNumber ??
    (wordmark
      ? String(
          (Array.from(wordmark).reduce((a, c) => a + c.charCodeAt(0), 0) % 24) + 1
        ).padStart(2, "0")
      : null);

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
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top frame rule */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
      />

      {/* Top-left editorial folio */}
      {folio && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-4 left-5 md:top-5 md:left-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/45 select-none"
        >
          <span className="font-display text-base md:text-lg leading-none text-accent">N°{folio}</span>
          <span className="h-px w-6 bg-foreground/20" />
          <span>{kicker ?? "RUBRIQUE"}</span>
        </div>
      )}

      {/* Accent corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-4 right-4 h-2.5 w-2.5 bg-accent shadow-[0_0_18px_hsl(var(--accent)/0.6)]"
      />

      {/* Vertical wordmark */}
      {wordmark && (
        <div
          aria-hidden
          className="hidden lg:block pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 rotate-90 origin-center font-display text-foreground/[0.06] text-7xl tracking-[0.5em] select-none whitespace-nowrap"
        >
          {wordmark}
        </div>
      )}

      <div className={`relative ${folio ? "pt-7 md:pt-8" : ""}`}>{children}</div>
    </section>
  );
}
