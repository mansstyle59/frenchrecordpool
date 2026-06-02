// Section + Column public renderers (phase 1 du Home Builder hiérarchique).
// Une Section est une rangée plein-largeur avec un grid CSS configurable ;
// chaque Colonne reçoit ses widgets enfants empilés verticalement.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ANIM_VARIANTS, CONTAINER_CLASS, PAD_X, padYClasses, bgStyle,
  containerStyle, shellStyle, alignYClass,
  type WidgetCommon,
} from "@/lib/widgetCommon";

export type SectionLayout =
  | "1"          // 1 colonne pleine
  | "1-1"        // 2 colonnes égales
  | "1-1-1"      // 3 colonnes égales
  | "1-1-1-1"    // 4 colonnes égales
  | "2-1"        // 2/3 + 1/3
  | "1-2"        // 1/3 + 2/3
  | "1-1-2"      // 1/4 + 1/4 + 2/4
  | "2-1-1";     // 2/4 + 1/4 + 1/4

export interface SectionConfig {
  layout?: SectionLayout;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  /** Niveau de breakpoint où les colonnes s'empilent (mobile). */
  stack_at?: "md" | "lg";
  common?: WidgetCommon;
}

const GAP_CLASS: Record<NonNullable<SectionConfig["gap"]>, string> = {
  none: "gap-0",
  sm: "gap-2 md:gap-3",
  md: "gap-4 md:gap-6",
  lg: "gap-6 md:gap-10",
  xl: "gap-8 md:gap-16",
};

/** Génère les classes Tailwind d'un grid à partir du layout. */
export function gridClassesForLayout(layout: SectionLayout, stackAt: "md" | "lg" = "md"): {
  cols: string;
  spans: string[];
} {
  const bp = stackAt === "lg" ? "lg" : "md";
  switch (layout) {
    case "1":
      return { cols: "grid-cols-1", spans: ["col-span-1"] };
    case "1-1":
      return { cols: `grid-cols-1 ${bp}:grid-cols-2`, spans: ["col-span-1", "col-span-1"] };
    case "1-1-1":
      return { cols: `grid-cols-1 ${bp}:grid-cols-3`, spans: ["col-span-1", "col-span-1", "col-span-1"] };
    case "1-1-1-1":
      return { cols: `grid-cols-1 sm:grid-cols-2 ${bp}:grid-cols-4`, spans: ["col-span-1", "col-span-1", "col-span-1", "col-span-1"] };
    case "2-1":
      return { cols: `grid-cols-1 ${bp}:grid-cols-3`, spans: [`col-span-1 ${bp}:col-span-2`, "col-span-1"] };
    case "1-2":
      return { cols: `grid-cols-1 ${bp}:grid-cols-3`, spans: ["col-span-1", `col-span-1 ${bp}:col-span-2`] };
    case "1-1-2":
      return { cols: `grid-cols-1 ${bp}:grid-cols-4`, spans: ["col-span-1", "col-span-1", `col-span-1 ${bp}:col-span-2`] };
    case "2-1-1":
      return { cols: `grid-cols-1 ${bp}:grid-cols-4`, spans: [`col-span-1 ${bp}:col-span-2`, "col-span-1", "col-span-1"] };
    default:
      return { cols: "grid-cols-1", spans: ["col-span-1"] };
  }
}

interface SectionShellProps {
  config: SectionConfig;
  /** Une entrée = le contenu d'une colonne (déjà rendu en JSX, empilé). */
  columns: ReactNode[];
  preview?: boolean;
}

/**
 * Section publique : wrapper full-width avec background/padding/animation
 * et un grid CSS qui place les colonnes selon `layout`.
 * Compatible avec WidgetCommon (mêmes contrôles que les widgets standards).
 */
export default function SectionShell({ config, columns, preview = false }: SectionShellProps) {
  const common = config.common ?? {};
  const layout = config.layout ?? "1";
  const gap = config.gap ?? "md";
  const stackAt = config.stack_at ?? "md";
  const { cols, spans } = gridClassesForLayout(layout, stackAt);

  const containerKey = (common.container ?? "default") as keyof typeof CONTAINER_CLASS;
  const padY = padYClasses(common);
  const padX = PAD_X[common.pad_x ?? "none"];

  const hasBg = common.bg_kind && common.bg_kind !== "none";
  const animKey = common.anim ?? "fade";
  const variants = ANIM_VARIANTS[animKey] || ANIM_VARIANTS.fade;

  // S'assure d'avoir autant de slots que de colonnes attendues
  const expected = spans.length;
  const padded: ReactNode[] = [];
  for (let i = 0; i < expected; i++) padded.push(columns[i] ?? null);

  return (
    <motion.section
      variants={variants}
      initial={animKey === "none" ? false : "hidden"}
      whileInView={animKey === "none" ? undefined : "show"}
      viewport={{ once: true, amount: 0.1 }}
      transition={common.anim_delay ? { delay: common.anim_delay / 1000 } : undefined}
      className={`relative ${padY} ${alignYClass(common)} ${hasBg ? "overflow-hidden" : ""}`}
      style={shellStyle(common)}
      data-section-layout={layout}
    >
      {hasBg && (
        <>
          <div className="absolute inset-0 -z-0" style={bgStyle(common)} />
          {common.bg_overlay ? (
            <div
              className="absolute inset-0 -z-0 bg-background"
              style={{ opacity: (common.bg_overlay ?? 0) / 100 }}
            />
          ) : null}
        </>
      )}
      <div
        className={`${CONTAINER_CLASS[containerKey]} ${padX} relative z-10`}
        style={containerStyle(common)}
      >
        <div className={`grid ${cols} ${GAP_CLASS[gap]}`}>
          {padded.map((col, i) => (
            <div key={i} className={`${spans[i]} flex flex-col gap-4 md:gap-6 min-w-0`}>
              {col}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
