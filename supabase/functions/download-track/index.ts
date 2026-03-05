import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: hasSub } = await adminClient.rpc("has_active_subscription", { _user_id: user.id });
    if (!hasSub) {
      return new Response(JSON.stringify({ error: "Abonnement actif requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { track_id } = await req.json();
    if (!track_id) {
      return new Response(JSON.stringify({ error: "track_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: track, error: trackError } = await adminClient
      .from("tracks")
      .select("id, title, artist, audio_url")
      .eq("id", track_id)
      .single();

    if (trackError || !track) {
      return new Response(JSON.stringify({ error: "Track introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!track.audio_url) {
      return new Response(JSON.stringify({ error: "Fichier audio non disponible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record download
    await adminClient.from("downloads").insert({ user_id: user.id, track_id: track.id });

    // Check if it's a storage URL or an external link
    const isStorageUrl = track.audio_url.includes("/object/public/track-audio/");

    if (isStorageUrl) {
      // Storage file → generate signed URL for direct download
      const urlObj = new URL(track.audio_url);
      const pathMatch = urlObj.pathname.match(/\/object\/public\/track-audio\/(.+)/);
      if (!pathMatch) {
        return new Response(JSON.stringify({ error: "Chemin fichier invalide" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const storagePath = decodeURIComponent(pathMatch[1]);

      const { data: signedData, error: signedError } = await adminClient.storage
        .from("track-audio")
        .createSignedUrl(storagePath, 300, { download: `${track.artist} - ${track.title}` });

      if (signedError || !signedData?.signedUrl) {
        return new Response(JSON.stringify({ error: "Impossible de générer le lien" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          type: "file",
          download_url: signedData.signedUrl,
          filename: `${track.artist} - ${track.title}.mp3`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // External link → return URL to open in new tab
      return new Response(
        JSON.stringify({
          type: "link",
          download_url: track.audio_url,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("download-track error:", err);
    return new Response(JSON.stringify({ error: "Une erreur interne s'est produite" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
