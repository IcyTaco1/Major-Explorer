import BorderGlow, { type BorderGlowProps } from "./BorderGlow";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

/**
 * A BorderGlow card that also fades + rises into view as it scrolls into the
 * viewport (see useScrollReveal). Drop-in replacement for BorderGlow — accepts
 * all the same props. The reveal is applied to BorderGlow's own root element via
 * a forwarded ref, so no extra wrapper DOM is added (keeps grids/stacks and the
 * save-dropdown z-index behavior intact).
 */
export default function RevealBorderGlow(props: BorderGlowProps) {
  const ref = useScrollReveal<HTMLDivElement>();
  return <BorderGlow ref={ref} {...props} />;
}
