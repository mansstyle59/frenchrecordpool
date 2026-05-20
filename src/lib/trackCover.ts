// Génère une pochette SVG déterministe à partir du titre + artiste.
// Appliquée systématiquement à toutes les tracks (override des covers existantes).

const PALETTES: Array<[string, string, string]> = [
  ["#1e3a8a", "#3b82f6", "#ef4444"], // bleu profond → rouge (FR)
  ["#0f172a", "#6366f1", "#ec4899"], // nuit → magenta
  ["#7c2d12", "#f97316", "#fbbf24"], // braise
  ["#064e3b", "#10b981", "#a7f3d0"], // émeraude
  ["#4c1d95", "#a855f7", "#f0abfc"], // violet vapor
  ["#831843", "#ec4899", "#fda4af"], // rose intense
  ["#0c4a6e", "#0ea5e9", "#67e8f9"], // océan
  ["#1f2937", "#f59e0b", "#fde68a"], // anthracite + or
  ["#450a0a", "#dc2626", "#fca5a5"], // rouge sang
  ["#134e4a", "#14b8a6", "#5eead4"], // teal
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function initials(title: string, artist: string): string {
  const t = (title || "").trim();
  const a = (artist || "").trim();
  const first = t[0]?.toUpperCase() || "?";
  const second = (a[0] || t.split(/\s+/)[1]?.[0] || "").toUpperCase();
  return (first + second).slice(0, 2);
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!),
  );
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Génère une pochette SVG déterministe (data URL) pour une track.
 */
export function generateTrackCover(title: string, artist: string, size = 600): string {
  const seed = hash(`${title}|${artist}`);
  const palette = PALETTES[seed % PALETTES.length];
  const angle = (seed % 360);
  const rot = ((seed >> 4) % 30) - 15;
  const ini = initials(title, artist);
  const t = escapeXml(truncate(title || "Untitled", 28));
  const a = escapeXml(truncate(artist || "Unknown", 24));
  const gid = `g${seed.toString(36)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="55%" stop-color="${palette[1]}"/>
      <stop offset="100%" stop-color="${palette[2]}"/>
    </linearGradient>
    <radialGradient id="${gid}r" cx="30%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#${gid})"/>
  <rect width="100%" height="100%" fill="url(#${gid}r)"/>
  <g opacity="0.18" transform="rotate(${rot} ${size / 2} ${size / 2})">
    <circle cx="${size * 0.78}" cy="${size * 0.22}" r="${size * 0.32}" fill="none" stroke="#fff" stroke-width="2"/>
    <circle cx="${size * 0.78}" cy="${size * 0.22}" r="${size * 0.22}" fill="none" stroke="#fff" stroke-width="1.5"/>
    <circle cx="${size * 0.78}" cy="${size * 0.22}" r="${size * 0.12}" fill="none" stroke="#fff" stroke-width="1"/>
    <circle cx="${size * 0.78}" cy="${size * 0.22}" r="${size * 0.04}" fill="#fff"/>
  </g>
  <text x="${size * 0.08}" y="${size * 0.62}"
        font-family="'Space Grotesk', system-ui, sans-serif"
        font-size="${size * 0.32}" font-weight="700" fill="#ffffff"
        letter-spacing="-4">${ini}</text>
  <text x="${size * 0.08}" y="${size * 0.78}"
        font-family="'Space Grotesk', system-ui, sans-serif"
        font-size="${size * 0.055}" font-weight="600" fill="#ffffff" opacity="0.95">${t}</text>
  <text x="${size * 0.08}" y="${size * 0.85}"
        font-family="'DM Sans', system-ui, sans-serif"
        font-size="${size * 0.038}" font-weight="400" fill="#ffffff" opacity="0.75">${a}</text>
  <text x="${size * 0.08}" y="${size * 0.94}"
        font-family="'DM Sans', system-ui, sans-serif"
        font-size="${size * 0.028}" font-weight="500" fill="#ffffff" opacity="0.6"
        letter-spacing="3">FRENCH RECORD POOL</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Résout la cover à afficher pour une track.
 * Politique actuelle : override systématique — la cover dynamique est appliquée
 * à toutes les tracks, qu'elles aient une cover_url ou non.
 */
export function resolveCover(track: { title?: string | null; artist?: string | null; cover_url?: string | null } | null | undefined): string {
  if (!track) return generateTrackCover("", "");
  return generateTrackCover(track.title ?? "", track.artist ?? "");
}
