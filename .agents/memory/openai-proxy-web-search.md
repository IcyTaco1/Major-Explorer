---
name: Web search via the Replit OpenAI proxy
description: The Responses API web_search tool works through the AI Integrations proxy even though the skill doc doesn't list it; citation annotations are empty when combined with structured output.
---

The Replit AI Integrations OpenAI proxy supports the Responses API `web_search` tool (`tools: [{ type: "web_search" }]`), even though the skill's supported-capabilities list doesn't mention it. Verified live: real searches run and return current, correct data.

**Why:** grepping the integration lib or reading the skill suggests web search is unavailable, which would push you toward stale model knowledge for time-sensitive data (deadlines, prices, news). A direct probe against `$AI_INTEGRATIONS_OPENAI_BASE_URL/responses` proves otherwise.

**How to apply:**
- For fresh factual data needs, combine `web_search` with strict `json_schema` output (`text.format`) — both work together through the proxy.
- Quirk: when structured output is used, `url_citation` annotations come back EMPTY. Ask for a `sources` array inside the JSON schema instead, and treat annotation harvesting as a best-effort bonus. Validate model-provided URLs to http(s) before rendering as links.
- Web-search calls are slow (~15-60s) and cost more — cache results in the DB and use a short TTL for empty/failed lookups so they stay retryable.
