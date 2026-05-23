// Cover tools: search (iTunes + Deezer), youtube/soundcloud thumbnails,
// AI generation via Lovable AI Gateway, and proxy fetch (URL -> base64).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_FETCH_HOSTS = [
  "i.ytimg.com",
  "img.youtube.com",
  "i1.sndcdn.com",
  "i2.sndcdn.com",
  "cdns-images.dzcdn.net",
  "e-cdns-images.dzcdn.net",
  "is1-ssl.mzstatic.com",
  "is2-ssl.mzstatic.com",
  "is3-ssl.mzstatic.com",
  "is4-ssl.mzstatic.com",
  "is5-ssl.mzstatic.com",
  "mzstatic.com",
];

function isAllowedFetchUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    // Block private/loopback/metadata
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "169.254.169.254" ||
      host === "metadata.google.internal" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^0\./.test(host)
    ) return false;
    return ALLOWED_FETCH_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}


const upscaleItunes = (u: string) =>
  u.replace(/\/\d+x\d+bb\.(jpg|png)/i, "/600x600bb.$1");

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/(shorts|embed)\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[2];
    return null;
  } catch { return null; }
}

async function searchItunes(q: string) {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=12`,
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results || []).map((x: any) => ({
      source: "iTunes",
      url: upscaleItunes(x.artworkUrl100 || ""),
      thumb: x.artworkUrl100,
      title: `${x.artistName} — ${x.trackName}`,
    })).filter((x: any) => x.url);
  } catch { return []; }
}

async function searchDeezer(q: string) {
  try {
    const r = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=12`,
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data || []).map((x: any) => ({
      source: "Deezer",
      url: x.album?.cover_xl || x.album?.cover_big || x.album?.cover_medium,
      thumb: x.album?.cover_medium || x.album?.cover_small,
      title: `${x.artist?.name} — ${x.title}`,
    })).filter((x: any) => x.url);
  } catch { return []; }
}

async function fetchSoundCloudOEmbed(url: string) {
  try {
    const r = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    );
    if (!r.ok) return null;
    const d = await r.json();
    const thumb = d.thumbnail_url
      ? String(d.thumbnail_url).replace(/-large\.(jpg|png)/, "-t500x500.$1")
      : null;
    return {
      thumbnail: thumb,
      title: d.title || null,
      author_name: d.author_name || null,
      author_url: d.author_url || null,
      html: d.html || null,
    };
  } catch { return null; }
}

async function fetchToBase64(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  const mime = r.headers.get("content-type") || "image/jpeg";
  // base64 encode
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  return { dataUrl: `data:${mime};base64,${b64}`, mime, bytes: buf.length };
}

async function generateAiCover(prompt: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      modalities: ["image", "text"],
      messages: [{
        role: "user",
        content:
          `Square album cover artwork (1:1), high quality, vibrant, professional, no text, no watermark, no logos. ${prompt}`,
      }],
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`AI ${r.status}: ${text.slice(0, 200)}`);
  }
  const d = await r.json();
  const url =
    d?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
    d?.choices?.[0]?.message?.content?.match?.(/data:image\/[^"\s)]+/)?.[0];
  if (!url) throw new Error("Aucune image générée");
  return url as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Non authentifié" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claimsData?.claims?.sub) {
      return json({ error: "Non authentifié" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const { action, query, url, prompt } = await req.json();

    if (action === "search") {
      if (!query) return json({ error: "query manquant" }, 400);
      const [a, b] = await Promise.all([searchItunes(query), searchDeezer(query)]);
      return json({ results: [...a, ...b] });
    }

    if (action === "meta_search") {
      if (!query) return json({ error: "query manquant" }, 400);
      const results: any[] = [];
      try {
        const r = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8`,
        );
        if (r.ok) {
          const d = await r.json();
          for (const x of d.results || []) {
            results.push({
              source: "iTunes",
              artist: x.artistName,
              title: x.trackName,
              album: x.collectionName,
              genre: x.primaryGenreName,
              releaseDate: x.releaseDate,
              durationMs: x.trackTimeMillis,
              coverUrl: upscaleItunes(x.artworkUrl100 || ""),
              thumb: x.artworkUrl100,
            });
          }
        }
      } catch { /* ignore */ }
      try {
        const r = await fetch(
          `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=8`,
        );
        if (r.ok) {
          const d = await r.json();
          for (const x of d.data || []) {
            results.push({
              source: "Deezer",
              artist: x.artist?.name,
              title: x.title,
              album: x.album?.title,
              genre: null,
              releaseDate: null,
              durationMs: x.duration ? x.duration * 1000 : null,
              coverUrl: x.album?.cover_xl || x.album?.cover_big,
              thumb: x.album?.cover_medium,
            });
          }
        }
      } catch { /* ignore */ }
      return json({ results });
    }

    if (action === "youtube") {
      if (!url) return json({ error: "url manquant" }, 400);
      const id = extractYouTubeId(url);
      if (!id) return json({ error: "ID YouTube introuvable" }, 400);
      const candidates = [
        `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      ];
      for (const c of candidates) {
        const h = await fetch(c, { method: "HEAD" });
        if (h.ok) return json({ url: c });
      }
      return json({ error: "Miniature indisponible" }, 404);
    }

    if (action === "soundcloud") {
      if (!url) return json({ error: "url manquant" }, 400);
      const meta = await fetchSoundCloudOEmbed(url);
      if (!meta) return json({ error: "SoundCloud indisponible" }, 404);
      return json({ ...meta, url: meta.thumbnail });
    }

    if (action === "soundcloud_meta") {
      if (!url) return json({ error: "url manquant" }, 400);
      const meta = await fetchSoundCloudOEmbed(url);
      if (!meta) return json({ error: "SoundCloud indisponible" }, 404);
      return json(meta);
    }

    if (action === "generate") {
      if (!prompt) return json({ error: "prompt manquant" }, 400);
      // Restrict AI generation to admins to avoid quota abuse
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);
      const dataUrl = await generateAiCover(prompt);
      return json({ dataUrl });
    }

    if (action === "fetch") {
      if (!url) return json({ error: "url manquant" }, 400);
      if (!isAllowedFetchUrl(url)) {
        return json({ error: "URL non autorisée" }, 400);
      }
      const r = await fetchToBase64(url);
      return json(r);
    }

    return json({ error: "action inconnue" }, 400);
  } catch (err) {
    console.error("cover-tools error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});

