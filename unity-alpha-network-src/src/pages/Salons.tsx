import { CardGrid, DemoCta, Landing, SectionHead } from "./Landing";

const features = [
  { k: "01", title: "A walk-through of your space", body: "Visitors scroll through your salon or spa, room by room, so they can feel the place before they book." },
  { k: "02", title: "Services and prices, clearly", body: "Treatments, durations and starting prices that are easy to read on a phone. No more 'DM for price'." },
  { k: "03", title: "Booking in one tap", body: "Link your booking app, or let clients request a time with a simple form. Calls and texts are one tap away." },
  { k: "04", title: "Your looks, front and centre", body: "A gallery for your best work: nails, hair, brows, facials. Updated whenever you post something new." },
  { k: "05", title: "Found in your neighbourhood", body: "Your city, your services and your Google listing lined up, so 'nail salon near me' can actually find you." },
  { k: "06", title: "An AI front desk", body: "When you're with a client, the AI receptionist answers, books the appointment and texts you the details." },
];

export const salonFaqs = [
  { q: "Can it work with my booking app?", a: "Yes. If you already use a booking app, we link it everywhere on the site. If you don't, we set up a simple request form that comes straight to your phone." },
  { q: "Do I need professional photos?", a: "Good phone photos are fine to start. We'll tell you exactly which shots to take, and we can upgrade the visuals later." },
  { q: "Can I change prices and services myself?", a: "Send us the change by text and it's usually live the same day. No logins to remember." },
  { q: "Can I see an example first?", a: "Open the Day Spa and Nail Studio demos on this page. We build a demo like that for your salon before you pay anything." },
];

export function Salons() {
  return (
    <Landing
      source="salons"
      eyebrow="Salons, spas & nail studios"
      title={
        <>
          Websites for salons &amp; spas that <span className="ua-grad">fill the chair.</span>
        </>
      }
      intro="A beautiful, fast site for your salon, spa or nail studio in Brampton and the GTA. Your space, your services and your prices, with booking one tap away."
      faqs={salonFaqs}
    >
      <section className="px-5 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionHead title="What your site includes" body="Built for how clients actually choose a salon: on their phone, in a minute." />
          <CardGrid items={features} />
        </div>
      </section>
      <section className="px-5 pb-8 md:px-12">
        <div className="mx-auto grid max-w-7xl gap-4">
          <DemoCta name="Day Spa" url="/demos/spa/" note="Scroll through a thermal spa, treatments, prices and booking." />
          <DemoCta name="Nail Studio" url="/demos/nails/" note="Walk-through, a looks gallery that slides in, and booking." />
        </div>
      </section>
    </Landing>
  );
}
