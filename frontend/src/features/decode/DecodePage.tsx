import { useQueryClient } from "@tanstack/react-query";
import { FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { usePetOutlet } from "@/components/usePetOutlet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/features/account/api";
import { DecodeExplainer } from "@/features/decode/DecodeExplainer";
import { DecodeLoading } from "@/features/decode/DecodeLoading";
import { DecodeResultPanel } from "@/features/decode/DecodeResultPanel";
import { loadSampleEstimate, useDecodeEstimate } from "@/features/decode/api";
import { AddExpenseDialog } from "@/features/expenses/AddExpenseDialog";
import { isApiError } from "@/lib/api";
import { formatDate, localDateIso, toNumber } from "@/lib/format";

export function DecodePage() {
  const pet = usePetOutlet();
  const queryClient = useQueryClient();
  const me = useMe();
  const decode = useDecodeEstimate();
  const [text, setText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState<unknown>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);

  function submit(value = text) {
    if (!value.trim()) {
      setInputError("Paste at least one priced line, like Wellness exam $89.00.");
      return;
    }
    setInputError(null);
    setSampleError(null);
    decode.mutate({ petId: pet.id, text: value });
  }

  async function loadSample() {
    setIsLoadingSample(true);
    setSampleError(null);
    try {
      const sample = await loadSampleEstimate(queryClient);
      setText(sample);
      submit(sample);
    } catch (error) {
      setSampleError(error);
    } finally {
      setIsLoadingSample(false);
    }
  }

  const noPrices = decode.isError && isApiError(decode.error, "NO_PRICES_FOUND");
  const atLimit = decode.isError && isApiError(decode.error, "DECODE_LIMIT_REACHED");
  const otherDecodeError = decode.isError && !noPrices && !atLimit;

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-bold text-coral">Vet estimate decoder</p>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
            Know what every line means
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Compare {pet.name}'s estimate with sourced US price ranges before you call the clinic.
          </p>
        </div>
        {me.isPending && <Chip tone="dashed">Checking free decode…</Chip>}
        {me.isSuccess && (
          <Chip tone="sun">
            {me.data.free_decodes_left} free decode{me.data.free_decodes_left === 1 ? "" : "s"} left
          </Chip>
        )}
        {me.isError && (
          <Button type="button" variant="link" size="sm" onClick={() => void me.refetch()}>
            Decode limit unavailable · Retry
          </Button>
        )}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
        <Card as="section" variant="raised" className="lg:sticky lg:top-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText aria-hidden="true" className="size-5" />
            <h2 className="font-display text-2xl font-extrabold">Paste the estimate</h2>
          </div>
          <Label htmlFor="estimate-text">Estimate or treatment plan text</Label>
          <Textarea
            id="estimate-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (inputError) setInputError(null);
            }}
            aria-invalid={inputError !== null}
            aria-describedby={inputError ? "estimate-error" : "estimate-help"}
            placeholder={"Wellness exam $89.00\nDHPP vaccine $42.00\nDental cleaning $750.00"}
            className="mt-2 min-h-[320px] resize-y font-mono text-sm"
          />
          {inputError ? (
            <p id="estimate-error" role="alert" className="mt-2 text-sm font-bold text-error">
              {inputError}
            </p>
          ) : (
            <p id="estimate-help" className="mt-2 text-sm text-muted">
              One priced service per line works best. Do not include private information.
            </p>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={decode.isPending || isLoadingSample}
              onClick={() => submit()}
            >
              {decode.isPending ? "Decoding…" : "Decode estimate"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={decode.isPending || isLoadingSample}
              onClick={() => void loadSample()}
            >
              <Sparkles aria-hidden="true" />
              {isLoadingSample ? "Loading sample…" : "Use sample estimate"}
            </Button>
          </div>
          {sampleError !== null && (
            <ErrorState
              className="mt-4"
              title="Sample didn't load"
              error={sampleError}
              onRetry={() => void loadSample()}
            />
          )}
        </Card>

        <section aria-live="polite">
          {!decode.data && !decode.isPending && !decode.isError && <DecodeExplainer />}
          {decode.isPending && <DecodeLoading />}
          {decode.data && !decode.isPending && (
            <DecodeResultPanel result={decode.data} onSave={() => setExpenseOpen(true)} />
          )}
          {noPrices && (
            <EmptyState
              title="We couldn't find any prices in that"
              icon={<FileText aria-hidden="true" className="size-9" />}
            >
              <p>
                Try one item per line, for example:{" "}
                <span className="font-mono font-bold">Wellness exam $89.00</span>
              </p>
              <p className="mt-2 font-bold">This didn't use up your free decode.</p>
            </EmptyState>
          )}
          {atLimit && (
            <Card tone="sun" variant="raised" className="space-y-4">
              <p className="font-display text-2xl font-extrabold">Your free decode is used</p>
              <p>
                Unlimited estimate decoding is included with the yearly or monthly plan. Checkout is
                test mode; nothing is charged.
              </p>
              <Button asChild variant="primary" size="lg">
                <Link to="/results">See upgrade options</Link>
              </Button>
            </Card>
          )}
          {otherDecodeError && (
            <ErrorState
              title="The estimate didn't decode"
              error={decode.error}
              onRetry={() => submit()}
            />
          )}
        </section>
      </div>

      <p className="mt-7 text-center text-sm font-bold">
        This is cost information, not veterinary advice.
      </p>

      {decode.data && (
        <AddExpenseDialog
          petId={pet.id}
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          initialValues={{
            amount: toNumber(decode.data.total_charged).toFixed(2),
            date: formatDate(localDateIso()),
            category: "other",
            note: "Vet estimate",
          }}
        />
      )}
    </div>
  );
}
