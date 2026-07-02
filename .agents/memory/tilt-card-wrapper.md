---
name: Generic mouse-tilt card wrapper (TiltedCard) constraints
description: Non-obvious constraints when wrapping existing cards in a framer-motion tilt wrapper — backdrop-filter, mount remount flash, grid-vs-stack sizing.
---

# TiltedCard (generic mouse-tilt wrapper) constraints

Adapting React Bits' TiltedCard into a generic wrapper (tilt any children, no image required) around existing cards surfaced constraints not obvious from the component code:

- **Use a FLAT transform only** (rotateX / rotateY / scale via springs). Do NOT use `transform-style: preserve-3d` or `translateZ`.
  **Why:** a 3D-transformed ancestor disables descendant `backdrop-filter` blur in most browsers — the cards' blur overlay goes flat/transparent. Flat rotateX/rotateY under a parent `perspective` still reads as a tilt while keeping backdrop-filter intact.

- **Gate pointer capability with a LAZY `useState` initializer**, not `useState(false)` + an effect that flips it true.
  **Why:** the inner element type differs by branch (`<div>` passthrough vs framer-motion `<motion.div>`). A false→true flip after mount remounts every card's children once at load, re-firing scroll-reveal/glow effects and causing a brief flash. Computing `(pointer: fine)` && !`prefers-reduced-motion` in the initializer avoids the flip. Safe because it's a client-only Vite SPA (no SSR).

- **Make BOTH wrapper layers `width:100%; height:100%`.** `height:100%` resolves to auto inside vertical `space-y` (block) stacks, but lets the wrapper stretch as a grid item in equal-height grids. For a grid card that relied on stretch + `mt-auto`, also add `h-full` to the card's own root so it fills the now-stretched cell.

- **Skip `will-change: transform`.** For a large grid (~60 cards) it forces that many permanent compositor layers; framer-motion promotes during the actual animation anyway.

- Pass a `disabled` prop while an in-card overlay (dropdown) is open so the tilt settles flat; combine with elevating the whole wrapper — see `stacking-context-card-wrap.md` for the stacking half.
