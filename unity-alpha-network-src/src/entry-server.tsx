import { renderToString } from "react-dom/server";
import { routes } from "./routes";
import { SITE } from "./site";

export { routes, SITE };
export function render(id: string) {
  const r = routes.find((x) => x.id === id)!;
  return renderToString(<r.Component />);
}
