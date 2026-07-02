import DarkVeil from "@/components/DarkVeil";

/**
 * Fixed, full-viewport animated background rendered behind the entire app.
 * A theme-aware scrim sits over the veil so content stays readable in both
 * light and dark mode (veil is subtle in light mode, prominent in dark mode).
 */
export default function SiteBackground() {
  return (
    <div className="site-bg" aria-hidden="true">
      <DarkVeil speed={0.5} warpAmount={0.05} resolutionScale={0.6} />
      <div className="site-bg-scrim" />
    </div>
  );
}
