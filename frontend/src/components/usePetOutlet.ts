import { useOutletContext } from "react-router-dom";
import type { PetRead } from "@/api/contract";

/** The current pet, provided by AppShell to every page inside it. */
export function usePetOutlet(): PetRead {
  return useOutletContext<PetRead>();
}
