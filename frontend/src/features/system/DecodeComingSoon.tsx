import { Card } from "@/components/Card";

/** Placeholder until Person 3's features/decode/DecodePage lands. */
export function DecodeComingSoon() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[40px] leading-none sm:text-[48px]">Is this vet bill normal?</h1>
      <Card variant="dashed" tone="none">
        <p className="font-display text-2xl font-extrabold">Decoder coming</p>
        <p className="mt-2">The estimate decoder is being built and will appear here.</p>
      </Card>
      <p className="rounded-control border-2 border-ink bg-surface p-3 text-sm font-medium">
        This is cost information, not veterinary advice.
      </p>
    </div>
  );
}
