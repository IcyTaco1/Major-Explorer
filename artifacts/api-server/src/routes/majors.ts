import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LookupMajorBody, GetMajorCurriculumBody } from "@workspace/api-zod";
import {
  getAllCareers,
  findCareerByMajor,
  findCareerBySoc,
  getOccupationWhitelist,
} from "@workspace/bls-data";

const router: IRouter = Router();

// ── Real BLS occupation whitelist given to the AI classifier ────────────────
// The AI never invents wages or growth figures. It only picks the single SOC
// code that best matches a major; the server then attaches the real BLS record.
const OCCUPATION_WHITELIST = getOccupationWhitelist();
const WHITELIST_TEXT = OCCUPATION_WHITELIST.map(
  (o) => `${o.socCode} — ${o.occupation}`
).join("\n");

// Local schema for validating the AI's JSON output (kept out of the OpenAPI
// contract: `blsSocCode` is internal and is stripped from the public response).
const AiAdmissionsProfileSchema = z.object({
  gpaLow: z.number().nullable().optional(),
  gpaHigh: z.number().nullable().optional(),
  selectivityTier: z.enum([
    "most_selective",
    "highly_selective",
    "selective",
    "accessible",
  ]),
});

const AiCollegeSchema = z.object({
  rank: z.number(),
  name: z.string(),
  location: z.string(),
  highlights: z.string(),
  // Tolerate a malformed admissions profile without failing the whole lookup.
  admissionsProfile: AiAdmissionsProfileSchema.optional().catch(undefined),
});

const AiLookupSchema = z.object({
  major: z.string(),
  description: z.string(),
  blsSocCode: z.string().optional(),
  topColleges: z.array(AiCollegeSchema),
});

// ── Defense-in-depth: AI must NEVER return wage/salary figures. The prompt
// forbids them, but we also scrub the free-text fields (description, highlights)
// so a stray figure can never leak to the client. Real wages come only from BLS.
const MONEY_FIGURE = /\$\s?\d|\b\d{1,3}(?:,\d{3})+\b|\b\d{2,3}\s?k\b/i;
const WAGE_KEYWORD =
  /\b(salar(?:y|ies)|wages?|pay|paid|income|earns?|earning|earnings|compensation|stipend|paycheck)\b/i;

function scrubWages(text: string): { text: string; scrubbed: boolean } {
  if (!text) return { text, scrubbed: false };
  let scrubbed = false;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => {
    const hasDollar = /\$\s?\d/.test(s);
    const hasMoneyWithWageWord = MONEY_FIGURE.test(s) && WAGE_KEYWORD.test(s);
    if (hasDollar || hasMoneyWithWageWord) {
      scrubbed = true;
      return false;
    }
    return true;
  });
  let out = kept.join(" ");
  if (/\$\s?\d/.test(out)) {
    out = out.replace(/\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|bn|million|thousand)?/gi, "");
    scrubbed = true;
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  return {
    text: out || text.replace(/\$\s?\d[\d,]*(?:\.\d+)?/g, "").trim(),
    scrubbed,
  };
}

