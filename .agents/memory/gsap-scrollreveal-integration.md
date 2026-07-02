---
name: Integrating GSAP scrub scroll-reveal (React Bits ScrollReveal) into a React app
description: Non-obvious readability, cleanup, and semantics gotchas when porting a scroll-scrubbed word-reveal text component.
---

# GSAP scrub scroll-reveal integration

Applies to React Bits "ScrollReveal" and any GSAP `scrollTrigger: { scrub: true }` word/opacity/blur reveal.

## Above-the-fold readability (the main UX trap)
With `scrub: true`, the reveal state is pinned to scroll position, not time. If the target text can be **above the fold** when it first renders (e.g. a primary description with no auto-scroll after it appears), it can sit permanently faded/blurred at rest until the user scrolls.
**Why it matters:** blurred body text is worse to read than merely dimmed text.
**How to apply:** for must-read prose, soften the at-rest floor — raise `baseOpacity` (~0.3) and keep `blurStrength` low (~2–3) or `enableBlur={false}`. Reserve the dramatic 0.1-opacity / high-blur defaults for decorative headings the user scrolls down to. On very tall viewports the whole trigger band is already past at scroll=0, so the effect simply no-ops (fully visible) — acceptable.

## Cleanup: revert tweens, not just triggers
The shipped source cleans up with `ScrollTrigger.getAll().forEach(kill)` — that nukes **every** ScrollTrigger app-wide, so any remount (e.g. `key={...}` on new data) breaks sibling instances. Also, killing a trigger does NOT kill its scrubbed tween, so tweens orphan on the global timeline each remount.
**Fix:** wrap all `gsap.fromTo` calls in `gsap.context(() => {...}, scopeRef)` and return `() => ctx.revert()`. `revert()` kills the tweens + their triggers and restores inline styles, scoped to this instance only.

## Semantics / theming
- The source renders `<h2><p>`. Injecting a full paragraph of body text as an `<h2>` pollutes the heading outline — render a `<div>` wrapper instead when the content is not a heading.
- The source CSS hardcodes a large heading font (`clamp(1.6rem,3rem)`, weight 600). Strip that and let the host app drive font/size/color via a `textClassName` (Tailwind `text-lg leading-relaxed text-foreground`) so it matches the theme and light/dark.
- `split(/(\s+)/)` keeps whitespace as text nodes between word `<span>`s, so `textContent` (and `data-testid` text assertions) still read the full string. Forward `data-*` onto the text element.
- Respect `prefers-reduced-motion`: `gsap.set` everything to the revealed state and skip the scroll animations.
