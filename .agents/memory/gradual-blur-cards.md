---
name: GradualBlur (backdrop-filter) overlay on cards
description: Non-obvious decisions for putting a React Bits GradualBlur / backdrop-filter fade on every card, especially BorderGlow cards.
---

# GradualBlur backdrop-filter overlay on cards

Applying a progressive `backdrop-filter` blur strip to the bottom edge of every card in Major Explorer.

## Self-clip the overlay; do NOT add overflow:hidden to the card
BorderGlow cards are intentionally `overflow: visible` (the glow bleeds outside the border) and the college-results card has an absolutely-positioned save dropdown that extends past the card. Adding `overflow: hidden` to the card to clip the blur to rounded corners would clip BOTH the glow and the dropdown.

**Rule:** let the blur overlay clip ITSELF — give its root `overflow: hidden` (React Bits `.gradual-blur-parent` already does) plus an explicit bottom `border-radius` matching the card (1rem / 16px here). Then a rectangular blur strip won't blur the page background outside the rounded corners, and the card keeps `overflow: visible`.

**Why:** a bottom blur strip is a rectangle; without clipping, its square corners blur the background beyond the card's rounded corners.

## z-index: above content, below interactive overlays
Use a LOW zIndex (2), not the component's default 1000. The blur must paint above the card's own content (z-auto) so `backdrop-filter` samples/blurs it, but below the save dropdown (z-30) so the dropdown is neither blurred nor covered. `backdrop-filter` only samples content painted BEFORE the element, so a z-30 dropdown painted after a z-2 blur stays crisp even if they overlap on a short card. Keep the overlay `pointer-events: none`.

## Anchoring inside BorderGlow
The blur is rendered as a child of `.border-glow-inner` (position: relative), so `position:absolute; bottom:0` aligns to the inner container, which fills the card just inside its 1px border — visually indistinguishable from the card edge.

## Don't install mathjs
The React Bits GradualBlur source lists `mathjs` as a dependency but only uses native `Math.pow`/`Math.round`. Do not install mathjs.

## Perf
`backdrop-filter` is GPU-expensive. Careers view renders up to 60 cards with no virtualization; keep `divCount` small (3–4) since each extra layer is another backdrop-filter element per card (~240 total at divCount 4). Hoist any inline `style` object passed to the memoized GradualBlur to a module constant, or `React.memo` is defeated.
