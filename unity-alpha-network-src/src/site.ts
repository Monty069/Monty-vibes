// Everything a non-developer might want to change lives in this file.

export const SITE = {
  name: "Unity Alpha Network",
  url: "https://unityalpha.ca",
  phoneDisplay: "(431) 244-5245",
  phoneTel: "+14312445245",
  instagram: { handle: "@unityalpha.ca", url: "https://instagram.com/unityalpha.ca" },
  x: { handle: "@unityalpha_ca", url: "https://x.com/unityalpha_ca" },
  email: null as string | null, // e.g. "hello@unityalpha.ca" once email is set up
};

// Packages shown in the Pricing section. `featured` is the one we push.
export type Package = {
  id: string;
  k: string;
  title: string;
  price: string;
  was?: string; // shown struck through
  note?: string; // small line under the price, e.g. launch offer
  per?: string; // small text after the price
  then?: string; // second line, e.g. monthly
  body: string;
  includes: string[];
  featured?: boolean;
  cta: string;
};

export const PACKAGES: Package[] = [
  {
    id: "basic",
    k: "Basic",
    title: "Business website",
    price: "$175",
    was: "$200",
    per: "one time",
    body: "A fast, clean site that gets you found and gets you called.",
    includes: ["Services, hours and prices", "Big tap-to-call button", "Built for phones and Google", "Your domain connected"],
    cta: "Get the basic site",
  },
  {
    id: "full",
    k: "Full package",
    title: "Premium site + AI front desk",
    price: "$2,500",
    was: "$4,000",
    per: "one time",
    note: "launch",
    then: "then $100 / month, everything included",
    body: "The whole thing. A premium site that makes the city look twice, and an AI receptionist that never misses a call.",
    includes: [
      "Premium scroll walk-through website",
      "AI receptionist on your business phone line",
      "Books appointments, takes callbacks, texts you every call",
      "AI assistant on your website",
      "All updates and maintenance",
    ],
    featured: true,
    cta: "Get the full package",
  },
  {
    id: "premium",
    k: "Premium",
    title: "Premium website",
    price: "$500",
    per: "one time",
    body: "A scroll walk-through site like our demos, with an AI assistant built in to answer visitors.",
    includes: ["Scroll walk-through design", "AI assistant on the site", "Services, prices and booking", "Your domain connected"],
    cta: "Get the premium site",
  },
];

// Full-package launch offer. Keep `left` honest: update it every time a full package sells.
export const LAUNCH = { total: 25, left: 25, regular: "$4,000" };

// The stand-alone AI front desk, shown under the packages so the full package reads as the better deal.
export const FRONT_DESK_ALONE = { setup: "$1,000", monthly: "$200 / month" };

// Real client quotes only. The section stays hidden while this list is empty.
export const TESTIMONIALS: { quote: string; name: string; business: string; result?: string }[] = [];

export const demos = [
  { name: "Day Spa", note: "Scroll walk-through, treatments, booking", url: "/demos/spa/" },
  { name: "Restaurant", note: "Walk in, dishes slide into the menu", url: "/demos/restaurant/" },
  { name: "Nail Studio", note: "Walk-through, looks gallery, booking", url: "/demos/nails/" },
  { name: "Plumbing", note: "X-ray walls, house cutaway, symptom check", url: "/demos/plumbing/" },
  { name: "Auto Repair", note: "Engine X-ray, car cutaway, warning lights", url: "/demos/auto/" },
];

export const cities = ["Brampton", "Mississauga", "Toronto", "Vaughan", "Oakville", "Milton", "Caledon", "Markham"];
