import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MONIEPOINT_VERIFY_URL = Deno.env.get("MONIEPOINT_VERIFY_URL") ?? "";
const MONIEPOINT_API_KEY = Deno.env.get("MONIEPOINT_API_KEY") ?? "";
const MONIEPOINT_ACCOUNT_NUMBER = Deno.env.get("MONIEPOINT_ACCOUNT_NUMBER") ?? "";
const MONIEPOINT_ACCOUNT_NAME = Deno.env.get("MONIEPOINT_ACCOUNT_NAME") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function text(value: unknown, max = 160): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function successfulStatus(value: unknown): boolean {
  const s = text(value, 40).toLowerCase();
  return ["success", "successful", "completed", "complete", "paid", "settled", "successful_transaction"].includes(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Only POST requests are supported." }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: "Payment backend is not configured." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return jsonResponse({ error: "Authentication required." }, 401);

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Invalid or expired session." }, 401);

    const body = await req.json();
    const reference = text(body?.reference);
    const plan = text(body?.plan, 30).toLowerCase();
    if (!reference) return jsonResponse({ error: "Transaction reference is required." }, 400);
    if (!["basic", "pro", "premium"].includes(plan)) return jsonResponse({ error: "Unsupported plan." }, 400);

    const expectedAmountNaira = plan === "premium" ? 2000 : plan === "pro" ? 1000 : 500;
    const expectedAmountKobo = expectedAmountNaira * 100;

    const { data: payment, error: paymentError } = await admin
      .from("destiny_payments")
      .select("id, reference, user_id, plan, amount_kobo, currency, status, metadata")
      .eq("user_id", user.id)
      .eq("plan", plan)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) return jsonResponse({ error: "Could not load payment record." }, 500);
    if (!payment) return jsonResponse({ error: "No pending payment was found for this plan." }, 404);

    if (!MONIEPOINT_VERIFY_URL || !MONIEPOINT_API_KEY) {
      return jsonResponse({
        verified: false,
        code: "PROVIDER_NOT_CONFIGURED",
        message: "Moniepoint transaction verification is not configured on the server yet.",
        recipient: { account_name: MONIEPOINT_ACCOUNT_NAME, account_number: MONIEPOINT_ACCOUNT_NUMBER },
      }, 503);
    }

    const providerResponse = await fetch(MONIEPOINT_VERIFY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MONIEPOINT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reference, transaction_reference: reference }),
    });
    const raw = await providerResponse.text();
    let provider: any = {};
    try { provider = JSON.parse(raw); } catch (_) { provider = { raw }; }

    if (!providerResponse.ok) {
      console.error("Moniepoint verification failed", providerResponse.status, provider);
      return jsonResponse({ verified: false, code: "PROVIDER_ERROR", message: "The transaction could not be verified right now." }, 502);
    }

    const data = provider?.data ?? provider?.transaction ?? provider;
    const providerStatus = data?.status ?? provider?.status;
    const providerReference = text(data?.reference ?? data?.transaction_reference ?? data?.session_id ?? reference);
    const providerAmount = numberValue(data?.amount ?? data?.amount_kobo ?? data?.amountKobo);
    const providerAccount = text(data?.destination_account_number ?? data?.account_number ?? data?.credit_account_number, 40);
    const providerAccountName = text(data?.destination_account_name ?? data?.account_name ?? data?.credit_account_name, 160);

    const amountMatches = providerAmount === expectedAmountKobo || providerAmount === expectedAmountNaira;
    const accountMatches = !MONIEPOINT_ACCOUNT_NUMBER || !providerAccount || providerAccount === MONIEPOINT_ACCOUNT_NUMBER;
    const referenceMatches = !providerReference || providerReference === reference;
    const verified = successfulStatus(providerStatus) && amountMatches && accountMatches && referenceMatches;

    if (!verified) {
      return jsonResponse({
        verified: false,
        code: "TRANSACTION_NOT_MATCHED",
        message: "The transaction was found but did not pass the amount, recipient, reference, and success checks.",
      });
    }

    const now = new Date().toISOString();
    const metadata = {
      ...(payment.metadata ?? {}),
      verified_transaction_reference: providerReference,
      verified_amount: providerAmount,
      verified_account_name: providerAccountName,
      verified_account_number: providerAccount,
      provider_status: providerStatus,
      verified_at: now,
    };

    const { error: updateError } = await admin
      .from("destiny_payments")
      .update({ status: "paid", paid_at: now, metadata })
      .eq("id", payment.id)
      .eq("user_id", user.id)
      .eq("status", "pending");
    if (updateError) {
      console.error("Payment status update failed", updateError);
      return jsonResponse({ error: "Transaction verified, but activation failed. Please try again." }, 500);
    }

    const profileUpdate: Record<string, unknown> = {
      plan,
      premium_source: "moniepoint",
      premium_started_at: now,
    };
    if (plan === "premium") {
      profileUpdate.premium_active = true;
      profileUpdate.premium_expires_at = null;
    }

    const { error: profileError } = await admin
      .from("destiny_profiles")
      .update(profileUpdate)
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Entitlement update failed", profileError);
      return jsonResponse({ error: "Payment verified, but account activation needs a retry." }, 500);
    }

    return jsonResponse({ verified: true, status: "paid", plan, reference });
  } catch (error) {
    console.error("verify-payment error", error);
    return jsonResponse({ error: "Unexpected verification error." }, 500);
  }
});
