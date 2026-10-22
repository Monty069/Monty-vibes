// Webhook signature checks. Pure WebCrypto (no imports) so they run under Deno and Node tests alike.

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

// Constant-time string comparison (avoids leaking how many leading characters matched).
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function hmac(hash: "SHA-256" | "SHA-512", secret: string, data: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

// Stripe: header "t=<unix>,v1=<hex>[,v1=...]", signed payload "<t>.<raw body>", 5-minute tolerance.
export async function verifyStripe(payload: string, header: string, secret: string, nowSec = Date.now() / 1000, toleranceSec = 300) {
  const parts = header.split(",").map((p) => p.trim());
  const t = (parts.find((p) => p.startsWith("t=")) || "").slice(2);
  const sigs = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!/^\d+$/.test(t) || !sigs.length) return false;
  if (Math.abs(nowSec - Number(t)) > toleranceSec) return false;
  const want = await hmac("SHA-256", secret, `${t}.${payload}`);
  return sigs.some((s) => safeEqual(s, want));
}

// NOWPayments: x-nowpayments-sig = HMAC-SHA512 of the JSON body with keys sorted recursively.
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}
export async function verifyNowPayments(body: unknown, sigHeader: string, secret: string) {
  if (!sigHeader) return false;
  const want = await hmac("SHA-512", secret, JSON.stringify(sortKeys(body)));
  return safeEqual(sigHeader.toLowerCase(), want);
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
