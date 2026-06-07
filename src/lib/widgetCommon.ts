// Shared layout / background / animation envelope for all home widgets.
import type { Variants } from "framer-motion";

export type PadSize = "none" | "sm" | "md" | "lg" | "xl";

export interface WidgetCommon {
  container?: "full" | "wide" | "default" | "narrow"; // max width preset
  /** Custom width override in px (wins over container preset when set). */
  max_width_px?: number;
  /** Minimum height in px (responsive: applied via inline style). */
  min_height_px?: number;
  /** Minimum height in viewport units (e.g. 60 = 60vh). When both set, px wins. */
  min_height_vh?: number;
  /** Vertical alignment of content inside the shell when min-height is set. */
  align_y?: "start" | "center" | "end";

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

/** Build inline style for the inner container (custom width override). */
export function containerStyle(c: WidgetCommon = {}): React.CSSProperties {
  if (c.max_width_px && c.max_width_px > 0) {
    return { maxWidth: `${c.max_width_px}px`, marginLeft: "auto", marginRight: "auto" };
  }
  return {};
}

/** Build inline style for the outer shell (min-height + flex alignment). */
export function shellStyle(c: WidgetCommon = {}): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (c.min_height_px && c.min_height_px > 0) s.minHeight = `${c.min_height_px}px`;
  else if (c.min_height_vh && c.min_height_vh > 0) s.minHeight = `${c.min_height_vh}vh`;
  return s;
}

