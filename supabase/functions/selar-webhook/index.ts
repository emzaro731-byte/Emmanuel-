import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyWithSelar } from "../_shared/selar.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-selar-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const text = (value: unknown, max = 200): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Keep the inbound webhook secret separate from SELAR_API_KEY.
  // SELAR_API_KEY is an outbound credential and must never be sent to clients.
  const expectedWebhookSecret = Deno.env.get("SELAR_WEBHOOK_SECRET")?.trim();
  if (!expectedWebhookSecret || req.headers.get("x-selar-webhook-secret") !== expectedWebhookSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.data ?? payload;
    const email = text(event?.email ?? event?.customer?.email ?? event?.buyer?.email, 320).toLowerCase();
    const productId = text(event?.product_id ?? event?.product?.id);
    const productName = text(event?.product_name ?? event?.product?.name);
    const amount = Number(event?.amount ?? event?.total ?? event?.price ?? 0);
    const currency = text(event?.currency ?? "NGN", 12).toUpperCase();
    const reference = text(event?.reference ?? event?.transaction_reference ?? event?.order_id ?? payload?.reference, 160);
    const eventKey = text(payload?.id ?? event?.id ?? reference ?? `${email}:${productId}:${event?.created_at ?? Date.now()}`, 300);

    if (!email) return json({ error: "Buyer email is required" }, 400);
    if (!reference) return json({ error: "Selar transaction reference is required" }, 400);

    // If the official verification URL is configured, verify the reference server-to-server.
    // The API key stays inside the Edge Function and is never returned to Flutter.
    const selarVerification = await verifyWithSelar(reference);
    if (selarVerification.configured && !selarVerification.ok) {
      console.error("Selar API verification failed", selarVerification.status);
      return json({ error: "Selar transaction verification failed" }, 502);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabase
      .from("destiny_selar_events")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();
    if (existing) return json({ ok: true, duplicate: true });

    const { error: eventError } = await supabase.from("destiny_selar_events").insert({
      event_key: eventKey,
      email,
      product_id: productId,
      product_name: productName,
      amount,
      currency,
      raw_event: payload,
    });
    if (eventError) throw eventError;

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;
    const user = users.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) return json({ ok: true, matched: false });

    const premium = /premium|pro|destiny\s*ai/i.test(`${productId} ${productName}`);
    const plan = premium ? "premium" : "pro";
    const credits = plan === "premium" ? 1000 : 300;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: entitlementError } = await supabase.from("destiny_entitlements").upsert({
      user_id: user.id,
      plan,
      credits,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (entitlementError) throw entitlementError;

    return json({
      ok: true,
      matched: true,
      plan,
      selar_api_verified: selarVerification.configured,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, 500);
  }
});
