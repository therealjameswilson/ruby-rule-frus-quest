import { HAC_HEARING_PROMPTS, HAC_HEARING_SOURCE_URL } from "./hacHearing";
import { TREATY_FRAGMENT_LABELS } from "./danneItemCatalog";

export const HAC_PROCESS_DOCKET_ITEM_LABEL = "HAC Process Docket";
export const HAC_ANNUAL_FINDINGS_ITEM_LABEL = "HAC Annual Findings";
export const HAC_THIRTY_YEAR_SAMPLE_ITEM_LABEL = "30-Year Classified Sample";
export const HAC_PACKET_POINT_VALUE = 6;
export const HAC_CLOSED_SESSION_POINT_VALUE = 4;

export interface CapitolHacPacketInput {
  alreadyFiled?: boolean;
  inventory?: readonly string[];
  currentStep?: number;
}

export interface CapitolHacPacketResult {
  alreadyFiled: boolean;
  documentPoints: number;
  nextStep: number;
  shouldCompleteHearing: boolean;
  treatyFragmentIndex: number;
  itemsToAward: readonly string[];
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

export interface ClosedSessionSampleInput {
  hacReviewComplete?: boolean;
  alreadyFiled?: boolean;
  inventory?: readonly string[];
}

export interface ClosedSessionSampleResult {
  ok: boolean;
  alreadyFiled: boolean;
  documentPoints: number;
  shouldFileSample: boolean;
  itemsToAward: readonly string[];
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

const PROCESS_SOURCE_BASIS =
  "HAC monitors FRUS compilation, editing, preparation, and declassification work, including procedures, guidelines, and the state of the series.";

const THIRTY_YEAR_SAMPLE_SOURCE_BASIS =
  "HAC may review random samples of documents remaining classified after 30 years and reports annually with findings and recommendations.";

function missingAwards(inventory: readonly string[], awards: readonly string[]) {
  return awards.filter((award) => !inventory.includes(award));
}

export function fileCapitolHacPacket(input: CapitolHacPacketInput = {}): CapitolHacPacketResult {
  const inventory = input.inventory ?? [];
  const alreadyFiled = Boolean(input.alreadyFiled);
  const itemsToAward = missingAwards(inventory, [
    HAC_PROCESS_DOCKET_ITEM_LABEL,
    HAC_ANNUAL_FINDINGS_ITEM_LABEL
  ]);
  const nextStep = Math.max(input.currentStep ?? 0, HAC_HEARING_PROMPTS.length);
  const message = alreadyFiled
    ? "HAC process docket already filed: annual findings and 30-year sampling remain visible."
    : "HAC process docket filed: oversight scope, annual findings, and 30-year sampling entered.";

  return {
    alreadyFiled,
    documentPoints: alreadyFiled ? 0 : HAC_PACKET_POINT_VALUE,
    nextStep,
    shouldCompleteHearing: !alreadyFiled,
    treatyFragmentIndex: 1,
    itemsToAward,
    sourceUrl: HAC_HEARING_SOURCE_URL,
    sourceBasis: `${PROCESS_SOURCE_BASIS} ${THIRTY_YEAR_SAMPLE_SOURCE_BASIS}`,
    objective: "HAC docket filed. Inspect the closed-session vault for the 30-year sample packet.",
    message,
    pages: [
      message,
      PROCESS_SOURCE_BASIS,
      THIRTY_YEAR_SAMPLE_SOURCE_BASIS,
      `${TREATY_FRAGMENT_LABELS[1]} is tied to the hearing record, not a shortcut.`
    ]
  };
}

export function inspectClosedSessionSample(input: ClosedSessionSampleInput = {}): ClosedSessionSampleResult {
  const inventory = input.inventory ?? [];
  const alreadyFiled = Boolean(input.alreadyFiled);
  if (!input.hacReviewComplete) {
    const message = "Closed-session vault locked: file the HAC process docket at the witness table first.";
    return {
      ok: false,
      alreadyFiled,
      documentPoints: 0,
      shouldFileSample: false,
      itemsToAward: [],
      sourceUrl: HAC_HEARING_SOURCE_URL,
      sourceBasis: THIRTY_YEAR_SAMPLE_SOURCE_BASIS,
      objective: "Need HAC docket: answer the witness-table process review before sampling still-classified records.",
      message,
      pages: [
        message,
        THIRTY_YEAR_SAMPLE_SOURCE_BASIS,
        "The sample is evidence for oversight, not a hidden publication shortcut."
      ]
    };
  }

  const itemsToAward = missingAwards(inventory, [HAC_THIRTY_YEAR_SAMPLE_ITEM_LABEL]);
  const message = alreadyFiled
    ? "Closed-session sample already filed: the 30-year classified-record check remains visible."
    : "Closed-session sample filed: 30-year classified records checked for the HAC docket.";

  return {
    ok: true,
    alreadyFiled,
    documentPoints: alreadyFiled ? 0 : HAC_CLOSED_SESSION_POINT_VALUE,
    shouldFileSample: !alreadyFiled,
    itemsToAward,
    sourceUrl: HAC_HEARING_SOURCE_URL,
    sourceBasis: THIRTY_YEAR_SAMPLE_SOURCE_BASIS,
    objective: "30-year sample filed. Keep annual findings visible in the FRUS production board.",
    message,
    pages: [
      message,
      THIRTY_YEAR_SAMPLE_SOURCE_BASIS,
      "The closed-session packet strengthens review without hiding agency declassification limits."
    ]
  };
}
