import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, collegeDeadlinesTable, type CollegeDeadlinesRow } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GetCollegeDeadlinesBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Cached lookups stay valid for 60 days; admissions deadlines are published
// once per cycle, so this avoids re-paying for web search on every click
// while still refreshing within a cycle. Lookups that found no dates at all
// are likely transient failures, so they only stick for an hour — otherwise
// one bad model response would show "no dates" to every user for 60 days.
const CACHE_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 60 * 60 * 1000;

function cacheTtlFor(row: Pick<CollegeDeadlinesRow, "earlyDecision" | "regularDecision" | "fafsa">): number {
  const hasAnyDate = row.earlyDecision || row.regularDecision || row.fafsa;
  return hasAnyDate ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS;
}

// A date string is only accepted when it round-trips through Date — the
// OpenAPI regex alone would let "2027-02-31" through and Postgres would 500.
function isRealDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const aiDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate)
  .nullable()
  .catch(null);

const AiDeadlinesSchema = z.object({
  cycle: z.string().catch(""),
  earlyDecision: aiDate,
  regularDecision: aiDate,
  fafsa: aiDate,
  notes: z.string().catch(""),
  // Model-provided URLs are rendered as links in the UI and the cache rows
  // are shared across users, so only allow http(s) URLs through.
  sources: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .catch([])
    .transform((list) => list.filter((s) => /^https?:\/\//i.test(s.url))),
});

const DEADLINES_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cycle: {
      type: "string",
      description: "Admission cycle the dates apply to, e.g. 'Fall 2027 entry'",
    },
    earlyDecision: {
      type: ["string", "null"],
      description:
        "Early Decision I application deadline as YYYY-MM-DD. If the college offers Early Action instead, use that date and explain in notes. Null if the college offers neither.",
    },
    regularDecision: {
      type: ["string", "null"],
      description: "Regular Decision application deadline as YYYY-MM-DD, null if unknown",
    },
    fafsa: {
      type: ["string", "null"],
      description:
        "The college's FAFSA / financial-aid priority deadline as YYYY-MM-DD (the college's own priority date, not the federal close date), null if not found",
    },
    notes: {
      type: "string",
      description:
        "One short sentence of caveats, e.g. 'Offers Early Action (non-binding) instead of Early Decision.' Empty string if none.",
    },
    sources: {
      type: "array",
      description: "The web pages the dates were taken from (prefer the college's official admissions pages)",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "url"],
      },
    },
  },
  required: ["cycle", "earlyDecision", "regularDecision", "fafsa", "notes", "sources"],
} as const;

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function toResponse(row: CollegeDeadlinesRow) {
  const sources = Array.isArray(row.sources)
    ? (row.sources as { title: string; url: string }[])
    : [];
  return {
    collegeName: row.collegeName,
    cycle: row.cycle,
    earlyDecision: row.earlyDecision,
    regularDecision: row.regularDecision,
    fafsa: row.fafsa,
    notes: row.notes,
    sources,
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

async function researchDeadlines(collegeName: string) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = [
    `Today's date is ${today}.`,
    `Find the official first-year application deadlines for ${collegeName} (United States) for the UPCOMING admission cycle — students applying now for the next fall's entering class.`,
    `Use web search. Strongly prefer the college's own official admissions and financial-aid pages; otherwise use highly reliable sources (Common App, the college's official catalog).`,
    `Report:`,
    `1. earlyDecision — the Early Decision I deadline. If the college only offers Early Action, give the EA date and say so in notes. If it offers neither, null.`,
    `2. regularDecision — the Regular Decision deadline.`,
    `3. fafsa — the college's own FAFSA/financial-aid PRIORITY deadline for incoming first-year students (not the federal June 30 close). Null if the college doesn't publish one.`,
    `All dates must be exact calendar dates in YYYY-MM-DD with the correct year for the upcoming cycle. If a page only lists e.g. "November 1", infer the correct year from the cycle. Do not guess dates that you cannot support from a source.`,
  ].join("\n");

  const response = await openai.responses.create({
    model: "gpt-5.4",
    tools: [{ type: "web_search" }],
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "college_deadlines",
        strict: true,
        schema: DEADLINES_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  });

  const raw: unknown = JSON.parse(response.output_text || "{}");
  const parsed = AiDeadlinesSchema.parse(raw);

  // Prefer real citation annotations from web search over the model's own
  // "sources" list — annotations are attached by the tool, not generated.
  const cited = new Map<string, { title: string; url: string }>();
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type !== "output_text") continue;
      for (const ann of content.annotations ?? []) {
        if (ann.type === "url_citation" && ann.url && /^https?:\/\//i.test(ann.url)) {
          cited.set(ann.url, { title: ann.title || ann.url, url: ann.url });
        }
      }
    }
  }
  const sources = (cited.size > 0 ? [...cited.values()] : parsed.sources).slice(0, 5);

  return { ...parsed, sources };
}

router.post("/colleges/deadlines", requireAuth, async (req, res) => {
  const body = GetCollegeDeadlinesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid college name" });
    return;
  }
  const collegeName = body.data.collegeName.trim();
  const key = normalizeKey(collegeName);

  try {
    const [cached] = await db
      .select()
      .from(collegeDeadlinesTable)
      .where(eq(collegeDeadlinesTable.collegeKey, key));
    if (cached && Date.now() - cached.fetchedAt.getTime() < cacheTtlFor(cached)) {
      res.json(toResponse(cached));
      return;
    }
  } catch (err) {
    req.log.error({ err }, "college deadlines cache read failed");
  }

  let researched: Awaited<ReturnType<typeof researchDeadlines>>;
  try {
    researched = await researchDeadlines(collegeName);
  } catch (err) {
    req.log.error({ err, collegeName }, "college deadlines research failed");
    res.status(502).json({
      error: "Couldn't look up deadlines for this college right now. Please try again.",
    });
    return;
  }

  const values = {
    collegeKey: key,
    collegeName,
    cycle: researched.cycle,
    earlyDecision: researched.earlyDecision,
    regularDecision: researched.regularDecision,
    fafsa: researched.fafsa,
    notes: researched.notes,
    sources: researched.sources,
    fetchedAt: new Date(),
  };

  try {
    const [row] = await db
      .insert(collegeDeadlinesTable)
      .values(values)
      .onConflictDoUpdate({
        target: collegeDeadlinesTable.collegeKey,
        set: { ...values, collegeKey: undefined as never },
      })
      .returning();
    res.json(toResponse(row));
  } catch (err) {
    // Research succeeded but caching failed — still give the user the data.
    req.log.error({ err }, "college deadlines cache write failed");
    res.json({
      collegeName,
      cycle: researched.cycle,
      earlyDecision: researched.earlyDecision,
      regularDecision: researched.regularDecision,
      fafsa: researched.fafsa,
      notes: researched.notes,
      sources: researched.sources,
      fetchedAt: new Date().toISOString(),
    });
  }
});

export default router;
