import { CardGrid, DemoCta, Landing, SectionHead } from "./Landing";

const features = [
  { k: "01", title: "Walk in before they arrive", body: "Guests scroll from the street into your dining room. They see the vibe, the table and the food before they decide." },
  { k: "02", title: "A menu people can read", body: "A real menu on the page, not a blurry PDF. Easy to update when prices or specials change." },
  { k: "03", title: "Reservations and ordering", body: "Link your reservation and delivery apps, or take booking requests straight to your phone." },
  { k: "04", title: "Hours, location, parking", body: "The three things everyone looks for, right at the top, with directions in one tap." },
  { k: "05", title: "Found for 'near me' searches", body: "Your cuisine, neighbourhood and Google listing lined up, so hungry people nearby find you first." },
  { k: "06", title: "An AI host on the phone", body: "During the dinner rush, the AI receptionist answers, takes the booking or the question, and texts you a summary." },
];

export const restaurantFaqs = [
  { q: "Can I keep using my delivery and reservation apps?", a: "Yes. We link the apps you already use. The website becomes the place that sends people to them, instead of a third-party page they forget." },
  { q: "How do I update the menu?", a: "Text us the change and it's usually live the same day. Specials and seasonal menus are easy." },
  { q: "Do I need professional food photos?", a: "Good phone photos in daylight work to start. We'll tell you which dishes and angles to shoot." },
  { q: "Can I see an example first?", a: "Open the Restaurant demo on this page. We build one like it for your restaurant before you pay anything." },
];

export function Restaurants() {
  return (
    <Landing
      source="restaurants"
      eyebrow="Restaurants & cafés"
      title={
        <>
          Websites for restaurants that <span className="ua-grad">fill tables.</span>
        </>
      }
      intro="A fast, mouth-watering site for your restaurant or café in Brampton and the GTA. Your room, your menu and your hours, with reservations and ordering one tap away."
      faqs={restaurantFaqs}
    >
      <section className="px-5 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionHead title="What your site includes" body="Built for the way people pick where to eat: on a phone, hungry, in under a minute." />
          <CardGrid items={features} />
        </div>
      </section>
      <section className="px-5 pb-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <DemoCta name="Restaurant" url="/demos/restaurant/" note="Walk in from the street, take a seat, and watch the dishes slide into the menu." />
        </div>
      </section>
    </Landing>
  );
}
