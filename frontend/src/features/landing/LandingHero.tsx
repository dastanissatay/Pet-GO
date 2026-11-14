import { Link } from "react-router-dom";
import { Chip } from "@/components/Chip";
import { PetAvatar } from "@/components/PetAvatar";
import { SpeechBubble } from "@/components/SpeechBubble";
import { Button, buttonVariants } from "@/components/ui/button";
import { VerdictStamp } from "@/components/VerdictStamp";
import { useStartSample } from "@/features/landing/useStartSample";

export function LandingHero() {
  const sample = useStartSample();
  return (
    <section className="container flex flex-wrap items-center gap-12 pb-16 pt-12 lg:pt-[72px]">
      <div className="flex min-w-0 flex-1 basis-[440px] flex-col gap-5">
        <Chip tone="surface" className="self-start">
          For dog and cat owners in the US
        </Chip>
        <h1 className="text-[48px] leading-[0.95] tracking-[-0.035em] sm:text-[64px] lg:text-[72px]">
          Vet bills, minus the panic.
        </h1>
        <p className="max-w-[520px] text-lg leading-normal text-muted sm:text-xl">
          Know what your pet will cost this year, check any vet estimate line by line, and grow your
          pet with small care habits that keep bills down.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <Link to="/quiz" className={buttonVariants({ variant: "primary", size: "xl" })}>
            Start with my pet
          </Link>
          <Button variant="secondary" size="xl" onClick={sample.start} disabled={sample.isPending}>
            {sample.isPending ? "Fetching Biscuit…" : "Try with a sample dog"}
          </Button>
        </div>
        <p className="text-sm text-muted">No sign-up. About a minute. Free to start.</p>
      </div>

      {/* Illustration of the product, not live data. */}
      <div aria-hidden="true" className="flex min-w-0 flex-1 basis-[380px] flex-col gap-4">
        <div className="flex items-end gap-4 rounded-hero border-2 border-ink bg-sky p-6 shadow-hard-lg">
          <PetAvatar species="dog" stage={2} size={140} label={null} />
          <SpeechBubble className="text-[17px]">
            Every bill checked, every habit counted. Let's plan for my year.
          </SpeechBubble>
        </div>
        <div className="flex w-[86%] rotate-[1.5deg] flex-col gap-2.5 self-end rounded-md border-2 border-ink bg-surface p-4 font-mono text-sm shadow-hard">
          <span className="text-center font-bold">DECODED ESTIMATE</span>
          <div className="border-t-2 border-dashed border-ink" />
          <div className="flex items-center justify-between">
            <span>Wellness exam</span>
            <VerdictStamp verdict="within" />
          </div>
          <div className="flex items-center justify-between">
            <span>Dental x-rays</span>
            <VerdictStamp verdict="above" />
          </div>
          <div className="flex items-center justify-between">
            <span>Disposal fee</span>
            <VerdictStamp verdict="unknown" />
          </div>
        </div>
      </div>
    </section>
  );
}
