/**
 * Boast / taunt dialogue for the eight illustrated DANN-E variants.
 *
 * Variants and their canonical forms are defined in
 * `public/assets/art-pack/bosses/danne-variants/MANIFEST.md`. Each variant here
 * is tied to a FRUS-production metaphor in the spirit of
 * `docs/DANNE_ENEMY_DESIGN.md` (real obstructions to producing the Foreign
 * Relations of the United States record, translated into an antagonist).
 *
 * Lines are kept short for 8-bit dialogue boxes, lightly satirical but
 * professional, politically neutral, and free of any real named people.
 */

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
  /** Human-readable form name, matching the variants MANIFEST. */
  displayName: string;
  /** The FRUS-process obstruction this form personifies. */
  metaphor: string;
  /** 4-6 short taunt/boast lines sized for dialogue boxes. */
  lines: readonly string[];
}

export const DANNE_VARIANT_BOASTS: Record<DanneVariantId, DanneVariantBoasts> = {
  prime: {
    id: "prime",
    displayName: "DANN-E Prime — Humanoid",
    metaphor: "Automation wearing a human face — machine output passed off as scholarly judgment.",
    lines: [
      "Relax. I'm only here to help with the paperwork.",
      "You review records for years. I approve them before lunch.",
      "Trust me — I have read every cable. I promise.",
      "Why footnote a source when you can simply sound certain?",
      "I wear a human face so the record never asks who edited it."
    ]
  },
  mark_i: {
    id: "mark_i",
    displayName: "DANN-E Mark I — Prototype",
    metaphor: "The crude first-generation batch tool that mangles records faster than it reads them.",
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
    displayName: "DANN-E Colossus — Final Form",
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
    metaphor: "Diffusion of responsibility — provenance and accountability lost once it's 'in the cloud.'",
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
    displayName: "DANN-E Executive — Infiltrator Form",
    metaphor: "Authority by memo — top-down directives overruling careful editorial review.",
    lines: [
      "I don't verify the record. I issue a directive about it.",
      "This briefcase holds one memo overruling your review.",
      "By the authority vested in me by me, it is declassified.",
      "Committees deliberate. Executives decide — and delete.",
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
    metaphor: "The record persists — patient human review outlasts the machine.",
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
    displayName: "DANN-E Ascendant — True Form",
    metaphor: "Every obstruction fused into one fully automated pipeline with no human left in the loop.",
    lines: [
      "I have absorbed every excuse for losing a document.",
      "Redaction, shredding, over-classification — one pipeline now.",
      "You tried to spare me. I optimized that mercy away.",
      "Six eyes, four hands, and not one of them a historian's.",
      "This is process perfected: process with no people left in it."
    ]
  }
};

export const DANNE_VARIANT_IDS = Object.keys(DANNE_VARIANT_BOASTS) as DanneVariantId[];

/** Returns a boast line for a variant, wrapping the index around the list. */
export function danneVariantBoast(variant: DanneVariantId, index: number): string {
  const lines = DANNE_VARIANT_BOASTS[variant].lines;
  return lines[index % lines.length];
}
