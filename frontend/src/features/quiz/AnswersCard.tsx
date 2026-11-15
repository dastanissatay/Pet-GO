import { PetAvatar } from "@/components/PetAvatar";
import type { QuizValues } from "@/features/quiz/quizSchema";

const SIZE_TEXT = {
  small: "Small, under 20 lb",
  medium: "Medium, 20–50 lb",
  large: "Large, over 50 lb",
} as const;
const WORRY_TEXT = {
  surprise: "Surprise bills",
  monthly: "Monthly costs",
  normal: "Not sure what's normal",
} as const;

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className={value ? "font-bold" : "text-muted"}>{value ?? "…"}</dd>
    </>
  );
}

/** "Biscuit so far": the answers given, shown beside the question on desktop. */
export function AnswersCard({ values }: { values: Partial<QuizValues> }) {
  const age =
    values.age_years === undefined
      ? undefined
      : values.age_years === 0
        ? "Under 1 year"
        : `${values.age_years} years`;
  return (
    <aside
      aria-label="Your answers so far"
      className="hidden flex-col gap-3.5 rounded-card border-2 border-ink bg-surface p-5 shadow-hard lg:flex"
    >
      <div className="flex items-center gap-3">
        <PetAvatar species={values.species ?? "dog"} stage={1} size={64} label={null} />
        <span className="font-display text-[22px] font-extrabold">
          {values.name?.trim() || "Your pet"} so far
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[15px]">
        <Row
          label="Pet"
          value={values.species ? (values.species === "dog" ? "Dog" : "Cat") : undefined}
        />
        <Row label="Breed" value={values.breed || undefined} />
        <Row label="Age" value={age} />
        {values.species !== "cat" && (
          <Row label="Size" value={values.size_class ? SIZE_TEXT[values.size_class] : undefined} />
        )}
        <Row
          label="ZIP code"
          value={values.zip && /^\d{5}$/.test(values.zip) ? values.zip : undefined}
        />
        <Row
          label="Insurance"
          value={values.insured === undefined ? undefined : values.insured ? "Yes" : "No"}
        />
        <Row label="Worry" value={values.worry ? WORRY_TEXT[values.worry] : undefined} />
      </dl>
      <p className="border-t-2 border-dashed border-ink pt-3 text-[13px] text-muted">
        No sign-up. You can change any answer later.
      </p>
    </aside>
  );
}
