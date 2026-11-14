import type * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(92vw,420px)] items-center gap-3 rounded-[18px] bg-ink px-4 py-3 font-sans text-[15px] text-surface shadow-hard-sm",
          title: "font-medium",
          actionButton:
            "ml-auto rounded-control px-2 py-2 font-bold text-surface underline underline-offset-4",
          error: "bg-error",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
