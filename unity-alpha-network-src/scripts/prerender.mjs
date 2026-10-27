// Renders every route to static HTML in dist/, then cleans up.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(dist, ".vite/manifest.json"), "utf8"));
const entry = manifest["src/entry-client.tsx"];
const css = (entry.css || []).map((c) => `<link rel="stylesheet" href="/${c}">`).join("");
const js = `<script type="module" src="/${entry.file}"></script>`;
const { render, routes, SITE } = await import(pathToFileURL(path.join(root, "dist-ssr/entry-server.js")).href);
const FONTS = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,600;125,800;125,900&family=Geist:wght@400;500;600&display=swap";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const business = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE.name,
  url: SITE.url,
  telephone: SITE.phoneTel,
  image: `${SITE.url}/brand/unity-alpha-icon-512.png`,
  logo: `${SITE.url}/brand/unity-alpha-icon-512.png`,
  description: "High-end websites and AI receptionists for local businesses in Brampton and the GTA.",
  address: { "@type": "PostalAddress", addressLocality: "Brampton", addressRegion: "ON", addressCountry: "CA" },
  areaServed: ["Brampton", "Mississauga", "Toronto", "Vaughan", "Oakville", "Milton", "Caledon", "Markham"].map((n) => ({ "@type": "City", name: n })),
  sameAs: [SITE.instagram.url, SITE.x.url],
};

for (const r of routes) {
  const url = SITE.url + r.path;
  const ld = [business];
  if (r.faqs?.length)
    ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: r.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`,
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="author" content="${SITE.name}">`,
    `<meta name="theme-color" content="#06070b">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${SITE.name}">`,
    `<meta property="og:title" content="${esc(r.title)}">`,
    `<meta property="og:description" content="${esc(r.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE.url}/assets/hero.png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:site" content="${SITE.x.handle}">`,
    `<link rel="icon" href="/favicon.ico" sizes="any">`,
    `<link rel="icon" type="image/svg+xml" href="/brand/unity-alpha-icon.svg">`,
    `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">`,
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="${FONTS}">`,
    r.id === "home" ? `<link rel="preload" as="image" href="/frames/f_000.webp">` : "",
    css,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("");
  const html = `<!doctype html><html lang="en-CA"><head>${head}</head><body><div id="root" data-page="${r.id}">${render(r.id)}</div>${js}</body></html>`;
  const out = path.join(dist, r.path, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log("wrote", r.path, Math.round(html.length / 1024) + "kb");
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes
    .map((r) => `<url><loc>${SITE.url}${r.path}</loc><lastmod>${today}</lastmod></url>`)
    .join("")}</urlset>`,
);
fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
fs.rmSync(path.join(dist, ".vite"), { recursive: true, force: true });
fs.rmSync(path.join(root, "dist-ssr"), { recursive: true, force: true });
