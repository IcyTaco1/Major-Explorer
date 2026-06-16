---
name: Clerk-gated apps & e2e testing harness
description: Why the Playwright testing harness intermittently blocks Clerk-protected apps, and how to verify them anyway.
---

# Clerk auth vs. the e2e testing harness

The major-explorer app gates `/app` behind Clerk sign-in. The Playwright testing
harness supports programmatic Clerk login (`runTest({ testClerkAuth: true })` +
a `[Clerk Auth] Sign in as {...}` step), but it is **unreliable**: it sometimes
falls back to the Clerk hosted UI / Google OAuth button, then declares the run
"unable" and can **globally block** all further testing for the session with a
message about "external OAuth not testable".

**Observed:** in one batch the 400px mobile run signed in via Clerk and fully
passed, while the 1280px desktop run in the same batch hit the OAuth fallback and
got blocked. So success is non-deterministic per-run, and one block poisons
subsequent `runTest` calls.

**Why:** the harness refuses third-party OAuth flows; whether it takes the
programmatic path or the OAuth UI is flaky.

**How to apply:** don't rely solely on e2e for Clerk-gated apps. Verify with a
combination of: one `runTest` attempt (mobile often works), plus `curl` through
the proxy (`localhost:80/api/...`) for API behavior, plus `pnpm --filter ... run
typecheck`, plus the architect review. Do NOT keep retrying once the harness
reports a global block — it stays blocked for the session.
