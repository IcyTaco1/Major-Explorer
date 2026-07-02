import {
  Component,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Beams from "@/components/Beams";

/**
 * Tracks whether the app is currently in dark mode by observing the `dark`
 * class the theme system toggles on <html>. Lets the background pick a
 * different palette for light vs dark mode.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

/**
 * Pre-flight WebGL support check. Running this BEFORE mounting the three.js
 * Canvas avoids three throwing (and the dev error overlay firing) on browsers
 * or GPUs without WebGL — we simply skip the Canvas and show the CSS fallback.
 */
function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Secondary defense: catches any WebGL/three failure that slips past the
 * pre-flight check (e.g. context lost right after creation) so the app renders
 * the CSS fallback background instead of crashing.
 */
class WebGLBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const LIGHT = { background: "#edecf7", light: "#7c3aed", base: "#4f46e5" };
const DARK = { background: "#0b1120", light: "#9aa7ff", base: "#000000" };

/**
 * Fixed, full-viewport animated Beams background rendered behind the entire
 * app. Light mode uses indigo beams lit by violet on a near-white backdrop;
 * dark mode uses black beams lit by indigo on a deep-navy backdrop. A
 * theme-aware scrim keeps content readable.
 */
export default function SiteBackground() {
  const isDark = useIsDark();
  const [webglOk] = useState(supportsWebGL);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const palette = isDark ? DARK : LIGHT;

  return (
    <div className="site-bg" aria-hidden="true">
      {webglOk && (
        <WebGLBoundary>
          <Beams
            backgroundColor={palette.background}
            lightColor={palette.light}
            baseColor={palette.base}
            beamNumber={12}
            beamWidth={2}
            beamHeight={15}
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
            animate={!prefersReducedMotion}
          />
        </WebGLBoundary>
      )}
      <div className="site-bg-scrim" />
    </div>
  );
}
