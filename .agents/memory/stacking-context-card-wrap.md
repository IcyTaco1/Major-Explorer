---
name: Wrapping cards in a stacking-context component traps inner overlays
description: Why absolutely-positioned dropdowns/menus inside a card break when the card is wrapped in a component that uses isolation/transform, and how to fix.
---

# Wrapping cards that contain absolute overlays

**Rule:** If a card contains an absolutely-positioned overlay (dropdown, popover, menu) that relies on `z-index` to sit above sibling cards, do NOT wrap/convert that card into a component that establishes a **new stacking context** without also raising the card itself when the overlay is open.

Anything that establishes a stacking context does this: `isolation: isolate`, any `transform`, `filter`, `mix-blend-mode`, `will-change`, `position: fixed/sticky`, opacity < 1, etc. The `BorderGlow` glow component uses both `isolation: isolate` and `transform: translate3d(...)`, so it is a stacking context.

**Symptom:** Before wrapping, the overlay's high `z-index` (e.g. `z-30`) escaped to the page level and painted over neighboring cards. After wrapping, that `z-index` is now confined *inside* the card's stacking context. Sibling cards (also stacking contexts at `z-auto`) paint later in DOM order, so the next card's opaque background covers any part of the overlay that overflows past the current card's bottom edge — the lower half of the dropdown becomes hidden/unclickable.

**Why:** z-index only competes within the same stacking context. Confining the overlay inside the card means the whole card (not the overlay) is what competes with sibling cards.

**How to apply:** When the overlay is open, raise the *whole card* above its siblings — e.g. add `relative z-20` (conditionally, only while open) to the wrapping element. Do NOT remove `isolation`/`transform` from the glow CSS; those are required for the `z-index:-1` pseudo-element glow layers and the `plus-lighter`/`soft-light` blend modes to render.

**Also applies to `perspective`/tilt wrappers:** a mouse-tilt wrapper (e.g. TiltedCard) sets `perspective` on the outer element, which is itself a stacking-context trigger — so wrapping cards in it has the exact same failure mode. Fix identically: pass the conditional `relative z-20` elevation to the tilt wrapper while the overlay is open, and also disable the tilt (settle to flat) so a mid-hover transform can't fight the elevation. The dropdown's containing block is the inner `relative` div, so it is unaffected by the wrapper's transform.
