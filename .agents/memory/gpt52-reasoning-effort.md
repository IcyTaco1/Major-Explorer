---
name: gpt-5.2 reasoning_effort values + large-list latency
description: Valid reasoning_effort values for gpt-5.2 via the OpenAI integration, and why big structured responses are slow.
---

# gpt-5.2 `reasoning_effort` and large-response latency

`chat.completions.create({ model: "gpt-5.2", reasoning_effort })` accepts ONLY: `none`, `low`, `medium`, `high`, `xhigh`. Passing `minimal` returns a 400 `unsupported_value` (that value exists for other GPT-5 variants, not 5.2). Our route catches OpenAI errors and returns HTTP 500, so a bad param shows up as a fast (~0.2s) 500 — check the api-server log for `BadRequestError` before assuming a timeout.

**Latency is output-bound, not reasoning-bound for listing tasks.** The major-explorer lookup generates ~50 colleges each with a 7-field admissions profile (~5k output tokens) and takes ~85-90s regardless of whether `reasoning_effort` is `none` or `low` — they measured the same. Lowering reasoning effort did NOT help here because there was little reasoning to begin with; the cost is emitting the tokens.

**How to apply:** to meaningfully cut latency on a large structured response you must cut output tokens (fewer items or fewer fields) or parallelize into concurrent calls — changing `reasoning_effort` won't move it. Single-call keeps global ranking coherent; parallel/tiered splits are faster but risk mis-ordered or duplicate items at the chunk boundary. A ~90s single call can hit request timeouts on some production/proxy configs — set loading-state expectations in the UI and be aware of the deploy target's timeout.

**Nullable fields get dropped aggressively at scale.** With `reasoning_effort: "none"` over a big list (50 items), if a JSON field is described as "use null if unknown/optional" the model fills null for a large fraction (major-explorer: ~3-6 of 50 colleges returned null SAT/ACT, so those comparison rows silently vanished for users). If a field must always be present, do NOT offer the null escape hatch — explicitly instruct "you MUST always provide X; do NOT use null for X; give your best estimate." That flipped SAT/ACT coverage from ~47/50 to 50/50 with no measurable latency change (output size barely moved).
