---
name: WebGL global background (three.js Beams)
description: Non-obvious pitfalls for a full-screen animated WebGL background (React Bits Beams, three.js + @react-three/fiber). Replaced the old ogl DarkVeil.
---

# WebGL global background (three.js Beams)

Global animated background = React Bits `<Beams />` (three.js). `SiteBackground`
renders a fixed layer (`z-index:-1`) + theme-aware scrim; app page-root wrappers
are transparent so it shows through; inner cards stay opaque. Stack: for React 19
use `@react-three/fiber@9` + `@react-three/drei@10` (fiber v8/drei v9 are React 18).

## Gotchas (each cost real debugging)

- **The headless screenshot tool has NO WebGL.** `getContext('webgl')` returns
  null there, so three throws "Error creating WebGL context". You CANNOT visually
  verify any WebGL canvas via the screenshot tool — it only ever shows the CSS
  fallback. Verify by code + typecheck + architect; the real user's browser
  renders the effect. Ask the user to confirm appearance in their preview.

- **Pre-flight `supportsWebGL()` BEFORE mounting `<Canvas>`; a React error
  boundary is not enough on its own.** In dev the Replit `runtime-error-modal`
  vite plugin throws up a full-screen error overlay on the thrown WebGL-context
  error EVEN WHEN a class error boundary catches it (the app still renders behind
  the overlay). Probing a throwaway `canvas.getContext('webgl2'||'webgl')` and
  only mounting `<Canvas>` when it succeeds avoids the throw — and thus the
  overlay — in both dev and prod. Keep the error boundary as a secondary defense
  (context lost after creation). CSS fallback = `background: hsl(var(--background))`
  on the fixed layer.

- **three 0.185 ShaderMaterial:** set `mat.lights = true` *after* construction —
  it's a plain property, not a `ShaderMaterialParameters` field, so passing it in
  the constructor object type-errors. Use `THREE.MathUtils.degToRad` (no deep
  `three/src/...` import needed).

## The beam base color (`diffuse`) is the main light-vs-dark lever
Beams' body color is the ShaderMaterial `diffuse` uniform, NOT `lightColor`
(which only tints lit edges). A **black** diffuse looks great on the deep-navy
dark backdrop but renders as muddy dark-gray streaks over a white/light-mode
background — the #1 "light mode looks weird" complaint. Fix: make the base color
theme-aware — black in dark mode, a soft light pastel (e.g. periwinkle #b4c0ff)
in light mode — and drive it as a reactive uniform: `beamMaterial.uniforms
.diffuse.value.set(baseColor)` in a `useEffect`, so theme toggles never rebuild
the material (keep it out of the material's useMemo deps).

**Both** the base (`diffuse`) AND the lit `lightColor` must be soft pastels in
light mode. Fully-saturated brand hex (e.g. base `#4f46e5` + light `#7c3aed`)
render as a heavy purple wall with harsh white streaks — users call it "bad."
Use pastel indigo/violet (base `#a5b4fc`, light `#c4b5fd`) and lift the light
scrim to ~0.6 so beams read as a gentle texture, not a saturated slab. Shared
Beams props (beamNumber/speed/noiseIntensity) affect BOTH themes — to change only
light mode, tune the light palette + `.site-bg-scrim` opacity, never those props.

## Theme-aware colors without Canvas remount
Observe the `dark` class on `document.documentElement` via `MutationObserver`
(`attributeFilter:["class"]`) — that's how the theme system toggles it. Pass the
palette as **reactive props**: background via `<color attach="background"
args={[hex]}>` and the light via the `directionalLight color` prop. fiber updates
both in place, so the `<Canvas>` (and its WebGL context) does NOT remount on theme
toggle. Only `useMemo` the ShaderMaterial on deps that actually change the shader
(speed/noise/scale) — never on the colors, or you rebuild the material needlessly.

## Reduced motion
`prefers-reduced-motion` → `frameloop="demand"`: R3F still renders the initial
frame on Canvas creation (and re-renders on any prop/state invalidation, e.g. a
theme change), so users get a static beams frame. Random UV offsets baked into the
geometry give visual texture even when `time` stays frozen at 0.

## Layering that works
Fixed layer is a sibling at the App root; `#root` creates no stacking context, so
a `z-index:-1` child paints above the body background but below in-flow content.
Dialogs portal at z-50, sticky header z-40 — no conflict. Keep `bg-background` on
`body` (via `@layer base`) as the ultimate fallback.
