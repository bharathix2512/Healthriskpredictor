import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { RiskResult } from "@/lib/risk";
import { cn } from "@/lib/utils";

const LEVEL_TOKEN: Record<RiskResult["level"], string> = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
};

const SEVERITY_LABEL = {
  info: "Keep going",
  watch: "Watch",
  urgent: "Act now",
} as const;

export function ResultsPanel({
  result,
  onEdit,
  onSave,
  saving,
  saved,
  signedIn,
}: {
  result: RiskResult;
  onEdit: () => void;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  signedIn?: boolean;
}) {
  const color = LEVEL_TOKEN[result.level];
  const bmiPct = Math.min(100, Math.max(0, ((result.bmi - 14) / 26) * 100));


  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lifted">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Overall risk score
          </p>
          <div className="mt-2 flex items-end gap-6">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: "score", value: result.total }]}
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={220}
                  endAngle={-40}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={20} fill={color} background />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="pb-4">
              <p className="font-display text-6xl leading-none">{result.total}</p>
              <p
                className="mt-2 font-display text-xl capitalize"
                style={{ color }}
              >
                {result.level} risk
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-muted-foreground">{result.levelCopy}</p>
          {result.specialists.length > 0 && (
            <div className="mt-6 rounded-xl bg-muted p-4">
              <p className="text-sm font-medium">Suggested to consult</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.specialists.join(" · ")}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">BMI</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-4xl">{result.bmi}</span>
              <span className="text-sm text-muted-foreground">{result.bmiLabel}</span>
            </div>
            <div className="relative mt-5 h-2 rounded-full bg-gradient-to-r from-sage via-accent to-destructive">
              <span
                className="absolute -top-1 h-4 w-1.5 -translate-x-1/2 rounded-full bg-foreground"
                style={{ left: `${bmiPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>14</span>
              <span>25</span>
              <span>40</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Where the score comes from
            </p>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.components} layout="vertical" barSize={16}>
                  <XAxis type="number" domain={[0, 25]} hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={116}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(v, _n, p) => [`${v} / ${p.payload.max} pts`, "Score"]}
                  />
                  <Bar dataKey="score" radius={8} background={{ fill: "var(--muted)", radius: 8 } as never} minPointSize={3}>
                    {result.components.map((c) => (
                      <Cell
                        key={c.key}
                        fill={
                          c.score / c.max > 0.6
                            ? "var(--risk-high)"
                            : c.score / c.max > 0.25
                              ? "var(--risk-moderate)"
                              : "var(--risk-low)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <h2 className="text-2xl">What to do next</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {result.recommendations.map((r) => (
            <div key={r.title} className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {r.category}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs",
                    r.severity === "urgent" && "bg-destructive text-destructive-foreground",
                    r.severity === "watch" && "bg-accent text-accent-foreground",
                    r.severity === "info" && "bg-muted text-muted-foreground",
                  )}
                >
                  {SEVERITY_LABEL[r.severity]}
                </span>
              </div>
              <h3 className="mt-3 text-lg">{r.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="lg" className="rounded-full px-7" onClick={onEdit}>
          Adjust my answers
        </Button>
        <p className="text-sm text-muted-foreground">
          Educational insight only — it is not a diagnosis.
        </p>
      </div>
    </div>
  );
}
