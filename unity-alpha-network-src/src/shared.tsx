import { useEffect, useState, type FormEvent } from "react";
import { SITE } from "./site";

export const CSS = `
.ua-root{--ua-amber:#f6b545;--ua-coral:#ff6f5b;--ua-pink:#ff4f9a;overflow-x:clip}
.font-display{font-family:'Archivo',ui-sans-serif,system-ui,sans-serif;font-stretch:125%}
.font-body{font-family:'Geist',ui-sans-serif,system-ui,sans-serif}
html{scroll-behavior:smooth}
.ua-grad{background:linear-gradient(100deg,var(--ua-amber),var(--ua-coral) 55%,var(--ua-pink));-webkit-background-clip:text;background-clip:text;color:transparent}
.ua-mark{color:#fff;background:linear-gradient(transparent 62%,rgba(246,181,69,.38) 62%);padding:0 .08em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.ua-outline{color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.55);text-shadow:0 0 40px rgba(246,181,69,.35),0 0 90px rgba(255,111,91,.25);filter:drop-shadow(0 0 18px rgba(246,181,69,.25))}
@media (max-width:767px){.ua-outline{transform:translateY(-24vh);font-size:19vw;opacity:.85}}
@media (min-width:768px){.ua-outline{transform:translateY(-17vh);font-size:min(11vw,22vh)}}
.ua-outline-sm{color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.5)}
.ua-chip{display:inline-block;flex:none;border-radius:12px;background:url(/brand/unity-alpha-icon.svg) center/100% 100% no-repeat;box-shadow:0 0 28px -4px rgba(246,181,69,.7)}
.ua-dot{display:inline-block;width:7px;height:7px;border-radius:99px;background:var(--ua-amber);box-shadow:0 0 12px var(--ua-amber)}
.ua-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:999px;padding:.85rem 1.6rem;font-weight:600;color:#160e02;background:linear-gradient(135deg,#ffd27a,var(--ua-amber) 45%,var(--ua-coral));box-shadow:0 10px 40px -10px rgba(246,181,69,.8),inset 0 1px 0 rgba(255,255,255,.5);transition:transform .2s,box-shadow .2s;border:0;cursor:pointer;font-size:inherit}
.ua-btn:hover{transform:translateY(-1px);box-shadow:0 14px 50px -8px rgba(246,181,69,.95),inset 0 1px 0 rgba(255,255,255,.5)}
.ua-btn:active{transform:scale(.97)}
.ua-btn[disabled]{opacity:.6;cursor:wait}
.ua-btn-ghost{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:999px;padding:.85rem 1.6rem;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);backdrop-filter:blur(14px);transition:background .2s,border-color .2s}
.ua-btn-ghost:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.4)}
.ua-glass{border-radius:24px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(160deg,rgba(20,18,26,.62),rgba(10,10,14,.45));backdrop-filter:blur(18px) saturate(140%);box-shadow:0 30px 80px -30px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.08)}
.ua-card{position:relative;border-radius:24px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015));transition:border-color .4s,transform .5s cubic-bezier(.2,.7,.2,1),background .4s,opacity .9s,translate .9s}
.ua-card:hover{border-color:rgba(246,181,69,.35);background:linear-gradient(160deg,rgba(246,181,69,.08),rgba(255,255,255,.015));transform:translateY(-4px)}
.ua-vignette{background:radial-gradient(ellipse at center,transparent 45%,rgba(6,7,11,.55) 100%),linear-gradient(to bottom,rgba(6,7,11,.45),transparent 22%,transparent 60%,rgba(6,7,11,.85))}
.ua-progress{background:linear-gradient(90deg,var(--ua-amber),var(--ua-coral),var(--ua-pink));box-shadow:0 0 14px var(--ua-amber)}
.ua-glow-a,.ua-glow-b{position:absolute;pointer-events:none;border-radius:999px;filter:blur(120px);opacity:.35}
.ua-glow-a{width:520px;height:520px;left:-120px;top:10%;background:var(--ua-coral)}
.ua-glow-b{width:600px;height:600px;right:-160px;top:20%;background:#7a4dff;opacity:.22}
.ua-row{transition:background .3s}
.ua-row:hover{background:linear-gradient(90deg,rgba(246,181,69,.07),transparent)}
.ua-arrow{display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(255,255,255,.18);font-size:18px;transition:all .3s}
.ua-row:hover .ua-arrow{background:var(--ua-amber);color:#160e02;border-color:var(--ua-amber);transform:rotate(45deg)}
.ua-marquee{overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.ua-marquee-track{display:flex;width:max-content;animation:ua-mq 38s linear infinite}
@keyframes ua-mq{to{transform:translateX(-50%)}}
[data-reveal]{opacity:0;translate:0 28px;transition:opacity .9s cubic-bezier(.2,.7,.2,1),translate .9s cubic-bezier(.2,.7,.2,1)}
[data-reveal].is-in{opacity:1;translate:0 0}
.ua-faq summary::-webkit-details-marker{display:none}
.ua-price{display:inline-flex;align-items:center;gap:.5rem;font-size:13px;letter-spacing:.04em;color:rgba(255,255,255,.75)}
.ua-price b{font-weight:600;color:#fff}
.ua-field{display:flex;flex-direction:column;gap:.45rem;text-align:left}
.ua-field label{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.ua-field input,.ua-field textarea{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(6,7,11,.55);color:#fff;padding:.85rem 1rem;font:inherit;font-size:15px;outline:none;transition:border-color .2s,background .2s}
.ua-field input::placeholder,.ua-field textarea::placeholder{color:rgba(255,255,255,.3)}
.ua-field input:focus,.ua-field textarea:focus{border-color:var(--ua-amber);background:rgba(6,7,11,.75)}
.ua-field textarea{min-height:96px;resize:vertical}
.ua-float{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:60;display:flex;gap:10px;transition:opacity .4s,transform .4s}
.ua-float.off{opacity:0;transform:translateY(12px);pointer-events:none}
.ua-float a{box-shadow:0 12px 40px -10px rgba(0,0,0,.8)}
.ua-float .ua-callchip{display:inline-flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(10,10,14,.75);backdrop-filter:blur(14px);color:#fff}
.ua-float .ua-callchip:hover{border-color:var(--ua-amber)}
.ua-prose p{color:rgba(255,255,255,.68);line-height:1.7}
:focus-visible{outline:2px solid var(--ua-amber);outline-offset:3px}
@media (prefers-reduced-motion:reduce){.ua-marquee-track{animation:none}[data-reveal]{opacity:1;translate:0 0}}
`;

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,600;125,800;125,900&family=Geist:wght@400;500;600&display=swap";

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);

