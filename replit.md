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
- **Compare** — side-by-side comparison of two saved majors (client-side, from localStorage saved majors).
- **Admin dashboard** — stats, charts, and users table; gated server-side by the `ADMIN_EMAILS` env var (comma-separated emails). The Admin nav tab only appears when `GET /api/me` returns `isAdmin: true`.
- GPA/SAT/ACT profile stays localStorage-only by design (privacy).

**Tech:** React + Vite frontend, Express API backend, OpenAI (gpt-5.2) for data generation, Clerk auth, Drizzle + Postgres.

**Key endpoints:**
- `POST /api/majors/lookup` — accepts `{ major: string }`, returns `{ major, description, topColleges[] }`
- `GET/PATCH /api/me` — profile (`gradeLevel`, `isAdmin`)
- `GET/POST /api/my-colleges`, `PATCH/DELETE /api/my-colleges/:id`, `POST /api/my-colleges/import` — per-user saved colleges (status, deadlines, notes)
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
