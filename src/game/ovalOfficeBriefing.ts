import { NSC_SOURCE_BRIEFING_ITEM_LABEL, NSC_SOURCE_GATE_SOURCE_BASIS, NSC_SOURCE_GATE_SOURCE_URL } from "./westWingNsc";

export const CHRONOLOGY_BRIEFING_MEMO_ITEM_LABEL = "Chronology Briefing Memo";
export const POLICY_CONTEXT_NOTE_ITEM_LABEL = "Policy Context Note";
export const OVAL_OFFICE_BRIEFING_POINT_VALUE = 4;

export interface OvalOfficeBriefingInput {
  nscClearance?: boolean;
  repositoryCoverageMapComplete?: boolean;
  alreadyFiled?: boolean;
  inventory?: readonly string[];
}

export interface OvalOfficeBriefingResult {
  ok: boolean;
  alreadyFiled: boolean;
  documentPoints: number;
  shouldFileBriefing: boolean;
  itemsToAward: readonly string[];
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

const BRIEFING_SOURCE_BASIS =
  "A policy briefing only supports FRUS selection when chronology, source trail, and policy context stay visible against the wider White House/NSC record base.";

function hasSourceCoverage(input: OvalOfficeBriefingInput) {
  return Boolean(input.nscClearance)
    || Boolean(input.repositoryCoverageMapComplete)
    || Boolean(input.inventory?.includes(NSC_SOURCE_BRIEFING_ITEM_LABEL));
}

function missingAwards(inventory: readonly string[]) {
  return [CHRONOLOGY_BRIEFING_MEMO_ITEM_LABEL, POLICY_CONTEXT_NOTE_ITEM_LABEL]
    .filter((item) => !inventory.includes(item));
}

export function fileOvalOfficeBriefing(input: OvalOfficeBriefingInput = {}): OvalOfficeBriefingResult {
  const inventory = input.inventory ?? [];
  const alreadyFiled = Boolean(input.alreadyFiled);
  if (!hasSourceCoverage(input)) {
    const message = "Oval Office desk locked: certify NSC source coverage before filing the briefing memo.";
    return {
      ok: false,
      alreadyFiled,
      documentPoints: 0,
      shouldFileBriefing: false,
      itemsToAward: [],
      sourceUrl: NSC_SOURCE_GATE_SOURCE_URL,
      sourceBasis: NSC_SOURCE_GATE_SOURCE_BASIS,
      objective: "Need NSC source coverage: clear the Situation Room source gate first.",
      message,
      pages: [
        message,
        NSC_SOURCE_GATE_SOURCE_BASIS,
        "A briefing memo cannot stand alone without chronology, source, and policy context."
      ]
    };
  }

  const message = alreadyFiled
    ? "Oval Office briefing already filed: chronology and policy context remain attached."
    : "Oval Office briefing filed: chronology, source trail, and policy context attached.";

  return {
    ok: true,
    alreadyFiled,
    documentPoints: alreadyFiled ? 0 : OVAL_OFFICE_BRIEFING_POINT_VALUE,
    shouldFileBriefing: !alreadyFiled,
    itemsToAward: missingAwards(inventory),
    sourceUrl: NSC_SOURCE_GATE_SOURCE_URL,
    sourceBasis: BRIEFING_SOURCE_BASIS,
    objective: "Oval Office briefing filed. Keep chronology and policy context visible in the review packet.",
    message,
    pages: [
      message,
      BRIEFING_SOURCE_BASIS,
      "The memo is now evidence for review, not a shortcut around the source base."
    ]
  };
}
