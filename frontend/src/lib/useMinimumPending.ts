import { useEffect, useState } from "react";

/**
 * Keeps a loading screen up for at least `ms`, so a fast response doesn't
 * flash the "building your plan" step too quickly to read.
 */
export function useMinimumPending(isPending: boolean, ms: number): boolean {
  const [held, setHeld] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setHeld(false), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return isPending || held;
}
