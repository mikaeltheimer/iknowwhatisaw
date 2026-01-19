import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId, voteType, fingerprint, turnstileToken } = await req.json();

    // Validation
    if (!videoId || !voteType || !fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["real", "fake"].includes(voteType)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid vote type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // // Vérifier Turnstile si token fourni
    // if (turnstileToken) {
    //   const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    //   const formData = new FormData();
    //   formData.append("secret", turnstileSecret);
    //   formData.append("response", turnstileToken);

    //   const turnstileResult = await fetch(
    //     "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    //     { method: "POST", body: formData }
    //   );
    //   const turnstileOutcome = await turnstileResult.json();

    //   if (!turnstileOutcome.success) {
    //     return new Response(
    //       JSON.stringify({ success: false, error: "Bot verification failed" }),
    //       { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //     );
    //   }
    // }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier le rate limit (max 50 votes par heure)
    const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
      p_fingerprint: fingerprint,
      p_action_type: "vote",
      p_max_actions: 50,
      p_window_minutes: 60,
    });

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash de l'IP pour détection d'abus
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(clientIP + Deno.env.get("IP_SALT") || "uap-archive")
    ).then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""));

    // Insérer le vote
    const { data, error } = await supabase
      .from("votes")
      .insert({
        video_id: videoId,
        voter_fingerprint: fingerprint,
        vote_type: voteType,
        ip_hash: ipHash,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Violation de contrainte unique = déjà voté
        return new Response(
          JSON.stringify({ success: false, error: "You have already voted on this video" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, vote: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Vote error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
