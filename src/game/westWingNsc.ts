import { NARA_CATALOG_ITEM_LABEL } from "./naraCatalog";

export const NSC_SOURCE_GATE_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";
export const NSC_SOURCE_BRIEFING_ITEM_LABEL = "NSC Source Briefing";
export const NSC_SOURCE_GATE_POINT_VALUE = 5;

export interface WestWingNscGateInput {
  alreadyCleared?: boolean;
  inventory?: readonly string[];
  repositoryCoverageMapComplete?: boolean;
}

export interface WestWingNscGateResult {
  ok: boolean;
  alreadyCleared: boolean;
  documentPoints: number;
  shouldClearGate: boolean;
  itemsToAward: readonly string[];
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

export const NSC_SOURCE_GATE_SOURCE_BASIS =
  "The About FRUS page identifies White House, National Security Council, State Department, Defense Department, CIA, other agency, private, and published records as part of the series source base.";

function hasSourceCoverage(input: WestWingNscGateInput) {
  return Boolean(input.repositoryCoverageMapComplete)
    || Boolean(input.inventory?.includes(NARA_CATALOG_ITEM_LABEL));
}

function missingInventoryAwards(inventory: readonly string[]) {
  return inventory.includes(NSC_SOURCE_BRIEFING_ITEM_LABEL) ? [] : [NSC_SOURCE_BRIEFING_ITEM_LABEL];
}

export function checkWestWingNscGate(input: WestWingNscGateInput = {}): WestWingNscGateResult {
  const inventory = input.inventory ?? [];
  const alreadyCleared = Boolean(input.alreadyCleared);
  if (!hasSourceCoverage(input)) {
    const message = "Situation Room locked: file a source index or repository coverage map first.";
    return {
      ok: false,
      alreadyCleared,
      documentPoints: 0,
      shouldClearGate: false,
      itemsToAward: [],
      sourceUrl: NSC_SOURCE_GATE_SOURCE_URL,
      sourceBasis: NSC_SOURCE_GATE_SOURCE_BASIS,
      objective: "Need source coverage: file the NARA Source Index or repository map before NSC records.",
      message,
      pages: [
        message,
        NSC_SOURCE_GATE_SOURCE_BASIS,
        "The Situation Room opens after the source trail proves White House and NSC records are being checked against the wider documentary record."
      ]
    };
  }

  const itemsToAward = missingInventoryAwards(inventory);
  const message = alreadyCleared
    ? "Situation Room source coverage already certified."
    : "Situation Room opened: White House and NSC source coverage certified.";

  return {
    ok: true,
    alreadyCleared,
    documentPoints: alreadyCleared ? 0 : NSC_SOURCE_GATE_POINT_VALUE,
    shouldClearGate: !alreadyCleared,
    itemsToAward,
    sourceUrl: NSC_SOURCE_GATE_SOURCE_URL,
    sourceBasis: NSC_SOURCE_GATE_SOURCE_BASIS,
    objective: "NSC source coverage certified. Compare briefing claims against the wider record.",
    message,
    pages: [
      message,
      NSC_SOURCE_GATE_SOURCE_BASIS,
      "Proceed with source coverage visible: NSC briefing notes are not a substitute for the full FRUS source base."
    ]
  };
}
