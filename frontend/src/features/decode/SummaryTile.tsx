import type * as React from "react";
import { Card } from "@/components/Card";

export function SummaryTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card padding="md" className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-sm font-bold text-muted">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-1 truncate font-display text-2xl font-extrabold">{value}</p>
    </Card>
  );
}
