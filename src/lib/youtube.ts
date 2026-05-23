/** Extract a YouTube video id from any URL (watch, youtu.be, shorts, embed). */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Already an id (11 chars, alnum/_-)
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] ?? null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] ?? null;
      }
      const v = u.searchParams.get("v");
      if (v) return v;
    }
  } catch {
    // not a URL — fallthrough
  }
  // Best-effort regex
  const m = trimmed.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(id: string, opts: { autoplay?: boolean; mute?: boolean; loop?: boolean } = {}): string {
  const params = new URLSearchParams({
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    autoplay: opts.autoplay ? "1" : "0",
    mute: opts.mute ? "1" : "0",
    controls: "1",
    enablejsapi: "1",
  });
  if (opts.loop) {
    params.set("loop", "1");
    params.set("playlist", id);
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
