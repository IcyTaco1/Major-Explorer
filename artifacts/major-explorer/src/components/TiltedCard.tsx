import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, useSpring } from "framer-motion";
import "./TiltedCard.css";

const SPRING = { damping: 30, stiffness: 100, mass: 2 } as const;

export interface TiltedCardProps {
  children: ReactNode;
  /** Applied to the inner (tilting) element. */
  className?: string;
  /** Applied to the outer perspective wrapper — use for grid/list layout
   *  classes and z-index elevation (e.g. lifting a card while its dropdown is open). */
  containerClassName?: string;
  style?: CSSProperties;
  rotateAmplitude?: number;
  scaleOnHover?: number;
  perspective?: number;
  /** When true, tilt is suppressed and the card settles flat (e.g. while an
   *  absolute dropdown inside the card is open). */
  disabled?: boolean;
  [dataAttribute: `data-${string}`]: unknown;
}

/**
 * TiltedCard (React Bits, adapted).
 *
 * A generic mouse-tilt WRAPPER — tilts whatever children it's given (no image
 * required). A flat rotateX/rotateY/scale transform (NO preserve-3d/translateZ,
 * which would break the cards' backdrop-filter blur) is driven by framer-motion
 * springs. Tilt is gated behind a fine pointer + no reduced-motion; otherwise it
 * renders a plain passthrough with no transform/perspective context so card
 * stacking stays simple on touch devices.
 */
export default function TiltedCard({
  children,
  className = "",
  containerClassName = "",
  style,
  rotateAmplitude = 8,
  scaleOnHover = 1.03,
  perspective = 900,
  disabled = false,
  ...rest
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);
  const scale = useSpring(1, SPRING);

  // Compute the correct value on the first render (client-only Vite app, so
  // `window` exists) — this avoids a false->true flip that would swap the inner
  // element from <div> to <motion.div> and remount every card once at load.
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return (
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fine.matches && !reduced.matches);
    update();
    fine.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  const active = enabled && !disabled;

  useEffect(() => {
    if (!active) {
      rotateX.set(0);
      rotateY.set(0);
      scale.set(1);
    }
  }, [active, rotateX, rotateY, scale]);

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!active || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
  };

  const handlePointerEnter = () => {
    if (!active) return;
    scale.set(scaleOnHover);
  };

  const handlePointerLeave = () => {
    if (!active) return;
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  };

  if (!enabled) {
    return (
      <div
        className={`tilted-card ${containerClassName}`.trim()}
        style={style}
        {...rest}
      >
        <div className={`tilted-card-inner ${className}`.trim()}>{children}</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`tilted-card ${containerClassName}`.trim()}
      style={{ perspective: `${perspective}px`, ...style }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      {...rest}
    >
      <motion.div
        className={`tilted-card-inner ${className}`.trim()}
        style={{ rotateX, rotateY, scale }}
      >
        {children}
      </motion.div>
    </div>
  );
}
