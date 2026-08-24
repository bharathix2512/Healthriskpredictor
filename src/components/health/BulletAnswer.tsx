/** Renders bullet-style AI answers as real lists, grouped under plain-text labels. */
export function BulletAnswer({ text, className = "" }: { text: string; className?: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: { label?: string; items: string[] }[] = [];
  for (const line of lines) {
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const item = bullet[1]!.replace(/\*\*/g, "");
      const last = blocks[blocks.length - 1];
      if (last) last.items.push(item);
      else blocks.push({ items: [item] });
    } else {
      blocks.push({ label: line.replace(/[*#]/g, "").trim(), items: [] });
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((b, i) => (
        <div key={i}>
          {b.label ? (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
              {b.label.replace(/:$/, "")}
            </p>
          ) : null}
          {b.items.length ? (
            <ul className={`${b.label ? "mt-2" : ""} space-y-2`}>
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2.5 leading-relaxed text-foreground/90">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
