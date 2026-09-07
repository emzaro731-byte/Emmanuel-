import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function getSupabaseServerKey(): string {
  // Prefer the modern Supabase secret-key collection. Keep the legacy
  // service-role fallback for existing deployments during migration.
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      const firstKey = Object.values(parsed).find((value) => typeof value === "string" && value.length > 0);
      if (firstKey) return firstKey;
    } catch (error) {
      console.error("Could not parse SUPABASE_SECRET_KEYS:", error);
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const SERVER_KEY = getSupabaseServerKey();
const MONIEPOINT_CHECKOUT_URL = Deno.env.get("MONIEPOINT_CHECKOUT_URL") ?? "";
const MONIEPOINT_ACCOUNT_NAME = Deno.env.get("MONIEPOINT_ACCOUNT_NAME") ?? "";
const MONIEPOINT_ACCOUNT_NUMBER = Deno.env.get("MONIEPOINT_ACCOUNT_NUMBER") ?? "";
const MONIEPOINT_BANK_NAME = Deno.env.get("MONIEPOINT_BANK_NAME") || "Moniepoint MFB";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function safeText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const PLANS: Record<string, { amountKobo: number; label: string }> = {
  pro: { amountKobo: 100000, label: "Destiny AI Pro" },
  premium: { amountKobo: 200000, label: "Destiny AI Premium" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Only POST requests are supported." }, 405);
  if (!SUPABASE_URL || !SERVER_KEY) return jsonResponse({ error: "Payment backend is not configured." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SERVER_KEY);
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) return jsonResponse({ error: "Invalid or expired session." }, 401);

    const body = await req.json();
    const plan = safeText(body?.plan, 30).toLowerCase();
    const selected = PLANS[plan];
    if (!selected) return jsonResponse({ error: "Unsupported plan." }, 400);

    const reference = `DESTINY-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const metadata = {
      user_id: user.id,
      plan,
      label: selected.label,
      created_from: "destiny-ai-mobile",
    };

    const { data: payment, error: insertError } = await adminClient
      .from("destiny_payments")
      .insert({
        user_id: user.id,
        reference,
        plan,
        amount_kobo: selected.amountKobo,
        currency: "NGN",
        status: "pending",
        provider: "moniepoint",
        checkout_url: MONIEPOINT_CHECKOUT_URL || null,
        metadata,
      })
      .select("id, reference, plan, amount_kobo, currency, status, checkout_url")
      .single();

    if (insertError) {
      console.error("Payment insert failed:", insertError);
      return jsonResponse({ error: "Could not create payment record." }, 500);
    }

    const response: Record<string, unknown> = {
      success: true,
      payment,
      instructions: MONIEPOINT_CHECKOUT_URL
        ? "Continue to the secure Moniepoint checkout page."
        : "A Moniepoint checkout URL has not been configured yet. Use the payment reference for the supported manual transfer flow.",
    };

    // Account details are loaded only from Edge Function secrets. They are
    // never committed to GitHub or stored in the public payment table.
    if (MONIEPOINT_ACCOUNT_NUMBER) {
      response.bank_transfer = {
        bank_name: MONIEPOINT_BANK_NAME,
        account_name: MONIEPOINT_ACCOUNT_NAME,
        account_number: MONIEPOINT_ACCOUNT_NUMBER,
        reference,
      };
    }

    return jsonResponse(response);
  } catch (error) {
    console.error("create-payment error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
