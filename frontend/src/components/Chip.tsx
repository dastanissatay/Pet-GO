import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-bold leading-none",
  {
    variants: {
      tone: {
        sun: "border-2 border-ink bg-sun text-ink",
        coral: "border-2 border-ink bg-coral text-ink",
        mint: "border-2 border-ink bg-mint text-ink",
        lilac: "border-2 border-ink bg-lilac text-ink",
        surface: "border-2 border-ink bg-surface text-ink",
        dashed: "border-2 border-dashed border-ink bg-surface text-ink",
        ink: "bg-ink text-sun",
      },
      size: { sm: "px-2 py-1 text-xs", md: "px-3 py-1.5 text-[13px]" },
    },
    defaultVariants: { tone: "surface", size: "md" },
  },
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

export function Chip({ className, tone, size, ...props }: ChipProps) {
  return <span className={cn(chipVariants({ tone, size }), className)} {...props} />;
}
