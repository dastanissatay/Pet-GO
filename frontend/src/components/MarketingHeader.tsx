import type * as React from "react";
import { Logo } from "@/components/Logo";

/** Top bar for the public pages (landing, quiz, results, 404). */
export function MarketingHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b-2 border-ink bg-surface">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-3.5">
        <Logo />
        {children}
      </div>
    </header>
  );
}
