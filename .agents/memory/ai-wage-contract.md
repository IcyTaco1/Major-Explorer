---
name: "AI never returns wages" hard contract (major-explorer)
description: Why wage/salary data must be scrubbed server-side, not just forbidden in the prompt.
---

# Locked contract: AI must never emit wage/salary figures

In major-explorer, all salary / job-growth / required-degree numbers come ONLY
from the BLS dataset (`lib/bls-data`). The AI's job is limited to: a description,
colleges (+admissionsProfile), and a SOC code chosen from a whitelist. The public
`/majors/lookup` response strips the internal `blsSocCode` and attaches the real
BLS `career` server-side.

**Rule:** prompt instructions alone ("do not include salary") are NOT sufficient
to satisfy this contract. There is a server-side `scrubWages()` defense-in-depth
layer that strips dollar figures / money-with-wage-keyword sentences from the
AI free-text fields (`description`, each `topColleges[].highlights`) before the
response is sent or logged. Keep it.

**Why:** the requirement is a hard product contract (only official BLS wages may
reach the user); a single stray "$90k" hallucinated into free text would violate
it. Models occasionally ignore negative prompt constraints.

**Also locked:** GPA lives in localStorage only — never sent to or logged by the
server; Reach/Match/Safety is computed client-side from GPA vs admissionsProfile.
`/majors/lookup` also caps `topColleges` to 10 and renumbers ranks 1..n.

**How to apply:** if you touch the lookup route or the prompt, do not remove the
scrub/cap/SOC-whitelist logic; re-verify no `$` figure appears in description or
highlights (a quick curl + regex check works).
