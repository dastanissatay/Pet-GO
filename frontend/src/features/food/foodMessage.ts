import type { FoodStatus } from "@/api/contract";
import { formatDate } from "@/lib/format";

export interface FoodMessage {
  title: string;
  detail: string;
}

/** Plain-language status of the current bag, from the server's dates. */
export function foodMessage(status: FoodStatus, petName: string): FoodMessage {
  const days = status.days_left ?? 0;
  const runsOut = status.runs_out_on ? formatDate(status.runs_out_on) : "";
  const buyBy = status.buy_by ? formatDate(status.buy_by) : "";

  switch (status.status) {
    case "none":
      return {
        title: "No food logged yet",
        detail: `Log the bag you bought and we'll remind you before ${petName} runs out.`,
      };
    case "out":
      return {
        title: `${petName} may be out of food`,
        detail:
          days === 0
            ? "The last bag runs out today. Buy a bag as soon as you can."
            : `The last bag was expected to run out on ${runsOut}. Buy a bag as soon as you can.`,
      };
    case "soon":
      return {
        title: `Running low: about ${days} day${days === 1 ? "" : "s"} of food left`,
        detail: `Order now so it arrives before ${runsOut}.`,
      };
    case "ok":
      return {
        title: `About ${days} days of food left`,
        detail: `Order the next bag around ${buyBy}, ${status.buy_ahead_days} days before it runs out on ${runsOut}.`,
      };
  }
}
