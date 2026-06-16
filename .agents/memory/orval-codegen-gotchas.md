---
name: Orval codegen name collisions (api-zod barrel)
description: Why regenerating the OpenAPI client can break the api-zod build with TS2308, and how to name schemas to avoid it
---

# Orval / api-zod barrel name collisions

`lib/api-zod/src/index.ts` re-exports BOTH `./generated/api` (zod value consts) and
`./generated/types` (TS interfaces) with `export *`. The zod target is configured with
`schemas: { path: "generated/types", type: "typescript" }`, so every component schema is
emitted as a TS interface in `types/`, AND every operation's response/body is emitted as a
zod const in `api.ts`.

## The collision rule
Orval names the per-operation zod consts `<OperationIdPascal>Body` and
`<OperationIdPascal>Response`. If a **component schema** has a name equal to one of those,
both `./generated/api` and `./generated/types` export the same identifier and the barrel
fails with **TS2308 "Module has already exported a member named 'X'"**.

Real example: operationId `chat` → zod const `ChatResponse`; a component schema also named
`ChatResponse` → collision. Fix: rename the component to an entity-shaped name (`ChatReply`).
The skill `pnpm-workspace/references/openapi.md` documents the `<OpId>Body` case; the
`<OpId>Response` case is the same bug and is easy to miss.

**How to apply:** never name a component schema `<SomethingResponse>`/`<SomethingBody>` when
an operationId PascalCases to the same string. Prefer entity nouns (`ChatReply`, `CareerInfo`).

## Stale committed generated output
The committed generated files can be stale (e.g. chat schemas present in `api.ts` but missing
from `types/`), so a latent collision only appears after you re-run codegen. tsc `--build`
also caches per-project (`.tsbuildinfo`), so an untouched `api-zod` may show clean until codegen
rewrites its files. After any `pnpm --filter @workspace/api-spec run codegen`, run
`pnpm run typecheck:libs` and trust it over cached/editor state.

## Pre-existing noise to ignore
`pnpm run typecheck:libs` always reports errors from `lib/integrations-openai-ai-server` and
`lib/integrations-openai-ai-react` (TS2688 'node', `AbortError`, `Cannot find module 'react'`).
These predate this work and are unrelated — filter them out when checking your own changes.
