import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  kind: z.enum(["summary", "plan", "explain"]),
  snapshot: z.string().min(10).max(6000),
});

const SYSTEM = `You are Ember, a warm, careful health-literacy assistant.
You write for a layperson about their own tracked health data.
Rules:
- Never diagnose, never prescribe medication or doses.
- Be specific to the numbers given; cite them.
- Be encouraging but honest; flag anything that needs a clinician.
- Plain markdown: short paragraphs and bullet lists. No headings above level 3.
- Always close with one line reminding them this is educational, not a diagnosis.`;

const PROMPTS = {
  summary:
    "Write a 180-250 word narrative health summary. Cover what is going well, what is drifting, and the single most useful change. Explain WHY the risk score is where it is, naming the contributing markers.",
  plan: "Write a practical 30-day wellness plan as three phases (days 1-10, 11-20, 21-30). Each phase: 3 concrete, measurable actions tuned to the data given. Keep it under 300 words.",
  explain:
    "Explain in under 200 words which specific factors drive this person's risk score most, in descending order of impact, and how much headroom each one has.",
} as const;

export const generateInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

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
          { role: "user", content: `${PROMPTS[data.kind]}\n\nMy data:\n${data.snapshot}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok) throw new Error(`AI request failed (${res.status}).`);

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("The AI returned an empty response.");
    return { content };
  });
