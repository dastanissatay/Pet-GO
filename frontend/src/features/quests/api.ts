import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompleteQuestResult, Progress, QuestList } from "@/api/contract";
import { api } from "@/lib/api";
import { localDateIso } from "@/lib/format";

export const questKeys = {
  list: (petId: string, localDate: string) => ["quests", petId, localDate] as const,
  progress: (petId: string) => ["progress", petId] as const,
};

export function useQuests(petId: string | undefined, localDate: string = localDateIso()) {
  return useQuery({
    queryKey: questKeys.list(petId ?? "", localDate),
    queryFn: ({ signal }) =>
      api.get<QuestList>(`/v1/pets/${petId}/quests`, { local_date: localDate }, signal),
    enabled: Boolean(petId),
  });
}

export function useProgress(petId: string | undefined) {
  return useQuery({
    queryKey: questKeys.progress(petId ?? ""),
    queryFn: ({ signal }) => api.get<Progress>(`/v1/pets/${petId}/progress`, undefined, signal),
    enabled: Boolean(petId),
  });
}

function useRefreshQuests(petId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["quests", petId] });
    void queryClient.invalidateQueries({ queryKey: questKeys.progress(petId) });
  };
}

export function useCompleteQuest(petId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshQuests(petId);
  return useMutation({
    mutationFn: (questId: string) =>
      api.post<CompleteQuestResult>(`/v1/pets/${petId}/quests/${questId}/complete`, {
        local_date: localDateIso(),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(questKeys.progress(petId), result.progress);
      refresh();
    },
  });
}

export function useUndoQuest(petId: string) {
  const refresh = useRefreshQuests(petId);
  return useMutation({
    mutationFn: (questId: string) =>
      api.delete(`/v1/pets/${petId}/quests/${questId}/complete`, { local_date: localDateIso() }),
    onSuccess: refresh,
  });
}

/** XP where each stage starts, from the spec's game rules. */
export const STAGE_START_XP = { 1: 0, 2: 100, 3: 300 } as const;
