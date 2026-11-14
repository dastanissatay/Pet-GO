import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn Button, restyled for Pet&GO: ink outline, hard offset shadow on primary,
// and a press effect that moves the button into its shadow.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[transform,box-shadow] duration-100 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-2 border-ink bg-coral text-ink shadow-hard hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-hard-pressed",
        secondary:
          "border-2 border-ink bg-surface text-ink hover:bg-butter active:translate-y-px",
        dark: "border-2 border-ink bg-ink text-surface hover:bg-ink/90",
        sun: "border-2 border-ink bg-sun text-ink active:translate-y-px",
        ghost: "text-ink hover:bg-ink/5",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 rounded-control px-3 text-sm",
        md: "h-12 rounded-control px-[18px] text-[15px]",
        lg: "h-14 rounded-button px-6 text-[17px]",
        xl: "h-[60px] rounded-[18px] px-7 text-lg",
        icon: "h-11 w-11 rounded-control",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
