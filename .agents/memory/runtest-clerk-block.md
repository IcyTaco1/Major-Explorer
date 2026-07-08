---
name: runTest persistent block after Clerk OAuth failure
description: Once a runTest session gets blocked (e.g. Clerk sign-in led to Google OAuth), all later runTest calls fail even with testClerkAuth:true.
---

The testing subagent persists a "blocked" state per project. If any earlier test run hit an external OAuth wall (Clerk UI showing only Google sign-in), every subsequent `runTest()` call throws "Testing is blocked: Testing was blocked earlier..." — even when `testClerkAuth: true` is passed and the new plan never touches the Clerk UI.

**Why:** the block is recorded from the prior failed session and is not cleared by passing the auth-override flag later.

**How to apply:** pass `testClerkAuth: true` on the FIRST test attempt in any Clerk-authenticated app. If the block already exists, don't retry runTest — fall back to architect review + curl smoke tests + screenshots, and tell the user which flows to click through manually.
