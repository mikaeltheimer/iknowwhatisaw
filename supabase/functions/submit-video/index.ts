import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Parse video URL to extract platform and ID
function parseVideoUrl(url: string): { platform: string; id: string } | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { platform: "youtube", id: ytMatch[1] };

  // TikTok
  const ttMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
  if (ttMatch) return { platform: "tiktok", id: ttMatch[1] };

  // Instagram
  const igMatch = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return { platform: "instagram", id: igMatch[1] };

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, title, fingerprint, turnstileToken } = await req.json();

    // Validation
    if (!url || !title || !fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier Turnstile (obligatoire pour soumettre une vidéo)
    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Verification required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    const formData = new FormData();
    formData.append("secret", turnstileSecret);
    formData.append("response", turnstileToken);

    const turnstileResult = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData }
    );
    const turnstileOutcome = await turnstileResult.json();

    if (!turnstileOutcome.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Bot verification failed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parser l'URL
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid video URL. Supported: YouTube, TikTok, Instagram" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valider le titre
    const cleanTitle = title.trim().slice(0, 500);
    if (cleanTitle.length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: "Title must be at least 5 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier le rate limit (max 5 soumissions par heure)
    const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
      p_fingerprint: fingerprint,
      p_action_type: "submit",
      p_max_actions: 5,
      p_window_minutes: 60,
    });

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insérer la vidéo
    const { data, error } = await supabase
      .from("videos")
      .insert({
        platform: parsed.platform,
        video_id: parsed.id,
        original_url: url,
        title: cleanTitle,
        submitter_fingerprint: fingerprint,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: "This video has already been submitted" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, video: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Submit error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
