# Memory Index

- [Orval codegen gotchas](orval-codegen-gotchas.md) — api-zod barrel TS2308 collisions when a component name equals `<OperationId>Response`/`Body`; rename to entity nouns; ignore pre-existing integrations-openai errors.
- [Clerk e2e testing](clerk-e2e-testing.md) — Clerk-gated apps flake/globally-block the Playwright harness via OAuth fallback; verify with curl+typecheck+architect, don't retry after a block.
- [AI wage contract](ai-wage-contract.md) — major-explorer: AI must NEVER emit wages; server scrubWages() + BLS-only data + GPA localStorage-only; don't remove scrub/cap/SOC-whitelist.
- [Babel metadata JSX generics](babel-metadata-jsx-generics.md) — `<Comp<T> .../>` passes tsc but Vite parse-errors (metadata plugin injects attrs before type arg); make component non-generic + cast instead.
