import type { SavedAssessment } from "./assessments";
import type { DailyLog } from "./tracking";

/** Least-squares slope of y over its index. */
export function slope(values: number[]) {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, i) => {
    num += (i - meanX) * (y - meanY);
    den += (i - meanX) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ax = a.slice(0, n);
  const bx = b.slice(0, n);
  const ma = ax.reduce((x, y) => x + y, 0) / n;
  const mb = bx.reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ax[i]! - ma) * (bx[i]! - mb);
    da += (ax[i]! - ma) ** 2;
    db += (bx[i]! - mb) ** 2;
  }
  if (!da || !db) return 0;
  return num / Math.sqrt(da * db);
}

export interface Forecast {
  horizon: string;
  score: number;
  confidence: number;
}

/**
 * Projects the risk score forward from the trend of saved assessments.
 * Confidence falls with fewer data points and longer horizons — deliberately
 * conservative, and clamped to the 0–100 scale.
 */
export function forecast(history: SavedAssessment[]): Forecast[] {
  const scores = history
    .slice()
    .reverse()
    .map((h) => h.total);
  if (scores.length === 0) return [];
  const latest = scores[scores.length - 1]!;
  const perStep = slope(scores);
  const spanDays = Math.max(
    1,
    (new Date(history[0]!.created_at).getTime() -
      new Date(history[history.length - 1]!.created_at).getTime()) /
      86400000,
  );
  const stepsPerDay = scores.length > 1 ? (scores.length - 1) / spanDays : 0;
  const perDay = perStep * stepsPerDay;

  const base = Math.min(0.9, 0.35 + scores.length * 0.09);
  return [
    { horizon: "6 months", days: 182, decay: 1 },
    { horizon: "1 year", days: 365, decay: 0.85 },
    { horizon: "5 years", days: 1825, decay: 0.6 },
  ].map(({ horizon, days, decay }) => ({
    horizon,
    score: Math.round(Math.min(100, Math.max(0, latest + perDay * days * 0.55))),
    confidence: Math.round(base * decay * 100),
  }));
}

export type Trajectory = "improving" | "stable" | "declining";

export function trajectory(history: SavedAssessment[]): { label: Trajectory; detail: string } {
  const scores = history
    .slice()
    .reverse()
    .map((h) => h.total);
  if (scores.length < 2) return { label: "stable", detail: "Needs a second assessment to trend." };
  const s = slope(scores);
  if (s < -1.5) return { label: "improving", detail: "Your score is trending down over time." };
  if (s > 1.5) return { label: "declining", detail: "Your score is drifting upward — worth attention." };
  return { label: "stable", detail: "Your score is holding steady." };
}

export interface Correlation {
  label: string;
  r: number;
  reading: string;
}

/** Correlates daily habits against the same-window stress/mood signals. */
export function correlations(logs: DailyLog[]): Correlation[] {
  const rows = logs.slice().reverse();
  const pick = (k: keyof DailyLog) =>
    rows.map((r) => Number(r[k] ?? NaN)).filter((n) => !Number.isNaN(n));

  const pairs: { label: string; a: keyof DailyLog; b: keyof DailyLog; good: string; bad: string }[] =
    [
      {
        label: "Sleep vs stress",
        a: "sleep_hours",
        b: "stress",
        good: "More sleep tracks with lower stress for you.",
        bad: "Longer sleep isn't lowering your stress readings.",
      },
      {
        label: "Steps vs mood",
        a: "steps",
        b: "mood",
        good: "Active days come with a better mood.",
        bad: "Movement and mood aren't moving together yet.",
      },
      {
        label: "Sleep vs resting HR",
        a: "sleep_hours",
        b: "resting_hr",
        good: "Better sleep lowers your resting heart rate.",
        bad: "No clear link between sleep and resting heart rate.",
      },
      {
        label: "Stress vs blood pressure",
        a: "stress",
        b: "systolic",
        good: "Higher stress days show higher systolic pressure.",
        bad: "Stress isn't tracking with your blood pressure.",
      },
    ];

  return pairs
    .map((p) => {
      const a = pick(p.a);
      const b = pick(p.b);
      const n = Math.min(a.length, b.length);
      if (n < 4) return null;
      const r = Math.round(pearson(a.slice(0, n), b.slice(0, n)) * 100) / 100;
      const positiveIsGood = p.label === "Steps vs mood";
      const helpful = positiveIsGood ? r > 0.3 : r < -0.3;
      return { label: p.label, r, reading: helpful ? p.good : p.bad };
    })
    .filter((x): x is Correlation => x !== null);
}

export interface Alert {
  severity: "urgent" | "watch" | "info";
  title: string;
  detail: string;
}

