# Destiny AI payment account setup

This payment architecture keeps merchant/bank account details on the server side and keeps the mobile app limited to the public Supabase publishable key and authenticated user session.

## Architecture

```text
Destiny AI Flutter app
        |
        | authenticated request
        v
Supabase Edge Function: create-payment
        |
        +--> Supabase secret key (server only)
        +--> Moniepoint account/payment secrets (server only)
        +--> public.destiny_payments (RLS protected)
        |
        +--> Moniepoint checkout/payment provider
```

Supabase publishable keys may be used by the mobile app when Row Level Security is correctly configured. Secret/service-role keys must never be shipped in the app or committed to GitHub.

## 1. Apply the database schema

Run `supabase/payments_schema.sql` in the Supabase SQL Editor for project `vihbsfrwnslnmheowkhy`.

The `destiny_payments` table allows an authenticated user to read only their own payment records. Payment creation and status changes are server-side operations.

## 2. Add Edge Function secrets

In the Supabase Dashboard, open the Edge Functions secrets/environment section and add these values:

- `MONIEPOINT_ACCOUNT_NAME` — your merchant account name
- `MONIEPOINT_ACCOUNT_NUMBER` — your merchant account number
- `MONIEPOINT_BANK_NAME` — normally `Moniepoint MFB`
- `MONIEPOINT_CHECKOUT_URL` — your approved Moniepoint checkout/payment URL, when available

Do **not** put these values in `flutter/`, `.env` files committed to GitHub, Dart source, or the public database API.

The Edge Function also needs a Supabase server-side secret. Prefer the modern Supabase secret-key system (`SUPABASE_SECRET_KEYS`). Existing deployments can continue using `SUPABASE_SERVICE_ROLE_KEY` while migrating.

## 3. Deploy the function

Deploy `supabase/functions/create-payment/index.ts` as the `create-payment` Edge Function.

The function requires an authenticated Supabase user session. It creates a unique `DESTINY-...` payment reference, records the pending transaction, and returns the configured checkout URL or server-provided bank-transfer details.

## 4. Flutter behavior

The Flutter app should call `create-payment` using the signed-in user's Supabase session. It should never contain a Supabase secret key or a payment-provider private credential.

## 5. Important payment-provider note

The Edge Function is deliberately provider-agnostic until an approved Moniepoint checkout/API credential and endpoint are configured. Do not invent or hard-code an API endpoint or private credential. When Moniepoint provides the merchant API/checkout credentials, put them in Edge Function secrets and implement the provider request server-side.

## 6. Security checklist

- [ ] RLS enabled on `destiny_payments`.
- [ ] Authenticated users can read only their own payment rows.
- [ ] No client INSERT/UPDATE/DELETE policy exists for payments.
- [ ] Merchant account details are Edge Function secrets, not GitHub source.
- [ ] Supabase secret/service-role keys stay server-side.
- [ ] Payment status is changed only by trusted server/provider callback logic.
- [ ] Webhook verification is required before marking a payment `paid`.
- [ ] Never log account numbers, API secrets, card details, PINs, OTPs, or private keys.
