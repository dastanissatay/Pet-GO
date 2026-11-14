import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx answers will not change on retry; network blips and 5xx might.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
