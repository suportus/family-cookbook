import { useEffect, useState } from "react";

// Screens live in the URL hash (#/recept/5), so the phone's back button and
// reloading the page work as expected.
export type Route =
  | { name: "list" }
  | { name: "recipe"; id: bigint }
  | { name: "edit"; id: bigint }
  | { name: "new" }
  | { name: "airFryer" };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "nov") return { name: "new" };
  if (parts[0] === "airfryer") return { name: "airFryer" };
  if (parts[0] === "recept" && /^\d+$/.test(parts[1] ?? "")) {
    const id = BigInt(parts[1]);
    return parts[2] === "uredi" ? { name: "edit", id } : { name: "recipe", id };
  }
  return { name: "list" };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case "list":
      return "#/";
    case "new":
      return "#/nov";
    case "airFryer":
      return "#/airfryer";
    case "recipe":
      return `#/recept/${route.id}`;
    case "edit":
      return `#/recept/${route.id}/uredi`;
  }
}

// True while a replace() is reported, so the entry keeps its own "inApp" mark.
let replacing = false;

export function navigate(route: Route, { replace = false } = {}) {
  const hash = routeHash(route);
  if (replace) {
    window.history.replaceState(window.history.state, "", hash);
    replacing = true;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    replacing = false;
  } else {
    window.location.hash = hash;
  }
}

// Goes back if the previous page is part of the app, otherwise to `fallback`.
export function goBack(fallback: Route = { name: "list" }) {
  if (window.history.state?.inApp) {
    window.history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      // Mark entries reached by a link inside the app, so goBack knows the
      // previous entry is also the app.
      if (!replacing && !window.history.state?.inApp) {
        window.history.replaceState({ inApp: true }, "");
      }
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
