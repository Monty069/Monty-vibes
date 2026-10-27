// Vercel serverless function: texts each new website lead to the owner via Twilio.
// Set these in Vercel (Project Settings, Environment Variables):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (your Twilio number, +1431...), LEAD_TO (your cell, +1647...)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (b.company_website) return res.status(200).json({ ok: true }); // bot
  const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
  const name = clean(b.name, 80), business = clean(b.business, 100), phone = clean(b.phone, 30), message = clean(b.message, 600), source = clean(b.source, 30);
  if (!name || phone.replace(/\D/g, "").length < 10) return res.status(400).json({ ok: false, error: "missing" });

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from, LEAD_TO: to } = process.env;
  if (!sid || !token || !from || !to) return res.status(503).json({ ok: false, error: "not_configured" });

  const body = `New lead (unityalpha.ca/${source || "home"})\n${name}${business ? " · " + business : ""}\n${phone}${message ? "\n" + message : ""}`;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  if (!r.ok) return res.status(502).json({ ok: false, error: "sms_failed" });
  return res.status(200).json({ ok: true });
}
