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
- ALWAYS answer as a bullet-point list. Never write paragraphs or prose blocks.
- Every bullet starts with "- " on its own line, is one sentence, and may open with a short bold-free label followed by a colon.
- Group with short plain-text section labels ending in a colon on their own line when useful.
- Close with a final bullet reminding them this is educational, not a diagnosis.`;

const PROMPTS = {
  summary:
    "Give a bullet-point health summary (8-12 bullets max) under these labels: Going well:, Drifting:, Why your score sits here:, Do this first:. Cite the actual numbers in the bullets. Bullets only, no paragraphs.",
  plan: "Give a 30-day wellness plan as bullets only, under three labels: Days 1-10:, Days 11-20:, Days 21-30:. Three concrete measurable action bullets per phase, tuned to the data given.",
  explain:
    "List the factors driving this risk score, bullets only, in descending order of impact. One bullet per factor: the factor, its current value, the points it contributes, and the headroom available.",
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
