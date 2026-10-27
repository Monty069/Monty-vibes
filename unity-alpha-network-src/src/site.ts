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

// Starting prices. Leave a value as null to hide that price line on the site.
export const PRICES: Record<"flagship" | "local" | "ongoing" | "receptionist", string | null> = {
  flagship: null, // e.g. "From $4,000"
  local: null, // e.g. "From $1,500"
  ongoing: null, // e.g. "From $99 / month"
  receptionist: null, // e.g. "From $199 / month"
};

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
