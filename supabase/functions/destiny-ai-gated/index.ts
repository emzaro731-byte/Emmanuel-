import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST requests are supported." }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: "Supabase is not configured." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or expired session." }, 401);

    const reservation = await client.rpc("reserve_destiny_ai_request");
    if (reservation.error) {
      console.error("Usage reservation failed:", reservation.error);
      return json({ error: "AI usage control is not configured. Run supabase/monetization_v2.sql first." }, 503);
    }

    const allowance = reservation.data as {
      allowed?: boolean;
      reason?: string;
      plan?: string;
      daily_limit?: number;
      used?: number;
      credits?: number;
    };

    if (!allowance?.allowed) {
      return json({
        error: "Daily AI limit reached. Upgrade your plan or buy credits to continue.",
        code: "AI_LIMIT_REACHED",
        plan: allowance?.plan ?? "free",
        daily_limit: allowance?.daily_limit ?? 20,
        used: allowance?.used ?? 0,
        credits: allowance?.credits ?? 0,
      }, 402);
    }

    const body = await req.text();
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/destiny-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
        apikey: SUPABASE_ANON_KEY,
      },
      body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("destiny-ai-gated error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
