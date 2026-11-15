import type { Species } from "@/api/contract";
import { cn } from "@/lib/utils";

export type Stage = 1 | 2 | 3;
export type Mood = "normal" | "happy" | "worried";

interface PetAvatarProps {
  species: Species;
  stage: Stage;
  mood?: Mood;
  size?: number;
  /** Visible description; pass null when nearby text already names the pet. */
  label?: string | null;
  className?: string;
}

const STAGE_NAMES: Record<Species, Record<Stage, string>> = {
  dog: { 1: "Puppy", 2: "Growing pup", 3: "Good dog" },
  cat: { 1: "Kitten", 2: "House cat", 3: "Top cat" },
};

export function stageName(species: Species, stage: Stage): string {
  return STAGE_NAMES[species][stage];
}

function Eyes({ mood, y, left, right }: { mood: Mood; y: number; left: number; right: number }) {
  if (mood === "happy") {
    return (
      <path
        d={`M${left - 4} ${y}q4-5 8 0M${right - 4} ${y}q4-5 8 0`}
        fill="none"
        className="stroke-ink"
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  }
  if (mood === "worried") {
    return (
      <path
        d={`M${left - 4} ${y}h8M${right - 4} ${y}h8`}
        className="stroke-ink"
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  }
  return (
    <>
      <circle cx={left} cy={y} r={3.5} className="fill-ink" />
      <circle cx={right} cy={y} r={3.5} className="fill-ink" />
    </>
  );
}

function Accessories({ stage }: { stage: Stage }) {
  if (stage === 1) return null;
  return (
    <>
      <path
        d="M30 76h36l-18 14z"
        className="fill-coral stroke-ink"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {stage === 3 && (
        <circle cx={48} cy={88} r={6} className="fill-sun stroke-ink" strokeWidth={2.5} />
      )}
    </>
  );
}

function Dog({ stage, mood }: { stage: Stage; mood: Mood }) {
  if (stage === 1) {
    return (
      <>
        <ellipse
          cx={30}
          cy={54}
          rx={8}
          ry={13}
          className="fill-fur-dark stroke-ink"
          strokeWidth={2.5}
        />
        <ellipse
          cx={66}
          cy={54}
          rx={8}
          ry={13}
          className="fill-fur-dark stroke-ink"
          strokeWidth={2.5}
        />
        <circle cx={48} cy={58} r={20} className="fill-fur stroke-ink" strokeWidth={2.5} />
        <ellipse
          cx={48}
          cy={67}
          rx={9}
          ry={7}
          className="fill-butter stroke-ink"
          strokeWidth={2.5}
        />
        <Eyes mood={mood} y={55} left={41} right={55} />
        <ellipse cx={48} cy={63} rx={3.5} ry={2.8} className="fill-ink" />
      </>
    );
  }
  return (
    <>
      <ellipse
        cx={27}
        cy={46}
        rx={10}
        ry={18}
        className="fill-fur-dark stroke-ink"
        strokeWidth={2.5}
      />
      <ellipse
        cx={69}
        cy={46}
        rx={10}
        ry={18}
        className="fill-fur-dark stroke-ink"
        strokeWidth={2.5}
      />
      <circle cx={48} cy={50} r={25} className="fill-fur stroke-ink" strokeWidth={2.5} />
      <ellipse
        cx={48}
        cy={62}
        rx={12}
        ry={9}
        className="fill-butter stroke-ink"
        strokeWidth={2.5}
      />
      <Eyes mood={mood} y={46} left={39} right={57} />
      <ellipse cx={48} cy={57} rx={4.5} ry={3.5} className="fill-ink" />
      <Accessories stage={stage} />
    </>
  );
}

function Cat({ stage, mood }: { stage: Stage; mood: Mood }) {
  if (stage === 1) {
    return (
      <>
        <path
          d="M32 40l4 16h-11z"
          className="fill-cat-dark stroke-ink"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path
          d="M64 40l-4 16h11z"
          className="fill-cat-dark stroke-ink"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <circle cx={48} cy={62} r={20} className="fill-cat stroke-ink" strokeWidth={2.5} />
        <Eyes mood={mood} y={59} left={41} right={55} />
        <path
          d="M45 66h6l-3 3z"
          className="fill-coral stroke-ink"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <path d="M34 66h-9M62 66h9" className="stroke-ink" strokeWidth={2} strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <path
        d="M26 24l6 24h-14z"
        className="fill-cat-dark stroke-ink"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path
        d="M70 24l-6 24h14z"
        className="fill-cat-dark stroke-ink"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <circle cx={48} cy={52} r={25} className="fill-cat stroke-ink" strokeWidth={2.5} />
      <Eyes mood={mood} y={48} left={39} right={57} />
      <path
        d="M44 57h8l-4 4z"
        className="fill-coral stroke-ink"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M30 57h-12M66 57h12" className="stroke-ink" strokeWidth={2} strokeLinecap="round" />
      <Accessories stage={stage} />
    </>
  );
}

/** Original Pet&GO avatar, drawn inline so it scales and themes cleanly. */
export function PetAvatar({
  species,
  stage,
  mood = "normal",
  size = 120,
  label,
  className,
}: PetAvatarProps) {
  const text = label === undefined ? `${stageName(species, stage)} avatar` : label;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("shrink-0", className)}
      role={text ? "img" : undefined}
      aria-label={text ?? undefined}
      aria-hidden={text ? undefined : true}
    >
      {species === "dog" ? <Dog stage={stage} mood={mood} /> : <Cat stage={stage} mood={mood} />}
    </svg>
  );
}