/** Rule-based alerts from the most recent daily log. */
export function alerts(logs: DailyLog[]): Alert[] {
  const out: Alert[] = [];
  const latest = logs[0];
  if (!latest) return out;

  if (latest.systolic && latest.systolic >= 140)
    out.push({
      severity: "urgent",
      title: `Systolic reading of ${latest.systolic}`,
      detail: "Re-check in 15 minutes while seated and rested. If it stays high, contact a clinician.",
    });
  else if (latest.systolic && latest.systolic >= 130)
    out.push({
      severity: "watch",
      title: `Blood pressure is elevated (${latest.systolic}/${latest.diastolic ?? "—"})`,
      detail: "Keep logging morning and evening readings for two weeks.",
    });

  if (latest.glucose && latest.glucose >= 126)
    out.push({
      severity: "urgent",
      title: `Fasting glucose of ${latest.glucose} mg/dL`,
      detail: "This is in the diabetic range on a single reading — confirm with an HbA1c test.",
    });

  if (latest.sleep_hours !== null && latest.sleep_hours !== undefined && latest.sleep_hours < 6)
    out.push({
      severity: "watch",
      title: `Only ${latest.sleep_hours}h sleep logged`,
      detail: "Short sleep raises blood pressure and appetite the next day. Aim for an early night.",
    });

  const recent = logs.slice(0, 7);
  const hrValues = recent.map((r) => r.resting_hr).filter((v): v is number => !!v);
  if (hrValues.length >= 4 && latest.resting_hr) {
    const avg = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
    if (latest.resting_hr - avg >= 7)
      out.push({
        severity: "watch",
        title: "Resting heart rate is above your recent average",
        detail: `${latest.resting_hr} bpm vs a ${Math.round(avg)} bpm average — often stress, illness or poor recovery.`,
      });
  }

  const stress = recent.map((r) => r.stress).filter((v): v is number => !!v);
  if (stress.length >= 3 && stress.reduce((a, b) => a + b, 0) / stress.length >= 7)
    out.push({
      severity: "watch",
      title: "Sustained high stress this week",
      detail: "Try ten minutes of breathwork daily; if it persists for weeks, speak with a professional.",
    });

  if (out.length === 0)
    out.push({
      severity: "info",
      title: "Nothing flagged in your latest log",
      detail: "Keep logging daily — patterns need about a week of data to show up.",
    });

  return out;
}

/** Sleep debt against a 7.5h nightly target, over the last 7 logged nights. */
export function sleepDebt(logs: DailyLog[]) {
  const nights = logs
    .slice(0, 7)
    .map((l) => l.sleep_hours)
    .filter((v): v is number => v !== null && v !== undefined);
  if (nights.length === 0) return null;
  const debt = nights.reduce((a, h) => a + Math.max(0, 7.5 - Number(h)), 0);
  return Math.round(debt * 10) / 10;
}

/** Composite 0–100 energy readiness from sleep, activity and stress. */
export function energyScore(logs: DailyLog[]) {
  const l = logs[0];
  if (!l) return null;
  const sleep = l.sleep_hours ? Math.min(1, Number(l.sleep_hours) / 8) : 0.6;
  const steps = l.steps ? Math.min(1, l.steps / 9000) : 0.5;
  const stress = l.stress ? 1 - (l.stress - 1) / 9 : 0.6;
  const quality = l.sleep_quality ? l.sleep_quality / 10 : sleep;
  return Math.round((sleep * 0.35 + quality * 0.2 + steps * 0.2 + stress * 0.25) * 100);
}

export function streakOf(dates: string[]) {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  // A streak survives a day that hasn't been logged yet today.
  if (!set.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function weeklyWins(logs: DailyLog[], habitDone: number) {
  const wins: string[] = [];
  const week = logs.slice(0, 7);
  const goodNights = week.filter((l) => Number(l.sleep_hours ?? 0) >= 7).length;
  if (goodNights >= 3) wins.push(`Slept 7h+ on ${goodNights} nights this week.`);
  const activeDays = week.filter((l) => (l.steps ?? 0) >= 8000).length;
  if (activeDays >= 3) wins.push(`Hit 8,000+ steps on ${activeDays} days.`);
  const hydrated = week.filter((l) => (l.water_glasses ?? 0) >= 8).length;
  if (hydrated >= 3) wins.push(`Reached your water target ${hydrated} times.`);
  if (habitDone > 0) wins.push(`Checked off ${habitDone} habits in the last 7 days.`);
  if (week.length >= 5) wins.push(`Logged ${week.length} days in a row of health data.`);
  return wins;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function download(filename: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
