import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { bmiOf, type HealthInput } from "@/lib/risk";
import { cn } from "@/lib/utils";

interface Props {
  value: HealthInput;
  onChange: (next: HealthInput) => void;
  onSubmit: () => void;
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex items-baseline gap-3">
        <span className="font-display text-sm text-primary">{step}</span>
        <div>
          <h2 className="text-xl">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">
        {label}
        {suffix ? <span className="ml-1 text-xs opacity-70">({suffix})</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition-colors",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CONDITIONS = [
  { id: "heart-disease", label: "Heart disease" },
  { id: "hypertension", label: "Hypertension" },
  { id: "cholesterol", label: "High cholesterol" },
];

const FAMILY = [
  { id: "diabetes", label: "Diabetes" },
  { id: "heart-disease", label: "Heart disease" },
  { id: "stroke", label: "Stroke" },
];

export function AssessmentForm({ value, onChange, onSubmit }: Props) {
  const set = <K extends keyof HealthInput>(key: K, v: HealthInput[K]) =>
    onChange({ ...value, [key]: v });

  const toggle = (key: "conditions" | "familyHistory", id: string) => {
    const list = value[key];
    set(key, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const bmi = bmiOf(value.heightCm, value.weightKg);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Section step="01" title="About you" hint="Basic context for the model.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Age" suffix="years">
            <Input
              type="number"
              min={12}
              max={110}
              value={value.age}
              onChange={(e) => set("age", Number(e.target.value))}
            />
          </Field>
          <Field label="Sex">
            <Choice
              value={value.sex}
              onChange={(v) => set("sex", v)}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Height" suffix="cm">
            <Input
              type="number"
              min={100}
              max={230}
              value={value.heightCm}
              onChange={(e) => set("heightCm", Number(e.target.value))}
            />
          </Field>
          <Field label="Weight" suffix="kg">
            <Input
              type="number"
              min={25}
              max={300}
              value={value.weightKg}
              onChange={(e) => set("weightKg", Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Calculated BMI <span className="font-display text-lg text-foreground">{bmi || "—"}</span>
        </p>
      </Section>

      <Section step="02" title="Vitals" hint="Use your most recent readings.">
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Systolic BP" suffix="mmHg">
            <Input
              type="number"
              min={70}
              max={250}
              value={value.systolic}
              onChange={(e) => set("systolic", Number(e.target.value))}
            />
          </Field>
          <Field label="Diastolic BP" suffix="mmHg">
            <Input
              type="number"
              min={40}
              max={150}
              value={value.diastolic}
              onChange={(e) => set("diastolic", Number(e.target.value))}
            />
          </Field>
          <Field label="Fasting glucose" suffix="mg/dL">
            <Input
              type="number"
              min={50}
              max={400}
              value={value.fastingGlucose}
              onChange={(e) => set("fastingGlucose", Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-xl bg-muted px-4 py-3">
          <Label htmlFor="diabetes" className="text-sm">
            Diagnosed with diabetes
          </Label>
          <Switch
            id="diabetes"
            checked={value.diabetesDiagnosed}
            onCheckedChange={(v) => set("diabetesDiagnosed", v)}
          />
        </div>
      </Section>

      <Section step="03" title="Daily life" hint="Habits move the needle most.">
        <div className="space-y-7">
          <Field label="Smoking">
            <Choice
              value={value.smoking}
              onChange={(v) => set("smoking", v)}
              options={[
                { value: "never", label: "Never" },
                { value: "former", label: "Former" },
                { value: "current", label: "Current" },
              ]}
            />
          </Field>
          <Field label="Alcohol">
            <Choice
              value={value.alcohol}
              onChange={(v) => set("alcohol", v)}
              options={[
                { value: "none", label: "None" },
                { value: "moderate", label: "Moderate" },
                { value: "heavy", label: "Heavy" },
              ]}
            />
          </Field>
          <Field label="Activity level">
            <Choice
              value={value.exercise}
              onChange={(v) => set("exercise", v)}
              options={[
                { value: "sedentary", label: "Sedentary" },
                { value: "light", label: "Light" },
                { value: "moderate", label: "Moderate" },
                { value: "active", label: "Active" },
              ]}
            />
          </Field>
          <Field label={`Sleep — ${value.sleepHours} h per night`}>
            <Slider
              min={3}
              max={12}
              step={1}
              value={[value.sleepHours]}
              onValueChange={(v) => set("sleepHours", v[0] ?? 7)}
            />
          </Field>
          <Field label={`Stress level — ${value.stress} / 10`}>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[value.stress]}
              onValueChange={(v) => set("stress", v[0] ?? 4)}
            />
          </Field>
        </div>
      </Section>

      <Section step="04" title="History" hint="Yours and your family's.">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Diagnosed conditions</p>
            {CONDITIONS.map((c) => (
              <label key={c.id} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={value.conditions.includes(c.id)}
                  onCheckedChange={() => toggle("conditions", c.id)}
                />
                {c.label}
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Family history</p>
            {FAMILY.map((c) => (
              <label key={c.id} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={value.familyHistory.includes(c.id)}
                  onCheckedChange={() => toggle("familyHistory", c.id)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" size="lg" className="rounded-full px-8">
          See my risk profile
        </Button>
        <p className="text-sm text-muted-foreground">
          Nothing is stored — the calculation runs in your browser.
        </p>
      </div>
    </form>
  );
}
