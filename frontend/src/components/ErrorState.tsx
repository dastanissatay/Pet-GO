import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/** Friendly message plus retry. Used by every data view so nothing goes blank. */
export function ErrorState({
  title = "That didn't load",
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-card border-2 border-ink bg-surface p-5",
        className,
      )}
    >
      <p className="font-display text-xl font-extrabold">{title}</p>
      <p className="text-[15px]">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
