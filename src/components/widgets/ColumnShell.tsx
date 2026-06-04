// Public renderer for a Section's Column.
// Wraps a vertical stack of child widgets with optional background, padding,
// vertical alignment and entrance animation — same vocabulary as WidgetCommon.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ANIM_VARIANTS, PAD_X, padYClasses, bgStyle, shellStyle, alignYClass,
  type WidgetCommon,
} from "@/lib/widgetCommon";

export interface ColumnConfig {
  common?: WidgetCommon;
  /** Override du span de colonne (1..4) — sinon hérite du layout de section. */
  span?: 1 | 2 | 3 | 4;
  /** Espacement vertical entre widgets enfants. */
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}

const GAP_CLASS: Record<NonNullable<ColumnConfig["gap"]>, string> = {
  none: "gap-0",
  sm: "gap-2 md:gap-3",
  md: "gap-4 md:gap-6",
  lg: "gap-6 md:gap-10",
  xl: "gap-8 md:gap-16",
};

interface Props {
  config: ColumnConfig;
  children: ReactNode;
  /** Classe de span injectée par la Section (col-span-* responsive). */
  spanClass: string;
  preview?: boolean;
}

export default function ColumnShell({ config, children, spanClass, preview = false }: Props) {
  const common = config.common ?? {};
  const gap = config.gap ?? "md";
  const padY = padYClasses(common);
  const padX = PAD_X[common.pad_x ?? "none"];
  const hasBg = common.bg_kind && common.bg_kind !== "none";
  const animKey = common.anim ?? "none";
  const variants = ANIM_VARIANTS[animKey] || ANIM_VARIANTS.fade;
  const animate = animKey !== "none";

  return (
    <motion.div
      variants={animate ? variants : undefined}
      initial={animate ? "hidden" : false}
      whileInView={animate ? "show" : undefined}
      viewport={{ once: true, amount: 0.1 }}
      transition={common.anim_delay ? { delay: common.anim_delay / 1000 } : undefined}
      className={`${spanClass} relative ${padY} ${padX} ${alignYClass(common)} ${hasBg ? "overflow-hidden rounded-xl" : ""} min-w-0`}
      style={shellStyle(common)}
    >
      {hasBg && (
        <>
          <div className="absolute inset-0 -z-0 rounded-xl" style={bgStyle(common)} />
          {common.bg_overlay ? (
            <div
              className="absolute inset-0 -z-0 rounded-xl bg-background"
              style={{ opacity: (common.bg_overlay ?? 0) / 100 }}
            />
          ) : null}
        </>
      )}
      <div className={`relative z-10 flex flex-col ${GAP_CLASS[gap]}`}>
        {children}
      </div>
    </motion.div>
  );
}
