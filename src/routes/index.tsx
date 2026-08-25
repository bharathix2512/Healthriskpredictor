import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ember Health — Know Your Health Risk in Minutes" },
      {
        name: "description",
        content:
          "Ember turns your vitals, lifestyle and family history into a transparent 0–100 health risk score with a clear breakdown, tracked history and personalised next steps.",
      },
      { property: "og:title", content: "Ember Health — Know Your Health Risk in Minutes" },
      {
        property: "og:description",
        content:
          "A transparent health risk assessment: vitals in, a 0–100 score, trend tracking and personalised next steps out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const MARKERS = [
  {
    label: "Blood pressure",
    weight: "25 pts",
    body: "Graded against current clinical stages, from normal through stage 2 hypertension.",
  },
  {
    label: "Body composition",
    weight: "25 pts",
    body: "BMI bands weighted the way clinicians read them, with a visual position on the scale.",
  },
  {
    label: "Blood sugar",
    weight: "20 pts",
    body: "Fasting glucose thresholds plus any existing diabetes diagnosis.",
  },
  {
    label: "Lifestyle",
    weight: "20 pts",
    body: "Smoking, alcohol, movement, sleep window and sustained stress load.",
  },
  {
    label: "Medical & family history",
    weight: "10 pts",
    body: "Existing conditions and what runs in your immediate family.",
  },
];

const FEATURES = [
  {
    title: "Traceable scoring",
    body: "A component bar chart shows exactly which markers built your score — and how much headroom each has.",
  },
  {
    title: "Trend tracking",
    body: "Save each assessment and watch your score, blood pressure, glucose and BMI move over time.",
  },
  {
    title: "Referral guidance",
    body: "When markers cluster, Ember names the specialist worth consulting instead of leaving you guessing.",
  },
  {
    title: "Shareable summary",
    body: "Print or export a clean one-page summary to bring to your next appointment.",
  },
  {
    title: "Actionable plan",
    body: "Recommendations are prioritised — act now, watch, or keep going — across diet, movement and medical follow-up.",
  },
  {
    title: "Private by default",
    body: "Scoring runs in your browser. Records are saved only to your own account when you choose to save them.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="grid border-b border-border lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2">
          <div className="flex flex-col justify-between gap-12 bg-gradient-warm px-8 py-14 lg:px-12">
            <span className="font-display text-xl text-primary-foreground">
              Ember<span className="opacity-70">.</span>
            </span>
            <div>
              <h1 className="max-w-md text-4xl leading-tight text-primary-foreground sm:text-5xl">
                A longitudinal view of your health, not a one-off number.
              </h1>
              <ul className="mt-8 space-y-3 text-primary-foreground/85">
                <li>Save every assessment and watch the trend line move.</li>
                <li>Compare vitals across visits, side by side.</li>
                <li>Keep your recommendations and specialist referrals in one place.</li>
              </ul>
            </div>
            <p className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <ShieldCheck className="size-4" /> Your records are private to your account.
            </p>
          </div>

          <div className="flex items-center justify-center bg-sand px-6 py-20 lg:px-12">
            <div className="w-full max-w-md">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Smart health risk prediction
              </p>
              <h2 className="mt-5 text-3xl leading-tight sm:text-4xl">
                Your body has been keeping notes.{" "}
                <span className="text-primary">Let's read them.</span>
              </h2>
              <p className="mt-5 text-muted-foreground">
                Ember reads your vitals, habits and history the way a careful clinician would — and
                hands back a score you can actually understand, along with what to do about it.
              </p>

              <Button asChild size="lg" className="mt-9 w-full rounded-full text-base">
                <Link to="/assess">Begin my assessment</Link>
              </Button>
              <Link
                to="/auth"
                className="mt-5 block text-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Create a health record
              </Link>

              <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-8">
                {[
                  ["5", "clinical markers"],
                  ["0–100", "transparent score"],
                  ["4 min", "to complete"],
                  ["∞", "saved check-ins"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="font-display text-2xl">{v}</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{l}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-10 text-xs text-muted-foreground">
                Ember provides educational insight, not a medical diagnosis.
              </p>
            </div>
          </div>
        </section>


        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              How the score is built
            </p>
            <h2 className="mt-5 text-3xl sm:text-4xl">Every point on your score is traceable.</h2>
          </div>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {MARKERS.map((m, i) => (
              <div key={m.label} className="grid gap-4 py-7 sm:grid-cols-[auto_1fr_auto] sm:gap-8">
                <span className="self-start font-display text-sm text-primary/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl">{m.label}</h3>
                  <p className="mt-1.5 max-w-xl text-muted-foreground">{m.body}</p>
                </div>
                <span className="self-center font-display text-lg text-primary">{m.weight}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-sand">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="max-w-xl text-3xl sm:text-4xl">
              Built to be used more than once.
            </h2>
            <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="border-t border-border pt-5">
                  <h3 className="text-xl">{f.title}</h3>
                  <p className="mt-2 text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="rounded-[2rem] bg-gradient-warm px-8 py-16 text-center shadow-lifted sm:px-16">
            <h2 className="mx-auto max-w-2xl text-4xl text-primary-foreground sm:text-5xl">
              Four minutes now, fewer surprises later.
            </h2>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-9 rounded-full px-8 text-base"
            >
              <Link to="/assess">Start my assessment</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground">
          <span>
            Ember gives educational insight, not a medical diagnosis. Always talk to a clinician
            about your results.
          </span>
          <Link to="/assess" className="underline underline-offset-4">
            Start assessment
          </Link>
        </div>
      </footer>
    </div>
  );
}
