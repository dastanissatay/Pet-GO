import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Chip } from "@/components/Chip";
import { useMe } from "@/features/account/api";

export function DecodeEntryCard() {
  const me = useMe();
  const freeLeft = me.data?.plan === "free" ? me.data.free_decodes_left : null;

  return (
    <Link
      to="/decode"
      className="flex items-center justify-between gap-4 rounded-hero border-2 border-ink bg-lilac px-6 py-5 text-ink no-underline shadow-hard-lg transition-transform hover:-translate-y-px"
    >
      <span>
        {freeLeft !== null && freeLeft > 0 && (
          <Chip tone="surface" size="sm" className="mb-2">
            {freeLeft} free decode
          </Chip>
        )}
        <span className="block font-display text-2xl font-extrabold">Got a vet estimate?</span>
        <span className="mt-1 block text-[15px]">See if every line is priced normally.</span>
      </span>
      <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-surface">
        <ArrowRight className="h-[22px] w-[22px]" strokeWidth={2.5} aria-hidden="true" />
      </span>
    </Link>
  );
}
