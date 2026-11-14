import { z } from "zod";
import type { PetCreate } from "@/api/contract";

export const ZIP_RE = /^\d{5}$/;

export const quizSchema = z
  .object({
    species: z.enum(["dog", "cat"], { message: "Pick dog or cat." }),
    name: z.string().trim().min(1, "Enter a name.").max(40, "Keep the name under 40 characters."),
    breed: z
      .string()
      .trim()
      .min(1, "Pick a breed, or choose Mixed / not sure.")
      .max(80, "Keep the breed under 80 characters."),
    age_years: z
      .number({ message: "Enter an age." })
      .int()
      .min(0, "Age can't be below 0.")
      .max(30, "Enter an age up to 30."),
    size_class: z.enum(["small", "medium", "large"]).nullable(),
    zip: z.string().trim().regex(ZIP_RE, "Enter a 5-digit US ZIP code."),
    insured: z.boolean({ message: "Pick an answer." }),
    worry: z.enum(["surprise", "monthly", "normal"], { message: "Pick one." }),
  })
  .superRefine((value, ctx) => {
    if (value.species === "dog" && value.size_class === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["size_class"], message: "Pick a size." });
    }
  });

export type QuizValues = z.infer<typeof quizSchema>;

export function toPetCreate(values: QuizValues): PetCreate {
  return {
    ...values,
    name: values.name.trim(),
    breed: values.breed.trim(),
    zip: values.zip.trim(),
    // Cats have no size step.
    size_class: values.species === "cat" ? null : values.size_class,
  };
}
