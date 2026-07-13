# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── major-explorer/     # React + Vite web app (Major Explorer)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side client
│   └── integrations-openai-ai-react/  # OpenAI React hooks
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Application: Major Explorer ("Next Steps")

A web app where users type in a college major and instantly get:
- A concise 5-7 sentence description of the major
- A ranked list of the top 10 US colleges for that major

Plus signed-in features (Clerk auth):
- **My Colleges** — saved per user in Postgres (keyed by Clerk userId), with application status tracker, per-college deadlines (Early Decision / Regular Decision / FAFSA), and notes. A one-time client-side effect imports pre-account localStorage data into the DB.
- **Roadmap** — grade-level selection (9-12, persisted server-side) with a college-prep roadmap per grade.
- **Saved majors** — bookmarked majors saved per user in Postgres (`saved_majors`, keyed by Clerk userId, unique per `majorName`). Each row stores the major description, a career snapshot, and a list of saved college snapshots. The client is server-authoritative (React Query) with optimistic cache updates; a one-time client-side effect imports pre-account localStorage saved majors into the DB.
- **Compare** — side-by-side comparison of two saved majors (derived from the server-backed saved majors), including a career outlook section (median pay, job growth, typical education) from career data captured at save time.
- **Admin dashboard** — stats, charts, and users table; gated server-side by the `ADMIN_EMAILS` env var (comma-separated emails). The Admin nav tab only appears when `GET /api/me` returns `isAdmin: true`.
- **Legal pages** — `/privacy` and `/terms` (wouter routes, public), content in `src/pages/legal/`. Linked from the landing-page footer and Settings → Data & privacy. `LEGAL_CONTACT_EMAIL` in `LegalLayout.tsx` is set to `next.steps.contact.here@gmail.com` — both policies' contact sections render it as a mailto link.
- **Profile sync** — GPA/SAT/ACT/goals and interest-quiz results/done state are stored per user in `user_profiles` (synced via `GET/PUT /api/me`). localStorage is kept as a fast-start cache; on load, a one-time reconciliation runs (server wins; local-only data is imported to the account). Sync failures surface a toast and suppress the "Saved" flash. Saved majors are now DB-backed (see **Saved majors** above); localStorage is only a one-time migration source.

**Tech:** React + Vite frontend, Express API backend, OpenAI (gpt-5.2) for data generation, Clerk auth, Drizzle + Postgres.

**Server hardening:** All AI endpoints (`/api/chat`, `/api/majors/lookup`, `/api/majors/curriculum`) require Clerk auth and are rate-limited per user via `src/middlewares/rateLimit.ts` — a **Postgres-backed fixed-window** limiter (10/min, `Retry-After` on 429, `rate_limit_counters` table with atomic `INSERT..ON CONFLICT..RETURNING`, keyed by userId with IP fallback, fails open on DB error). Being DB-backed, limits survive server restarts. Each limiter passes a `name` (e.g. `chat`, `lookup`) to isolate buckets. Sage chat injects student context (profile, quiz results, saved colleges) into its system prompt. `/api/careers` stays public.

**Key endpoints:**
- `POST /api/majors/lookup` — auth + rate-limited; accepts `{ major: string }` (max 120 chars), returns `{ major, description, topColleges[] }`
- `POST /api/colleges/deadlines` — auth-required; researches a college's official ED/RD/FAFSA-priority deadlines via OpenAI Responses API + web_search (strict JSON schema output), cached in `college_deadlines` table (60-day TTL; 1-hour TTL when no dates found so failures are retryable). UI: "Find official dates" button per saved college in My Colleges with sources + one-click "Use these dates".
- `GET/PUT /api/me` — profile (`gradeLevel`, `gpa`, `sat`, `act`, `goals`, `quizResults`, `quizDone`, `isAdmin`)
- `GET/POST /api/my-colleges`, `PATCH/DELETE /api/my-colleges/:id`, `POST /api/my-colleges/import` — per-user saved colleges (status, deadlines, notes)
- `GET/PUT /api/saved-majors`, `DELETE /api/saved-majors/:id`, `POST /api/saved-majors/import` — auth-required; per-user bookmarked majors. PUT upserts by `(userId, majorName)` and preserves the original `savedAt` (stable ordering). Caps: majorName ≤120, description ≤2000, colleges ≤15, import ≤100 items
- `GET /api/admin/stats`, `GET /api/admin/users` — admin-only

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/major-explorer` (`@workspace/major-explorer`)

React + Vite frontend. Single-page app with major search and results display.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`. Uses `@workspace/integrations-openai-ai-server` for OpenAI calls.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- Routes: `src/routes/majors.ts` — `POST /api/majors/lookup`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/integrations-openai-ai-server`

Server-side OpenAI client with Replit AI Integrations. Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`.
