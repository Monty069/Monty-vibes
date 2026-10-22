// Live MT5 sync through MetaApi (read-only, investor password). Pro only.
// Body: { action: "link", localId, login, password, server }   -> provisions + deploys the account
//       { action: "sync", localId, since? }                     -> balance, equity, open P&L, closed deals since `since`
//       { action: "unlink", localId }                           -> removes it from MetaApi
// env: METAAPI_TOKEN, MT5_SYNC_ENABLED ("true" to turn on; off by default, see _shared/flags.ts)
import { CORS, json, userFrom, admin } from "../_shared/common.ts";
import { mt5Enabled, MT5_DISABLED_BODY } from "../_shared/flags.ts";

const PROV = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts";
const clientHost = (region: string) => `https://mt-client-api-v1.${region || "new-york"}.agiliumtrade.ai/users/current/accounts`;

async function api(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { "auth-token": Deno.env.get("METAAPI_TOKEN")!, "Content-Type": "application/json", Accept: "application/json", ...(init.headers || {}) } });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  return { status: r.status, body, retry: Number(r.headers.get("retry-after") || 0) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Kill switch: checked before auth, body parsing, DB access or any MetaApi call, so no broker
  // operation (link, sync, unlink) is reachable while the integration is disabled.
  if (!mt5Enabled((k) => Deno.env.get(k))) return json(MT5_DISABLED_BODY, 503);
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const user = await userFrom(req);
  if (!user) return json({ error: "Sign in first." }, 401);
  const db = admin();
  const { data: pro } = await db.rpc("is_pro", { uid: user.id });
  if (!pro) return json({ error: "Live MT5 sync is a Pro feature.", upgrade: true }, 402);

  const b = await req.json().catch(() => ({}));
  const localId = String(b.localId || "");
  if (!localId) return json({ error: "Missing account." }, 400);

  if (b.action === "link") {
    const login = String(b.login || "").replace(/\D/g, ""), server = String(b.server || "").trim(), password = String(b.password || "");
    if (!login || !server || !password) return json({ error: "Enter login, investor password and server." }, 400);
    const tx = crypto.randomUUID().replace(/-/g, "");
    let res;
    for (let i = 0; i < 6; i++) {
      res = await api(PROV, { method: "POST", headers: { "transaction-id": tx }, body: JSON.stringify({ login, password, server, name: `fm-${user.id.slice(0, 8)}-${login}`, platform: "mt5", magic: 0, manualTrades: true, reliability: "regular" }) });
      if (res.status !== 202) break;
      await new Promise((r) => setTimeout(r, Math.min((res!.retry || 5), 10) * 1000));
    }
    if (!res || res.status === 202) return json({ error: "Your broker server is still being checked. Try again in a minute." }, 504);
    if (res.status >= 300) return json({ error: res.body?.message || "MetaApi could not connect that account. Check the server name and investor password." }, 400);
    const id = res.body.id;
    if (res.body.state !== "DEPLOYED") await api(`${PROV}/${id}/deploy`, { method: "POST" });
    await db.from("mt5_links").upsert({ user_id: user.id, local_account_id: localId, metaapi_account_id: id, login, server, status: "deploying" });
    return json({ ok: true, status: "deploying" });
  }

  const { data: link } = await db.from("mt5_links").select("*").eq("user_id", user.id).eq("local_account_id", localId).maybeSingle();
  if (!link) return json({ error: "This account is not connected." }, 404);

  if (b.action === "unlink") {
    await api(`${PROV}/${link.metaapi_account_id}`, { method: "DELETE" });
    await db.from("mt5_links").delete().eq("user_id", user.id).eq("local_account_id", localId);
    return json({ ok: true });
  }

  if (b.action === "sync") {
    const acc = await api(`${PROV}/${link.metaapi_account_id}`);
    if (acc.status >= 300) return json({ error: "MetaApi account missing. Reconnect it." }, 404);
    const state = acc.body.state, conn = acc.body.connectionStatus;
    if (state !== "DEPLOYED" || conn !== "CONNECTED") {
      await db.from("mt5_links").update({ status: state === "DEPLOYED" ? "connecting" : "deploying" }).eq("user_id", user.id).eq("local_account_id", localId);
      return json({ ok: true, status: state === "DEPLOYED" ? "connecting" : "deploying" });
    }
    const base = `${clientHost(acc.body.region)}/${link.metaapi_account_id}`;
    const since = b.since ? new Date(Number(b.since)) : new Date(Date.now() - 30 * 86400000);
    const [info, pos, deals] = await Promise.all([
      api(`${base}/account-information`),
      api(`${base}/positions`),
      api(`${base}/history-deals/time/${since.toISOString()}/${new Date().toISOString()}`),
    ]);
    if (info.status >= 300) return json({ error: info.body?.message || "Could not read the account." }, 502);
    const positions = Array.isArray(pos.body) ? pos.body : [];
    const openPnl = positions.reduce((t: number, p: any) => t + (p.profit || 0) + (p.swap || 0) + (p.commission || 0), 0);
    // Pair entry/exit deals into closed trades (exit deals carry the realised profit).
    const list = Array.isArray(deals.body) ? deals.body : [];
    const entries = new Map(list.filter((d: any) => d.entryType === "DEAL_ENTRY_IN").map((d: any) => [d.positionId, d]));
    const trades = list.filter((d: any) => d.entryType === "DEAL_ENTRY_OUT" || d.entryType === "DEAL_ENTRY_OUT_BY").map((d: any) => {
      const e: any = entries.get(d.positionId);
      return {
        id: "mt5-" + d.id, symbol: d.symbol, side: d.type === "DEAL_TYPE_SELL" ? "buy" : "sell", lots: d.volume,
        openTime: e ? Date.parse(e.time) : Date.parse(d.time), closeTime: Date.parse(d.time),
        profit: d.profit || 0, commission: (d.commission || 0) + (e?.commission || 0), swap: d.swap || 0, source: "mt5",
      };
    });
    const snapshot = { balance: info.body.balance, equity: info.body.equity, currency: info.body.currency, openPnl, openPositions: positions.length, ts: Date.now() };
    await db.from("mt5_links").update({ status: "live", snapshot, last_sync: new Date().toISOString() }).eq("user_id", user.id).eq("local_account_id", localId);
    return json({ ok: true, status: "live", snapshot, trades });
  }

  return json({ error: "Unknown action." }, 400);
});
