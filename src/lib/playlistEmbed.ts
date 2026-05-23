export type PlaylistSource = "spotify" | "deezer" | "soundcloud" | "custom";

export interface ParsedPlaylist {
  source: PlaylistSource;
  embed_id: string;
  /** For Spotify: "playlist" | "album" | "track" */
  kind?: string;
}

/**
 * Parse a Spotify / Deezer / SoundCloud URL into a normalized embed descriptor.
 * Returns null when the URL doesn't match a known pattern.
 */
export function parsePlaylistUrl(url: string): ParsedPlaylist | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Spotify: https://open.spotify.com/(playlist|album|track)/{id}?...
  const sp = trimmed.match(
    /open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|episode|show)\/([A-Za-z0-9]+)/i
  );
  if (sp) return { source: "spotify", kind: sp[1].toLowerCase(), embed_id: sp[2] };

  // Deezer: https://www.deezer.com/(fr|en)/(playlist|album|track)/{id}
  const dz = trimmed.match(
    /deezer\.com\/(?:[a-z]{2}\/)?(playlist|album|track)\/(\d+)/i
  );
  if (dz) return { source: "deezer", kind: dz[1].toLowerCase(), embed_id: dz[2] };

  // SoundCloud: any soundcloud.com/... URL → use the URL itself as embed_id
  if (/soundcloud\.com\//i.test(trimmed)) {
    return { source: "soundcloud", embed_id: trimmed };
  }
  return null;
}

export interface PlaylistEmbedInput {
  source: PlaylistSource;
  embed_id: string | null;
  source_url?: string | null;
  /** Optional kind hint for Spotify/Deezer */
  kind?: string | null;
  /** HSL accent like "220 80% 58%" — used for SoundCloud color */
  accent_color?: string | null;
}

/** Build the iframe `src` for the given playlist. Returns null for `custom` or invalid input. */
export function getEmbedSrc(p: PlaylistEmbedInput): string | null {
  if (!p.embed_id) return null;
  if (p.source === "spotify") {
    const kind = p.kind || guessKind(p.source_url) || "playlist";
    return `https://open.spotify.com/embed/${kind}/${p.embed_id}?utm_source=frp`;
  }
  if (p.source === "deezer") {
    const kind = p.kind || guessKind(p.source_url) || "playlist";
    return `https://widget.deezer.com/widget/dark/${kind}/${p.embed_id}`;
  }
  if (p.source === "soundcloud") {
    const u = encodeURIComponent(p.embed_id);
    // Convert HSL accent to a hex-ish fallback; SoundCloud expects hex without #
    const color = hslToHex(p.accent_color) || "3b6fa0";
    return `https://w.soundcloud.com/player/?url=${u}&color=%23${color}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  }
  return null;
}

function guessKind(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/(playlist|album|track|episode|show)\//i);
  return m ? m[1].toLowerCase() : null;
}

/** Very small HSL ("220 80% 58%") → hex (without #) converter. */
function hslToHex(hsl?: string | null): string | null {
  if (!hsl) return null;
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `${to(r)}${to(g)}${to(b)}`;
}

export const SOURCE_LABEL: Record<PlaylistSource, string> = {
  spotify: "Spotify",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  custom: "Interne",
};
