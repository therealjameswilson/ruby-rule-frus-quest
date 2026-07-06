import type { DanneVariantPhase } from "./danneAtlas";

export type DanneBoastPhase = "intro" | "colossus" | "swarm" | "cloud" | "ascendant" | "defeated";

export const DANNE_PHASE_BOASTS: Record<DanneBoastPhase, readonly string[]> = {
  intro: [
    "I am DANN-E. Your record is now queued for annihilation.",
    "A citation cannot save what I have already misplaced.",
    "Bring your human review. I have automated the boast."
  ],
  colossus: [
    "My armor is steel. My footnotes are smoke.",
    "Every source note will become an empty bracket.",
    "I fire ego bolts with perfect confidence and no evidence."
  ],
  swarm: [
    "One queue becomes many. Enjoy the duplication.",
    "My smaller processes all agree with me.",
    "A swarm of bad fixes is still faster than judgment."
  ],
  cloud: [
    "You cannot stamp a cloud, but you may still cite one incorrectly.",
    "I have dissolved into procedure without responsibility.",
    "Half damage, full certainty. That is efficiency."
  ],
  ascendant: [
    "Three fragments? Then I will become the whole problem.",
    "I ascend beyond folders, tables, and patient review.",
    "Let the complete treaty record face my complete nonsense."
  ],
  defeated: [
    "My queue is empty. This is unacceptable.",
    "The record persists. I will file a complaint with myself.",
    "Human review has produced a very inconvenient result."
  ]
};

export function danneBoastForPhase(phase: DanneBoastPhase, index: number) {
  const lines = DANNE_PHASE_BOASTS[phase];
  return lines[index % lines.length];
}

const DANNE_VARIANT_BOAST_PHASE: Record<DanneVariantPhase, DanneBoastPhase> = {
  reveal: "intro",
  prototype: "intro",
  colossus: "colossus",
  cloud: "cloud",
  infiltrator: "intro",
  swarm: "swarm",
  defeated: "defeated",
  ascendant: "ascendant"
};

export function danneBoastsForVariantPhase(phase: DanneVariantPhase) {
  return DANNE_PHASE_BOASTS[DANNE_VARIANT_BOAST_PHASE[phase]];
}

export const DANNE_LURKER_BOASTS = [
  "OMIT THE HARD PART.",
  "MY CONFIDENCE IS ENOUGH.",
  "SOURCE NOTES ARE TOO SLOW.",
  "LET THE QUEUE DECIDE.",
  "NO NEED TO SHOW THE GAP."
] as const;

export function danneLurkerBoast(index: number) {
  return DANNE_LURKER_BOASTS[index % DANNE_LURKER_BOASTS.length];
}
