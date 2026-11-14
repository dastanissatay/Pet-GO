import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useCreatePet } from "@/features/pets/api";
import { AnswersCard } from "@/features/quiz/AnswersCard";
import { QuizStepContent, stepCopy } from "@/features/quiz/QuizStepContent";
import { quizSchema, toPetCreate, type QuizValues } from "@/features/quiz/quizSchema";
import { STEPS, stepIndexForField, visibleSteps } from "@/features/quiz/quizSteps";
import { ApiError, errorMessage } from "@/lib/api";

const AUTO_ADVANCE_MS = 180;

export function QuizPage() {
  const navigate = useNavigate();
  const createPet = useCreatePet();
  const form = useForm<QuizValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: { name: "", breed: "", age_years: 3, size_class: null, zip: "" },
  });
  const values = form.watch();
  const steps = visibleSteps(values);
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex] ?? STEPS[0]!;
  const isLast = safeIndex === steps.length - 1;
  const copy = stepCopy(step.id, values);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new question so screen readers announce it. Text steps
  // focus their input instead (autoFocus), so typing can start right away.
  const hasTextInput = step.id === "name" || step.id === "zip";
  useEffect(() => {
    if (!hasTextInput) headingRef.current?.focus();
  }, [safeIndex, hasTextInput]);

  function submit(data: QuizValues) {
    createPet.mutate(toPetCreate(data), {
      onSuccess: () => navigate("/results"),
      onError: (error) => {
        const fields = error instanceof ApiError ? error.fieldErrors() : {};
        const first = Object.keys(fields)[0];
        if (!first) {
          form.setError("root", { message: errorMessage(error) });
          return;
        }
        for (const [name, message] of Object.entries(fields)) {
          if (name in data) form.setError(name as keyof QuizValues, { message });
        }
        const target = stepIndexForField(first, data);
        if (target >= 0) setIndex(target);
      },
    });
  }

  async function next() {
    form.clearErrors("root");
    if (step.id === "size" && !form.getValues("size_class")) {
      form.setError("size_class", { message: "Pick a size." });
      return;
    }
    const ok = await form.trigger(step.field);
    if (!ok) return;
    if (isLast) {
      await form.handleSubmit(submit)();
      return;
    }
    setIndex(safeIndex + 1);
  }

  function back() {
    if (safeIndex === 0) navigate("/");
    else setIndex(safeIndex - 1);
  }

  function pick<K extends keyof QuizValues>(field: K, value: QuizValues[K], advance: boolean) {
    // RHF's setValue needs a path-typed value; K narrows it correctly at call sites.
    form.setValue(field, value as never, { shouldDirty: true });
    form.clearErrors(field);
    if (advance) setTimeout(() => setIndex((i) => i + 1), AUTO_ADVANCE_MS);
  }

  const rootError = form.formState.errors.root?.message;
  const progress = ((safeIndex + 1) / steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-ink bg-surface">
        <div className="container flex flex-wrap items-center gap-6 py-3.5">
          <Logo />
          <div className="flex min-w-[220px] flex-1 items-center gap-3">
            <span className="whitespace-nowrap text-sm font-bold">
              Step {safeIndex + 1} of {steps.length}
            </span>
            <div
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-valuenow={safeIndex + 1}
              className="h-4 flex-1 overflow-hidden rounded-full border-2 border-ink bg-butter"
            >
              <div
                className="h-full border-r-2 border-ink bg-coral transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Link to="/" className="px-1 py-2.5 font-bold">
            Exit
          </Link>
        </div>
      </header>

      <main className="container flex flex-1 flex-wrap items-start gap-10 py-10 lg:py-14">
        <Form {...form}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void next();
            }}
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-7"
          >
            <button type="button" onClick={back} className="flex items-center gap-1.5 self-start py-2 font-bold">
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              Back
            </button>
            <div className="flex flex-col gap-2.5">
              <h1 ref={headingRef} tabIndex={-1} className="text-[36px] leading-none outline-none sm:text-[52px]">
                {copy.title}
              </h1>
              {copy.hint && <p className="text-lg text-muted">{copy.hint}</p>}
            </div>

            <QuizStepContent id={step.id} form={form} values={values} onPick={pick} />

            {rootError && (
              <p role="alert" className="font-bold text-error">
                {rootError}
              </p>
            )}

            {!step.autoAdvance && (
              <div className="flex flex-wrap items-center gap-3.5">
                <Button type="submit" variant="primary" size="xl" disabled={createPet.isPending}>
                  {isLast
                    ? createPet.isPending
                      ? "Building…"
                      : `Build ${values.name?.trim() || "my pet"}'s plan`
                    : "Continue"}
                </Button>
                <span className="hidden text-sm text-muted sm:inline">or press Enter</span>
              </div>
            )}
          </form>
        </Form>
        <div className="flex-[1_1_300px]">
          <AnswersCard values={values} />
        </div>
      </main>
    </div>
  );
}
