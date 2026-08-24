import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithCoach } from "@/lib/chat.functions";
import { BulletAnswer } from "@/components/health/BulletAnswer";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What should I fix first?",
  "Why is my score where it is?",
  "How is my sleep affecting me?",
];

export function CoachChat({ snapshot }: { snapshot: string }) {
  const send = useServerFn(chatWithCoach);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "- Hi, I'm Ember — ask me anything about your tracked health data.\n- I answer in short points, and I'll tell you when something needs a clinician.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, busy]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { content } = await send({
        data: { snapshot, messages: next.filter((m) => m.role === "user" || m !== next[0]) },
      });
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The AI could not respond.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(question);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 rounded-full px-6 shadow-lifted"
      >
        <MessageCircle className="size-5" /> Ask Ember
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lifted">
      <header className="flex items-center justify-between border-b border-border bg-gradient-warm px-5 py-4">
        <div>
          <p className="font-display text-primary-foreground">Ask Ember</p>
          <p className="text-xs text-primary-foreground/80">Your AI health coach</p>
        </div>
        <button
          aria-label="Close chat"
          onClick={() => setOpen(false)}
          className="rounded-full p-1.5 text-primary-foreground/90 hover:bg-white/15"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                {m.content}
              </p>
            </div>
          ) : (
            <BulletAnswer key={i} text={m.content} className="max-w-[95%]" />
          ),
        )}
        {busy ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Reading your data…
          </p>
        ) : null}
      </div>

      {messages.length === 1 ? (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <Textarea
          ref={inputRef}
          rows={1}
          value={input}
          placeholder="Ask about your health data…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          className="max-h-28 min-h-10 resize-none rounded-2xl"
        />
        <Button type="submit" size="icon" className="size-10 rounded-full" disabled={busy}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
