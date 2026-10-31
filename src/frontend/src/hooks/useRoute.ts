import { useEffect, useState } from "react";

// Screens live in the URL hash (#/recept/5), so the phone's back button and
// reloading the page work as expected.
export type Route =
  | { name: "list" }
  | { name: "recipe"; id: bigint }
  | { name: "edit"; id: bigint }
  | { name: "new" }
  | { name: "airFryer" }
  // Read-only share link (#/s/<token>), opened without signing in.
  | { name: "shared"; token: string };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "nov") return { name: "new" };
  if (parts[0] === "airfryer") return { name: "airFryer" };
  if (parts[0] === "s") return { name: "shared", token: parts[1] ?? "" };
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
    case "shared":
      return `#/s/${route.token}`;
  }
}

// True while a replace() is reported, so the entry keeps its own "inApp" mark.
let replacing = false;

// Scroll position of the recipe list, restored when coming Back to it (the
// browser's or the app's back button). Links inside the app open the list at
// the top.
let lastHash = window.location.hash;
let byLink = false;
let listScrollY = 0;
let restoreList = false;

export function takeListScroll(): number | null {
  if (!restoreList) return null;
  restoreList = false;
  return listScrollY;
}

export function navigate(route: Route, { replace = false } = {}) {
  const hash = routeHash(route);
  if (replace) {
    window.history.replaceState(window.history.state, "", hash);
    replacing = true;
    byLink = true;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    replacing = false;
    byLink = false;
  } else if (window.location.hash !== hash) {
    // Reported later by a hashchange event, which clears the flag.
    byLink = true;
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
      // Both App and Root listen; do the bookkeeping once per change.
      if (lastHash !== window.location.hash) {
        if (parse(lastHash).name === "list") listScrollY = window.scrollY;
        restoreList = !byLink;
        byLink = false;
        lastHash = window.location.hash;
        window.scrollTo(0, 0);
      }
      setRoute(parse(window.location.hash));
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
