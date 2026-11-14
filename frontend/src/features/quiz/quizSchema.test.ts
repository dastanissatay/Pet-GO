import { describe, expect, it } from "vitest";
import { quizSchema, toPetCreate, type QuizValues } from "@/features/quiz/quizSchema";
import { visibleSteps } from "@/features/quiz/quizSteps";

const dog: QuizValues = {
  species: "dog",
  name: "Biscuit",
  breed: "Labrador Retriever",
  age_years: 4,
  size_class: "large",
  zip: "78704",
  insured: false,
  worry: "surprise",
};

describe("quizSchema", () => {
  it("accepts a complete dog", () => {
    expect(quizSchema.safeParse(dog).success).toBe(true);
  });

  it.each(["7870", "787041", "ABCDE", "78 04"])("rejects ZIP %s", (zip) => {
    const result = quizSchema.safeParse({ ...dog, zip });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a 5-digit US ZIP code.");
  });

  it("requires a size for dogs but not for cats", () => {
    expect(quizSchema.safeParse({ ...dog, size_class: null }).success).toBe(false);
    expect(quizSchema.safeParse({ ...dog, species: "cat", size_class: null }).success).toBe(true);
  });

  it("requires a name", () => {
    expect(quizSchema.safeParse({ ...dog, name: "   " }).success).toBe(false);
  });

  it("drops the size for cats when building the API body", () => {
    expect(toPetCreate({ ...dog, species: "cat" }).size_class).toBeNull();
  });
});

describe("visibleSteps", () => {
  it("skips the size step for cats", () => {
    expect(visibleSteps({ species: "dog" })).toHaveLength(8);
    expect(visibleSteps({ species: "cat" }).map((s) => s.id)).not.toContain("size");
  });
});
