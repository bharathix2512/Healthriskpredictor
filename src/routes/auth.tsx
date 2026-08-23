import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Ember Health" },
      {
        name: "description",
        content:
          "Sign in to Ember Health to save your health risk assessments, track your score over time and revisit your personalised recommendations.",
      },
      { property: "og:title", content: "Sign in — Ember Health" },
      {
        property: "og:description",
        content: "Save assessments and track your health risk trend over time with Ember Health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.8 4.4-5.35 4.4a5.9 5.9 0 1 1 0-11.8c1.65 0 2.8.65 3.45 1.25l2.2-2.15C16.3 4.35 14.35 3.5 12 3.5a8.5 8.5 0 1 0 0 17c4.9 0 8.15-3.45 8.15-8.3 0-.55-.05-.8-.1-1.1Z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const signInGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back.");
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your inbox if confirmation is required.");
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-gradient-warm px-12 py-14 lg:flex">
        <Link to="/" className="font-display text-xl text-primary-foreground">
          Ember<span className="opacity-70">.</span>
        </Link>
        <div>
          <h1 className="max-w-md text-4xl leading-tight text-primary-foreground">
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
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl">Your health record</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to save assessments and track progress over time.
          </p>

          <Button
            variant="outline"
            className="mt-8 w-full rounded-full"
            onClick={signInGoogle}
            disabled={busy}
          >
            <GoogleMark /> Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="mt-5 space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="mt-5 space-y-4" onSubmit={signUp}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Password</Label>
                  <Input
                    id="password-up"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-xs text-muted-foreground">
            Ember provides educational insight, not a medical diagnosis.
          </p>
        </div>
      </section>
    </main>
  );
}
