/**
 * Parse DJ-style file names into structured metadata.
 * Examples handled:
 *   "DJ Yass - Ma Philosophie (Extended Mix) [Clean] 128 - Am.mp3"
 *   "Artist_-_Title_(Bootleg)_-_8A_124bpm.wav"
 *   "01. Artist - Title (Radio Edit).mp3"
 */

export interface ParsedFilename {
  artist?: string;
  title?: string;
  version?: string;
  bpm?: number;
  key?: string;
  remixers?: string[];
  year?: number;
  mood?: string;
}

const VERSION_KEYWORDS = [
  "Extended Mix", "Extended", "Radio Edit", "Radio", "Club Mix", "Club Edit",
  "Intro Outro", "Intro Edit", "Intro", "Outro",
  "Short Edit", "Quick Hit", "Quick Edit", "Quick",
  "Super Clean", "Clean", "Dirty",
  "Acapella", "Instrumental", "Dub", "Bonus Beats",
  "VIP Mix", "Bootleg", "Mashup", "Flip", "Rework", "Edit",
  "Transition In", "Transition Out", "Transition",
  "Hype Intro", "Hype Edit", "Aca In", "Aca Out",
  "Re-Drum", "Redrum", "Starter", "Segue",
  "Slowed", "Sped Up",
  "Tech Edit", "House Edit",
  "Dancehall Mix", "Afro Mix", "Latin Mix",
  "Original",
];

// Camelot wheel → standard key
const CAMELOT_TO_KEY: Record<string, string> = {
  "1A": "Abm", "1B": "B",
  "2A": "Ebm", "2B": "F#",
  "3A": "Bbm", "3B": "Db",
  "4A": "Fm",  "4B": "Ab",
  "5A": "Cm",  "5B": "Eb",
  "6A": "Gm",  "6B": "Bb",
  "7A": "Dm",  "7B": "F",
  "8A": "Am",  "8B": "C",
  "9A": "Em",  "9B": "G",
  "10A": "Bm", "10B": "D",
  "11A": "F#m", "11B": "A",
  "12A": "C#m", "12B": "E",
};

const NOTE_RE = /\b([A-G](?:#|b)?)(m|min|maj)?\b/;

function stripJunk(s: string): string {
  return s
    // remove file extension
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    // remove common scene/release tokens
    .replace(/\[(?:free\s*download|exclusive|preview|320|192|256)\b[^\]]*\]/gi, "")
    .replace(/\((?:free\s*download|exclusive|preview|192|256|320)\b[^)]*\)/gi, "")
    .replace(/\b\d{3}\s*kbps\b/gi, "")
    .replace(/\bwww\.[^\s)]+/gi, "")
    .replace(/\bhttps?:\/\/[^\s)]+/gi, "")
    // leading numeric tracks ("01. ", "12 - ")
    .replace(/^\s*\d{1,3}[._\-)\s]+/g, "")
    // underscores → spaces
    .replace(/_+/g, " ")
    // collapse spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}

function matchVersion(s: string): { version?: string; rest: string } {
  for (const kw of VERSION_KEYWORDS) {
    const re = new RegExp(`[\\(\\[]\\s*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[\\)\\]]`, "i");
    if (re.test(s)) return { version: kw, rest: s.replace(re, "").trim() };
  }
  // bare keyword between separators
  for (const kw of VERSION_KEYWORDS) {
    const re = new RegExp(`(?:^|\\s|-)\\s*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:$|\\s|-)`, "i");
    if (re.test(s)) return { version: kw, rest: s.replace(re, " ").replace(/\s{2,}/g, " ").trim() };
  }
  return { rest: s };
}

function matchBpm(s: string): { bpm?: number; rest: string } {
  // "128 bpm", "128bpm", "- 128 -", "(128)"
  const m =
    s.match(/\b(\d{2,3})\s*bpm\b/i) ||
    s.match(/[\(\[]\s*(\d{2,3})\s*[\)\]]/) ||
    s.match(/(?:^|[\s\-])(\d{2,3})(?=$|[\s\-_])/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 40 && n <= 220) {
      return { bpm: n, rest: s.replace(m[0], " ").replace(/\s{2,}/g, " ").trim() };
    }
  }
  return { rest: s };
}

