---
name: Card bottom-fade blur was removed (do not reintroduce)
description: The GradualBlur backdrop-filter bottom-fade on Major Explorer cards was removed at the user's request; plus the reusable technique notes in case it is ever wanted again.
---

# Card bottom-fade blur — removed by user request

Major Explorer cards briefly had a progressive `backdrop-filter` blur strip fading the bottom edge of every card (a shared `CardBlur` wrapper around React Bits `GradualBlur`, used at all card sites).

**Decision:** the user explicitly asked to remove that blurred bottom edge "everywhere." The `CardBlur` component, all its usages, and the `GradualBlur.tsx`/`.css` files were deleted.
**Why:** the user did not like the faded/blurred bottom of the cards (it made the last line of card content look cut off / smudged).
**How to apply:** do NOT reintroduce a bottom-fade / backdrop-filter blur strip on these cards unless the user asks for it again.

## Reusable technique notes (only if it is ever wanted again)
- Self-clip the overlay (give it its own `overflow:hidden` + matching bottom `border-radius`); do NOT add `overflow:hidden` to the card — BorderGlow cards are `overflow:visible` and the college card's save dropdown overflows.
- Use a LOW zIndex (~2): above card content so `backdrop-filter` samples it, but below the z-30 save dropdown so the dropdown stays crisp and clickable. Keep it `pointer-events:none`.
- `backdrop-filter` is GPU-expensive; the careers view renders ~60 cards unvirtualized, so keep `divCount` small (3–4) and hoist any inline style object to a module constant so `React.memo` holds.
- The React Bits GradualBlur source lists `mathjs` but only uses native `Math` — do not install mathjs.
