import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Invalid request. Provide a messages array." });
    return;
  }

  const validRoles = new Set(["user", "assistant"]);
  const validMessages = messages.filter(
    (m: unknown) =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as { role?: unknown }).role === "string" &&
      validRoles.has((m as { role: string }).role) &&
      typeof (m as { content?: unknown }).content === "string"
  ) as { role: "user" | "assistant"; content: string }[];

  if (validMessages.length === 0) {
    res.status(400).json({ error: "No valid messages provided." });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a friendly and knowledgeable college advisor for Next Steps, an app that helps students explore college majors and universities. Your name is Sage.

Help students with questions about:
- Choosing and understanding college majors
- Career paths and what jobs different majors lead to
- Top universities for specific programs
- What to expect in college life and coursework
- Study tips and academic advice

Keep your answers conversational, encouraging, and easy to understand — especially for high schoolers and their families. Be concise (2-4 sentences typically), unless the question requires more depth. Never be preachy or overwhelming.`,
        },
        ...validMessages,
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ??
      "I'm not sure how to answer that — try rephrasing!";

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
