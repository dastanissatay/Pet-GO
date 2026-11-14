import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useStartWithSample } from "@/features/pets/api";
import { errorMessage } from "@/lib/api";

/** "Try with a sample dog": real API calls with sample input, then the results page. */
export function useStartSample() {
  const navigate = useNavigate();
  const mutation = useStartWithSample();
  return {
    start: () =>
      mutation.mutate(undefined, {
        onSuccess: () => navigate("/results"),
        onError: (error) => toast.error(errorMessage(error)),
      }),
    isPending: mutation.isPending,
  };
}
