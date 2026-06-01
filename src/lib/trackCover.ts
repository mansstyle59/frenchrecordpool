// Cover éditoriale générative — typographie Bebas Neue, palette FRP Tricolore,
// dot-grid et accents géométriques. Cohérente avec la direction éditoriale du site.

// Palette dérivée des tokens (HSL → HEX figés pour SVG inline).
const PALETTES: Array<{ bg: string; bg2: string; accent: string; ink: string }> = [
  { bg: "#0a0e1a", bg2: "#0f1830", accent: "#ef4444", ink: "#f8fafc" }, // navy + red
  { bg: "#0a0e1a", bg2: "#1e3a8a", accent: "#f8fafc", ink: "#f8fafc" }, // navy + white
  { bg: "#1e3a8a", bg2: "#0a0e1a", accent: "#ef4444", ink: "#f8fafc" }, // blue + red
  { bg: "#ef4444", bg2: "#7f1d1d", accent: "#f8fafc", ink: "#f8fafc" }, // red mono
  { bg: "#0a0e1a", bg2: "#1f2937", accent: "#fbbf24", ink: "#f8fafc" }, // night + gold
  { bg: "#f8fafc", bg2: "#e2e8f0", accent: "#ef4444", ink: "#0a0e1a" }, // light + red
  { bg: "#111827", bg2: "#1e3a8a", accent: "#22d3ee", ink: "#f8fafc" }, // deep + cyan
  { bg: "#18181b", bg2: "#3f3f46", accent: "#a3e635", ink: "#f8fafc" }, // mono + lime
];

// 8 motifs géométriques différents — chacun donne une "edition" visuelle unique.
type Motif = "grid" | "stripes" | "circles" | "wave" | "cross" | "halftone" | "rays" | "blocks";
const MOTIFS: Motif[] = ["grid", "stripes", "circles", "wave", "cross", "halftone", "rays", "blocks"];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

