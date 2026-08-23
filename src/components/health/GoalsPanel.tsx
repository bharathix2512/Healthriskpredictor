import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGoal,
  deleteGoal,
  setGoalAchieved,
  type DailyLog,
  type Goal,
} from "@/lib/tracking";

const METRICS: { value: string; label: string; key: keyof DailyLog | null }[] = [
  { value: "weight_kg", label: "Weight (kg)", key: "weight_kg" },
  { value: "steps", label: "Daily steps", key: "steps" },
  { value: "sleep_hours", label: "Sleep (hours)", key: "sleep_hours" },
  { value: "systolic", label: "Systolic (mmHg)", key: "systolic" },
  { value: "glucose", label: "Fasting glucose (mg/dL)", key: "glucose" },
  { value: "water_glasses", label: "Water (glasses)", key: "water_glasses" },
  { value: "risk_score", label: "Risk score", key: null },
];

function currentValue(goal: Goal, logs: DailyLog[], riskScore: number | null) {
  if (goal.metric === "risk_score") return riskScore;
  const key = METRICS.find((m) => m.value === goal.metric)?.key;
  if (!key) return null;
  for (const l of logs) {
    const v = l[key];
    if (v !== null && v !== undefined) return Number(v);
  }
  return null;
}

export function GoalsPanel({
  userId,
  goals,
  logs,
  riskScore,
  onChange,
}: {
  userId: string;
  goals: Goal[];
  logs: DailyLog[];
  riskScore: number | null;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("weight_kg");
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || target === "") {
      toast.error("Add a title and a target value.");
      return;
    }
    setBusy(true);
    try {
      await createGoal(userId, {
        title: title.trim(),
        metric,
        start_value: start === "" ? null : Number(start),
        target_value: Number(target),
        due_date: due || null,
      });
      setTitle("");
      setStart("");
      setTarget("");
      setDue("");
      setOpen(false);
      onChange();
      toast.success("Goal set.");
    } catch {
      toast.error("Could not save that goal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-xl">Goals</h2>
          <p className="text-sm text-muted-foreground">
            Progress is measured against your most recent log.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full px-5">
              <Plus className="mr-1 size-4" /> New goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">New goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="g-title">Goal</Label>
                <Input
                  id="g-title"
                  value={title}
                  placeholder="Get down to 78 kg"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="g-start">Start</Label>
                  <Input
                    id="g-start"
                    type="number"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="g-target">Target</Label>
                  <Input
                    id="g-target"
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="g-due">By</Label>
                  <Input
                    id="g-due"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="rounded-full px-6" onClick={submit} disabled={busy}>
                Save goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <p className="px-6 py-10 text-muted-foreground">
          No goals yet. A goal turns a recommendation into something you can measure.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {goals.map((g) => {
            const now = currentValue(g, logs, riskScore);
            const startVal = g.start_value === null ? null : Number(g.start_value);
            const targetVal = Number(g.target_value);
            let pct = 0;
            if (now !== null && startVal !== null && startVal !== targetVal) {
              pct = Math.round(((startVal - now) / (startVal - targetVal)) * 100);
            } else if (now !== null && targetVal !== 0) {
              pct = Math.round((now / targetVal) * 100);
            }
            pct = Math.max(0, Math.min(100, pct));
            const label = METRICS.find((m) => m.value === g.metric)?.label ?? g.metric;
            return (
              <li key={g.id} className="px-6 py-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-48 flex-1">
                    <p className={g.achieved ? "line-through opacity-70" : undefined}>{g.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {label} · now {now ?? "—"} · target {targetVal}
                      {g.due_date ? ` · by ${new Date(g.due_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{pct}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mark goal achieved"
                    onClick={async () => {
                      await setGoalAchieved(g.id, !g.achieved);
                      onChange();
                    }}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete goal"
                    onClick={async () => {
                      await deleteGoal(g.id);
                      onChange();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Progress value={g.achieved ? 100 : pct} className="mt-3 h-2" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
