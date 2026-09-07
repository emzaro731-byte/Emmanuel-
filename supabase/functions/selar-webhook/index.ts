import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-selar-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('SELAR_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'SELAR_WEBHOOK_SECRET is not configured' }, 500);

  const signature = req.headers.get('x-selar-signature');
  if (!signature || signature !== secret) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Selar payloads can change by integration. Keep the parser tolerant, but
  // require a successful payment and a customer email before granting access.
  const event = body.event ?? body.type ?? body.status;
  const status = String(body.status ?? body.payment_status ?? body.paymentStatus ?? event ?? '').toLowerCase();
  const successful = ['paid', 'successful', 'success', 'completed', 'complete'].includes(status);
  if (!successful) return json({ ok: true, ignored: true, reason: 'not a successful payment' });

  const customer = (body.customer && typeof body.customer === 'object')
    ? body.customer as Record<string, unknown>
    : {};
  const product = (body.product && typeof body.product === 'object')
    ? body.product as Record<string, unknown>
    : {};

  const email = (
    pick(body, ['email', 'customer_email', 'customerEmail', 'buyer_email', 'buyerEmail']) ??
    pick(customer, ['email', 'email_address', 'emailAddress'])
  )?.toLowerCase();

  const productName = (
    pick(body, ['product_name', 'productName', 'item_name', 'itemName']) ??
    pick(product, ['name', 'title'])
  )?.toLowerCase() ?? '';

  if (!email) return json({ error: 'Customer email is required' }, 400);
  if (!productName.includes('premium')) {
    return json({ ok: true, ignored: true, reason: 'not Destiny AI Premium' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Supabase service configuration missing' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error: userError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (userError) return json({ error: userError.message }, 500);

  const user = users.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    // The customer can create/sign in to Destiny AI using the same email and
    // the next webhook retry can grant access. Do not create accounts silently.
    return json({ ok: true, pending: true, reason: 'Destiny AI account not found' });
  }

  const reference = pick(body, ['reference', 'payment_reference', 'paymentReference', 'transaction_id', 'transactionId']) ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from('destiny_profiles')
    .update({
      plan: 'premium',
      premium_active: true,
      premium_source: 'selar',
      premium_customer_email: email,
      premium_started_at: now,
      premium_expires_at: null,
      updated_at: now,
    })
    .eq('user_id', user.id);

  if (updateError) return json({ error: updateError.message }, 500);

  await admin.from('destiny_payments').upsert({
    user_id: user.id,
    reference,
    plan: 'premium',
    amount_kobo: Number(body.amount_kobo ?? body.amount ?? 1),
    currency: String(body.currency ?? 'NGN'),
    status: 'paid',
    provider: 'selar',
    paid_at: now,
    metadata: body,
  }, { onConflict: 'reference' });

  return json({ ok: true, premium: true, user_id: user.id });
});
