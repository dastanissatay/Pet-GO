import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const cardVariants = cva("border-ink", {
  variants: {
    variant: {
      hero: "rounded-hero border-2 shadow-hard-lg",
      raised: "rounded-card border-2 shadow-hard",
      flat: "rounded-card border-2",
      dashed: "rounded-card border-2 border-dashed",
    },
    tone: {
      surface: "bg-surface",
      butter: "bg-butter",
      sun: "bg-sun",
      mint: "bg-mint",
      lilac: "bg-lilac",
      sky: "bg-sky",
      coral: "bg-coral",
      none: "bg-transparent",
    },
    padding: { none: "", md: "p-5", lg: "p-6" },
  },
  defaultVariants: { variant: "flat", tone: "surface", padding: "lg" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  as?: "div" | "section" | "article" | "aside";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, tone, padding, as: Tag = "div", ...props }, ref) => (
    <Tag ref={ref} className={cn(cardVariants({ variant, tone, padding }), className)} {...props} />
  ),
);
Card.displayName = "Card";
