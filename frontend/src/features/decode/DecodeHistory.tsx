import { History } from "lucide-react";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecodeHistory } from "@/features/decode/api";
import { formatDate, formatUsd, localDateIso } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DecodeHistoryProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Past decodes. Picking one shows its stored result again; it never re-runs the decode. */
export function DecodeHistory({ selectedId, onSelect }: DecodeHistoryProps) {
  const history = useDecodeHistory();

  return (
    <Card as="section" aria-labelledby="decode-history-title">
      <div className="mb-3 flex items-center gap-2">
        <History aria-hidden="true" className="size-5" />
        <h2 id="decode-history-title" className="font-display text-xl font-extrabold">
          Past decodes
        </h2>
      </div>
      {history.isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}
      {history.isError && (
        <ErrorState
          title="Past decodes didn't load"
          error={history.error}
          onRetry={() => void history.refetch()}
        />
      )}
      {history.data && history.data.items.length === 0 && (
        <p className="text-sm text-muted">
          Each estimate you decode is saved here, so you can open it again before the vet visit.
        </p>
      )}
      {history.data && history.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {history.data.items.map((item) => {
            const { counts } = item.result;
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full flex-wrap items-center justify-between gap-2 rounded-control border-2 border-ink px-4 py-3 text-left focus-visible:shadow-focus focus-visible:outline-none",
                    selected ? "bg-ink text-surface" : "bg-surface hover:bg-butter",
                  )}
                >
                  <span>
                    <span className="block font-bold">
                      {formatDate(localDateIso(new Date(item.created_at)))}
                    </span>
                    <span className={cn("text-sm", selected ? "text-surface/80" : "text-muted")}>
                      {item.result.lines.length} lines · {counts.within} within · {counts.above}{" "}
                      above
                    </span>
                  </span>
                  <span className="money text-lg">{formatUsd(item.total_charged)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
