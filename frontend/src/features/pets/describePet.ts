import type { PetCreate } from "@/api/contract";

/** "Labrador Retriever, 4 years, large, ZIP 78704, no insurance" */
export function describePet(pet: PetCreate): string {
  const age = pet.age_years === 0 ? "under 1 year" : `${pet.age_years} ${pet.age_years === 1 ? "year" : "years"}`;
  const parts = [pet.breed, age];
  if (pet.size_class) parts.push(pet.size_class);
  parts.push(`ZIP ${pet.zip}`, pet.insured ? "insured" : "no insurance");
  return parts.join(", ");
}
