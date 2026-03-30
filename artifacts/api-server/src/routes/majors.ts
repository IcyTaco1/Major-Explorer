import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LookupMajorBody } from "@workspace/api-zod";

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

  const prompt = `You are a college admissions expert with deep knowledge of US universities and their academic programs. Provide accurate, up-to-date information about the "${trimmedMajor}" major.

Respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:
{
  "major": "<normalized major name>",
  "description": "<A concise 5-7 sentence paragraph describing what the ${trimmedMajor} major is about: its core focus, what students study, key skills developed, career paths, and why it matters in today's world.>",
  "topColleges": [
    {
      "rank": 1,
      "name": "<College name>",
      "location": "<City, State>",
      "highlights": "<One concise sentence about why this school excels for this major>"
    },
    ... (10 total)
  ]
}

Requirements:
- The description must be exactly 5-7 sentences, informative, and engaging
- List exactly 10 colleges ranked 1-10 based on their reputation and program quality for ${trimmedMajor}
- Use well-known, reputable US universities only
- Each college highlight should be specific and factual (mention rankings, unique programs, notable features)
- Return only the JSON, nothing else`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: "Failed to generate major information. Please try again." });
      return;
    }

    let parsed_result;
    try {
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed_result = JSON.parse(cleanedContent);
    } catch {
      req.log.error({ content }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Failed to parse major information. Please try again." });
      return;
    }

    res.json(parsed_result);
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(500).json({ error: "Failed to fetch major information. Please try again." });
  }
});

export default router;
