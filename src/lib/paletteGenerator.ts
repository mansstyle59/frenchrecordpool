// Palette harmonies + auto dark mode derivation.
// Input/output use the CSS HSL string format: "H S% L%".

export type Harmony = "analogous" | "complementary" | "triadic" | "monochrome" | "split";

function parseHsl(hsl: string): [number, number, number] {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return [220, 75, 45];
  return [parseFloat(m[1]) % 360, parseFloat(m[2]), parseFloat(m[3])];
}

const fmt = (h: number, s: number, l: number) =>
  `${Math.round(((h % 360) + 360) % 360)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(Math.max(0, Math.min(100, l)))}%`;

export function harmonize(baseHsl: string, harmony: Harmony): { primary: string; accent: string } {
  const [h, s, l] = parseHsl(baseHsl);
  const primary = fmt(h, s, l);
  switch (harmony) {
    case "analogous":     return { primary, accent: fmt(h + 30, s, l) };
    case "complementary": return { primary, accent: fmt(h + 180, s, l) };
    case "triadic":       return { primary, accent: fmt(h + 120, s, l) };
    case "split":         return { primary, accent: fmt(h + 150, s, l) };
    case "monochrome":    return { primary, accent: fmt(h, Math.max(20, s - 10), Math.min(85, l + 18)) };
  }
}

// Derive a coherent dark variant of an HSL (raise lightness for accents, lower for bg).
export function deriveDark(role: "primary" | "accent" | "background" | "foreground", lightHsl: string): string {
  const [h, s, l] = parseHsl(lightHsl);
  switch (role) {
    case "primary":    return fmt(h, Math.min(90, s + 5), Math.min(70, Math.max(55, l + 12)));
    case "accent":     return fmt(h, Math.min(90, s + 5), Math.min(72, Math.max(58, l + 14)));
    case "background": return fmt(h, Math.min(40, s * 0.4), 8);
    case "foreground": return fmt(h, Math.min(25, s * 0.3), 95);
  }
}

export const HARMONY_LABELS: Record<Harmony, string> = {
  analogous: "Analogue",
  complementary: "Complémentaire",
  triadic: "Triadique",
  split: "Split-complémentaire",
  monochrome: "Monochrome",
};
