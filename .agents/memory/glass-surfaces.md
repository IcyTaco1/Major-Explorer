---
name: Liquid-glass surfaces (glassmorphism over the beams)
description: How the "glass everywhere" look is implemented in major-explorer and why the raw React Bits GlassSurface is NOT used for it.
---

# Liquid-glass surfaces

The app-wide "glass" look = translucent `--card` + `backdrop-filter` applied via a
few shared classes, NOT by wrapping elements in the React Bits `<GlassSurface>`
component.

- `.glass-panel` / `.glass-popover` (index.css `@layer components`) for the ~34
  former `bg-card` surfaces; `.border-glow-card` gets the same via a translucent
  `--card-bg` + backdrop-filter (BorderGlow.css). Both have a
  `@supports not (backdrop-filter)` opaque fallback.
- Popovers/dropdowns/modals use `.glass-popover` (higher alpha ~0.9 / dark 0.82 +
  stronger blur) so text stays readable over the moving beams; plain panels use
  `.glass-panel` (~0.6 / dark 0.5).

**Why not raw `<GlassSurface>` everywhere:** its content wrapper force-centers
(flex center) → breaks left-aligned multi-row cards; it needs an explicit
width/height → bad for content-height cards; its container is `overflow:hidden`
→ clips the search-suggestions and in-card dropdowns; each instance mounts its own
`<svg>` displacement filter + ResizeObserver → 30+ instances = perf/DOM bloat; and
its SVG `backdrop-filter: url(#id)` is Chromium-only (Safari/Firefox fall back).
So `<GlassSurface>` is used only for small fixed-size chrome (the landing hero
badge). The CSS-class approach is the real "glass everywhere".

**React Bits theme gotcha:** this app toggles theme via a `.dark` class on
`<html>`, NOT the OS preference. Any React Bits CSS that uses `light-dark()` or
`@media (prefers-color-scheme: dark)` must be rewritten to `:root` defaults +
`.dark` overrides or dark styling won't track the manual toggle. (Done in
GlassSurface.css.)

**Verification limit:** the headless screenshot browser has no WebGL and limited
backdrop-filter, so glass-over-beams cannot be verified in-tool — ask the user to
check in a real browser (Chrome for the SVG variant, Safari/Firefox for the
fallback), both themes. Watch item: ~35 backdrop-filter surfaces over the
always-animating beams re-sample every frame → possible frame drops on low-end
hardware. Accepted because the user explicitly asked for glass everywhere.

**Do NOT** mutate the `--card` token / `@theme` mapping to get glass — that
silently hits Clerk's `cardBox` and every `bg-*card*` variant. Clerk cardBox stays
opaque `bg-card` (its Clerk appearance hardcodes a white background).
