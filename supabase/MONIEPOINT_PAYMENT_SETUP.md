# Moniepoint payment verification setup

The app now supports a secure bank-transfer flow:

1. The authenticated app creates a pending `destiny_payments` record.
2. The server returns the configured Moniepoint recipient details.
3. The user enters the transaction reference/session ID after transferring.
4. `verify-payment` calls the configured Moniepoint verification provider from the server only.
5. The server checks successful status, amount, recipient account, and transaction reference.
6. Only a verified transaction changes the payment to `paid` and activates the user's entitlement.

## Supabase Edge Function secrets

Set these as Supabase Edge Function secrets. Never put the API key in Flutter or commit it to GitHub.

- `MONIEPOINT_ACCOUNT_NAME` = your exact Moniepoint account name
- `MONIEPOINT_ACCOUNT_NUMBER` = your Moniepoint account number
- `MONIEPOINT_BANK_NAME` = `Moniepoint MFB`
- `MONIEPOINT_VERIFY_URL` = the transaction-verification endpoint supplied by Moniepoint for your account/product
- `MONIEPOINT_API_KEY` = the server-side credential supplied by Moniepoint

The repository intentionally does **not** commit the account number or API credentials.

## Important

Do not treat a screenshot, receipt image, or user-entered reference as proof of payment. The reference is only an input to the server-side verification call.

The current verification adapter is deliberately provider-agnostic because the exact transaction-verification endpoint and response schema depend on the Moniepoint product/API credentials enabled for the merchant. The official Moniepoint POS API documentation is available at https://docs.pos.moniepoint.com/.
