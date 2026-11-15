import { AlertTriangle, CalendarClock, ShoppingCart } from "lucide-react";
import type { FoodStatus } from "@/api/contract";
import { Button, buttonVariants } from "@/components/ui/button";
import { foodMessage } from "@/features/food/foodMessage";
import { cn } from "@/lib/utils";

interface FoodStatusPanelProps {
  status: FoodStatus;
  petName: string;
  onLogBag: () => void;
}

const TONES = {
  none: "bg-surface border-dashed",
  ok: "bg-mint",
  soon: "bg-sun",
  out: "bg-coral",
} as const;

/** The current bag's status with what to buy, where, and a button to log a new bag. */
export function FoodStatusPanel({ status, petName, onLogBag }: FoodStatusPanelProps) {
  const message = foodMessage(status, petName);
  const urgent = status.status === "soon" || status.status === "out";
  const Icon = urgent ? AlertTriangle : CalendarClock;

  return (
    <div
      role={urgent ? "alert" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-button border-2 border-ink p-4",
        TONES[status.status],
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-bold">{message.title}</p>
          <p className="mt-0.5 text-sm">{message.detail}</p>
          {status.status !== "none" && (
            <p className="mt-1 text-sm">Buy: {status.food_type.toLowerCase()}.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {urgent &&
          status.shop_links.map((link) => (
            <a
              key={link.store}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              <ShoppingCart aria-hidden="true" className="size-4" />
              Order on {link.store}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        <Button type="button" size="sm" variant="secondary" onClick={onLogBag}>
          {status.status === "none" ? "Log a bag of food" : "I bought a new bag"}
        </Button>
      </div>
    </div>
  );
}
