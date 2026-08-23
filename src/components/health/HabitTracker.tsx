import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { streakOf } from "@/lib/analytics";
import {
  archiveHabit,
  createHabit,
  toggleHabit,
  type Habit,
  type HabitLog,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";

const CATEGORIES = ["lifestyle", "exercise", "diet", "sleep", "medical"] as const;

const SUGGESTIONS = [
  { emoji: "🚶", title: "20-minute walk after dinner", category: "exercise", target: 5 },
  { emoji: "💧", title: "Eight glasses of water", category: "diet", target: 7 },
  { emoji: "🧘", title: "Ten minutes of breathwork", category: "lifestyle", target: 5 },
  { emoji: "🥗", title: "Vegetables at two meals", category: "diet", target: 6 },
  { emoji: "🛏️", title: "Lights out before 11pm", category: "sleep", target: 6 },
  { emoji: "🩺", title: "Log blood pressure", category: "medical", target: 7 },
  { emoji: "🚭", title: "No smoking today", category: "lifestyle", target: 7 },
  { emoji: "🍬", title: "No sugary drinks", category: "diet", target: 7 },
];

function last7() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

export function HabitTracker({
  userId,
  habits,
  logs,
  onChange,
}: {
  userId: string;
  habits: Habit[];
  logs: HabitLog[];
  onChange: () => void;
}) {
  const days = useMemo(last7, []);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [category, setCategory] = useState<string>("lifestyle");
  const [target, setTarget] = useState(5);
  const [busy, setBusy] = useState(false);

  const doneSet = useMemo(
    () => new Set(logs.map((l) => `${l.habit_id}|${l.done_date}`)),
    [logs],
  );

  const add = async (preset?: (typeof SUGGESTIONS)[number]) => {
    const payload = preset
      ? {
          title: preset.title,
          emoji: preset.emoji,
          category: preset.category,
          target_per_week: preset.target,
        }
      : { title: title.trim(), emoji, category, target_per_week: target };
    if (!payload.title) {
      toast.error("Give the habit a name.");
      return;
    }
    setBusy(true);
    try {
      await createHabit(userId, payload);
      setTitle("");
      setOpen(false);
      onChange();
      toast.success("Habit added.");
    } catch {
      toast.error("Could not add that habit.");
    } finally {
      setBusy(false);
    }
  };

  const flip = async (habitId: string, date: string) => {
    const done = doneSet.has(`${habitId}|${date}`);
    try {
      await toggleHabit(userId, habitId, date, done);
      onChange();
    } catch {
      toast.error("Could not update that day.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-xl">Habits & streaks</h2>
            <p className="text-sm text-muted-foreground">
              Tap a day to check it off. Streaks count consecutive days.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full px-5">
                <Plus className="mr-1 size-4" /> New habit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl">New habit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-[5rem_1fr] gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="h-emoji">Icon</Label>
                    <Input
                      id="h-emoji"
                      value={emoji}
                      maxLength={2}
                      onChange={(e) => setEmoji(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="h-title">Habit</Label>
                    <Input
                      id="h-title"
                      value={title}
                      placeholder="Walk 20 minutes after dinner"
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="h-target">Days per week</Label>
                    <Input
                      id="h-target"
                      type="number"
                      min={1}
                      max={7}
                      value={target}
                      onChange={(e) => setTarget(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="rounded-full px-6" onClick={() => add()} disabled={busy}>
                  Add habit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {habits.length === 0 ? (
          <div className="px-6 py-10">
            <p className="text-muted-foreground">
              No habits yet. Start with one of these micro-challenges:
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s.title}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => add(s)}
                >
                  {s.emoji} {s.title}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {habits.map((h) => {
              const dates = logs.filter((l) => l.habit_id === h.id).map((l) => l.done_date);
              const streak = streakOf(dates);
              const weekCount = days.filter((d) => doneSet.has(`${h.id}|${d}`)).length;
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <span className="text-2xl">{h.emoji}</span>
                  <div className="min-w-40 flex-1">
                    <p>{h.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {weekCount}/{h.target_per_week} this week ·{" "}
                      {streak > 0 ? `${streak}-day streak` : "no streak yet"}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {days.map((d) => {
                      const done = doneSet.has(`${h.id}|${d}`);
                      return (
                        <button
                          key={d}
                          onClick={() => flip(h.id, d)}
                          aria-label={`${h.title} on ${d}`}
                          aria-pressed={done}
                          className={cn(
                            "size-8 rounded-lg border text-xs transition-colors",
                            done
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {new Date(d).getDate()}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove habit"
                    onClick={async () => {
                      await archiveHabit(h.id);
                      onChange();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
