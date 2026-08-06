/**
 * Reusable animation helpers for Družinska Kuharica
 * Provides smooth, lightweight animations for page transitions, list items, interactions, and modals
 */

import { useEffect, useRef } from "react";

/**
 * Page transition animation
 * Animates opacity from 0 to 1 and blur from 4px to 0px over 250ms
 */
export function useFadePage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.opacity = "0";
    element.style.filter = "blur(4px)";
    element.style.transition = "opacity 250ms ease-out, filter 250ms ease-out";

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      element.style.opacity = "1";
      element.style.filter = "blur(0px)";
    });
  }, []);

  return ref;
}

/**
 * List item fade-in animation
 * Animates opacity from 0 to 1 and blur from 2px to 0px over 220ms
 * Optionally staggered by 30ms per item
 */
export function useFadeIn(index = 0, stagger = true) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const delay = stagger ? index * 30 : 0;

    element.style.opacity = "0";
    element.style.filter = "blur(2px)";
    element.style.transition = "opacity 220ms ease-out, filter 220ms ease-out";

    const timeoutId = setTimeout(() => {
      element.style.opacity = "1";
      element.style.filter = "blur(0px)";
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [index, stagger]);

  return ref;
}

/**
 * Slide fade-in animation for cookbook and recipe cards
 * Animates opacity from 0 to 1 and translateY from 10px to 0px over 240ms
 * Optionally staggered by 25ms per item
 * Applied only on mount, not on rerenders
 */
export function useSlideFadeIn(index = 0, stagger = true) {
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasAnimated.current) return;

    const delay = stagger ? index * 25 : 0;

    element.style.opacity = "0";
    element.style.transform = "translateY(10px)";
    element.style.transition =
      "opacity 240ms ease-out, transform 240ms ease-out";

    const timeoutId = setTimeout(() => {
      element.style.opacity = "1";
      element.style.transform = "translateY(0px)";
      hasAnimated.current = true;
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [index, stagger]);

  return ref;
}

/**
 * Star bounce animation for favorite toggle
 * Scales from 1 to 1.18 then back to 1 over 180ms with smooth color transition
 * Triggers only on click, not on mount
 */
export function useStarBounce() {
  const ref = useRef<HTMLButtonElement>(null);

  const triggerBounce = () => {
    const element = ref.current;
    if (!element) return;

    element.style.transition = "transform 180ms ease-out";
    element.style.transform = "scale(1.18)";

    setTimeout(() => {
      element.style.transform = "scale(1)";
    }, 90);
  };

  return { ref, triggerBounce };
}

/**
 * Favorite star animation for star toggle interactions
 * Triggers on favorite star toggle with opacity from 0.6 to 1 and scale from 1 to 1.22 then back to 1
 * Over 180ms ease-out with smooth color transition to red
 * Applied only on click, not on mount
 */
export function useFavoriteStarAnimation() {
  const ref = useRef<HTMLButtonElement>(null);

  const triggerAnimation = () => {
    const element = ref.current;
    if (!element) return;

    // Apply opacity and scale animation
    element.style.transition =
      "opacity 180ms ease-out, transform 180ms ease-out";
    element.style.opacity = "0.6";
    element.style.transform = "scale(1.22)";

    setTimeout(() => {
      element.style.opacity = "1";
      element.style.transform = "scale(1)";
    }, 90);
  };

  return { ref, triggerAnimation };
}

/**
 * Button hover animation for primary action buttons
 * Desktop-only: scales from 1 to 1.06 over 120ms with ease-out
 * Does not activate on touch devices
 */
export function useButtonHover() {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if device supports hover (desktop)
    const supportsHover = window.matchMedia("(hover: hover)").matches;
    if (!supportsHover) return;

    const handleMouseEnter = () => {
      element.style.transition = "transform 120ms ease-out";
      element.style.transform = "scale(1.06)";
    };

    const handleMouseLeave = () => {
      element.style.transform = "scale(1)";
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return ref;
}

/**
 * Modal fade animation
 * Opens: opacity 0 to 1, blur 6px to 0px over 260ms (ease-out)
 * Closes: reverse fade-out/blur over 200ms
 */
export function useFadeModal(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (isOpen) {
      element.style.opacity = "0";
      element.style.filter = "blur(6px)";
      element.style.transition =
        "opacity 260ms ease-out, filter 260ms ease-out";

      requestAnimationFrame(() => {
        element.style.opacity = "1";
        element.style.filter = "blur(0px)";
      });
    } else {
      element.style.transition =
        "opacity 200ms ease-out, filter 200ms ease-out";
      element.style.opacity = "0";
      element.style.filter = "blur(6px)";
    }
  }, [isOpen]);

  return ref;
}

/**
 * About modal animation
 * Opens: opacity 0→1, scale 0.94→1.00, blur 4px→0px over 220ms (ease-out)
 * Closes: opacity 1→0, scale 1.00→0.96, blur 0→4px over 180ms (ease-in)
 */
export function useAboutModalAnimation(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (isOpen) {
      element.style.opacity = "0";
      element.style.transform = "scale(0.94)";
      element.style.filter = "blur(4px)";
      element.style.transition =
        "opacity 220ms ease-out, transform 220ms ease-out, filter 220ms ease-out";

      requestAnimationFrame(() => {
        element.style.opacity = "1";
        element.style.transform = "scale(1.00)";
        element.style.filter = "blur(0px)";
      });
    } else {
      element.style.transition =
        "opacity 180ms ease-in, transform 180ms ease-in, filter 180ms ease-in";
      element.style.opacity = "0";
      element.style.transform = "scale(0.96)";
      element.style.filter = "blur(4px)";
    }
  }, [isOpen]);

  return ref;
}

/**
 * Image zoom modal animation
 * Opens: opacity 0→1, scale 0.95→1.00 over 240ms (ease-out)
 * Closes: opacity 1→0, scale 1.00→0.95 over 200ms (ease-in)
 * Matches fade/scale modal pattern with subtle scale-up ("pop") effect
 */
export function useImageZoomModalAnimation(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (isOpen) {
      element.style.opacity = "0";
      element.style.transform = "scale(0.95)";
      element.style.transition =
        "opacity 240ms ease-out, transform 240ms ease-out";

      requestAnimationFrame(() => {
        element.style.opacity = "1";
        element.style.transform = "scale(1.00)";
      });
    } else {
      element.style.transition =
        "opacity 200ms ease-in, transform 200ms ease-in";
      element.style.opacity = "0";
      element.style.transform = "scale(0.95)";
    }
  }, [isOpen]);

  return ref;
}
