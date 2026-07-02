import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollRevealOptions {
  /** Distance (px) the element rises from as it fades in. */
  y?: number;
  duration?: number;
  /** ScrollTrigger `start` — when the reveal fires. Default "top 88%". */
  start?: string;
  delay?: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

/**
 * Fade + rise an element into view whenever it scrolls into the viewport.
 *
 * Uses a timed GSAP entrance with `toggleActions` (NOT scrub), so it replays
 * every time the element re-enters view from either direction, and plays on
 * load when the element is already visible — the same reliable behavior as the
 * word-by-word reveal on the major description. Attach the returned ref to the
 * element you want to animate (no wrapper element is added).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
): RefObject<T | null> {
  const { y = 28, duration = 0.6, start = "top 88%", delay = 0, scrollContainerRef } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scroller = scrollContainerRef?.current ?? undefined;

    // Respect users who prefer reduced motion: show it, skip the animation.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    // Scope the tween + its ScrollTrigger to this element so ctx.revert() fully
    // cleans them up (kills the tween, its trigger, and restores inline styles)
    // when the element unmounts or the list re-keys.
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            scroller,
            start,
            toggleActions: "restart none restart none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [y, duration, start, delay, scrollContainerRef]);

  return ref;
}
