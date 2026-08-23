import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { upsertLog, type DailyLog } from "@/lib/tracking";

const NUMERIC: { key: keyof DailyLog; label: string; suffix: string; step?: string }[] = [
  { key: "sleep_hours", label: "Sleep", suffix: "hours", step: "0.5" },
  { key: "steps", label: "Steps", suffix: "count" },
  { key: "resting_hr", label: "Resting heart rate", suffix: "bpm" },
  { key: "systolic", label: "Systolic", suffix: "mmHg" },
  { key: "diastolic", label: "Diastolic", suffix: "mmHg" },
  { key: "glucose", label: "Fasting glucose", suffix: "mg/dL" },
  { key: "weight_kg", label: "Weight", suffix: "kg", step: "0.1" },
  { key: "water_glasses", label: "Water", suffix: "glasses" },
];

export function DailyLogDialog({
  userId,
  existing,
  onSaved,
  trigger,
}: {
  userId: string;
  existing?: DailyLog | null;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    existing?.log_date ?? new Date().toISOString().slice(0, 10),
  );
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    NUMERIC.forEach((f) => {
      const v = existing?.[f.key];
      init[f.key as string] = v === null || v === undefined ? "" : String(v);
    });
    return init;
  });
  const [mood, setMood] = useState(existing?.mood ?? 6);
  const [stress, setStress] = useState(existing?.stress ?? 4);
  const [quality, setQuality] = useState(existing?.sleep_quality ?? 7);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const numeric: Record<string, number | null> = {};
      NUMERIC.forEach((f) => {
        const raw = fields[f.key as string];
        numeric[f.key as string] = raw === "" || raw === undefined ? null : Number(raw);
      });
      await upsertLog(userId, {
        log_date: date,
        ...numeric,
        mood,
        stress,
        sleep_quality: quality,
        note: note || null,
      });
      toast.success("Day logged.");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Could not save that log.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Log a day</DialogTitle>
          <DialogDescription>
            Leave anything blank that you don't have. Saving the same date updates that entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="log-date">Date</Label>
            <Input
              id="log-date"
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {NUMERIC.map((f) => (
              <div key={f.key as string} className="space-y-2">
                <Label htmlFor={`f-${f.key as string}`} className="text-sm text-muted-foreground">
                  {f.label} <span className="text-xs opacity-70">({f.suffix})</span>
                </Label>
                <Input
                  id={`f-${f.key as string}`}
                  type="number"
                  step={f.step ?? "1"}
                  inputMode="decimal"
                  value={fields[f.key as string] ?? ""}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, [f.key as string]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          {[
            { label: "Sleep quality", value: quality, set: setQuality },
            { label: "Mood", value: mood, set: setMood },
            { label: "Stress", value: stress, set: setStress },
          ].map((s) => (
            <div key={s.label} className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{s.label}</span>
                <span>{s.value} / 10</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[s.value]}
                onValueChange={([v]) => s.set(v ?? s.value)}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="log-note" className="text-sm text-muted-foreground">
              Note
            </Label>
            <Textarea
              id="log-note"
              rows={3}
              placeholder="Anything worth remembering about today"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button className="rounded-full px-7" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
