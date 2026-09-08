export function getSelarApiKey(): string {
  return Deno.env.get("SELAR_API_KEY")?.trim() ?? "";
}

export function getSelarVerifyUrl(): string {
  return Deno.env.get("SELAR_VERIFY_URL")?.trim() ?? "";
}

/**
 * Calls the configured Selar verification endpoint without exposing the API key
 * to Flutter, the browser, or GitHub source code.
 *
 * SELAR_VERIFY_URL is intentionally required to be configured separately.
 * We do not guess a Selar endpoint because the public Selar documentation does
 * not currently document the transaction-verification path for the Third Party
 * Integration API key.
 */
export async function verifyWithSelar(reference: string): Promise<{
  configured: boolean;
  ok: boolean;
  status: number;
  data: unknown;
}> {
  const apiKey = getSelarApiKey();
  const verifyUrl = getSelarVerifyUrl();

  if (!apiKey || !verifyUrl) {
    return { configured: false, ok: false, status: 0, data: null };
  }

  let url: URL;
  try {
    url = new URL(verifyUrl);
  } catch {
    throw new Error("SELAR_VERIFY_URL is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("SELAR_VERIFY_URL must use HTTPS.");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ reference, transaction_reference: reference }),
  });

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw: raw.slice(0, 2000) };
  }

  return {
    configured: true,
    ok: response.ok,
    status: response.status,
    data,
  };
}