/** Flex classes when a min-height is defined, to vertically center/align content. */
export function alignYClass(c: WidgetCommon = {}): string {
  if (!c.min_height_px && !c.min_height_vh) return "";
  const map = { start: "items-start", center: "items-center", end: "items-end" } as const;
  return `flex flex-col ${map[c.align_y ?? "center"]}`;
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

/* ──────────────────────────────────────────────────────────────────────
   WidgetItemStyle — apparence des items (cartes / lignes / vignettes)
   à l'intérieur d'un widget. Tous les champs sont optionnels et
   n'altèrent rien tant qu'ils ne sont pas définis (compat 100%).
   ────────────────────────────────────────────────────────────────────── */

export type ItemBgKind = "none" | "color" | "glass" | "gradient";
export type ItemShadow = "none" | "sm" | "md" | "lg" | "xl";
export type ItemHoverLift = "none" | "sm" | "md" | "lg";
export type ItemPadding = "none" | "sm" | "md" | "lg";

export interface WidgetItemStyle {
  bg_kind?: ItemBgKind;
  bg_color?: string;
  bg_color_2?: string;
  bg_opacity?: number;        // 0..100
  border_color?: string;
  border_width?: number;      // px (0..4)
  radius?: number;            // px
  text_color?: string;
  muted_color?: string;
  meta_color?: string;
  hover_bg?: string;
  hover_lift?: ItemHoverLift;
  hover_glow?: boolean;
  shadow?: ItemShadow;
  padding?: ItemPadding;
}

function rawColor(v?: string) {
  if (!v) return undefined;
  const t = v.trim();
  if (/^\d+\s+\d+%\s+\d+%$/.test(t)) return `hsl(${t})`;
  return t;
}

const SHADOW_MAP: Record<ItemShadow, string> = {
  none: "none",
  sm: "0 1px 2px 0 hsl(0 0% 0% / 0.08)",
  md: "0 4px 12px -2px hsl(0 0% 0% / 0.18)",
  lg: "0 10px 24px -6px hsl(0 0% 0% / 0.28)",
  xl: "0 20px 40px -10px hsl(0 0% 0% / 0.40)",
};

export const ITEM_PAD_CLASS: Record<ItemPadding, string> = {
  none: "p-0",
  sm: "p-2",
  md: "p-3 md:p-4",
  lg: "p-4 md:p-6",
};

export const ITEM_HOVER_LIFT_CLASS: Record<ItemHoverLift, string> = {
  none: "",
  sm: "hover:-translate-y-0.5",
  md: "hover:-translate-y-1",
  lg: "hover:-translate-y-1.5",
};

/** Build inline style for an item container from a WidgetItemStyle. */
export function itemStyle(s: WidgetItemStyle = {}): React.CSSProperties {
  const out: React.CSSProperties = {};
  const op = s.bg_opacity != null ? Math.max(0, Math.min(100, s.bg_opacity)) / 100 : undefined;

  if (s.bg_kind === "color") {
    const c = rawColor(s.bg_color);
    if (c) out.background = op != null ? `color-mix(in oklab, ${c} ${op * 100}%, transparent)` : c;
  } else if (s.bg_kind === "gradient") {
    const a = rawColor(s.bg_color) || "transparent";
    const b = rawColor(s.bg_color_2) || a;
    out.background = `linear-gradient(135deg, ${a}, ${b})`;
    if (op != null) out.opacity = op;
  } else if (s.bg_kind === "glass") {
    out.background = `hsl(var(--card) / ${op ?? 0.4})`;
    out.backdropFilter = "blur(14px)";
    (out as any).WebkitBackdropFilter = "blur(14px)";
  }

  if (s.border_width != null) {
    out.borderWidth = `${s.border_width}px`;
    out.borderStyle = "solid";
  }
  const bc = rawColor(s.border_color);
  if (bc) out.borderColor = bc;

  if (s.radius != null) out.borderRadius = `${s.radius}px`;
  const tc = rawColor(s.text_color);
  if (tc) out.color = tc;
  if (s.shadow && s.shadow !== "none") out.boxShadow = SHADOW_MAP[s.shadow];

  return out;
}

/** Tailwind classes (hover lift, padding, transition) for an item. */
export function itemClasses(s: WidgetItemStyle = {}): string {
  const cls: string[] = ["transition-all duration-300"];
  if (s.padding) cls.push(ITEM_PAD_CLASS[s.padding]);
  if (s.hover_lift && s.hover_lift !== "none") cls.push(ITEM_HOVER_LIFT_CLASS[s.hover_lift]);
  if (s.hover_glow) cls.push("hover:shadow-[0_0_24px_hsl(var(--accent)/0.35)]");
  return cls.join(" ");
}

/** CSS vars exposing item palette tokens to children (text/muted/meta). */
export function itemCssVars(s: WidgetItemStyle = {}): React.CSSProperties {
  const v: Record<string, string> = {};
  const t = rawColor(s.text_color);
  const m = rawColor(s.muted_color);
  const mt = rawColor(s.meta_color);
  if (t) v["--w-item-fg"] = t;
  if (m) v["--w-item-muted"] = m;
  if (mt) v["--w-item-meta"] = mt;
  return v as React.CSSProperties;
}

/* ──────────────────────────────────────────────────────────────────────
   WidgetLayout — disposition interne d'un widget de listing.
   ────────────────────────────────────────────────────────────────────── */

export type WidgetLayoutMode = "auto" | "list" | "grid" | "carousel";
export type LayoutGap = "none" | "sm" | "md" | "lg" | "xl";
export type LayoutDensity = "compact" | "cozy" | "comfortable";
export type LayoutAspect = "auto" | "square" | "4:3" | "16:9" | "portrait";

export interface WidgetLayout {
  mode?: WidgetLayoutMode;
  columns_mobile?: number;   // 1..6
  columns_tablet?: number;
  columns_desktop?: number;
  gap?: LayoutGap;
  item_width_px?: number;    // carrousels
  aspect?: LayoutAspect;
  density?: LayoutDensity;
  show_index?: boolean;
  show_meta?: boolean;
  show_actions?: boolean;
}

const COL_M: Record<number, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3",
  4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6",
};
const COL_T: Record<number, string> = {
  1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3",
  4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6",
};
const COL_D: Record<number, string> = {
  1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3",
  4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6",
};
const GAP_CLASS: Record<LayoutGap, string> = {
  none: "gap-0", sm: "gap-2", md: "gap-4", lg: "gap-6", xl: "gap-8",
};

export const LAYOUT_ASPECT_CLASS: Record<LayoutAspect, string> = {
  auto: "",
  square: "aspect-square",
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-video",
  portrait: "aspect-[3/4]",
};

export function gridClasses(l: WidgetLayout = {}, fallback = { m: 2, t: 3, d: 4 }): string {
  const m = l.columns_mobile ?? fallback.m;
  const t = l.columns_tablet ?? fallback.t;
  const d = l.columns_desktop ?? fallback.d;
  return `grid ${COL_M[m] || COL_M[fallback.m]} ${COL_T[t] || COL_T[fallback.t]} ${COL_D[d] || COL_D[fallback.d]} ${gapClass(l)}`;
}

export function gapClass(l: WidgetLayout = {}): string {
  return GAP_CLASS[l.gap ?? "md"];
}

export const LAYOUT_DENSITY_CLASS: Record<LayoutDensity, string> = {
  compact: "[--w-row-py:6px]",
  cozy: "[--w-row-py:10px]",
  comfortable: "[--w-row-py:14px]",
};

