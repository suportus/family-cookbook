import { useLayoutEffect, useRef } from "react";

// Card animations on the recipe list (CSS in index.css):
// - first load: the first cards on screen fade in, slightly staggered;
// - scrolling: a card below the screen fades in once, when it comes near;
// - a card that was shown before never animates again (e.g. after Back).
// Without IntersectionObserver, or with reduced motion, cards are simply
// visible. Only cards below the screen are hidden before their fade.

const STAGGER_CARDS = 10;
const STAGGER_MS = 40;

const revealed = new Set<string>();
let firstLoadDone = false;
let observer: IntersectionObserver | null = null;
const onVisible = new WeakMap<Element, () => void>();

function reducedMotion(): boolean {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function getObserver(): IntersectionObserver | null {
  if (!("IntersectionObserver" in window)) return null;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        onVisible.get(entry.target)?.();
        onVisible.delete(entry.target);
      }
    },
    // Start a little before the card reaches the screen.
    { rootMargin: "0px 0px 120px 0px" },
  );
  return observer;
}

// Called once the list has been shown, so later lists don't stagger.
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
    if (el.getBoundingClientRect().top < window.innerHeight) {
      revealed.add(key);
      if (!firstLoadDone && index < STAGGER_CARDS) {
        el.style.animationDelay = `${index * STAGGER_MS}ms`;
        el.dataset.reveal = "in";
      }
      return;
    }
    const io = getObserver();
    if (!io) {
      revealed.add(key);
      return;
    }
    el.dataset.reveal = "pending";
    onVisible.set(el, () => {
      revealed.add(key);
      el.dataset.reveal = "in";
    });
    io.observe(el);
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