function matchKey(s: string): { key?: string; rest: string } {
  // Camelot first (more specific)
  const cm = s.match(/[\(\[\s\-](1[0-2]|[1-9])([AB])(?=$|[\s\-_\)\]])/i);
  if (cm) {
    const camelot = `${cm[1]}${cm[2].toUpperCase()}`;
    const key = CAMELOT_TO_KEY[camelot];
    if (key) {
      return { key, rest: s.replace(cm[0], cm[0][0] === " " ? " " : " ").replace(/\s{2,}/g, " ").trim() };
    }
  }
  // standard note - require surrounding separators to avoid false positives in titles
  const nm = s.match(new RegExp(`(?:[\\(\\[]|[-\\s])${NOTE_RE.source}(?=$|[\\s\\-_\\)\\]])`, "i"));
  if (nm) {
    const note = (nm[1] as string).toUpperCase().replace("B", "b").replace(/^([A-G])b$/, "$1b");
    const isMinor = /^m(in)?$/i.test(nm[2] || "");
    const key = `${nm[1].toUpperCase()}${isMinor ? "m" : ""}`;
    return { key, rest: s.replace(nm[0], " ").replace(/\s{2,}/g, " ").trim() };
  }
  return { rest: s };
}

function matchYear(s: string): { year?: number; rest: string } {
  const m = s.match(/[\(\[]\s*(20\d{2}|19\d{2})\s*[\)\]]/) || s.match(/\b(20\d{2}|19\d{2})\b/);
  if (m) {
    const y = parseInt(m[1], 10);
    if (y >= 1990 && y <= 2100) {
      return { year: y, rest: s.replace(m[0], " ").replace(/\s{2,}/g, " ").trim() };
    }
  }
  return { rest: s };
}

const MOOD_KEYWORDS: Record<string, string> = {
  "énergique": "Énergique", "energique": "Énergique", "energy": "Énergique",
  "euphorique": "Euphorique", "euphoric": "Euphorique",
  "dark": "Dark", "obscur": "Dark",
  "mélancolique": "Mélancolique", "melancolique": "Mélancolique", "sad": "Mélancolique",
  "chill": "Chill", "relaxed": "Chill", "détendu": "Chill",
  "romantique": "Romantique", "romantic": "Romantique", "love": "Romantique",
  "festif": "Festif", "festive": "Festif", "party": "Festif",
  "agressif": "Agressif", "aggressive": "Agressif", "hard": "Agressif",
  "sensuel": "Sensuel", "sexy": "Sensuel", "sensual": "Sensuel",
  "hypnotique": "Hypnotique", "hypnotic": "Hypnotique",
  "groovy": "Groovy", "groove": "Groovy",
  "triomphant": "Triomphant", "triumphant": "Triomphant",
  "mystérieux": "Mystérieux", "mysterious": "Mystérieux", "mystery": "Mystérieux",
  "nostalgique": "Nostalgique", "nostalgic": "Nostalgique",
  "estival": "Estival", "summer": "Estival", "été": "Estival",
};

function matchMood(s: string): { mood?: string; rest: string } {
  const lower = s.toLowerCase();
  for (const [kw, label] of Object.entries(MOOD_KEYWORDS)) {
    const re = new RegExp(`(?:[\\(\\[]|[-\\s])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s\\-_\\)\\]])`, "i");
    if (re.test(lower)) {
      return { mood: label, rest: s.replace(new RegExp(kw, "i"), " ").replace(/\s{2,}/g, " ").trim() };
    }
  }
  return { rest: s };
}

export function parseFilenameMeta(filename: string): ParsedFilename {
  if (!filename) return {};
  let s = stripJunk(filename);
  const out: ParsedFilename = {};

  const v = matchVersion(s); if (v.version) out.version = v.version; s = v.rest;
  const k = matchKey(s);     if (k.key)     out.key = k.key;         s = k.rest;
  const b = matchBpm(s);     if (b.bpm)     out.bpm = b.bpm;         s = b.rest;
  const y = matchYear(s);    if (y.year)    out.year = y.year;       s = y.rest;
  const m = matchMood(s);    if (m.mood)    out.mood = m.mood;       s = m.rest;

  // Split "Artist - Title" (handle several dash flavours)
  const parts = s.split(/\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    out.artist = parts[0];
    out.title = parts.slice(1).join(" - ").trim();
  } else if (parts.length === 1 && parts[0]) {
    out.title = parts[0];
  }

  // Extract remixers from "(NAME Remix)" / "(NAME Bootleg)" patterns
  if (out.title) {
    const remix = out.title.match(/[\(\[]([^()\[\]]+?)\s+(?:Remix|Bootleg|Edit|Flip|Mashup|VIP|Rework)[\)\]]/i);
    if (remix) {
      out.remixers = [remix[1].trim()];
    }
  }

  return out;
}
