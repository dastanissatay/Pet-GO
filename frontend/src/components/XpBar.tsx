import { cn } from "@/lib/utils";

interface XpBarProps {
  xp: number;
  /** XP needed for the next level, or null at the top level. */
  nextLevelXp: number | null;
  /** XP at which the current level started. */
  levelStartXp: number;
  className?: string;
}

export function XpBar({ xp, nextLevelXp, levelStartXp, className }: XpBarProps) {
  const span = nextLevelXp === null ? 1 : Math.max(1, nextLevelXp - levelStartXp);
  const filled = nextLevelXp === null ? 1 : Math.min(1, Math.max(0, (xp - levelStartXp) / span));
  const label =
    nextLevelXp === null
      ? `${xp} XP, top level reached`
      : `${xp} of ${nextLevelXp} XP to the next level`;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(filled * 100)}
      className={cn(
        "h-[18px] overflow-hidden rounded-full border-2 border-ink bg-surface",
        className,
      )}
    >
      <div
        className="h-full bg-sun transition-[width] duration-300 ease-out"
        style={{ width: `${filled * 100}%` }}
      />
    </div>
  );
}
