import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Download,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DailyLogDialog } from "@/components/health/DailyLogDialog";
import { HabitTracker } from "@/components/health/HabitTracker";
import { GoalsPanel } from "@/components/health/GoalsPanel";
import { InsightsPanel, buildSnapshot } from "@/components/health/InsightsPanel";
import { CoachChat } from "@/components/health/CoachChat";
import { useAuth } from "@/hooks/useAuth";
import { deleteAssessment, listAssessments, type SavedAssessment } from "@/lib/assessments";
import {
  alerts as buildAlerts,
  correlations as buildCorrelations,
  download,
  energyScore,
  forecast,
  sleepDebt,
  toCsv,
  trajectory,
  weeklyWins,
} from "@/lib/analytics";
import {
  deleteLog,
  listGoals,
  listHabitLogs,
  listHabits,
  listInsights,
  listLogs,
  type AiInsight,
  type DailyLog,
  type Goal,
  type Habit,
  type HabitLog,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Health Dashboard — Ember Health" },
      {
        name: "description",
        content:
          "Track your risk score, daily vitals, habits, goals and AI coaching insights in one private health dashboard.",
      },
      { property: "og:title", content: "My Health Dashboard — Ember Health" },
      {
        property: "og:description",
        content:
          "Risk trends, forecasts, correlations, habit streaks and goals — all from your own health data.",
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

const SEVERITY_COLOR: Record<string, string> = {
  urgent: "var(--risk-critical)",
  watch: "var(--risk-moderate)",
  info: "var(--risk-low)",
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

function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-6 shadow-soft", className)}>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedAssessment[] | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [a, l, h, hl, g, i] = await Promise.all([
        listAssessments(),
        listLogs(),
        listHabits(),
        listHabitLogs(),
        listGoals(),
        listInsights(),
      ]);
      setRows(a);
      setLogs(l);
      setHabits(h);
      setHabitLogs(hl);
      setGoals(g);
      setInsights(i);
    } catch {
      toast.error("Could not load your health record.");
      setRows((prev) => prev ?? []);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const logSeries = useMemo(
    () =>
      logs
        .slice(0, 30)
        .slice()
        .reverse()
        .map((l) => ({
          date: new Date(l.log_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          sleep: l.sleep_hours === null ? null : Number(l.sleep_hours),
          steps: l.steps,
          stress: l.stress,
          mood: l.mood,
          rhr: l.resting_hr,
          weight: l.weight_kg === null ? null : Number(l.weight_kg),
        })),
    [logs],
  );

  const history = rows ?? [];
  const latest = history[0];
  const previous = history[1];
  const delta = latest && previous ? latest.total - previous.total : null;
  const projections = useMemo(() => forecast(history), [history]);
  const traj = useMemo(() => trajectory(history), [history]);
  const alertList = useMemo(() => buildAlerts(logs), [logs]);
  const cors = useMemo(() => buildCorrelations(logs), [logs]);
  const energy = energyScore(logs);
  const debt = sleepDebt(logs);
  const weekHabitDone = habitLogs.filter(
    (l) => new Date(l.done_date).getTime() >= Date.now() - 7 * 86400000,
  ).length;
  const wins = useMemo(() => weeklyWins(logs, weekHabitDone), [logs, weekHabitDone]);
  const todayLog = logs.find((l) => l.log_date === new Date().toISOString().slice(0, 10)) ?? null;

  const removeAssessment = async (id: string) => {
    try {
      await deleteAssessment(id);
      setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
      toast.success("Assessment removed.");
    } catch {
      toast.error("Could not remove that record.");
    }
  };

  const exportAll = () => {
    const csv = toCsv(
      logs.map((l) => ({
        date: l.log_date,
        sleep_hours: l.sleep_hours,
        sleep_quality: l.sleep_quality,
        steps: l.steps,
        resting_hr: l.resting_hr,
        mood: l.mood,
        stress: l.stress,
        weight_kg: l.weight_kg,
        systolic: l.systolic,
        diastolic: l.diastolic,
        glucose: l.glucose,
        water_glasses: l.water_glasses,
        note: l.note,
      })),
    );
    const scores = toCsv(
      history.map((r) => ({
        date: r.created_at,
        score: r.total,
        level: r.level,
        bmi: r.bmi,
        systolic: r.input.systolic,
        diastolic: r.input.diastolic,
        glucose: r.input.fastingGlucose,
      })),
    );
    if (!csv && !scores) {
      toast.error("Nothing to export yet.");
      return;
    }
    download(
      "ember-health-export.csv",
      `# Assessments\n${scores}\n\n# Daily logs\n${csv}\n`,
    );
    toast.success("Export downloaded.");
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
              Assessments, daily logs, habits, goals and AI coaching — private to your account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-full px-6" onClick={exportAll}>
              <Download className="mr-1 size-4" /> Export
            </Button>
            {user && (
              <DailyLogDialog
                userId={user.id}
                existing={todayLog}
                onSaved={refresh}
                trigger={
                  <Button variant="outline" className="rounded-full px-6">
                    <Plus className="mr-1 size-4" /> Log today
                  </Button>
                }
              />
            )}
            <Button asChild className="rounded-full px-7">
              <Link to="/assess">
                New assessment <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {rows === null ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-10">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
              {[
                ["overview", "Overview"],
                ["trends", "Trends"],
                ["habits", "Habits"],
                ["logs", "Daily logs"],
                ["goals", "Goals"],
                ["insights", "AI coach"],
              ].map(([v, label]) => (
                <TabsTrigger key={v} value={v!} className="rounded-full px-5">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ---------------- Overview ---------------- */}
            <TabsContent value="overview" className="mt-8 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Latest score"
                  value={latest ? String(latest.total) : "—"}
                  hint={latest ? `${latest.level} risk` : "No assessment yet"}
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
                <Stat
                  label="Energy today"
                  value={energy === null ? "—" : `${energy}`}
                  hint={energy === null ? "Log a day to see this" : "Sleep, activity and stress"}
                />
                <Stat
                  label="Sleep debt"
                  value={debt === null ? "—" : `${debt}h`}
                  hint="Against 7.5h a night, last 7 nights"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <Panel title="Clinical alerts" hint="Rule-based flags from your latest log">
                  <ul className="space-y-4">
                    {alertList.map((a) => (
                      <li key={a.title} className="flex gap-3">
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full"
                          style={{ background: SEVERITY_COLOR[a.severity] }}
                        />
                        <div>
                          <p style={{ color: SEVERITY_COLOR[a.severity] }}>{a.title}</p>
                          <p className="text-sm text-muted-foreground">{a.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Risk projection" hint={traj.detail}>
                  {projections.length === 0 ? (
                    <p className="text-muted-foreground">
                      Save an assessment to project your risk forward.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {projections.map((p) => (
                        <div key={p.horizon}>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">In {p.horizon}</span>
                            <span>
                              {p.score}/100{" "}
                              <span className="text-muted-foreground">
                                · {p.confidence}% confidence
                              </span>
                            </span>
                          </div>
                          <Progress value={p.score} className="mt-2 h-2" />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Projections extrapolate your own trend — they are not clinical predictions.
                      </p>
                    </div>
                  )}
                </Panel>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Weekly wins" hint="Momentum worth keeping">
                  {wins.length === 0 ? (
                    <p className="text-muted-foreground">
                      Log a few days and check off habits — your wins appear here.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {wins.map((w) => (
                        <li key={w} className="flex gap-3">
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                          <span className="text-foreground/90">{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Your patterns" hint="Correlations across your logged days">
                  {cors.length === 0 ? (
                    <p className="text-muted-foreground">
                      Four or more logged days unlock personal correlations.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {cors.map((c) => (
                        <li key={c.label}>
                          <div className="flex justify-between text-sm">
                            <span>{c.label}</span>
                            <span className="text-muted-foreground">r = {c.r}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{c.reading}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </TabsContent>

            {/* ---------------- Trends ---------------- */}
            <TabsContent value="trends" className="mt-8 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <Panel title="Risk score over time">
                  <div className="flex items-center justify-end">
                    {delta !== null &&
                      (delta <= 0 ? (
                        <TrendingDown className="size-4" style={{ color: "var(--risk-low)" }} />
                      ) : (
                        <TrendingUp className="size-4" style={{ color: "var(--risk-high)" }} />
                      ))}
                  </div>
                  <div className="h-64">
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
                        <Tooltip contentStyle={tooltipStyle} />
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
                </Panel>

                <Panel title="Vitals history" hint="Systolic · fasting glucose · BMI">
                  <div className="h-64">
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
                        <Tooltip contentStyle={tooltipStyle} />
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
                </Panel>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Sleep & stress" hint="From your daily logs">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={logSeries}>
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
                          width={28}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="sleep"
                          name="Sleep (h)"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="stress"
                          name="Stress"
                          stroke="var(--chart-4)"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="mood"
                          name="Mood"
                          stroke="var(--chart-2)"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel title="Daily steps" hint="Last 30 logged days">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={logSeries}>
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
                          width={44}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="steps" name="Steps" fill="var(--ember)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>
            </TabsContent>

            {/* ---------------- Habits ---------------- */}
            <TabsContent value="habits" className="mt-8">
              <HabitTracker
                userId={user.id}
                habits={habits}
                logs={habitLogs}
                onChange={refresh}
              />
            </TabsContent>

            {/* ---------------- Daily logs ---------------- */}
            <TabsContent value="logs" className="mt-8 space-y-6">
              <div className="rounded-2xl border border-border bg-card shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
                  <div>
                    <h2 className="text-xl">Daily logs</h2>
                    <p className="text-sm text-muted-foreground">
                      {logs.length} entries. Everything here feeds your alerts and patterns.
                    </p>
                  </div>
                  <DailyLogDialog
                    userId={user.id}
                    onSaved={refresh}
                    trigger={
                      <Button size="sm" className="rounded-full px-5">
                        <Plus className="mr-1 size-4" /> Add entry
                      </Button>
                    }
                  />
                </div>
                {logs.length === 0 ? (
                  <p className="px-6 py-10 text-muted-foreground">
                    No logs yet. A week of entries unlocks correlations and forecasting.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {logs.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                        <div className="min-w-32">
                          <p>{new Date(l.log_date).toLocaleDateString()}</p>
                          {l.note && (
                            <p className="text-sm text-muted-foreground">{l.note}</p>
                          )}
                        </div>
                        <div className="flex flex-1 flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                          {l.sleep_hours !== null && <span>{l.sleep_hours}h sleep</span>}
                          {l.steps !== null && <span>{l.steps.toLocaleString()} steps</span>}
                          {l.resting_hr !== null && <span>{l.resting_hr} bpm</span>}
                          {l.systolic !== null && (
                            <span>
                              BP {l.systolic}/{l.diastolic ?? "—"}
                            </span>
                          )}
                          {l.glucose !== null && <span>{l.glucose} mg/dL</span>}
                          {l.stress !== null && <span>stress {l.stress}/10</span>}
                          {l.mood !== null && <span>mood {l.mood}/10</span>}
                        </div>
                        <DailyLogDialog
                          key={`edit-${l.id}`}
                          userId={user.id}
                          existing={l}
                          onSaved={refresh}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete log"
                          onClick={async () => {
                            await deleteLog(l.id);
                            refresh();
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-soft">
                <div className="border-b border-border px-6 py-4">
                  <h2 className="text-xl">Saved assessments</h2>
                </div>
                {history.length === 0 ? (
                  <div className="px-6 py-10">
                    <p className="text-muted-foreground">
                      No assessments saved yet — your trend line starts with the first entry.
                    </p>
                    <Button asChild className="mt-6 rounded-full px-7">
                      <Link to="/assess">Start now</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {history.map((r) => (
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
                          <p className="capitalize" style={{ color: LEVEL_COLOR[r.level] }}>
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
                          onClick={() => removeAssessment(r.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* ---------------- Goals ---------------- */}
            <TabsContent value="goals" className="mt-8">
              <GoalsPanel
                userId={user.id}
                goals={goals}
                logs={logs}
                riskScore={latest?.total ?? null}
                onChange={refresh}
              />
            </TabsContent>

            {/* ---------------- AI coach ---------------- */}
            <TabsContent value="insights" className="mt-8">
              <InsightsPanel
                userId={user.id}
                history={history}
                logs={logs}
                insights={insights}
                onSaved={refresh}
              />
            </TabsContent>
          </Tabs>
        )}

        <CoachChat snapshot={buildSnapshot(history, logs)} />
      </main>
    </div>
  );
}
