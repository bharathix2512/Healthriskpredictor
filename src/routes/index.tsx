import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, HeartPulse, LineChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-warm.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ember Health — Know Your Health Risk in Minutes" },
      {
        name: "description",
        content:
          "Ember turns your vitals, lifestyle and family history into a transparent 0–100 health risk score with a clear breakdown and personalised next steps.",
      },
      { property: "og:title", content: "Ember Health — Know Your Health Risk in Minutes" },
      {
        property: "og:description",
        content:
          "A warm, transparent health risk assessment: vitals in, a 0–100 score and personalised next steps out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const MARKERS = [
  {
    icon: HeartPulse,
    title: "Blood pressure",
    body: "Graded against the current clinical stages, from normal through stage 2.",
  },
  {
    icon: Activity,
    title: "Body composition & glucose",
    body: "BMI bands and fasting glucose thresholds, weighted the way clinicians read them.",
  },
  {
    icon: LineChart,
    title: "Lifestyle & history",
    body: "Sleep, stress, movement, smoking, and what runs in your family.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <span className="font-display text-lg">
          Ember<span className="text-primary">.</span>
        </span>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/assess">Start assessment</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Smart health risk prediction
            </p>
            <h1 className="mt-6 text-5xl leading-[1.05] sm:text-6xl">
              Your body has been
              <br />
              keeping notes.
              <br />
              <span className="text-primary">Let's read them.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg text-muted-foreground">
              Ember reads your vitals, habits and history the way a careful clinician would — and
              hands back a score you can actually understand, along with what to do about it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="rounded-full px-8 text-base">
                <Link to="/assess">Begin my assessment</Link>
              </Button>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" /> Runs locally, nothing stored
              </span>
            </div>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="Figs, pomegranate and a glass of water on a warm terracotta surface in morning light"
              width={1408}
              height={1104}
              className="w-full rounded-[2rem] object-cover shadow-lifted"
            />
            <div className="absolute -bottom-6 left-6 rounded-2xl border border-border bg-card px-6 py-4 shadow-soft">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Five markers
              </p>
              <p className="font-display text-2xl">One clear score</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-sand">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="max-w-xl text-3xl sm:text-4xl">
              Every point on your score is traceable.
            </h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {MARKERS.map((m) => (
                <div key={m.title}>
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-gradient-warm text-primary-foreground">
                    <m.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl">{m.title}</h3>
                  <p className="mt-2 text-muted-foreground">{m.body}</p>
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
            <Button asChild size="lg" variant="secondary" className="mt-9 rounded-full px-8 text-base">
              <Link to="/assess">Start my assessment</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
          Ember gives educational insight, not a medical diagnosis. Always talk to a clinician about
          your results.
        </div>
      </footer>
    </div>
  );
}
