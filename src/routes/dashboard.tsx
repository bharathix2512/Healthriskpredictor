import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Loader2, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { deleteAssessment, listAssessments, type SavedAssessment } from "@/lib/assessments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Health Dashboard — Ember Health" },
      {
        name: "description",
        content:
          "Track your Ember health risk score over time, compare vitals across assessments and review saved recommendations in one private dashboard.",
      },
      { property: "og:title", content: "My Health Dashboard — Ember Health" },
      {
        property: "og:description",
        content: "Your saved health risk assessments, score trend and vitals history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const LEVEL_COLOR: Record<string, string> = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedAssessment[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    listAssessments()
      .then(setRows)
      .catch(() => toast.error("Could not load your history."));
  }, [user]);

  const trend = useMemo(
    () =>
      (rows ?? [])
        .slice()
        .reverse()
        .map((r) => ({
          date: new Date(r.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: r.total,
          bmi: Number(r.bmi),
          systolic: r.input.systolic,
          glucose: r.input.fastingGlucose,
        })),
    [rows],
  );

  const latest = rows?.[0];
  const previous = rows?.[1];
  const delta = latest && previous ? latest.total - previous.total : null;

  const remove = async (id: string) => {
    try {
      await deleteAssessment(id);
      setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
      toast.success("Assessment removed.");
    } catch {
      toast.error("Could not remove that record.");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl">Your health record</h1>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Every saved assessment, its score and the vitals behind it — tracked over time.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full px-7">
            <Link to="/assess">
              New assessment <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        {rows === null ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-14 text-center">
            <h2 className="text-2xl">No assessments saved yet</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Complete an assessment and save it — your trend line starts with the first entry.
            </p>
            <Button asChild className="mt-7 rounded-full px-7">
              <Link to="/assess">Start now</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Latest score"
                value={String(latest!.total)}
                hint={`${latest!.level} risk`}
              />
              <Stat
                label="Change"
                value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
                hint={
                  delta === null
                    ? "Needs a second assessment"
                    : delta <= 0
                      ? "Improving or steady"
                      : "Trending upward"
                }
              />
              <Stat label="Latest BMI" value={String(latest!.bmi)} hint={latest!.input.sex} />
              <Stat label="Assessments" value={String(rows.length)} hint="Saved to your record" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Risk score over time
                  </p>
                  {delta !== null &&
                    (delta <= 0 ? (
                      <TrendingDown className="size-4" style={{ color: "var(--risk-low)" }} />
                    ) : (
                      <TrendingUp className="size-4" style={{ color: "var(--risk-high)" }} />
                    ))}
                </div>
                <div className="mt-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--ember)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--ember)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="var(--ember)"
                        strokeWidth={2.5}
                        fill="url(#scoreFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Vitals history
                </p>
                <div className="mt-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={34}
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        name="Systolic"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="glucose"
                        name="Glucose"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="bmi"
                        name="BMI"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Systolic</span>
                  <span>Fasting glucose</span>
                  <span>BMI</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-xl">Saved assessments</h2>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-full font-display text-lg"
                      style={{
                        background: `color-mix(in oklab, ${LEVEL_COLOR[r.level]} 18%, transparent)`,
                        color: LEVEL_COLOR[r.level],
                      }}
                    >
                      {r.total}
                    </span>
                    <div className="min-w-40 flex-1">
                      <p className={cn("capitalize")} style={{ color: LEVEL_COLOR[r.level] }}>
                        {r.level} risk
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="hidden gap-8 text-sm text-muted-foreground sm:flex">
                      <span>BMI {r.bmi}</span>
                      <span>
                        BP {r.input.systolic}/{r.input.diastolic}
                      </span>
                      <span>Glucose {r.input.fastingGlucose}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete assessment"
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
