import { FileSearch, Home, Wallet } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { PetRead } from "@/api/contract";
import { Logo } from "@/components/Logo";
import { PetAvatar } from "@/components/PetAvatar";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/account/api";
import { CheckoutDialog } from "@/features/checkout/CheckoutDialog";
import { useProgress } from "@/features/quests/api";
import { cn } from "@/lib/utils";

// Three places: the pet, its money, and checking a new vet bill.
const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/decode", label: "Decode an estimate", icon: FileSearch },
] as const;

export function Sidebar({ pet }: { pet: PetRead }) {
  const me = useMe();
  const progress = useProgress(pet.id);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const stage = progress.data?.stage ?? 1;

  return (
    <aside className="flex flex-col gap-4 border-b-2 border-ink bg-surface px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:shrink-0 lg:gap-6 lg:border-b-0 lg:border-r-2 lg:py-6">
      <div className="flex items-center justify-between px-2">
        <Logo />
      </div>

      <nav
        aria-label="Main"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 lg:flex-col lg:overflow-visible"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex h-12 shrink-0 items-center gap-3 rounded-control border-2 px-3 text-[15px] font-bold text-ink no-underline",
                isActive ? "border-ink bg-sun" : "border-transparent hover:bg-butter",
              )
            }
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="hidden items-center gap-2.5 rounded-button border-2 border-ink bg-mint p-3 lg:flex">
        <PetAvatar species={pet.species} stage={stage} size={44} label={null} />
        <div className="min-w-0">
          <p className="truncate font-bold">{pet.name}</p>
          <p className="text-[13px]">
            Level {progress.data?.level ?? 1}
            {progress.data ? ` · ${progress.data.streak}-day streak` : ""}
          </p>
        </div>
      </div>

      {me.data?.plan === "free" && (
        <div className="hidden flex-col gap-2.5 rounded-[18px] border-2 border-dashed border-ink bg-butter p-3.5 lg:mt-auto lg:flex">
          <p className="text-sm font-bold">Free plan</p>
          <p className="text-[13px] leading-snug">
            Unlock unlimited decoding and the full forecast.
          </p>
          <Button variant="primary" size="sm" onClick={() => setCheckoutOpen(true)}>
            Upgrade · $59.99/yr
          </Button>
        </div>
      )}
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} petName={pet.name} />
    </aside>
  );
}
