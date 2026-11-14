import { useState } from "react";
import { toast } from "sonner";
import type { PaidPlan } from "@/api/contract";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscribe } from "@/features/account/api";
import { PLANS } from "@/features/checkout/plans";
import { errorMessage } from "@/lib/api";
import { formatDate, localDateIso } from "@/lib/format";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  initialPlan?: PaidPlan;
  onConfirmed?: () => void;
}

function renewalDate(plan: PaidPlan): string {
  const date = new Date();
  if (plan === "yearly") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return formatDate(localDateIso(date));
}

/** Test-mode checkout: no card fields, nothing is charged (spec section 3). */
export function CheckoutDialog({
  open,
  onOpenChange,
  petName,
  initialPlan = "yearly",
  onConfirmed,
}: CheckoutDialogProps) {
  const [plan, setPlan] = useState<PaidPlan>(initialPlan);
  const subscribe = useSubscribe();
  const details = PLANS[plan];
  const other: PaidPlan = plan === "yearly" ? "monthly" : "yearly";

  function confirm() {
    subscribe.mutate(plan, {
      onSuccess: () => {
        toast.success(`You're on the ${details.label.toLowerCase()} plan. Test mode, nothing charged.`);
        onOpenChange(false);
        onConfirmed?.();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your plan</DialogTitle>
          <DialogDescription className="sr-only">
            Demo checkout. No card is needed and nothing is charged.
          </DialogDescription>
        </DialogHeader>
        <Chip tone="ink" className="self-start">
          Test mode · nothing is charged
        </Chip>

        <div className="flex flex-col gap-3 rounded-[20px] border-2 border-ink bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[22px] font-extrabold">
              {details.label} plan for {petName}
            </span>
            {plan === "yearly" && <Chip tone="coral" size="sm">Save 50%</Chip>}
          </div>
          <Row label={`${details.label} plan`} value={details.price} />
          {plan === "yearly" && <Row label="Works out to" value="$5.00 a month" muted />}
          <Row label="Renews" value={renewalDate(plan)} muted />
          <div className="border-t-2 border-dashed border-ink" />
          <div className="flex justify-between font-display text-[26px] font-extrabold">
            <span>Due today</span>
            <span>{details.price}</span>
          </div>
        </div>

        {subscribe.isError && (
          <p role="alert" className="font-bold text-error">
            {errorMessage(subscribe.error)}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="primary"
            size="lg"
            className="flex-1 basis-[220px]"
            onClick={confirm}
            disabled={subscribe.isPending}
          >
            {subscribe.isPending ? "Confirming…" : `Confirm ${details.label.toLowerCase()} plan`}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setPlan(other)}>
            Switch to {PLANS[other].label.toLowerCase()}
          </Button>
        </DialogFooter>
        <p className="text-sm leading-normal text-muted">
          Demo checkout for testing pricing. No card needed, nothing is charged, and you can cancel
          anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={muted ? "flex justify-between text-muted" : "flex justify-between"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
