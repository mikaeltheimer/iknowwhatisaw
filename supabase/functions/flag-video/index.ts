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
    const { videoId, fingerprint, reason, turnstileToken } = await req.json();

    // Validation
    if (!videoId || !fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier Turnstile si fourni
    if (turnstileToken) {
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
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier le rate limit (max 20 flags par heure pour éviter les abus)
    const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
      p_fingerprint: fingerprint,
      p_action_type: "flag",
      p_max_actions: 20,
      p_window_minutes: 60,
    });

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many reports. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valider la raison
    const validReasons = ["inappropriate", "spam", "misleading", "copyright", "other"];
    const flagReason = validReasons.includes(reason) ? reason : "inappropriate";

    // Insérer le flag
    const { data, error } = await supabase
      .from("flags")
      .insert({
        video_id: videoId,
        flagger_fingerprint: fingerprint,
        reason: flagReason,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: "You have already reported this video" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Report submitted. Thank you for helping keep the community safe." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Flag error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
