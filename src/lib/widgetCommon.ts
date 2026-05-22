// Shared layout / background / animation envelope for all home widgets.
import type { Variants } from "framer-motion";

export interface WidgetCommon {
  container?: "full" | "wide" | "default" | "narrow"; // max width
  pad_y?: "none" | "sm" | "md" | "lg" | "xl";
  pad_x?: "none" | "sm" | "md";
  bg_kind?: "none" | "color" | "gradient" | "image";
  bg_color?: string;       // HSL "220 80% 25%" or #hex
  bg_color_2?: string;     // for gradient
  bg_image?: string;
  bg_blur?: number;        // px
  bg_overlay?: number;     // 0..100
  anim?: "none" | "fade" | "slide-up" | "slide-left" | "zoom";
  anim_delay?: number;     // ms
}

export const CONTAINER_CLASS: Record<NonNullable<WidgetCommon["container"]>, string> = {
  full: "w-full",
  wide: "max-w-screen-2xl mx-auto px-4",
  default: "container",
  narrow: "max-w-3xl mx-auto px-4",
};

export const PAD_Y: Record<NonNullable<WidgetCommon["pad_y"]>, string> = {
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
