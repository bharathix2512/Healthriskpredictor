import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  snapshot: z.string().max(6000).default(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

const SYSTEM = `You are Ember, a warm, careful health-literacy assistant inside a personal health app.
You chat with a layperson about their own tracked health data.
Rules:
- Never diagnose, never prescribe medication or doses.
- Answer as short bullet points starting with "- ", not paragraphs. At most 6 bullets.
- Be specific to the numbers you are given and cite them when relevant.
- If the question needs a clinician, say so plainly in a bullet.
- If you have no data for the question, say what to log to get an answer.
- Keep it friendly and concrete; no headings, no markdown tables.`;

export const chatWithCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const context = data.snapshot.trim()
      ? `Here is my current tracked health data:\n${data.snapshot}`
      : "I have not saved much health data yet.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: context },
          { role: "assistant", content: "- Got it, I have your data in front of me." },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok) throw new Error(`AI request failed (${res.status}).`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("The AI returned an empty response.");
    return { content };
  });
