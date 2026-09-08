import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-selar-webhook-secret",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("SELAR_WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-selar-webhook-secret") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.data ?? payload;
    const email = String(event?.email ?? event?.customer?.email ?? event?.buyer?.email ?? "").trim().toLowerCase();
    const productId = String(event?.product_id ?? event?.product?.id ?? "");
    const productName = String(event?.product_name ?? event?.product?.name ?? "");
    const amount = Number(event?.amount ?? event?.total ?? event?.price ?? 0);
    const currency = String(event?.currency ?? "NGN");
    const eventKey = String(payload?.id ?? event?.id ?? event?.reference ?? event?.order_id ?? `${email}:${productId}:${event?.created_at ?? Date.now()}`);
    if (!email) return json({ error: "Buyer email is required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await supabase.from("destiny_selar_events").select("id").eq("event_key", eventKey).maybeSingle();
    if (existing) return json({ ok: true, duplicate: true });

    await supabase.from("destiny_selar_events").insert({
      event_key: eventKey,
      email,
      product_id: productId,
      product_name: productName,
      amount,
      currency,
      raw_event: payload,
    });

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
    return json({ ok: true, matched: true, plan });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, 500);
  }
});
