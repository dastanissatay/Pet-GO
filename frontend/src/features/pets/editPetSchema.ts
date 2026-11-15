import { z } from "zod";
import type { PetRead, PetUpdate } from "@/api/contract";
import { ZIP_RE } from "@/features/quiz/quizSchema";

/** Species is fixed after the quiz; everything else that drives the forecast can change. */
export const editPetSchema = z
  .object({
    species: z.enum(["dog", "cat"]),
    name: z.string().trim().min(1, "Enter a name.").max(40, "Keep the name under 40 characters."),
    breed: z
      .string()
      .trim()
      .min(1, "Enter a breed, or Mixed / not sure.")
      .max(80, "Keep the breed under 80 characters."),
    age_years: z
      .string()
      .trim()
      .regex(/^\d{1,2}$/, "Enter an age in whole years.")
      .refine((value) => Number(value) <= 30, "Enter an age up to 30."),
    size_class: z.enum(["small", "medium", "large"]).nullable(),
    zip: z.string().trim().regex(ZIP_RE, "Enter a 5-digit US ZIP code."),
    insured: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.species === "dog" && value.size_class === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["size_class"], message: "Pick a size." });
    }
  });

export type EditPetValues = z.infer<typeof editPetSchema>;

export function petToEditForm(pet: PetRead): EditPetValues {
  return {
    species: pet.species,
    name: pet.name,
    breed: pet.breed,
    age_years: String(pet.age_years),
    size_class: pet.size_class,
    zip: pet.zip,
    insured: pet.insured,
  };
}

export function toPetUpdate(values: EditPetValues): PetUpdate {
  return {
    name: values.name.trim(),
    breed: values.breed.trim(),
    age_years: Number(values.age_years),
    size_class: values.species === "cat" ? null : values.size_class,
    zip: values.zip.trim(),
    insured: values.insured,
  };
}

/** Backend field names that map onto form fields, for 422 errors. */
export const PET_FIELDS = ["name", "breed", "age_years", "size_class", "zip", "insured"] as const;
