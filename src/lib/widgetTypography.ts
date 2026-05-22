// Shared typography helpers for home widgets — admin-controllable text styles.

export interface WidgetTypo {
  title_size?: number;       // px, applied to h2/h1
  title_font?: string;       // "display" | "body" | custom CSS font stack
  title_weight?: number;     // 400-900
  title_color?: string;      // HSL "220 80% 58%" or any CSS color
  body_size?: number;        // px
  body_font?: string;
  body_color?: string;
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  letter_spacing?: number;   // em * 100 (admin slider 0-20)
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

function color(value?: string) {
  if (!value) return undefined;
  // hsl tokens like "220 80% 58%" -> wrap; raw colors / vars stay as-is
  if (/^\d+\s+\d+%\s+\d+%$/.test(value.trim())) return `hsl(${value})`;
  return value;
}

export function titleStyle(t: WidgetTypo = {}): React.CSSProperties {
  return {
    fontSize: t.title_size ? `${t.title_size}px` : undefined,
    fontFamily: font(t.title_font),
    fontWeight: t.title_weight,
    color: color(t.title_color),
    textAlign: t.align,
    textTransform: t.uppercase ? "uppercase" : undefined,
    letterSpacing: t.letter_spacing != null ? `${t.letter_spacing / 100}em` : undefined,
    lineHeight: 1.1,
  };
}

export function bodyStyle(t: WidgetTypo = {}): React.CSSProperties {
  return {
    fontSize: t.body_size ? `${t.body_size}px` : undefined,
    fontFamily: font(t.body_font),
    color: color(t.body_color),
    textAlign: t.align,
  };
}

export function alignClass(t: WidgetTypo = {}) {
  return t.align === "right" ? "text-right" : t.align === "left" ? "text-left" : "text-center";
}
