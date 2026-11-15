import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-14 w-full rounded-button border-2 border-ink bg-surface px-4 text-[17px] font-medium text-ink placeholder:text-muted focus-visible:shadow-focus focus-visible:outline-none disabled:opacity-60 aria-[invalid=true]:border-[3px] aria-[invalid=true]:border-error",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
