import type * as React from "react";
import { cn } from "@/lib/utils";

export function SpeechBubble({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "m-0 self-start rounded-[18px] rounded-bl-[4px] border-2 border-ink bg-surface px-4 py-3 text-base font-medium leading-snug",
        className,
      )}
      {...props}
    />
  );
}
