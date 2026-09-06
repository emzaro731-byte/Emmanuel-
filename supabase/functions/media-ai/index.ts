import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROVIDER_KEY = Deno.env.get("MEDIA_PROVIDER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST is supported." }, 405);
  if (!PROVIDER_KEY) return json({ error: "Media provider key is not configured in Supabase Function Secrets." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: "Supabase authentication is not configured." }, 500);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: "Invalid or expired session." }, 401);

    const body = await req.json();
    const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim().slice(0, 160) : "fal-ai/flux/schnell";
    const input = body?.input && typeof body.input === "object" ? body.input : {};
    const prompt = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 6000) : "";
    if (!prompt) return json({ error: "A prompt is required." }, 400);

    const providerResponse = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PROVIDER_KEY}`,
        "Content-Type": "application/json",
        "X-Fal-Store-IO": "0",
      },
      body: JSON.stringify({ ...input, prompt }),
    });

    const text = await providerResponse.text();
    let result: any;
    try { result = JSON.parse(text); } catch { result = { raw: text }; }
    if (!providerResponse.ok) return json({ error: result?.detail || result?.message || `Media provider returned HTTP ${providerResponse.status}.` }, providerResponse.status);
    return json({ success: true, provider: "fal", model, result, user_id: user.id });
  } catch (error) {
    console.error("Media provider function error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
