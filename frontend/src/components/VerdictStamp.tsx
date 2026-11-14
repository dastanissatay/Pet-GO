import { cn } from "@/lib/utils";

export type Verdict = "within" | "above" | "below" | "unknown";

const STYLES: Record<Verdict, { label: string; className: string }> = {
  within: { label: "WITHIN", className: "border-solid bg-mint" },
  above: { label: "ABOVE", className: "-rotate-[4deg] border-solid bg-coral" },
  below: { label: "BELOW", className: "border-solid bg-sky" },
  unknown: { label: "NO RANGE", className: "rotate-[3deg] border-dashed bg-surface" },
};

/** Always carries a text label, never color alone. */
export function VerdictStamp({ verdict, className }: { verdict: Verdict; className?: string }) {
  const style = STYLES[verdict];
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-md border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold text-ink",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
