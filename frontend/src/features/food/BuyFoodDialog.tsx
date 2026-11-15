import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddFoodPurchase } from "@/features/food/api";
import {
  CUPS_PER_POUND,
  daysFromBag,
  emptyFoodPurchase,
  FOOD_FIELD_MAP,
  foodPurchaseSchema,
  toFoodPurchaseCreate,
  type FoodPurchaseValues,
} from "@/features/food/foodPurchaseSchema";
import { ApiError, errorMessage } from "@/lib/api";

interface BuyFoodDialogProps {
  petId: string;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Log a bag of food so the app can say when the next one is due. */
export function BuyFoodDialog({ petId, petName, open, onOpenChange }: BuyFoodDialogProps) {
  const add = useAddFoodPurchase(petId);
  const form = useForm<FoodPurchaseValues>({
    resolver: zodResolver(foodPurchaseSchema),
    defaultValues: emptyFoodPurchase(),
  });
  const [pounds, setPounds] = useState("");
  const [cups, setCups] = useState("");

  useEffect(() => {
    if (!open) return;
    form.reset(emptyFoodPurchase());
    setPounds("");
    setCups("");
  }, [open, form]);

  function applyEstimate() {
    const days = daysFromBag(Number(pounds), Number(cups));
    if (days === null) return;
    form.setValue("lastsDays", String(days), { shouldValidate: true });
  }

  const submit = form.handleSubmit((values) => {
    add.mutate(toFoodPurchaseCreate(values), {
      onSuccess: () => {
        toast.success(`Logged ${petName}'s food. We'll remind you before it runs out.`);
        onOpenChange(false);
      },
      onError: (error) => {
        const fields = error instanceof ApiError ? error.fieldErrors() : {};
        let mapped = false;
        for (const [serverName, message] of Object.entries(fields)) {
          const name = FOOD_FIELD_MAP[serverName];
          if (!name) continue;
          form.setError(name, { message });
          mapped = true;
        }
        if (!mapped) form.setError("root", { message: errorMessage(error) });
      },
    });
  });

  const estimate = daysFromBag(Number(pounds), Number(cups));
  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a bag of food</DialogTitle>
          <DialogDescription>
            We'll work out when it runs out and remind you to order the next one.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bought on</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" placeholder="MM/DD/YYYY" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="54.99" />
                    </FormControl>
                    <FormDescription>With a price, it's added to your expenses.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lastsDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many days does a bag last?</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <fieldset className="flex flex-col gap-2.5 rounded-button border-2 border-dashed border-ink p-3.5">
              <legend className="px-1 text-sm font-bold">Not sure? Estimate it</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bag-pounds">Bag size (lb)</Label>
                  <Input
                    id="bag-pounds"
                    inputMode="decimal"
                    value={pounds}
                    onChange={(event) => setPounds(event.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cups-per-day">Cups a day</Label>
                  <Input
                    id="cups-per-day"
                    inputMode="decimal"
                    value={cups}
                    onChange={(event) => setCups(event.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  About {CUPS_PER_POUND} cups per pound of dry food. The feeding chart on the bag is
                  the better guide.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={estimate === null}
                  onClick={applyEstimate}
                >
                  {estimate === null ? "Use estimate" : `Use ${estimate} days`}
                </Button>
              </div>
            </fieldset>

            {rootError && (
              <p role="alert" className="font-bold text-error">
                {rootError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1 basis-[220px]"
                disabled={add.isPending}
              >
                {add.isPending ? "Saving…" : "Save the bag"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
