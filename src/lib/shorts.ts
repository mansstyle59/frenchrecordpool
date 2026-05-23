/** Unified helpers for short-form videos (YouTube Shorts + Instagram Reels). */
import { extractYouTubeId, youtubeEmbedUrl, youtubeThumb } from "./youtube";

export type ShortProvider = "youtube" | "instagram";

export function detectProvider(url: string): ShortProvider | null {
  if (!url) return null;
  const u = url.trim().toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  // bare 11-char id → YouTube
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return "youtube";
  return null;
}

/** Extract a Reel/Post id from an Instagram URL. */
export function extractInstagramId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes("instagram.com")) return null;
    // /reel/{id}/, /reels/{id}/, /p/{id}/, /tv/{id}/
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["reel", "reels", "p", "tv"].includes(p));
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // ignore
  }
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

export function extractShortId(url: string, provider?: ShortProvider | null): string | null {
  const p = provider ?? detectProvider(url);
  if (p === "instagram") return extractInstagramId(url);
  if (p === "youtube") return extractYouTubeId(url);
  return null;
}

export function shortEmbedUrl(
  provider: ShortProvider,
  id: string,
  opts: { autoplay?: boolean; mute?: boolean; loop?: boolean } = {}
): string {
  if (provider === "instagram") {
    // Instagram /embed iframe — autoplay/mute not controllable via params
    return `https://www.instagram.com/reel/${id}/embed/?cr=1&v=14`;
  }
  return youtubeEmbedUrl(id, opts);
}

export function shortThumbnail(
  provider: ShortProvider,
  id: string | null,
  fallback?: string | null
): string | null {
  if (fallback) return fallback;
  if (provider === "youtube" && id) return youtubeThumb(id);
  return null; // Instagram doesn't expose thumbnails without API
}

export function providerLabel(p: ShortProvider): string {
  return p === "instagram" ? "Instagram Reel" : "YouTube Short";
}
