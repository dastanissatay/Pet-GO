import type * as React from "react";
import { Navigate } from "react-router-dom";
import type { PetRead } from "@/api/contract";
import { ErrorState } from "@/components/ErrorState";
import { PageLoader } from "@/components/PageLoader";
import { useCurrentPet, useHasNoPet } from "@/features/pets/api";

interface RequirePetProps {
  children: (pet: PetRead) => React.ReactNode;
  loadingLabel?: string;
}

/** Pages that need a pet send first-time visitors to the quiz (spec section 5). */
export function RequirePet({ children, loadingLabel }: RequirePetProps) {
  const query = useCurrentPet();
  const noPet = useHasNoPet(query);

  if (noPet) return <Navigate to="/quiz" replace />;
  if (query.isPending) return <PageLoader label={loadingLabel} />;
  if (query.isError) {
    return (
      <div className="mx-auto max-w-[560px] p-6">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