function initials(title: string, artist: string): string {
  const src = (artist || title || "FRP").trim();
  const words = src.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function renderMotif(motif: Motif, size: number, accent: string, ink: string, seed: number): string {
  switch (motif) {
    case "grid": {
      // Dot-grid éditorial (signature FRP).
      const step = size / 18;
      let dots = "";
      for (let y = step; y < size; y += step) {
        for (let x = step; x < size; x += step) {
          dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.2" fill="${ink}" opacity="0.18"/>`;
        }
      }
      return dots;
    }
    case "stripes": {
      const count = 12;
      let s = "";
      for (let i = 0; i < count; i++) {
        const y = (i / count) * size;
        s += `<rect x="0" y="${y}" width="${size}" height="${size / count / 2}" fill="${ink}" opacity="${i % 2 ? 0.06 : 0.12}"/>`;
      }
      return s;
    }
    case "circles": {
      const cx = size * (0.3 + (seed % 40) / 100);
      const cy = size * 0.45;
      let s = "";
      for (let i = 6; i > 0; i--) {
        s += `<circle cx="${cx}" cy="${cy}" r="${(i * size) / 14}" fill="none" stroke="${accent}" stroke-width="1.5" opacity="${0.08 + i * 0.04}"/>`;
      }
      return s;
    }
    case "wave": {
      let path = `M0 ${size * 0.55}`;
      const amp = size * 0.06;
      for (let x = 0; x <= size; x += size / 24) {
        const y = size * 0.55 + Math.sin((x / size) * Math.PI * 4 + (seed % 10)) * amp;
        path += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      path += ` L${size} ${size} L0 ${size} Z`;
      return `<path d="${path}" fill="${accent}" opacity="0.22"/>`;
    }
    case "cross": {
      const t = size * 0.06;
      return `<rect x="${(size - t) / 2}" y="0" width="${t}" height="${size}" fill="${ink}" opacity="0.07"/>
        <rect x="0" y="${(size - t) / 2}" width="${size}" height="${t}" fill="${ink}" opacity="0.07"/>`;
    }
    case "halftone": {
      const step = size / 14;
      let s = "";
      for (let y = step / 2; y < size; y += step) {
        for (let x = step / 2; x < size; x += step) {
          const d = Math.hypot(x - size * 0.7, y - size * 0.3);
          const r = Math.max(0.4, step * 0.42 - d / 22);
          s += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${accent}" opacity="0.55"/>`;
        }
      }
      return s;
    }
    case "rays": {
      const cx = size * 0.8;
      const cy = size * 0.2;
      let s = "";
      for (let a = 0; a < 12; a++) {
        const rad = (a / 12) * Math.PI * 2;
        const x2 = cx + Math.cos(rad) * size * 1.2;
        const y2 = cy + Math.sin(rad) * size * 1.2;
        s += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="1" opacity="0.1"/>`;
      }
      return s;
    }
    case "blocks": {
      const n = 5;
      let s = "";
      for (let i = 0; i < n; i++) {
        const w = (size / n) * (0.6 + ((seed >> i) % 5) / 10);
        const h = size * 0.08;
        const y = size * (0.15 + i * 0.14);
        s += `<rect x="0" y="${y}" width="${w}" height="${h}" fill="${i === 2 ? accent : ink}" opacity="${i === 2 ? 0.85 : 0.08}"/>`;
      }
      return s;
    }
  }
}

/**
 * Génère une cover éditoriale SVG (data URL).
 * Style : Bebas Neue + dot-grid + accent géométrique, palette FRP.
 */
export function generateTrackCover(title = "", artist = "", size = 600): string {
  const seed = hash(`${title}|${artist}`);
  const palette = PALETTES[seed % PALETTES.length];
  const motif = MOTIFS[(seed >> 3) % MOTIFS.length];
  const gid = `g${seed.toString(36)}`;
  const t = escapeXml((title || "Untitled").toUpperCase().slice(0, 22));
  const a = escapeXml((artist || "Unknown").toUpperCase().slice(0, 28));
  const ini = initials(title, artist);
  const lineY = size * 0.74;
  const num = String((seed % 99) + 1).padStart(2, "0");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="${gid}bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg}"/>
      <stop offset="100%" stop-color="${palette.bg2}"/>
    </linearGradient>
    <radialGradient id="${gid}glow" cx="20%" cy="15%" r="70%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#${gid}bg)"/>
  <rect width="100%" height="100%" fill="url(#${gid}glow)"/>
  ${renderMotif(motif, size, palette.accent, palette.ink, seed)}

  <!-- Accent corner square (signature FRP) -->
  <rect x="${size - size * 0.06}" y="0" width="${size * 0.06}" height="${size * 0.06}" fill="${palette.accent}"/>

  <!-- Top wordmark -->
  <text x="${size * 0.05}" y="${size * 0.08}"
        font-family="'Barlow', 'Inter', system-ui, sans-serif"
        font-size="${size * 0.026}" font-weight="700" fill="${palette.ink}" opacity="0.6"
        letter-spacing="${size * 0.006}">FRENCH RECORD POOL</text>
  <text x="${size - size * 0.08}" y="${size * 0.08}" text-anchor="end"
        font-family="'Barlow', 'Inter', system-ui, sans-serif"
        font-size="${size * 0.026}" font-weight="700" fill="${palette.ink}" opacity="0.45"
        letter-spacing="${size * 0.004}">N°${num}</text>

  <!-- Initiales géantes (Bebas Neue) -->
  <text x="${size * 0.5}" y="${size * 0.58}" text-anchor="middle"
        font-family="'Bebas Neue', 'Oswald', 'Impact', sans-serif"
        font-size="${size * 0.42}" font-weight="400" fill="${palette.ink}"
        opacity="0.95" letter-spacing="${size * 0.01}">${escapeXml(ini)}</text>

  <!-- Ligne accent -->
  <rect x="${size * 0.05}" y="${lineY}" width="${size * 0.18}" height="${size * 0.008}" fill="${palette.accent}"/>

  <!-- Title (Bebas Neue) -->
  <text x="${size * 0.05}" y="${lineY + size * 0.06}"
        font-family="'Bebas Neue', 'Oswald', sans-serif"
        font-size="${size * 0.058}" font-weight="400" fill="${palette.ink}"
        letter-spacing="${size * 0.002}">${t}</text>

  <!-- Artist (Barlow) -->
  <text x="${size * 0.05}" y="${lineY + size * 0.115}"
        font-family="'Barlow', 'Inter', system-ui, sans-serif"
        font-size="${size * 0.028}" font-weight="600" fill="${palette.ink}" opacity="0.7"
        letter-spacing="${size * 0.003}">${a}</text>

  <!-- Bottom-right meta tag -->
  <text x="${size - size * 0.05}" y="${size - size * 0.04}" text-anchor="end"
        font-family="'Barlow', 'Inter', system-ui, sans-serif"
        font-size="${size * 0.022}" font-weight="700" fill="${palette.ink}" opacity="0.5"
        letter-spacing="${size * 0.008}">EDITION ${String.fromCharCode(65 + (seed % 26))}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Résout la cover à afficher pour une track.
 * Priorité : cover_url uploadée → cover éditoriale générée.
 */
export function resolveCover(track: { title?: string | null; artist?: string | null; cover_url?: string | null } | null | undefined): string {
  if (!track) return generateTrackCover("", "");
  if (track.cover_url && track.cover_url.trim()) return track.cover_url;
  return generateTrackCover(track.title ?? "", track.artist ?? "");
}