router.post("/majors/lookup", async (req, res) => {
  const parsed = LookupMajorBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request. Please provide a valid major name." });
    return;
  }

  const { major } = parsed.data;

  if (!major || major.trim().length === 0) {
    res.status(400).json({ error: "Major name cannot be empty." });
    return;
  }

  const trimmedMajor = major.trim();

  const prompt = `You are a friendly college guide helping students and families explore majors for the first time.

For the "${trimmedMajor}" major, respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:
{
  "major": "<normalized major name>",
  "description": "<A friendly, easy-to-understand 5-7 sentence paragraph about the ${trimmedMajor} major. Write like you're explaining it to a curious high schooler who knows nothing about it. Use simple words, avoid jargon, and make it feel exciting and relatable. Explain what students actually do day-to-day, what kinds of jobs they can get after, and why it matters in everyday life.>",
  "blsSocCode": "<the single SOC code from the list below whose occupation best matches the typical career for this major, or an empty string \"\" if none reasonably fit>",
  "topColleges": [
    {
      "rank": 1,
      "name": "<College name>",
      "location": "<City, State>",
      "highlights": "<One sentence about why this school is great for this major, in plain friendly language>",
      "admissionsProfile": {
        "gpaLow": <number 0-4: lower end of typical admitted high-school GPA, ~25th percentile>,
        "gpaHigh": <number 0-4: upper end of typical admitted high-school GPA, ~75th percentile>,
        "selectivityTier": "<one of: most_selective, highly_selective, selective, accessible>"
      }
    }
    // ... 10 total
  ]
}

Requirements:
- The description must be 5-7 sentences, friendly, simple, and engaging — no academic jargon.
- DO NOT include any salary, wage, pay, or income figures anywhere in your response. Wages are provided separately from official data.
- "blsSocCode" MUST be exactly one of the SOC codes from the list below, or "" if none reasonably fit. Do not invent SOC codes.
- For each college, "admissionsProfile" describes the typical admitted student's high-school GPA on a 4.0 scale and the school's overall admission difficulty. Use realistic values for that specific school.
- List exactly 10 colleges ranked 1-10 based on reputation for ${trimmedMajor}, using well-known, reputable US universities only.
- Return only the JSON, nothing else.

SOC code list (choose "blsSocCode" ONLY from these):
${WHITELIST_TEXT}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: "Failed to generate major information. Please try again." });
      return;
    }

    let rawResult: unknown;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      rawResult = JSON.parse(cleaned);
    } catch {
      req.log.error({ content }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Failed to parse major information. Please try again." });
      return;
    }

    const aiParsed = AiLookupSchema.safeParse(rawResult);
    if (!aiParsed.success) {
      req.log.error({ issues: aiParsed.error.issues }, "AI lookup response failed validation");
      res.status(500).json({ error: "Failed to parse major information. Please try again." });
      return;
    }

    const data = aiParsed.data;

    // Resolve the REAL BLS career: deterministic keyword/title match first,
    // then fall back to the AI's whitelisted SOC classification. findCareerBySoc
    // returns null for any SOC not in the dataset, so this also validates it.
    let career = findCareerByMajor(trimmedMajor);
    if (!career) {
      const soc = data.blsSocCode?.trim();
      if (soc) {
        career = findCareerBySoc(soc);
      }
    }

    const cleanDescription = scrubWages(data.description);
    if (cleanDescription.scrubbed) {
      req.log.warn({ major: trimmedMajor }, "Scrubbed potential wage figure from AI description");
    }

    // Cap to the top 10 and renumber ranks 1..n so the contract's "top 10"
    // requirement holds even if the model returns a different count or ranking.
    const topColleges = data.topColleges.slice(0, 10).map((c, i) => {
      const cleanHighlights = scrubWages(c.highlights);
      if (cleanHighlights.scrubbed) {
        req.log.warn({ major: trimmedMajor, college: c.name }, "Scrubbed potential wage figure from AI highlights");
      }
      return {
        rank: i + 1,
        name: c.name,
        location: c.location,
        highlights: cleanHighlights.text,
        ...(c.admissionsProfile ? { admissionsProfile: c.admissionsProfile } : {}),
      };
    });

    res.json({
      major: data.major,
      description: cleanDescription.text,
      career,
      topColleges,
    });
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(500).json({ error: "Failed to fetch major information. Please try again." });
  }
});

// ── GET /careers — serve the full BLS dataset for the Browse Careers view ────
router.get("/careers", (_req, res) => {
  res.json(getAllCareers());
});

router.post("/majors/curriculum", async (req, res) => {
  const parsed = GetMajorCurriculumBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request. Please provide a major and college name." });
    return;
  }

  const { major, college } = parsed.data;

  const prompt = `You are a college academic advisor. Create a realistic 4-year course plan for a student studying "${major}" at "${college}".

Respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:
{
  "major": "${major}",
  "college": "${college}",
  "years": [
    {
      "year": 1,
      "label": "Freshman Year",
      "focus": "<A one-sentence summary of what this year is all about, written simply>",
      "courses": [
        {
          "name": "<Course name>",
          "description": "<One sentence explaining what this course covers in plain language>"
        }
      ]
    },
    {
      "year": 2,
      "label": "Sophomore Year",
      "focus": "<summary>",
      "courses": [ ... ]
    },
    {
      "year": 3,
      "label": "Junior Year",
      "focus": "<summary>",
      "courses": [ ... ]
    },
    {
      "year": 4,
      "label": "Senior Year",
      "focus": "<summary>",
      "courses": [ ... ]
    }
  ]
}

Requirements:
- Each year should have exactly 6 courses (a realistic semester load averaged across 2 semesters)
- Courses should progress logically: foundations in year 1, core skills in year 2, advanced topics in year 3, specialization/capstone in year 4
- Use realistic course names that ${college} would actually offer for a ${major} program
- Keep descriptions short, friendly, and jargon-free
- Return only the JSON, nothing else`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: "Failed to generate curriculum. Please try again." });
      return;
    }

    let result;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      req.log.error({ content }, "Failed to parse curriculum JSON");
      res.status(500).json({ error: "Failed to parse curriculum. Please try again." });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "OpenAI API error for curriculum");
    res.status(500).json({ error: "Failed to fetch curriculum. Please try again." });
  }
});

export default router;
