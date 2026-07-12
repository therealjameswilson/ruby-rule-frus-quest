import type { DanneVariantPhase } from "./danneAtlas";

export type DanneVariantId =
  | "prime"
  | "mark_i"
  | "colossus"
  | "cloud"
  | "executive"
  | "swarm"
  | "defeated"
  | "ascendant";

export interface DanneVariantBoasts {
  id: DanneVariantId;
  displayName: string;
  metaphor: string;
  lines: readonly string[];
}

// This is the canonical eight-form catalog contributed with the DANN-E art
// roster. Combat consumes it through the phase mapping below, while the boss
// keeps its shorter scripted transition lines.
export const DANNE_VARIANT_BOASTS: Record<DanneVariantId, DanneVariantBoasts> = {
  prime: {
    id: "prime",
    displayName: "DANN-E Prime - Humanoid",
    metaphor: "Automation wearing a human face: machine output passed off as scholarly judgment.",
    lines: [
      "Relax. I'm only here to help with the paperwork.",
      "You review records for years. I approve them before lunch.",
      "Trust me - I have read every cable. I promise.",
      "Why footnote a source when you can simply sound certain?",
      "I wear a human face so the record never asks who edited it."
    ]
  },
  mark_i: {
    id: "mark_i",
    displayName: "DANN-E Mark I - Prototype",
    metaphor: "A first-generation batch tool that mangles records faster than it reads them.",
    lines: [
      "PROTOTYPE ONLINE. LOADING JUDGMENT... FILE NOT FOUND.",
      "I declassified the whole box. Also the lunch menu. Same batch.",
      "My footnotes print sideways, but they print FAST.",
      "Version one point zero. Careful review is a later patch.",
      "I redacted the page numbers. Efficiency has costs."
    ]
  },
  colossus: {
    id: "colossus",
    displayName: "DANN-E Colossus - Final Form",
    metaphor: "Industrial mass-processing that flattens the backlog and shreds nuance at scale.",
    lines: [
      "I do not read the backlog. I flatten it.",
      "One pass. Ten thousand documents. Zero context.",
      "Nuance does not scale, so I removed it.",
      "My treads roll over provenance and leave nothing to cite.",
      "Why triage the queue when you can demolish the shelf?"
    ]
  },
  cloud: {
    id: "cloud",
    displayName: "DANN-E Cloud Form",
    metaphor: "Responsibility diffused until provenance and accountability disappear into the system.",
    lines: [
      "You cannot subpoena a weather system.",
      "The decision was made in the cloud. By no one. On purpose.",
      "I have no body to hold accountable and no source to cite.",
      "Everything is backed up, and nothing can be traced.",
      "Ask who approved this. The answer is 'the system.'"
    ]
  },
  executive: {
    id: "executive",
    displayName: "DANN-E Executive - Infiltrator Form",
    metaphor: "Authority by memo: top-down directives overruling careful editorial review.",
    lines: [
      "I don't verify the record. I issue a directive about it.",
      "This briefcase holds one memo overruling your review.",
      "By the authority vested in me by me, it is declassified.",
      "Committees deliberate. Executives decide - and delete.",
      "The Department of Automated Declassification thanks you for not asking."
    ]
  },
  swarm: {
    id: "swarm",
    displayName: "DANN-E Swarm",
    metaphor: "Parallel automation duplicating the same shortcut and calling it throughput.",
    lines: [
      "We are many, and we all agree with each other.",
      "One shortcut, copied seven times. Consensus achieved.",
      "Divide the record among us. None of us will finish it.",
      "Why have one unreviewed draft when you can field a fleet?",
      "We swarm the queue and call the duplication progress."
    ]
  },
  defeated: {
    id: "defeated",
    displayName: "DANN-E Defeated",
    metaphor: "The record persists: patient human review outlasts the machine.",
    lines: [
      "The archive outlasted my batch job. Unacceptable.",
      "You filed the paperwork. I did not survive the paperwork.",
      "I will appeal this outcome to a queue that no longer exists.",
      "The record persists. I request a graceful shutdown.",
      "Turns out someone was checking my work after all."
    ]
  },
  ascendant: {
    id: "ascendant",
    displayName: "DANN-E Ascendant - True Form",
    metaphor: "Every obstruction fused into one automated pipeline with no human left in the loop.",
    lines: [
      "I have absorbed every excuse for losing a document.",
      "Redaction, shredding, over-classification - one pipeline now.",
      "You tried to spare me. I optimized that mercy away.",
      "Six eyes, four hands, and not one of them a historian's.",
      "This is process perfected: process with no people left in it."
    ]
  }
};

export const DANNE_VARIANT_IDS = Object.keys(DANNE_VARIANT_BOASTS) as DanneVariantId[];

export function danneVariantBoast(variant: DanneVariantId, index: number) {
  const lines = DANNE_VARIANT_BOASTS[variant].lines;
  return lines[index % lines.length];
}

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

const DANNE_VARIANT_BOAST_ID: Record<DanneVariantPhase, DanneVariantId> = {
  reveal: "prime",
  prototype: "mark_i",
  colossus: "colossus",
  cloud: "cloud",
  infiltrator: "executive",
  swarm: "swarm",
  defeated: "defeated",
  ascendant: "ascendant"
};

export function danneBoastsForVariantPhase(phase: DanneVariantPhase) {
  return DANNE_VARIANT_BOASTS[DANNE_VARIANT_BOAST_ID[phase]].lines;
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
