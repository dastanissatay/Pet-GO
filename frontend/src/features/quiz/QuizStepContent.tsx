import type { UseFormReturn } from "react-hook-form";
import { PetAvatar } from "@/components/PetAvatar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AgeStepper } from "@/features/quiz/AgeStepper";
import { BreedPicker } from "@/features/quiz/BreedPicker";
import { ChoiceGrid } from "@/features/quiz/ChoiceGrid";
import type { QuizValues } from "@/features/quiz/quizSchema";
import type { StepId } from "@/features/quiz/quizSteps";

export interface StepCopy {
  title: string;
  hint?: string;
}

export function stepCopy(id: StepId, values: Partial<QuizValues>): StepCopy {
  const name = values.name?.trim() || "your pet";
  const kind = values.species === "cat" ? "cat" : "dog";
  switch (id) {
    case "species":
      return { title: "Dog or cat?", hint: "We'll tailor every cost to them." };
    case "name":
      return { title: `What's your ${values.species ? kind : "pet"}'s name?` };
    case "breed":
      return { title: `What breed is ${name}?` };
    case "age":
      return { title: `How old is ${name}?`, hint: "Your best guess is fine." };
    case "size":
      return { title: `How big is ${name}?`, hint: "Bigger dogs need bigger doses, so costs change." };
    case "zip":
      return { title: "What's your ZIP code?", hint: "Vet prices vary a lot by area." };
    case "insured":
      return { title: `Does ${name} have pet insurance?`, hint: "It changes what you pay out of pocket." };
    case "worry":
      return { title: "What worries you most?", hint: `We'll put that first in ${name}'s plan.` };
  }
}

function SizeDot({ size }: { size: number }) {
  return (
    <span className="flex h-20 items-end" aria-hidden="true">
      <span className="rounded-full border-2 border-ink bg-fur" style={{ width: size, height: size }} />
    </span>
  );
}

interface QuizStepContentProps {
  id: StepId;
  form: UseFormReturn<QuizValues>;
  values: Partial<QuizValues>;
  onPick: <K extends keyof QuizValues>(field: K, value: QuizValues[K], advance: boolean) => void;
}

export function QuizStepContent({ id, form, values, onPick }: QuizStepContentProps) {
  const errors = form.formState.errors;
  const errorId = `quiz-${id}-error`;
  const choiceError = (message: string | undefined) =>
    message ? (
      <p id={errorId} role="alert" className="text-[15px] font-bold text-error">
        {message}
      </p>
    ) : null;

  switch (id) {
    case "species":
      return (
        <>
          <ChoiceGrid
            label="Dog or cat"
            value={values.species}
            onPick={(v) => onPick("species", v, true)}
            describedBy={errors.species ? errorId : undefined}
            choices={[
              { value: "dog", label: "Dog", tone: "sky", visual: <PetAvatar species="dog" stage={1} size={104} label={null} /> },
              { value: "cat", label: "Cat", tone: "lilac", visual: <PetAvatar species="cat" stage={1} size={104} label={null} /> },
            ]}
          />
          {choiceError(errors.species?.message)}
        </>
      );
    case "name":
      return (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="max-w-[460px]">
              <FormLabel className="text-[15px]">Name</FormLabel>
              <FormControl>
                <Input {...field} autoFocus autoComplete="off" maxLength={40} placeholder="Biscuit" className="h-[60px] text-[22px] font-bold" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    case "breed":
      return (
        <BreedPicker
          species={values.species ?? "dog"}
          value={values.breed ?? ""}
          onChange={(breed) => onPick("breed", breed, false)}
          error={errors.breed?.message}
          errorId={errorId}
        />
      );
    case "age":
      return <AgeStepper value={values.age_years ?? 3} onChange={(age) => onPick("age_years", age, false)} />;
    case "size":
      return (
        <>
          <ChoiceGrid
            label="Size"
            value={values.size_class}
            onPick={(v) => onPick("size_class", v, true)}
            describedBy={errors.size_class ? errorId : undefined}
            choices={[
              { value: "small", label: "Small", hint: "Under 20 lb", visual: <SizeDot size={30} /> },
              { value: "medium", label: "Medium", hint: "20–50 lb", visual: <SizeDot size={50} /> },
              { value: "large", label: "Large", hint: "Over 50 lb", visual: <SizeDot size={76} /> },
            ]}
          />
          {choiceError(errors.size_class?.message)}
        </>
      );
    case "zip":
      return (
        <FormField
          control={form.control}
          name="zip"
          render={({ field }) => (
            <FormItem className="max-w-[420px]">
              <FormLabel className="text-[15px]">ZIP code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="78704"
                  className="h-[72px] text-[32px] font-bold tracking-[0.2em]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    case "insured":
      return (
        <div className="flex flex-col gap-4">
          <ChoiceGrid
            label="Pet insurance"
            value={values.insured}
            onPick={(v) => onPick("insured", v, true)}
            describedBy={errors.insured ? errorId : undefined}
            choices={[
              { value: true, label: "Yes", tone: "mint" },
              { value: false, label: "No" },
            ]}
          />
          {/* Stored as "no": we only adjust out-of-pocket costs when coverage is confirmed. */}
          <button
            type="button"
            onClick={() => onPick("insured", false, true)}
            className="self-center p-2 font-bold underline underline-offset-4"
          >
            I'm not sure
          </button>
          {choiceError(errors.insured?.message)}
        </div>
      );
    case "worry":
      return (
        <>
          <ChoiceGrid
            label="Biggest worry"
            layout="rows"
            value={values.worry}
            onPick={(v) => onPick("worry", v, false)}
            describedBy={errors.worry ? errorId : undefined}
            choices={[
              { value: "surprise", label: "Surprise bills", hint: "A big bill I didn't see coming" },
              { value: "monthly", label: "Monthly costs", hint: "Food, meds and care adding up" },
              { value: "normal", label: "Not sure what's normal", hint: "Is my vet charging a fair price?" },
            ]}
          />
          {choiceError(errors.worry?.message)}
        </>
      );
  }
}
