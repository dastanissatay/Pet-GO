import { Check, CircleDollarSign, Clipboard, HelpCircle, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { DecodeResult } from "@/api/contract";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { DecodeLine } from "@/features/decode/DecodeLine";
import { QuestionCard } from "@/features/decode/QuestionCard";
import { SummaryTile } from "@/features/decode/SummaryTile";
import { formatUsd } from "@/lib/format";

export function DecodeResultPanel({
  result,
  onSave,
}: {
  result: DecodeResult;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const questions = result.lines.flatMap((line) =>
    line.question_for_vet
      ? [{ description: line.description, question: line.question_for_vet }]
      : [],
  );

  async function copyQuestions() {
    await navigator.clipboard.writeText(questions.map((item) => `• ${item.question}`).join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <Card tone="lilac" className="space-y-4">
        <div>
          <p className="font-display text-2xl font-extrabold">Estimate decoded</p>
          <p className="mt-1 text-muted">{result.summary}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryTile
            label="Total"
            value={formatUsd(result.total_charged)}
            icon={<CircleDollarSign aria-hidden="true" className="size-4" />}
          />
          <SummaryTile
            label="Within"
            value={String(result.counts.within)}
            icon={<ShieldCheck aria-hidden="true" className="size-4" />}
          />
          <SummaryTile
            label="Above"
            value={String(result.counts.above)}
            icon={<HelpCircle aria-hidden="true" className="size-4" />}
          />
          <SummaryTile
            label="No range"
            value={String(result.counts.unknown)}
            icon={<HelpCircle aria-hidden="true" className="size-4" />}
          />
        </div>
      </Card>

      <Card as="section" aria-labelledby="line-items-title">
        <h2 id="line-items-title" className="font-display text-2xl font-extrabold">
          Line by line
        </h2>
        {result.area && (
          <p className="mt-1 text-sm text-muted">
            Typical prices for {result.area}: the average US vet price adjusted for local prices,
            then 30% either side.
          </p>
        )}
        <ul className="mt-5">
          {result.lines.map((line, index) => (
            <DecodeLine key={`${line.raw_text}-${index}`} line={line} />
          ))}
        </ul>
      </Card>

      {questions.length > 0 && (
        <Card as="section" aria-labelledby="questions-title" tone="sun" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="questions-title" className="font-display text-2xl font-extrabold">
                Worth a question
              </h2>
              <p className="text-sm text-muted">
                Cost-focused prompts you can bring to the clinic.
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => void copyQuestions()}>
              {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
              {copied ? "Copied" : "Copy questions"}
            </Button>
          </div>
          <div className="grid gap-3">
            {questions.map((item) => (
              <QuestionCard key={`${item.description}-${item.question}`} {...item} />
            ))}
          </div>
        </Card>
      )}

      <Button type="button" variant="secondary" size="lg" onClick={onSave}>
        <Save aria-hidden="true" />
        Save as expense
      </Button>
    </div>
  );
}
