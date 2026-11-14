import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-[18px] border-2 border-ink bg-surface p-4 font-mono text-sm leading-relaxed text-ink placeholder:text-muted focus-visible:shadow-focus focus-visible:outline-none aria-[invalid=true]:border-[3px] aria-[invalid=true]:border-error",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
