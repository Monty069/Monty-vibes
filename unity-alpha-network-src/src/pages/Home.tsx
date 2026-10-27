import { useEffect, useRef, useState } from "react";
import { CSS, Footer, FloatingContact, LeadForm, Nav, useReveal } from "../shared";
import { FRONT_DESK_ALONE, LAUNCH, PACKAGES, SITE, TESTIMONIALS, cities, demos } from "../site";

const FRAME_COUNT = 240;
const frameSrc = (i: number) => `/frames/f_${String(i).padStart(3, "0")}.webp`;

const chapters = [
  { from: 0.16, to: 0.36, n: "01", label: "Above the city", title: "Your business, seen by the whole GTA.", body: "Most local customers search before they call. If you are not there, your competitor is." },
  { from: 0.4, to: 0.6, n: "02", label: "Street level", title: "Built to stop the scroll.", body: "Phone, laptop, tablet. Every page is designed to make a first-time visitor pay attention." },
  { from: 0.64, to: 0.82, n: "03", label: "The neighbourhood", title: "Made for local business.", body: "Salons, kitchens, clinics, trades. Real sites for businesses that still run on a phone number." },
  { from: 0.86, to: 1.01, n: "04", label: "Golden hour", title: "Live in days, not months.", body: "Tell us about the business on a short call. We send you a working site to look at." },
];

const steps = [
  { n: "01", title: "A short call", body: "We learn what the business does and who it serves." },
  { n: "02", title: "You see it first", body: "We send a working demo built for your category before you pay anything." },
  { n: "03", title: "We make it yours", body: "Your name, photos, services and prices. Your domain." },
  { n: "04", title: "You go live", body: "Launched in days. Updates whenever you need them." },
];

const faqs = [
  { q: "How fast can my site be live?", a: "Most local business sites go live within days of the first call, once we have your details and photos." },
  { q: "Do I need to know anything technical?", a: "No. We handle the design, build, domain and hosting. You tell us what you want changed and we change it." },
  { q: "Can I see something before I commit?", a: "Yes. We send you a live demo for your type of business so you can see exactly what you would get." },
  { q: "What is the AI receptionist?", a: "A natural-sounding voice assistant that answers your business line when you're busy or closed. It books appointments, takes callbacks and texts you a summary of every call. You keep your number." },
  { q: "What does the $100 a month cover?", a: "Everything after launch on the full package: hosting, the AI receptionist on your phone line, and any updates you need, like new prices, photos, hours or services. No surprise bills." },
  { q: "Which areas do you serve?", a: "Brampton, Mississauga, Toronto and the wider GTA. Calls and demos happen remotely, so anywhere works." },
];

const proof = [
  { big: "$0", label: "until you've seen it", body: "You get a working demo for your kind of business before you pay anything." },
  { big: "Days", label: "not months", body: "Most local sites go live within days of the first call, once we have your details and photos." },
  { big: String(demos.length), label: "live demos", body: "Spa, restaurant, nail studio, plumbing and auto repair. Open any of them on your phone, right now." },
];

function clamp(v: number, a = 0, b = 1) {
  return Math.min(b, Math.max(a, v));
}
function fade(p: number, from: number, to: number) {
  const edge = 0.04;
  if (p < from || p > to) return 0;
  return clamp(Math.min((p - from) / edge, (to - p) / edge));
}

function FilmHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    let count = 0, target = 0, current = 0, lastDrawn = -1, raf = 0, alive = true;
    const nearestLoaded = (i: number) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        const a = imgs[i - d];
        if (a && a.complete && a.naturalWidth) return a;
        const b = imgs[i + d];
        if (b && b.complete && b.naturalWidth) return b;
      }
      return null;
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      lastDrawn = -1;
    };
    const draw = (i: number) => {
      const img = nearestLoaded(i);
      if (!img) return;
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const p = clamp(-r.top / total);
      target = p * (FRAME_COUNT - 1);
      setProgress(p);
    };
    const loop = () => {
      if (!alive) return;
      current += (target - current) * 0.14;
      const idx = Math.round(current);
      if (idx !== lastDrawn) {
        draw(idx);
        lastDrawn = idx;
      }
      raf = requestAnimationFrame(loop);
    };
    const order: number[] = [];
    const seen = new Set<number>();
    for (const step of [16, 8, 4, 2, 1])
      for (let i = 0; i < FRAME_COUNT; i += step)
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
    let next = 0;
    const loadNext = () => {
      if (!alive || next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => {
        count++;
        setLoaded(count / FRAME_COUNT);
        if (i === 0 || Math.abs(i - Math.round(current)) < 3) lastDrawn = -1;
        loadNext();
      };
      img.src = frameSrc(i);
      imgs[i] = img;
    };
    for (let k = 0; k < 6; k++) loadNext();
    size();
    onScroll();
    loop();
    window.addEventListener("resize", size);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const introOpacity = clamp(1 - progress / 0.1);
  const wordScale = 1 + progress * 0.6;
  const active = chapters.findIndex((c) => progress >= c.from && progress <= c.to);

  return (
    <section ref={wrapRef} id="top" className="relative" style={{ height: "640vh" }} aria-label="Intro film">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        <div className="ua-vignette pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#06070b] transition-opacity duration-700"
          style={{ opacity: loaded > 0.12 ? 0 : 1 }}
        >
          <div className="flex flex-col items-center gap-5">
            <span className="ua-chip h-12 w-12" />
            <div className="h-px w-40 overflow-hidden bg-white/10">
              <div className="h-full bg-[var(--ua-amber)]" style={{ width: `${clamp(loaded / 0.12) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: introOpacity, transform: `scale(${wordScale})` }}>
          <p aria-hidden="true" className="ua-outline select-none text-center font-display text-[17vw] font-black leading-[0.82] tracking-tight md:text-[13vw]">
            UNITY
            <br />
            ALPHA
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 md:px-12 md:pb-14" style={{ opacity: introOpacity, transform: `translateY(${progress * -120}px)` }}>
          <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-white/70">
                <span className="ua-dot" /> Brampton &amp; the GTA
              </p>
              <h1 className="max-w-[14ch] font-display text-[11vw] font-extrabold leading-[0.95] tracking-tight text-white md:text-[5.2vw]">
                Websites that make the city <span className="ua-grad">look twice.</span>
              </h1>
            </div>
            <div className="flex max-w-sm flex-col gap-5">
              <p className="text-base leading-relaxed text-white/75">
                Unity Alpha Network designs and builds high-end websites for local businesses. Scroll to take the flight.
              </p>
              <div className="flex gap-3">
                <a href="#contact" className="ua-btn">Get your site</a>
                <a href="#work" className="ua-btn-ghost">See demos</a>
              </div>
            </div>
          </div>
        </div>
        {chapters.map((c, i) => {
          const o = fade(progress, c.from, c.to);
          const y = (1 - o) * 30;
          return (
            <div
              key={c.n}
              className={`pointer-events-none absolute inset-0 z-10 flex px-5 md:px-12 ${
                i % 2 === 0 ? "items-end pb-24 md:items-center md:pb-0" : "items-end justify-end pb-24 md:items-center md:pb-0"
              }`}
              style={{ opacity: o }}
            >
              <div
                className={`ua-glass max-w-md p-6 md:p-8 ${i % 2 === 0 ? "" : "md:mr-16"}`}
                style={{ transform: `translateY(${y}px)`, pointerEvents: o > 0.5 ? "auto" : "none" }}
              >
                <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-[var(--ua-amber)]">
                  <span className="h-px w-8 bg-[var(--ua-amber)]" />
                  {c.n} · {c.label}
                </p>
                <h2 className="font-display text-3xl font-extrabold leading-[1.02] tracking-tight text-white md:text-4xl">{c.title}</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/70">{c.body}</p>
                {c.n === "04" && (
                  <a href="#contact" className="ua-btn mt-6 inline-flex">
                    Start a project
                  </a>
                )}
              </div>
            </div>
          );
        })}
        <div className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-4 md:flex" aria-hidden="true">
          {chapters.map((c, i) => (
            <div key={c.n} className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.2em] transition-all duration-500" style={{ opacity: active === i ? 1 : 0, color: "rgba(255,255,255,.85)" }}>
                {c.label}
              </span>
              <span
                className="block rounded-full transition-all duration-500"
                style={{
                  width: active === i ? 8 : 5,
                  height: active === i ? 8 : 5,
                  background: active === i ? "var(--ua-amber)" : "rgba(255,255,255,.35)",
                  boxShadow: active === i ? "0 0 14px var(--ua-amber)" : "none",
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/10">
          <div className="ua-progress h-full" style={{ width: `${progress * 100}%` }} />
        </div>
        <div
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-[11px] uppercase tracking-[0.3em] text-white/60 transition-opacity"
          style={{ opacity: progress < 0.02 ? 1 : 0 }}
          aria-hidden="true"
        >
          Scroll
        </div>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section id="proof" className="px-5 py-28 md:px-12 md:py-36" aria-labelledby="proof-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end" data-reveal>
          <h2 id="proof-title" className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">
            No <span className="ua-grad">guesswork.</span>
          </h2>
          <p className="max-w-sm text-white/60">You see it, hear it and click through it before you spend a dollar.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {proof.map((p, i) => (
            <div key={p.label} className="ua-card p-7 md:p-8" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <p className="font-display text-5xl font-black tracking-tight md:text-6xl">
                <span className="ua-grad">{p.big}</span>
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-white/55">{p.label}</p>
              <p className="mt-8 leading-relaxed text-white/65">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="ua-glass mt-4 flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-10" data-reveal>
          <div className="max-w-xl">
            <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-[var(--ua-amber)]">
              <span className="ua-dot" /> Live right now
            </p>
            <h3 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-4xl">Call our AI receptionist.</h3>
            <p className="mt-3 leading-relaxed text-white/65">
              Ava answers our line the way she'd answer yours: books the call, takes a callback, and texts the owner a summary.
              Ask her anything.
              {" "}
              <span className="text-white/80">Included in the full package.</span>
            </p>
          </div>
          <a href={`tel:${SITE.phoneTel}`} className="ua-btn !px-7 !py-4 whitespace-nowrap">
            Call {SITE.phoneDisplay}
          </a>
        </div>

        {TESTIMONIALS.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} className="ua-card p-7 md:p-9" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                {t.result && <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--ua-amber)]">{t.result}</p>}
                <blockquote className="font-display text-xl font-extrabold leading-snug tracking-tight md:text-2xl">“{t.quote}”</blockquote>
                <figcaption className="mt-6 text-sm text-white/55">
                  {t.name} · {t.business}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function usePackagePrefill() {
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-package]");
      const msg = document.getElementById("lf-msg") as HTMLTextAreaElement | null;
      if (a && msg && !msg.value.trim()) msg.value = `Interested in: ${a.dataset.package}. `;
    };
    document.addEventListener("click", f);
    return () => document.removeEventListener("click", f);
  }, []);
}

export function Home() {
  useReveal();
  usePackagePrefill();
  return (
    <div className="ua-root min-h-screen bg-[#06070b] font-body text-white antialiased">
      <style>{CSS}</style>
      <Nav />
      <main>
        <FilmHero />

        <section className="relative px-5 py-32 md:px-12 md:py-44">
          <div className="ua-glow-a" />
          <div className="mx-auto max-w-6xl" data-reveal>
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-white/50">What we do</p>
            <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white/45 md:text-6xl">
              Thousands of GTA businesses <span className="ua-mark">still have no website.</span> We build them one that{" "}
              <span className="ua-grad">looks like a brand</span>, loads in a second and <span className="ua-mark">turns searches into calls.</span>
            </h2>
          </div>
        </section>

        <div className="ua-marquee border-y border-white/10 py-5" aria-hidden="true">
          <div className="ua-marquee-track font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">
            {[...cities, ...cities].map((c, i) => (
              <span key={i} className="flex items-center gap-8 pr-8">
                <span className={i % 2 ? "ua-outline-sm" : "text-white"}>{c}</span>
                <span className="ua-dot" />
              </span>
            ))}
          </div>
        </div>

        <section id="services" className="px-5 py-28 md:px-12 md:py-36" aria-labelledby="pricing-title">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end" data-reveal>
              <h2 id="pricing-title" className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">
                Simple <span className="ua-grad">pricing.</span>
              </h2>
              <p className="max-w-sm text-white/60">Every package starts with a free demo for your business. You pay once you love it.</p>
            </div>
            <div className="grid items-stretch gap-4 md:grid-cols-3">
              {PACKAGES.map((p, i) => (
                <div
                  key={p.id}
                  className={`ua-card flex flex-col p-7 md:p-8 ${p.featured ? "ua-featured order-first md:order-none" : ""}`}
                  data-reveal
                  style={{ transitionDelay: `${i * 90}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ua-amber)]">{p.k}</p>
                    {p.featured && <span className="ua-badge">Best value</span>}
                  </div>
                  <h3 className="mt-8 font-display text-2xl font-extrabold tracking-tight md:text-[1.7rem]">{p.title}</h3>
                  <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`font-display font-black tracking-tight ${p.featured ? "ua-grad text-6xl" : "text-5xl"}`}>{p.price}</span>
                    {p.was && <s className="text-lg text-white/40">{p.was}</s>}
                    {p.per && <span className="text-sm text-white/50">{p.per}</span>}
                  </p>
                  {p.then && <p className="mt-2 text-sm font-medium text-white/80">{p.then}</p>}
                  {p.was && p.note !== "launch" && <p className="mt-2 text-sm font-medium text-white/80">Launch price</p>}
                  {p.note === "launch" && (
                    <div className="ua-launch mt-4">
                      <p className="text-sm font-medium text-white">
                        Launch price for our first {LAUNCH.total} clients. {LAUNCH.regular} after that.
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="ua-progress h-full rounded-full" style={{ width: `${((LAUNCH.total - LAUNCH.left) / LAUNCH.total) * 100}%`, minWidth: "6px" }} />
                        </div>
                        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ua-amber)]">
                          {LAUNCH.left} of {LAUNCH.total} spots left
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="mt-5 leading-relaxed text-white/60">{p.body}</p>
                  <ul className="mt-6 flex flex-col gap-2.5 border-t border-white/10 pt-6 text-[15px] text-white/75">
                    {p.includes.map((x) => (
                      <li key={x} className="flex gap-3">
                        <span className="ua-tick" aria-hidden="true">✓</span>
                        {x}
                      </li>
                    ))}
                  </ul>
                  <a href="#contact" data-package={p.title} className={`${p.featured ? "ua-btn" : "ua-btn-ghost"} mt-8 w-full`}>
                    {p.cta}
                  </a>
                </div>
              ))}
            </div>
            <div className="ua-card mt-4 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:px-8" data-reveal>
              <p className="text-white/70">
                <span className="font-display font-extrabold text-white">Just the AI front desk?</span> {FRONT_DESK_ALONE.setup} setup, then{" "}
                {FRONT_DESK_ALONE.monthly}.
              </p>
              <p className="text-sm text-white/55">
                Or get it inside the <a href="#contact" className="text-white underline decoration-[var(--ua-amber)] underline-offset-4">full package</a> for $100 / month, with a premium website included.
              </p>
            </div>
            <p className="mt-6 text-sm text-white/40" data-reveal>Prices in CAD, plus HST. Domain registration not included.</p>
          </div>
        </section>

        <section id="work" className="relative px-5 py-28 md:px-12 md:py-36">
          <div className="ua-glow-b" />
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end" data-reveal>
              <h2 className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">
                Live <span className="ua-grad">demos</span>
              </h2>
              <p className="max-w-sm text-white/60">One for every kind of business we build for. Open any of them on your phone.</p>
            </div>
            <div className="border-t border-white/10">
              {demos.map((d, i) => (
                <a
                  key={d.name}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ua-row group grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-white/10 py-6 md:grid-cols-[5rem_1fr_1fr_auto] md:py-8"
                  data-reveal
                >
                  <span className="font-display text-sm text-white/35">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display text-2xl font-extrabold tracking-tight transition-transform duration-500 group-hover:translate-x-2 md:text-4xl">{d.name}</span>
                  <span className="hidden text-white/50 md:block">{d.note}</span>
                  <span className="ua-arrow" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <Proof />

        <section id="process" className="px-5 py-28 md:px-12 md:py-36">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-14 font-display text-5xl font-extrabold tracking-tight md:text-7xl" data-reveal>
              How it works
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((s, i) => (
                <div key={s.n} className="ua-card p-7" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="ua-grad font-display text-5xl font-black">{s.n}</span>
                  <h3 className="mt-10 font-display text-xl font-extrabold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/60">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-5 py-28 md:px-12 md:py-36">
          <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.4fr]">
            <h2 className="font-display text-5xl font-extrabold tracking-tight md:text-7xl" data-reveal>
              Questions
            </h2>
            <div className="border-t border-white/10">
              {faqs.map((f) => (
                <details key={f.q} className="ua-faq group border-b border-white/10 py-6" data-reveal>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-extrabold tracking-tight md:text-xl">
                    {f.q}
                    <span className="text-2xl text-[var(--ua-amber)] transition-transform duration-300 group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-4 max-w-xl leading-relaxed text-white/60">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="relative overflow-hidden px-5 py-32 md:px-12 md:py-44">
          <img src="/assets/sunset.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06070b] via-[#06070b]/60 to-[#06070b]" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div data-reveal>
              <p className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-white/60">Your turn</p>
              <h2 className="font-display text-5xl font-black leading-[0.95] tracking-tight md:text-8xl">
                Let the city <span className="ua-grad">find you.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-white/70">Tell us about your business and we will send you a working demo, usually the same week.</p>
            </div>
            <div className="mt-12" data-reveal>
              <LeadForm source="home" />
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/60" data-reveal>
              <a href={`tel:${SITE.phoneTel}`} className="transition-colors hover:text-white">
                Or call / text <span className="text-white">{SITE.phoneDisplay}</span>
              </a>
              {SITE.email && (
                <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-white">
                  {SITE.email}
                </a>
              )}
              <a href="#work" className="transition-colors hover:text-white">Browse demos ↗</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingContact afterId="top" />
    </div>
  );
}
