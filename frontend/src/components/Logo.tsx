import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "font-display text-2xl font-extrabold tracking-tight text-ink no-underline",
        className,
      )}
    >
      Pet&amp;GO
    </Link>
  );
}
