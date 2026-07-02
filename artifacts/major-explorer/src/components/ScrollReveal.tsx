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
  rotationEnd?: string;
  wordAnimationEnd?: string;
  [dataAttribute: `data-${string}`]: unknown;
}

const ScrollReveal = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = "",
  textClassName = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
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

    const scroller =
      scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

    const wordElements = el.querySelectorAll<HTMLElement>(".word");

    // Respect users who prefer reduced motion: show everything, skip scroll-driven animation.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(el, { rotate: 0 });
      gsap.set(wordElements, { opacity: 1, filter: "blur(0px)" });
      return;
    }

    // Scope every tween + its ScrollTrigger to this instance via gsap.context so
    // cleanup fully reverts them. Killing triggers alone would orphan the scrubbed
    // tweens; ctx.revert() kills tweens, their triggers, and restores inline styles —
    // important because key={result.major} remounts this on each new lookup.
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { transformOrigin: "0% 50%", rotate: baseRotation },
        {
          ease: "none",
          rotate: 0,
          scrollTrigger: { trigger: el, scroller, start: "top bottom", end: rotationEnd, scrub: true },
        },
      );

      gsap.fromTo(
        wordElements,
        { opacity: baseOpacity, willChange: "opacity" },
        {
          ease: "none",
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: { trigger: el, scroller, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true },
        },
      );

      if (enableBlur) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.05,
            scrollTrigger: { trigger: el, scroller, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true },
          },
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [
    scrollContainerRef,
    enableBlur,
    baseRotation,
    baseOpacity,
    rotationEnd,
    wordAnimationEnd,
    blurStrength,
  ]);

  return (
    <div ref={containerRef} className={`scroll-reveal ${containerClassName}`.trim()}>
      <p className={`scroll-reveal-text ${textClassName}`.trim()} {...rest}>
        {splitText}
      </p>
    </div>
  );
};

export default ScrollReveal;
