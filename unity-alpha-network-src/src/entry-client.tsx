import "./styles.css";
import { hydrateRoot } from "react-dom/client";
import { routes } from "./routes";

const el = document.getElementById("root")!;
const r = routes.find((x) => x.id === el.dataset.page) ?? routes[0];
hydrateRoot(el, <r.Component />);
