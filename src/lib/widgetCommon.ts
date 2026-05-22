// Shared layout / background / animation envelope for all home widgets.
import type { Variants } from "framer-motion";

export type PadSize = "none" | "sm" | "md" | "lg" | "xl";

export interface WidgetCommon {
  container?: "full" | "wide" | "default" | "narrow"; // max width
  /** Legacy uniform Y padding (applied as fallback to top + bottom on every breakpoint). */
  pad_y?: PadSize;
  pad_x?: "none" | "sm" | "md";

  // Responsive top padding (overrides pad_y for that breakpoint when set)
  pad_top_mobile?: PadSize;
  pad_top_tablet?: PadSize;
  pad_top_desktop?: PadSize;
  // Responsive bottom padding
  pad_bottom_mobile?: PadSize;
  pad_bottom_tablet?: PadSize;
  pad_bottom_desktop?: PadSize;

  bg_kind?: "none" | "color" | "gradient" | "image";
  bg_color?: string;       // HSL "220 80% 25%" or #hex
  bg_color_2?: string;     // for gradient
  bg_image?: string;
  bg_blur?: number;        // px
  bg_overlay?: number;     // 0..100
  anim?: "none" | "fade" | "slide-up" | "slide-left" | "zoom";
  anim_delay?: number;     // ms
}

// djcity-like: contenu cadré ~1200-1280px max au centre, marges latérales.
export const CONTAINER_CLASS: Record<NonNullable<WidgetCommon["container"]>, string> = {
  full: "w-full",
  wide: "max-w-[1440px] mx-auto px-4 md:px-6",
  default: "max-w-[1200px] mx-auto px-4 md:px-6",
  narrow: "max-w-3xl mx-auto px-4",
};

/** Legacy uniform Y padding (kept for backward compat & defaults). */
export const PAD_Y: Record<PadSize, string> = {
  none: "py-0",
  sm: "py-4",
  md: "py-8",
  lg: "py-14",
  xl: "py-24",
};

export const PAD_X: Record<NonNullable<WidgetCommon["pad_x"]>, string> = {
  none: "px-0",
  sm: "px-3",
  md: "px-6",
};

/* ── Responsive top / bottom padding scales ────────────────────────── */
/* All literal classes are listed so Tailwind's JIT picks them up.     */

export const PAD_TOP_MOBILE: Record<PadSize, string> = {
  none: "pt-0",  sm: "pt-2",  md: "pt-4",  lg: "pt-8",  xl: "pt-12",
};
export const PAD_TOP_TABLET: Record<PadSize, string> = {
  none: "md:pt-0", sm: "md:pt-4", md: "md:pt-8", lg: "md:pt-12", xl: "md:pt-20",
};
export const PAD_TOP_DESKTOP: Record<PadSize, string> = {
  none: "lg:pt-0", sm: "lg:pt-6", md: "lg:pt-10", lg: "lg:pt-16", xl: "lg:pt-28",
};

export const PAD_BOTTOM_MOBILE: Record<PadSize, string> = {
  none: "pb-0",  sm: "pb-2",  md: "pb-4",  lg: "pb-8",  xl: "pb-12",
};
export const PAD_BOTTOM_TABLET: Record<PadSize, string> = {
  none: "md:pb-0", sm: "md:pb-4", md: "md:pb-8", lg: "md:pb-12", xl: "md:pb-20",
};
export const PAD_BOTTOM_DESKTOP: Record<PadSize, string> = {
  none: "lg:pb-0", sm: "lg:pb-6", md: "lg:pb-10", lg: "lg:pb-16", xl: "lg:pb-28",
};

export const PAD_SIZE_LABEL: Record<PadSize, string> = {
  none: "Aucun", sm: "Petit", md: "Moyen", lg: "Grand", xl: "Très grand",
};

/**
 * Build the responsive Y padding class string for a widget shell.
 * Falls back to legacy `pad_y` (or "none") when a breakpoint is unset.
 */
export function padYClasses(c: WidgetCommon = {}): string {
  const fb: PadSize = c.pad_y ?? "none";
  const top_m = c.pad_top_mobile ?? fb;
  const top_t = c.pad_top_tablet ?? c.pad_top_mobile ?? fb;
  const top_d = c.pad_top_desktop ?? c.pad_top_tablet ?? c.pad_top_mobile ?? fb;
  const bot_m = c.pad_bottom_mobile ?? fb;
  const bot_t = c.pad_bottom_tablet ?? c.pad_bottom_mobile ?? fb;
  const bot_d = c.pad_bottom_desktop ?? c.pad_bottom_tablet ?? c.pad_bottom_mobile ?? fb;
  return [
    PAD_TOP_MOBILE[top_m],   PAD_TOP_TABLET[top_t],   PAD_TOP_DESKTOP[top_d],
    PAD_BOTTOM_MOBILE[bot_m], PAD_BOTTOM_TABLET[bot_t], PAD_BOTTOM_DESKTOP[bot_d],
  ].join(" ");
}

function color(v?: string) {
  if (!v) return "transparent";
  if (/^\d+\s+\d+%\s+\d+%$/.test(v.trim())) return `hsl(${v})`;
  return v;
}

export function bgStyle(c: WidgetCommon = {}): React.CSSProperties {
  if (c.bg_kind === "color") return { background: color(c.bg_color) };
  if (c.bg_kind === "gradient") {
    return { background: `linear-gradient(135deg, ${color(c.bg_color)}, ${color(c.bg_color_2 || c.bg_color)})` };
  }
  if (c.bg_kind === "image" && c.bg_image) {
    return {
      backgroundImage: `url(${c.bg_image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      filter: c.bg_blur ? `blur(0px)` : undefined,
    };
  }
  return {};
}

export const ANIM_VARIANTS: Record<string, Variants> = {
  none: { hidden: {}, show: {} },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.6 } },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  },
  "slide-left": {
    hidden: { opacity: 0, x: 40 },
    show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  },
};
