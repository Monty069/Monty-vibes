import type { ComponentType } from "react";
import { Home } from "./pages/Home";
import { Areas, areasFaqs } from "./pages/Areas";
import { Salons, salonFaqs } from "./pages/Salons";
import { Restaurants, restaurantFaqs } from "./pages/Restaurants";

export type Route = {
  id: string;
  path: string; // URL path, trailing slash
  title: string;
  description: string;
  Component: ComponentType;
  faqs?: { q: string; a: string }[];
};

export const routes: Route[] = [
  {
    id: "home",
    path: "/",
    title: "Unity Alpha Network | Websites for Brampton & GTA businesses",
    description:
      "Unity Alpha Network builds fast, high-end websites and AI receptionists for local businesses across Brampton and the GTA. See a free demo before you pay. Live in days, not months.",
    Component: Home,
  },
  {
    id: "areas",
    path: "/areas/",
    title: "Areas we serve | Web design in Brampton, Mississauga, Toronto & the GTA",
    description:
      "Unity Alpha Network builds websites and AI receptionists for local businesses in Brampton, Mississauga, Toronto, Vaughan, Oakville, Milton, Caledon and Markham.",
    Component: Areas,
    faqs: areasFaqs,
  },
  {
    id: "salons",
    path: "/websites-for-salons-spas/",
    title: "Websites for salons, spas & nail studios in Brampton & the GTA | Unity Alpha",
    description:
      "Beautiful, fast websites for salons, spas and nail studios in Brampton and the GTA. Show your space, services and prices, with booking one tap away. Free demo first.",
    Component: Salons,
    faqs: salonFaqs,
  },
  {
    id: "restaurants",
    path: "/websites-for-restaurants/",
    title: "Websites for restaurants & cafés in Brampton & the GTA | Unity Alpha",
    description:
      "Fast restaurant websites for Brampton and the GTA: a readable menu, hours, location, reservations and ordering in one tap. See a free demo before you pay.",
    Component: Restaurants,
    faqs: restaurantFaqs,
  },
];
