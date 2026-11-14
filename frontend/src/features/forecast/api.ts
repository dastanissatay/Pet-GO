import { useQuery } from "@tanstack/react-query";
import type { Forecast, Summary } from "@/api/contract";
import { api } from "@/lib/api";

export const forecastKeys = {
  forecast: (petId: string) => ["forecast", petId] as const,
  summary: (petId: string) => ["summary", petId] as const,
};

export function useForecast(petId: string | undefined) {
  return useQuery({
    queryKey: forecastKeys.forecast(petId ?? ""),
    queryFn: ({ signal }) => api.get<Forecast>(`/v1/pets/${petId}/forecast`, undefined, signal),
    enabled: Boolean(petId),
  });
}

export function useSummary(petId: string | undefined) {
  return useQuery({
    queryKey: forecastKeys.summary(petId ?? ""),
    queryFn: ({ signal }) => api.get<Summary>(`/v1/pets/${petId}/summary`, undefined, signal),
    enabled: Boolean(petId),
  });
}
