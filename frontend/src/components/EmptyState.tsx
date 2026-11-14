import type * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, children, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-[20px] border-2 border-dashed border-ink bg-butter px-5 py-7 text-center",
        className,
      )}
    >
      {icon}
      <p className="font-display text-[22px] font-extrabold">{title}</p>
      {children && <div className="max-w-[380px] text-[15px] leading-normal">{children}</div>}
      {actions && <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">{actions}</div>}
    </div>
  );
}
