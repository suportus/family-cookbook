import { useLayoutEffect, useRef } from "react";

// Card animations on the recipe list. Timing lives in CSS variables in
// index.css (--card-anim-*); this hook only decides which cards animate and
// numbers them (--i) for the stagger.
// - first load: every card on screen fades and slides in, staggered;
// - scrolling: a card fades in once, when it actually enters the screen;
//   cards entering together get a small stagger;
// - a card that was shown before never animates again (e.g. after Back).
// Without IntersectionObserver, or with reduced motion, cards are simply
// visible. Only cards off screen are hidden before their fade.

const revealed = new Set<string>();
let firstLoadDone = false;
let observer: IntersectionObserver | null = null;
const onVisible = new WeakMap<Element, () => void>();

function reducedMotion(): boolean {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Shows a card. The class is set even if something else fails, so a card
// is never left invisible.
function show(el: HTMLElement, kind: "load" | "scroll", i: number) {
  el.style.setProperty("--i", String(i));
  el.dataset.reveal = kind;
}

function getObserver(): IntersectionObserver | null {
  if (!("IntersectionObserver" in window)) return null;
  observer ??= new IntersectionObserver(
    (entries) => {
      // Cards entering together, top to bottom, left to right.
      const entering = entries
        .filter((e) => e.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        );
      entering.forEach((entry, i) => {
        observer?.unobserve(entry.target);
        try {
          onVisible.get(entry.target)?.();
        } finally {
          show(entry.target as HTMLElement, "scroll", i);
          onVisible.delete(entry.target);
        }
      });
    },
    // When a card is really on screen (10 % of it, 40 px above the bottom
    // edge), so the fade is seen.
    { rootMargin: "0px 0px -40px 0px", threshold: 0.1 },
  );
  return observer;
}

// Called once the list has been shown, so later lists don't animate on mount.
export function markFirstLoadDone() {
  firstLoadDone = true;
}

export function useReveal<T extends HTMLElement>(key: string, index: number) {
  const ref = useRef<T>(null);

  // Before paint, so a card is never visible first and then hidden.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || revealed.has(key)) return;
    if (reducedMotion()) {
      revealed.add(key);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      revealed.add(key);
      // On screen at first load: all of them animate, numbered in list
      // order (the on-screen cards are the first ones). Later (Back, filter
      // changes) they appear without a card animation.
      if (!firstLoadDone) show(el, "load", index);
      return;
    }
    const io = getObserver();
    if (!io) {
      revealed.add(key);
      return;
    }
    el.dataset.reveal = "pending";
    onVisible.set(el, () => revealed.add(key));
    try {
      io.observe(el);
    } catch {
      delete el.dataset.reveal;
      revealed.add(key);
      return;
    }
    return () => {
      io.unobserve(el);
      onVisible.delete(el);
    };
  }, [key, index]);

  return ref;
}

// "results-fade" class after `key` (the filters) changes, but not on the
// first render (first load, or coming Back to the list).
export function useChangeFade(key: string): string {
  const prev = useRef(key);
  const changed = useRef(false);
  if (prev.current !== key) {
    prev.current = key;
    changed.current = true;
  }
  return changed.current ? "results-fade" : "";
}
