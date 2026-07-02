import { useEffect, useRef, useMemo, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./ScrollReveal.css";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  /** ScrollTrigger `start` string — when the reveal fires. Default "top 80%". */
  start?: string;
  [dataAttribute: `data-${string}`]: unknown;
}

const ScrollReveal = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0,
  baseRotation = 3,
  blurStrength = 8,
  containerClassName = "",
  textClassName = "",
  start = "top 80%",
  ...rest
}: ScrollRevealProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="word" key={index}>
          {word}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller = scrollContainerRef?.current ?? undefined;
    const wordElements = el.querySelectorAll<HTMLElement>(".word");

    // Respect users who prefer reduced motion: show everything, skip the animation.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(el, { rotate: 0 });
      gsap.set(wordElements, { opacity: 1, yPercent: 0, filter: "blur(0px)" });
      return;
    }

    // Scope every tween + its ScrollTrigger to this instance via gsap.context so
    // cleanup fully reverts them (ctx.revert() kills tweens, triggers, and inline
    // styles) — important because key={result.major} remounts this on each lookup.
    const ctx = gsap.context(() => {
      // A timed entrance (not scrub): `toggleActions` replays it every time the
      // text scrolls into view from either direction, and plays it on load when
      // the text is already visible. This is why the effect is reliably seen.
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.8 },
        scrollTrigger: {
          trigger: el,
          scroller,
          start,
          toggleActions: "restart none restart none",
        },
      });

      tl.fromTo(
        el,
        { rotate: baseRotation, transformOrigin: "0% 50%" },
        { rotate: 0 },
        0,
      );

      tl.fromTo(
        wordElements,
        {
          opacity: baseOpacity,
          yPercent: 40,
          filter: enableBlur ? `blur(${blurStrength}px)` : "blur(0px)",
        },
        {
          opacity: 1,
          yPercent: 0,
          filter: "blur(0px)",
          // Spread the per-word stagger across a fixed window so long and short
          // descriptions both finish in a pleasant, similar amount of time.
          stagger: { amount: 0.9, from: "start" },
        },
        0,
      );
    }, containerRef);

    return () => ctx.revert();
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, blurStrength, start]);

  return (
    <div ref={containerRef} className={`scroll-reveal ${containerClassName}`.trim()}>
      <p className={`scroll-reveal-text ${textClassName}`.trim()} {...rest}>
        {splitText}
      </p>
    </div>
  );
};

export default ScrollReveal;
