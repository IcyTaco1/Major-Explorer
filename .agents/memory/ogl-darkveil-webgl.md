---
name: ogl / DarkVeil WebGL background gotchas
description: Non-obvious pitfalls when porting React Bits DarkVeil (or any ogl full-screen shader) as a global background.
---

# ogl / DarkVeil WebGL background

DarkVeil (React Bits) is a full-screen CPPN shader rendered with `ogl`
(`Renderer`/`Program`/`Mesh`/`Triangle`/`Vec2`). Used here as a fixed global
background (`SiteBackground` → fixed layer `z-index:-1` + theme-aware scrim; app
page-root wrappers made transparent so it shows through; inner cards stay opaque).

## Gotchas (each cost real debugging)

- **`resolutionScale` < 1 shrinks the visible canvas, not just the buffer.**
  ogl's `renderer.setSize(w, h)` also writes *inline* `canvas.style.width/height`
  = the size you pass. If you pass `w*scale`, the canvas visually covers only
  `scale` of the parent (top-left), and inline styles beat any `width:100%` CSS
  class. **Fix:** after `setSize(w*scale, h*scale)`, re-assert
  `gl.canvas.style.width = "100%"; gl.canvas.style.height = "100%"`.

- **`uResolution` must be the drawing-buffer size, not CSS px.** `gl_FragCoord`
  spans the drawing buffer (`w*scale*dpr`). Feeding CSS px makes the shader UV
  range wrong (e.g. [-1,1.4]) and DPR-dependent. Use
  `gl.drawingBufferWidth/Height`.

- **Wrap `new Renderer(...)` in try/catch.** On a browser/GPU with no WebGL,
  `getContext` returns null and ogl's constructor then dereferences
  `this.gl.renderer` → throws. Catch it and bail so a CSS fallback background
  (`background: hsl(var(--background))` on the fixed layer) shows instead of an
  error-overlay crash.

- **The headless screenshot tool has NO WebGL** ("unable to create webgl
  context"). You cannot visually verify an ogl/WebGL canvas via the screenshot
  tool — it only ever shows the CSS fallback. Verify correctness by code +
  typecheck + architect; the real user's browser renders the effect.

## Layering that works
Fixed layer is a sibling at the App root; `#root` creates no stacking context, so
a `z-index:-1` child paints above the body background but below in-flow content.
Dialogs portal at z-50, sticky header z-40 — no conflict. Keep `bg-background` on
`body` (via `@layer base`) as the ultimate fallback.

Also: respect `prefers-reduced-motion` — render a single static frame, no rAF
loop; and clean up with `gl.getExtension("WEBGL_lose_context")?.loseContext()`
plus `cancelAnimationFrame` + resize-listener removal.
