---
name: Integrating GSAP scrub scroll-reveal (React Bits ScrollReveal) into a React app
description: Non-obvious readability, cleanup, and semantics gotchas when porting a scroll-scrubbed word-reveal text component.
---

# GSAP scrub scroll-reveal integration

Applies to React Bits "ScrollReveal" and any GSAP `scrollTrigger: { scrub: true }` word/opacity/blur reveal.

## Prefer a timed toggleActions entrance over scrub (the main trap)
`scrub: true` pins the reveal to scroll POSITION, not time. If the text is **already in view** when it first renders (e.g. a description that appears after an async lookup, or anything above the fold), the scrub range is already complete → the user sees NO animation and reports "it's not working." Softening baseOpacity/blur does not fix this; it only makes the dead state less ugly.
**Fix that actually works:** drop scrub. Use a `gsap.timeline({ scrollTrigger: { trigger, start: "top 80%", toggleActions: "restart none restart none" } })`. `toggleActions` restart-on-enter/enter-back **replays the reveal every time the element scrolls into view from either direction, and plays it on initial load when the element is already within the start zone.** This is what "make it fire on every scroll" means.
**Nicer fade:** animate `opacity baseOpacity→1` + `yPercent 40→0` (per-word rise) + `blur(N)→0`, `ease: "power3.out"`, and `stagger: { amount: 0.9, from: "start" }` so long and short strings finish in a similar time. With a timed entrance the text always ends fully opaque and stays, so at-rest readability is a non-issue and you can use a dramatic `baseOpacity: 0`.
**fromTo immediateRender:** in a timeline `fromTo` sets the "from" state immediately, so there's no flash of visible-then-hidden before the trigger fires.

## Cleanup: revert tweens, not just triggers
The shipped source cleans up with `ScrollTrigger.getAll().forEach(kill)` — that nukes **every** ScrollTrigger app-wide, so any remount (e.g. `key={...}` on new data) breaks sibling instances. Also, killing a trigger does NOT kill its scrubbed tween, so tweens orphan on the global timeline each remount.
**Fix:** wrap all `gsap.fromTo` calls in `gsap.context(() => {...}, scopeRef)` and return `() => ctx.revert()`. `revert()` kills the tweens + their triggers and restores inline styles, scoped to this instance only.

## Reusing the reveal on cards / arbitrary elements (not just text)
To apply the same fade+rise reveal to card lists, extract a `useScrollReveal<T>()` hook that returns a **ref only** (no wrapper element) and attaches the GSAP `fromTo` (opacity 0→1, y 28→0, `toggleActions: "restart none restart none"`) to whatever element the ref lands on.
**Why no wrapper:** wrapping a card in an extra `<div>` breaks CSS-grid equal-height rows (a footer using `mt-auto` needs the card itself to be the direct grid item) and can add an unwanted stacking context. Attaching to the card's own element preserves layout.
- For a plain card, put the ref on the card's root `<div>`. Hooks-rules: do this inside a real module-level component (e.g. a `CareerCard`), never call the hook inside a `.map`.
- For a component that owns its root (like a glow-border card), convert it to `forwardRef` and merge the forwarded ref with the internal ref via a `setRefs` useCallback (handle both function and object refs). Then a thin `RevealX` wrapper calls the hook and passes the ref in — no extra DOM.
- **Remove any old one-time CSS entrance classes** (e.g. `animate-in fade-in slide-in-from-bottom-4`) from cards you convert, or they double-animate against GSAP.

## Stale ScrollTrigger start positions after client-side list changes (the card trap)
`gsap.fromTo` immediately sets below-fold cards to opacity 0, and each ScrollTrigger caches its start position when its effect runs. When a **client-side filter/sort shrinks or reorders a list whose items keep stable keys** (so React does NOT remount them and the reveal effect does NOT re-run), persisting cards move up into the viewport with stale trigger positions and can stay **stuck at opacity 0** until a resize or extra scroll.
**Fix:** call `ScrollTrigger.refresh()` from a `useEffect` in the list-owning component, keyed on what changes layout — e.g. `[filtered]` for a filtered grid, `[filteredLen, currentPage, resultKey]` for a filtered+paginated list. Refresh recomputes start positions and `toggleActions` then fires onEnter for now-visible cards. Watch for identical keys across data swaps (e.g. `key={rank}` reused across different lookups) — those elements persist rather than remount, so they specifically rely on this refresh.

## Semantics / theming
- The source renders `<h2><p>`. Injecting a full paragraph of body text as an `<h2>` pollutes the heading outline — render a `<div>` wrapper instead when the content is not a heading.
- The source CSS hardcodes a large heading font (`clamp(1.6rem,3rem)`, weight 600). Strip that and let the host app drive font/size/color via a `textClassName` (Tailwind `text-lg leading-relaxed text-foreground`) so it matches the theme and light/dark.
- `split(/(\s+)/)` keeps whitespace as text nodes between word `<span>`s, so `textContent` (and `data-testid` text assertions) still read the full string. Forward `data-*` onto the text element.
- Respect `prefers-reduced-motion`: `gsap.set` everything to the revealed state and skip the scroll animations.
