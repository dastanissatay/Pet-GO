import type { EstimateLine } from "@/api/contract";
import { VerdictStamp } from "@/components/VerdictStamp";
import { formatUsd, formatUsdRange } from "@/lib/format";

export function DecodeLine({ line }: { line: EstimateLine }) {
  return (
    <li className="grid gap-3 border-t-2 border-dashed border-ink/20 py-5 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="font-mono text-sm font-bold sm:text-base">{line.raw_text}</p>
        <p className="mt-1 text-sm text-muted">{line.explanation}</p>
        {line.range && (
          <p className="mt-2 text-sm font-bold">
            Reference: {formatUsdRange(line.range.low, line.range.high)}
            {line.source_url && (
              <a
                className="ml-2 underline underline-offset-4"
                href={line.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            )}
          </p>
        )}
        {!line.range && <p className="mt-2 text-sm font-bold">No reference range</p>}
      </div>
      <div className="flex items-start gap-3 sm:flex-col sm:items-end">
        <span className="font-mono text-lg font-bold">{formatUsd(line.charged)}</span>
        <VerdictStamp verdict={line.verdict} />
      </div>
    </li>
  );
}
