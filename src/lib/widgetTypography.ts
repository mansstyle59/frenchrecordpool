// Shared typography helpers for home widgets — admin-controllable text styles.

export interface WidgetTypo {
  // Title
  title_size?: number;       // px
  title_font?: string;       // "display" | "body" | "serif" | "mono" | custom
  title_weight?: number;     // 400-900
  title_color?: string;      // HSL "220 80% 58%" | #hex | css var
  title_gradient?: boolean;  // render title as primary→accent gradient
  title_gradient_from?: string; // optional override (HSL or hex)
  title_gradient_to?: string;
  // Body / subtitle
  body_size?: number;
  body_font?: string;
  body_color?: string;
  // Eyebrow (small uppercase label above title)
  eyebrow_text?: string;     // overrides the default eyebrow shipped by the widget
  eyebrow_color?: string;
  eyebrow_hidden?: boolean;
  // Accent bar (left of header)
  accent_color?: string;     // HSL or hex; defaults to primary→accent gradient
  accent_hidden?: boolean;
  // Layout
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  letter_spacing?: number;   // em * 100
}

const FONT_MAP: Record<string, string> = {
  display: "var(--font-display, 'Space Grotesk', sans-serif)",
  body: "var(--font-body, 'DM Sans', sans-serif)",
  serif: "'Instrument Serif', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

function font(value?: string) {
  if (!value) return undefined;
  return FONT_MAP[value] ?? value;
}

/** Accept HSL tokens ("220 80% 58%"), hex, var(--x), or any raw CSS color. */
export function color(value?: string) {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d+\s+\d+%\s+\d+%$/.test(v)) return `hsl(${v})`;
  return v;
}

export function titleStyle(t: WidgetTypo = {}): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: t.title_size ? `${t.title_size}px` : undefined,
    fontFamily: font(t.title_font),
    fontWeight: t.title_weight,
    textAlign: t.align,
    textTransform: t.uppercase ? "uppercase" : undefined,
    letterSpacing: t.letter_spacing != null ? `${t.letter_spacing / 100}em` : undefined,
    lineHeight: 1.1,
  };
  if (t.title_gradient) {
    const from = color(t.title_gradient_from) || "hsl(var(--primary))";
    const to = color(t.title_gradient_to) || "hsl(var(--accent))";
    return {
      ...base,
      backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    };
  }
  return { ...base, color: color(t.title_color) };
}

export function bodyStyle(t: WidgetTypo = {}): React.CSSProperties {
  return {
    fontSize: t.body_size ? `${t.body_size}px` : undefined,
    fontFamily: font(t.body_font),
    color: color(t.body_color),
    textAlign: t.align,
  };
}

export function eyebrowStyle(t: WidgetTypo = {}): React.CSSProperties {
  return { color: color(t.eyebrow_color) };
}

export function accentBarStyle(t: WidgetTypo = {}): React.CSSProperties {
  if (t.accent_color) {
    return { background: color(t.accent_color), backgroundImage: "none" };
  }
  return {};
}

export function alignClass(t: WidgetTypo = {}) {
  return t.align === "right" ? "text-right" : t.align === "left" ? "text-left" : "text-center";
}
