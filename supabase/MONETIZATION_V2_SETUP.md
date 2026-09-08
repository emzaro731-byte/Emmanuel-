# Destiny AI Monetization V2

The repository now contains the server-side foundation for Free / Pro / Premium usage limits and AI credits.

## 1. Run the SQL

Open the Supabase SQL Editor and run:

`supabase/monetization_v2.sql`

This creates the daily usage table and the atomic `reserve_destiny_ai_request()` function.

Limits:

- Free: 20 AI requests/day
- Pro: 200 AI requests/day
- Premium: 1,000 AI requests/day
- Purchased credits can be used after the daily allowance is exhausted.

## 2. Use the gated AI function

The new Edge Function is:

`destiny-ai-gated`

It checks the signed-in user's allowance before proxying the request to the existing `destiny-ai` function. The original AI provider keys remain server-side.

Update the mobile app's AI function constant from:

`const AI_FUNCTION_NAME = "destiny-ai";`

to:

`const AI_FUNCTION_NAME = "destiny-ai-gated";`

No API keys or service-role keys belong in the mobile app.

## 3. Entitlement client helper

`lib/entitlements.ts` provides:

- `getDestinyEntitlement()`
- `reserveDestinyAIRequest()`

Use the first for the Pro/credits dashboard and the second only when the client needs to display usage information. The actual authorization must remain server-side.

## 4. Payments

The existing `destiny_payments` table and `create-payment` / `verify-payment` functions remain in place. Selar webhook processing can also grant `destiny_entitlements` after verified purchases.

Before production, configure provider secrets only in Supabase Edge Function secrets. Supabase recommends protecting exposed tables with RLS and keeping secret/service-role keys off the client.
