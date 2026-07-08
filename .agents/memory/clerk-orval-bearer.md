---
name: Clerk sessions don't reach the API via cookies
description: Signed-in user but every /api request 401s — the Orval client must send a Clerk bearer token; cookies alone don't authenticate the Express API.
---

Symptom: user is visibly signed in (Clerk UI works, app renders), but every authenticated API call returns 401 while public endpoints return 200.

Cause: `@clerk/express`'s `getAuth()` cannot read the session from cookies in this setup (dev instances especially). The generated API client only authenticates when a bearer-token getter is registered — that wiring is a separate, easy-to-forget step from adding auth UI.

**Why:** adding `requireAuth` server-side + `<Show when="signed-in">` client-side looks complete, but nothing connects Clerk's `getToken()` to outgoing fetches. Smoke-testing only unauthenticated 401s (which look "correct") misses this entirely.

**How to apply:** whenever adding Clerk-authenticated endpoints, register the token getter (`setAuthTokenGetter(() => getToken())` from `useAuth`) inside the ClerkProvider tree, and gate children rendering until it's registered so no query fires without it. Verify with a signed-in request returning 200, not just unauth 401s.
