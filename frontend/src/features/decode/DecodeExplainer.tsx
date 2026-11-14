import { FileSearch, MessageCircleQuestion, ReceiptText } from "lucide-react";
import { Card } from "@/components/Card";

export function DecodeExplainer() {
  return (
    <Card variant="dashed" tone="lilac" className="space-y-6">
      <div>
        <p className="font-display text-2xl font-extrabold">
          Turn clinic shorthand into a clear receipt
        </p>
        <p className="mt-2 text-muted">
          Paste a written estimate. Pet&amp;GO matches each priced line to sourced US reference
          ranges.
        </p>
      </div>
      <ol className="space-y-4">
        <li className="flex gap-3">
          <ReceiptText aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <span>
            <strong>We find priced lines</strong> and ignore totals, deposits and unpriced notes.
          </span>
        </li>
        <li className="flex gap-3">
          <FileSearch aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <span>
            <strong>Code compares prices</strong> with source-backed ranges for your pet's species.
          </span>
        </li>
        <li className="flex gap-3">
          <MessageCircleQuestion aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <span>
            <strong>You get useful questions</strong> for lines that are above range or have no
            match.
          </span>
        </li>
      </ol>
    </Card>
  );
}
