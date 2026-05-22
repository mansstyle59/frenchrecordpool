// Vinyle SVG universel — remplace toutes les pochettes par un disque vinyle stylisé.
// Couleur d'accent déterministe à partir du titre/artiste pour varier subtilement.

const ACCENTS = [
  "#3b82f6", "#ef4444", "#6366f1", "#ec4899", "#f97316",
  "#10b981", "#a855f7", "#0ea5e9", "#f59e0b", "#14b8a6",
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/**
 * Génère un vinyle SVG (data URL) — même rendu sur toutes les tracks.
 * Accent label varie pour distinguer visuellement les morceaux.
 */
export function generateTrackCover(title = "", artist = "", size = 600): string {
  const seed = hash(`${title}|${artist}`);
  const accent = ACCENTS[seed % ACCENTS.length];
  const gid = `g${seed.toString(36)}`;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <radialGradient id="${gid}bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
    <radialGradient id="${gid}shine" cx="35%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#${gid}bg)"/>
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0d0d0d" stroke="#222" stroke-width="2"/>
    ${Array.from({ length: 28 }, (_, i) => {
      const rr = r - 6 - i * (r / 36);
      return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#1f1f1f" stroke-width="0.7"/>`;
    }).join("")}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="${accent}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="url(#${gid}shine)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.06}" fill="#0a0a0a"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.015}" fill="#fff" opacity="0.6"/>
    <text x="${cx}" y="${cy - r * 0.05}" text-anchor="middle"
          font-family="'Space Grotesk', system-ui, sans-serif"
          font-size="${size * 0.035}" font-weight="700" fill="#fff" opacity="0.95"
          letter-spacing="2">FRP</text>
    <text x="${cx}" y="${cy + r * 0.12}" text-anchor="middle"
          font-family="'DM Sans', system-ui, sans-serif"
          font-size="${size * 0.022}" font-weight="500" fill="#fff" opacity="0.7"
          letter-spacing="3">FRENCH RECORD POOL</text>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid}shine)" opacity="0.7"/>
  </g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Résout la cover à afficher pour une track.
 * Politique : vinyle universel pour toutes les tracks.
 */
export function resolveCover(track: { title?: string | null; artist?: string | null; cover_url?: string | null } | null | undefined): string {
  if (!track) return generateTrackCover("", "");
  return generateTrackCover(track.title ?? "", track.artist ?? "");
}
