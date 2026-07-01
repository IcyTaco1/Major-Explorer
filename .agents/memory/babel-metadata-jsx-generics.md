---
name: Babel metadata plugin breaks JSX generic type args
description: Why <Component<T> .../> fails at runtime in Vite artifacts despite passing tsc, and what to do instead.
---

# JSX generic type arguments break under the Vite/Babel replit-metadata plugin

Writing an explicit type argument on a JSX element — e.g. `<FilterChips<FitTier | "all"> ... />` — is valid TypeScript and passes `tsc --noEmit`, but it throws a Vite `Pre-transform error: Unexpected token` at dev-server/runtime.

**Why:** the Replit metadata Babel plugin injects `data-replit-metadata=... data-component-name="..."` attributes immediately after the tag name, producing `<FilterChips data-...="..." data-component-name="FilterChips"<FitTier | "all">` — the type arg lands after injected attributes and the JSX parser chokes.

**How to apply:** never rely on inline JSX generic type-argument syntax in these artifacts. If a generic component's type inference widens wrong (e.g. options literals widening a param to `string`), don't fix it with `<Comp<T>>`. Instead either make the component non-generic (accept `string`) and cast at the call site (`onChange={(v) => setX(v as MyUnion)}`), or pass a typed variable whose annotation drives inference. Symptom to recognize: `tsc` is clean but the browser/Vite log shows a parse error pointing at the `<Type>` right after `data-component-name`.
