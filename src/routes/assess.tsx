import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AssessmentForm } from "@/components/health/AssessmentForm";
import { ResultsPanel } from "@/components/health/ResultsPanel";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { saveAssessment } from "@/lib/assessments";
import { assess, defaultInput, type HealthInput } from "@/lib/risk";

export const Route = createFileRoute("/assess")({
  head: () => ({
    meta: [
      { title: "Health Risk Assessment — Ember Health" },
      {
        name: "description",
        content:
          "Enter your vitals, lifestyle and history to get a transparent 0–100 health risk score with a component breakdown and next steps.",
      },
      { property: "og:title", content: "Health Risk Assessment — Ember Health" },
      {
        property: "og:description",
        content:
          "A transparent 0–100 health risk score from your vitals, lifestyle and history, with clear next steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessPage,
});

function AssessPage() {
  const [input, setInput] = useState<HealthInput>(defaultInput);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const result = useMemo(() => assess(input), [input]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    try {
      await saveAssessment(user.id, input, result);
      setSaved(true);
      toast.success("Saved to your health record.");
    } catch {
      toast.error("Could not save this assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dawn pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pt-12">
        <h1 className="max-w-2xl text-4xl sm:text-5xl">
          {submitted ? "Here's where you stand." : "Tell us your numbers."}
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {submitted
            ? "Every point is traceable to a marker you entered — nothing hidden, nothing guessed."
            : "Five short sections. Use recent readings where you have them; sensible defaults are already filled in."}
        </p>

        <div className="mt-10">
          {submitted ? (
            <ResultsPanel
              result={result}
              onEdit={() => {
                setSubmitted(false);
                setSaved(false);
              }}
              onSave={handleSave}
              saving={saving}
              saved={saved}
              signedIn={!!user}
            />
          ) : (
            <AssessmentForm
              value={input}
              onChange={setInput}
              onSubmit={() => {
                setSubmitted(true);
                setSaved(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
