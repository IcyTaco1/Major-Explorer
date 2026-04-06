import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LookupMajorBody, GetMajorCurriculumBody } from "@workspace/api-zod";

const router: IRouter = Router();

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
  "salary": {
    "entryLevel": "<Typical starting salary for a ${trimmedMajor} graduate, e.g. '$52,000'>",
    "midCareer": "<Typical mid-career salary (5-10 years experience) for ${trimmedMajor}, e.g. '$78,000'>",
    "experienced": "<Typical experienced salary (15+ years) for ${trimmedMajor}, e.g. '$110,000'>"
  },
  "topColleges": [
    {
      "rank": 1,
      "name": "<College name>",
      "location": "<City, State>",
      "highlights": "<One sentence about why this school is great for this major, in plain friendly language>"
    },
    ... (10 total)
  ]
}

Requirements:
- The description must be 5-7 sentences, friendly, simple, and engaging — no academic jargon
- The salary figures must be realistic US national medians based on BLS or similar data, formatted as "$XX,000" with no ranges, just a single number per level
- List exactly 10 colleges ranked 1-10 based on reputation for ${trimmedMajor}
- Use well-known, reputable US universities only
- Return only the JSON, nothing else`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: "Failed to generate major information. Please try again." });
      return;
    }

    let result;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      req.log.error({ content }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Failed to parse major information. Please try again." });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(500).json({ error: "Failed to fetch major information. Please try again." });
  }
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