/** base = "" on the homepage, "/" on sub-pages so section links go back home. */
export function Nav({ base = "" }: { base?: string }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a href={base ? "/" : "#top"} className="flex items-center gap-2.5" aria-label="Unity Alpha Network home">
          <span className="ua-chip h-9 w-9" aria-hidden="true" />
          <span className="hidden font-display text-sm font-extrabold tracking-tight text-white sm:block">Unity Alpha Network</span>
        </a>
        <div
          className={`hidden items-center gap-1 rounded-full border border-white/10 p-1 backdrop-blur-xl transition-colors md:flex ${
            solid ? "bg-black/50" : "bg-white/5"
          }`}
        >
          {[
            ["Services", `${base}#services`],
            ["Demos", `${base}#work`],
            ["Areas", "/areas/"],
            ["FAQ", `${base}#faq`],
          ].map(([l, h]) => (
            <a key={l} href={h} className="rounded-full px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href={`tel:${SITE.phoneTel}`} className="hidden text-sm text-white/75 transition-colors hover:text-white lg:inline">
            {SITE.phoneDisplay}
          </a>
          <a href={`${base}#contact`} className="ua-btn !px-5 !py-2.5 text-sm">
            Get a site
          </a>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-10 md:px-12">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-xs text-white/45 md:flex-row md:items-center">
        <span>© Unity Alpha Network, Ontario · Websites for local businesses across the GTA</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href="/areas/" className="transition-colors hover:text-white">Areas we serve</a>
          <a href="/websites-for-salons-spas/" className="transition-colors hover:text-white">Salons &amp; spas</a>
          <a href="/websites-for-restaurants/" className="transition-colors hover:text-white">Restaurants</a>
          <a href={SITE.instagram.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            Instagram {SITE.instagram.handle}
          </a>
          <a href={SITE.x.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            X {SITE.x.handle}
          </a>
          <a href={`tel:${SITE.phoneTel}`} className="transition-colors hover:text-white">{SITE.phoneDisplay}</a>
        </nav>
      </div>
    </footer>
  );
}

/** Floating contact. Shows once the visitor is past the element `afterId` (the hero film on the homepage). */
export function FloatingContact({ afterId, base = "" }: { afterId?: string; base?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => {
      const contact = document.getElementById("contact");
      const nearContact = contact ? contact.getBoundingClientRect().top < window.innerHeight * 0.6 : false;
      const hero = afterId ? document.getElementById(afterId) : null;
      const threshold = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight : window.innerHeight * 0.8;
      setOn(window.scrollY > threshold && !nearContact);
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      window.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
    };
  }, [afterId]);
  return (
    <div className={`ua-float ${on ? "" : "off"}`} aria-hidden={!on}>
      <a href={`tel:${SITE.phoneTel}`} className="ua-callchip" aria-label={`Call ${SITE.phoneDisplay}`} tabIndex={on ? 0 : -1}>
        <PhoneIcon />
      </a>
      <a href={`${base}#contact`} className="ua-btn !px-5 !py-3 text-sm" tabIndex={on ? 0 : -1}>
        Start a project
      </a>
    </div>
  );
}

type Status = "idle" | "sending" | "sent" | "error";

export function LeadForm({ source = "home" }: { source?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = Object.fromEntries(f.entries()) as Record<string, string>;
    if (data.company_website) return; // honeypot
    if (!data.name?.trim()) return setErr("Add your name so we know who to ask for.");
    if ((data.phone || "").replace(/\D/g, "").length < 10) return setErr("Add a 10-digit phone number so we can reach you.");
    setErr("");
    setStatus("sending");
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="ua-glass mx-auto max-w-xl p-8 text-left" role="status">
        <p className="font-display text-2xl font-extrabold tracking-tight">Got it. Talk soon.</p>
        <p className="mt-3 text-white/70">
          Gagan will call you back, usually the same day. Want to hear our AI receptionist in the meantime? Call{" "}
          <a className="text-white underline decoration-[var(--ua-amber)] underline-offset-4" href={`tel:${SITE.phoneTel}`}>
            {SITE.phoneDisplay}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="ua-glass mx-auto grid max-w-xl gap-4 p-6 text-left md:grid-cols-2 md:p-8" aria-label="Start a project">
      <div className="ua-field">
        <label htmlFor="lf-name">Your name</label>
        <input id="lf-name" name="name" autoComplete="name" required placeholder="Gagan" />
      </div>
      <div className="ua-field">
        <label htmlFor="lf-business">Business name</label>
        <input id="lf-business" name="business" autoComplete="organization" placeholder="Glow Nail Studio" />
      </div>
      <div className="ua-field md:col-span-2">
        <label htmlFor="lf-phone">Phone</label>
        <input id="lf-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="647 555 0123" />
      </div>
      <div className="ua-field md:col-span-2">
        <label htmlFor="lf-msg">What do you need?</label>
        <textarea id="lf-msg" name="message" placeholder="New website for my salon in Brampton, maybe the AI receptionist too." />
      </div>
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-white/45">We reply by phone, usually the same day. No spam, ever.</p>
        <button type="submit" className="ua-btn" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send"}
        </button>
      </div>
      <p className="min-h-[1.25rem] text-sm text-[#ff9a8a] md:col-span-2" role="alert">
        {err ||
          (status === "error" ? (
            <>
              That didn't go through. Call or text us at{" "}
              <a className="underline underline-offset-4" href={`tel:${SITE.phoneTel}`}>
                {SITE.phoneDisplay}
              </a>{" "}
              and we'll pick it up from there.
            </>
          ) : null)}
      </p>
    </form>
  );
}
