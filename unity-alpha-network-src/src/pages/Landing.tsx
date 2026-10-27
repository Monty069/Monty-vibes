import type { ReactNode } from "react";
import { CSS, Footer, FloatingContact, LeadForm, Nav, useReveal } from "../shared";
import { SITE } from "../site";

export type Faq = { q: string; a: string };

/** Shared layout for the lighter SEO pages: static hero, content, FAQ, contact. */
export function Landing({
  eyebrow,
  title,
  intro,
  heroImage = "/assets/sunset.webp",
  children,
  faqs = [],
  source,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  heroImage?: string;
  children: ReactNode;
  faqs?: Faq[];
  source: string;
}) {
  useReveal();
  return (
    <div className="ua-root min-h-screen bg-[#06070b] font-body text-white antialiased">
      <style>{CSS}</style>
      <Nav base="/" />
      <main>
        <section id="top" className="relative overflow-hidden px-5 pb-20 pt-40 md:px-12 md:pb-28 md:pt-52">
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06070b]/70 via-[#06070b]/55 to-[#06070b]" />
          <div className="relative mx-auto max-w-7xl">
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-white/70">
              <span className="ua-dot" /> {eyebrow}
            </p>
            <h1 className="max-w-[18ch] font-display text-5xl font-extrabold leading-[0.98] tracking-tight md:text-7xl">{title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{intro}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#contact" className="ua-btn">Get a free demo</a>
              <a href={`tel:${SITE.phoneTel}`} className="ua-btn-ghost">Call {SITE.phoneDisplay}</a>
            </div>
          </div>
        </section>

        {children}

        {faqs.length > 0 && (
          <section id="faq" className="px-5 py-24 md:px-12 md:py-32">
            <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.4fr]">
              <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl" data-reveal>
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
        )}

        <section id="contact" className="relative px-5 py-28 md:px-12 md:py-36">
          <div className="ua-glow-a" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div data-reveal>
              <p className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-white/60">Your turn</p>
              <h2 className="font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                Let the city <span className="ua-grad">find you.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-white/70">Tell us about your business and we will send you a working demo, usually the same week.</p>
            </div>
            <div className="mt-12" data-reveal>
              <LeadForm source={source} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingContact base="/" />
    </div>
  );
}

export function SectionHead({ title, body }: { title: ReactNode; body?: string }) {
  return (
    <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end" data-reveal>
      <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">{title}</h2>
      {body && <p className="max-w-sm text-white/60">{body}</p>}
    </div>
  );
}

export function CardGrid({ items, cols = 3 }: { items: { k?: string; title: string; body: string }[]; cols?: 2 | 3 | 4 }) {
  const c = cols === 4 ? "md:grid-cols-4" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className={`grid gap-4 ${c}`}>
      {items.map((s, i) => (
        <div key={s.title} className="ua-card p-7 md:p-8" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
          {s.k && <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ua-amber)]">{s.k}</p>}
          <h3 className={`${s.k ? "mt-10" : ""} font-display text-xl font-extrabold tracking-tight md:text-2xl`}>{s.title}</h3>
          <p className="mt-3 leading-relaxed text-white/60">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export function DemoCta({ name, url, note }: { name: string; url: string; note: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="ua-glass ua-row group flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-10" data-reveal>
      <div>
        <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-[var(--ua-amber)]">
          <span className="ua-dot" /> Live demo
        </p>
        <h3 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{name}</h3>
        <p className="mt-2 text-white/60">{note}</p>
      </div>
      <span className="ua-arrow" aria-hidden="true">↗</span>
    </a>
  );
}
