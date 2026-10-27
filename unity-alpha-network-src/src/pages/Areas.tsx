import { CardGrid, Landing, SectionHead } from "./Landing";

const areas = [
  { k: "Home base", title: "Brampton", body: "Downtown, Bramalea, Springdale, Mount Pleasant, Castlemore. Salons, restaurants, auto shops and trades that win on the phone and on Google." },
  { k: "Peel", title: "Mississauga", body: "Square One, Port Credit, Malton, Meadowvale, Streetsville. Sites built to stand out in one of the busiest search markets in Canada." },
  { k: "The city", title: "Toronto", body: "From Etobicoke to Scarborough. Independent shops and kitchens that need to look as good online as they do in person." },
  { k: "York Region", title: "Vaughan", body: "Woodbridge, Maple, Concord, Kleinburg. Trades, clinics and family businesses that want more calls, not more tabs." },
  { k: "Halton", title: "Oakville & Milton", body: "Growing neighbourhoods and new plazas. A fast site with your hours, services and booking is the first thing new residents look for." },
  { k: "North", title: "Caledon & Bolton", body: "Contractors, farms, garages and local services. We make sure people can find you, and call you, from their phone." },
  { k: "York Region", title: "Markham & Richmond Hill", body: "Restaurants, tutors, spas and professional services competing for the same searches. We help you be the one they tap." },
  { k: "Anywhere", title: "The rest of Ontario", body: "Calls and demos happen remotely, so if you're outside the GTA, we can still build your site and your AI receptionist." },
];

export const areasFaqs = [
  { q: "Do you meet in person?", a: "We can. Most clients prefer a quick phone or video call, and we send the demo by text so you can open it on your phone." },
  { q: "Will my site show up for searches in my city?", a: "Every site is built with your city and neighbourhood in the right places: page titles, headings, your Google Business link and fast mobile loading, which is what local search rewards." },
  { q: "Can you help with my Google Business Profile?", a: "Yes. We line up your website, hours, services and photos with your Google listing so customers see the same thing everywhere." },
];

export function Areas() {
  return (
    <Landing
      source="areas"
      eyebrow="Areas we serve"
      title={
        <>
          Websites for businesses across <span className="ua-grad">the GTA.</span>
        </>
      }
      intro="Brampton is home. We build high-end, fast websites and AI receptionists for local businesses from Mississauga to Markham, and anywhere a phone call still matters."
      faqs={areasFaqs}
    >
      <section className="px-5 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionHead title="Where we work" body="Same team, same standard, wherever your business is." />
          <CardGrid items={areas} cols={4} />
        </div>
      </section>
      <section className="px-5 pb-8 md:px-12">
        <div className="ua-prose mx-auto max-w-3xl" data-reveal>
          <h2 className="mb-5 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Why local businesses here need a real website</h2>
          <p>
            Most people in Peel and the GTA search on their phone before they call anyone. They look for your hours, your prices, photos and a number they can tap.
            If that isn't easy to find, they call the next result.
          </p>
          <p className="mt-4">
            We build sites that load fast on a phone, show exactly what you offer and make calling or booking one tap away. Then we keep them updated: new prices, new
            photos, new hours, usually live the same day.
          </p>
        </div>
      </section>
    </Landing>
  );
}
