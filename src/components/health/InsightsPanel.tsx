import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateInsight } from "@/lib/insights.functions";
import { correlations, sleepDebt, energyScore, forecast, trajectory } from "@/lib/analytics";
import { saveInsight, type AiInsight, type DailyLog } from "@/lib/tracking";
import type { SavedAssessment } from "@/lib/assessments";

const KINDS = [
  { kind: "summary" as const, label: "Narrative summary" },
  { kind: "plan" as const, label: "30-day plan" },
  { kind: "explain" as const, label: "Why this score?" },
];

function buildSnapshot(history: SavedAssessment[], logs: DailyLog[]) {
  const latest = history[0];
  const lines: string[] = [];
  if (latest) {
    lines.push(
      `Risk score: ${latest.total}/100 (${latest.level} risk). BMI ${latest.bmi}. ` +
        `BP ${latest.input.systolic}/${latest.input.diastolic}. Fasting glucose ${latest.input.fastingGlucose} mg/dL. ` +
        `Age ${latest.input.age}, sex ${latest.input.sex}, smoking ${latest.input.smoking}, alcohol ${latest.input.alcohol}, ` +
        `exercise ${latest.input.exercise}, sleep ${latest.input.sleepHours}h, stress ${latest.input.stress}/10.`,
    );
    lines.push(
      `Score components: ${latest.components
        .map((c) => `${c.label} ${c.score}/${c.max}`)
        .join(", ")}.`,
    );
  }
  if (history.length > 1) {
    lines.push(`Trajectory: ${trajectory(history).detail}`);
    lines.push(
      `Projection: ${forecast(history)
        .map((f) => `${f.horizon} ${f.score} (confidence ${f.confidence}%)`)
        .join(", ")}.`,
    );
  }
  if (logs.length) {
    const energy = energyScore(logs);
    const debt = sleepDebt(logs);
    lines.push(
      `Daily logs: ${logs.length} entries. Latest energy score ${energy ?? "—"}/100. ` +
        `7-night sleep debt ${debt ?? "—"} hours.`,
    );
    lines.push(
      `Recent days: ${logs
        .slice(0, 7)
        .map(
          (l) =>
            `${l.log_date} sleep ${l.sleep_hours ?? "—"}h, steps ${l.steps ?? "—"}, stress ${l.stress ?? "—"}, mood ${l.mood ?? "—"}`,
        )
        .join("; ")}.`,
    );
    const cors = correlations(logs);
    if (cors.length) {
      lines.push(`Correlations: ${cors.map((c) => `${c.label} r=${c.r}`).join(", ")}.`);
    }
  }
  return lines.join("\n");
}

export function InsightsPanel({
  userId,
  history,
  logs,
  insights,
  onSaved,
}: {
  userId: string;
  history: SavedAssessment[];
  logs: DailyLog[];
  insights: AiInsight[];
  onSaved: () => void;
}) {
  const run = useServerFn(generateInsight);
  const [busy, setBusy] = useState<string | null>(null);

  const generate = async (kind: "summary" | "plan" | "explain") => {
    const snapshot = buildSnapshot(history, logs);
    if (snapshot.length < 40) {
      toast.error("Save an assessment or a daily log first — the AI needs data to read.");
      return;
    }
    setBusy(kind);
    try {
      const { content } = await run({ data: { kind, snapshot } });
      await saveInsight(userId, kind, content);
      onSaved();
      toast.success("New insight ready.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The AI could not respond.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-xl">AI health coach</h2>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your scores, vitals and daily logs are read together to explain what is driving your risk
          and what to change first. Educational only — never a diagnosis.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {KINDS.map((k) => (
            <Button
              key={k.kind}
              variant={k.kind === "summary" ? "default" : "outline"}
              className="rounded-full px-6"
              disabled={busy !== null}
              onClick={() => generate(k.kind)}
            >
              {busy === k.kind ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              {k.label}
            </Button>
          ))}
        </div>
      </div>

      {insights.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-muted-foreground">
          No insights generated yet.
        </p>
      ) : (
        insights.map((i) => (
          <article key={i.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <header className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {i.kind === "plan" ? "30-day plan" : i.kind === "explain" ? "Score breakdown" : "Summary"}
              </p>
              <time className="text-xs text-muted-foreground">
                {new Date(i.created_at).toLocaleString()}
              </time>
            </header>
            <div className="mt-4 whitespace-pre-wrap leading-relaxed text-foreground/90">
              {i.content}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
