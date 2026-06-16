import type { ProcessStampId } from "./constants";
import type { DocumentCandidate } from "./types";
import { compilationIsComplete, crystalsEarned, PENDANTS, totalEquities } from "./frusProgression";

export const TRUE_ENDING_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";
export const TRUE_ENDING_STAGES_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";
export const TRUE_ENDING_TREATY_FRAGMENTS_REQUIRED = 3;

export interface TrueEndingCertificateInput {
  processStamps: readonly ProcessStampId[];
  documentCandidates: readonly DocumentCandidate[];
  volumeFragments: readonly string[];
  reliability: number;
  documentPoints: number;
  treatyFragmentsCollected: number;
  publicationBoardCompleted: number;
  publicationBoardTotal: number;
  publicationApparatusCompleted: number;
  publicationApparatusTotal: number;
  buckramGateOpen: boolean;
  standardsClear: boolean;
}

export interface TrueEndingCertificateLine {
  label: string;
  value: string;
  complete: boolean;
}

export interface TrueEndingCertificate {
  title: string;
  subtitle: string;
  sourceUrl: string;
  stagesSourceUrl: string;
  complete: boolean;
  checklist: TrueEndingCertificateLine[];
  summaryLines: string[];
  footer: string;
}

function ratioLine(label: string, current: number, total: number, complete = current >= total): TrueEndingCertificateLine {
  return {
    label,
    value: `${Math.min(current, total)}/${total}`,
    complete
  };
}

export function buildTrueEndingCertificate(input: TrueEndingCertificateInput): TrueEndingCertificate {
  const pendantsComplete = compilationIsComplete(input.processStamps);
  const equityTotal = totalEquities(input.documentCandidates);
  const equityCrystals = crystalsEarned(input.documentCandidates);
  const crystalsComplete = equityTotal > 0 && equityCrystals === equityTotal;
  const treatyComplete = input.treatyFragmentsCollected >= TRUE_ENDING_TREATY_FRAGMENTS_REQUIRED;
  const apparatusComplete = input.publicationApparatusTotal > 0
    && input.publicationApparatusCompleted >= input.publicationApparatusTotal;
  const boardComplete = input.publicationBoardTotal > 0
    && input.publicationBoardCompleted >= input.publicationBoardTotal - 1;
  const reliabilityComplete = input.reliability >= 70;
  const fragmentsComplete = input.volumeFragments.length >= 5;
  const complete = pendantsComplete
    && crystalsComplete
    && treatyComplete
    && apparatusComplete
    && boardComplete
    && reliabilityComplete
    && fragmentsComplete
    && input.buckramGateOpen
    && input.standardsClear;

  const checklist: TrueEndingCertificateLine[] = [
    ratioLine("PENDANTS", PENDANTS.filter((pendant) => input.processStamps.includes(pendant.stampId)).length, PENDANTS.length, pendantsComplete),
    ratioLine("EQUITY CRYSTALS", equityCrystals, Math.max(1, equityTotal), crystalsComplete),
    ratioLine("COVER FRAGMENTS", input.volumeFragments.length, 5, fragmentsComplete),
    ratioLine("TREATY RECORD", input.treatyFragmentsCollected, TRUE_ENDING_TREATY_FRAGMENTS_REQUIRED, treatyComplete),
    ratioLine("APPARATUS", input.publicationApparatusCompleted, input.publicationApparatusTotal, apparatusComplete),
    ratioLine("PRODUCTION BOARD", input.publicationBoardCompleted, input.publicationBoardTotal, boardComplete),
    { label: "RELIABILITY", value: `${input.reliability}/100`, complete: reliabilityComplete },
    { label: "KELLOGG STANDARDS", value: input.standardsClear ? "CLEAR" : "OPEN", complete: input.standardsClear }
  ];

  return {
    title: complete ? "FRUS VOLUME CERTIFIED" : "FRUS VOLUME REVIEWED",
    subtitle: "Foreign Relations of the United States",
    sourceUrl: TRUE_ENDING_SOURCE_URL,
    stagesSourceUrl: TRUE_ENDING_STAGES_SOURCE_URL,
    complete,
    checklist,
    summaryLines: complete
      ? [
          "The complete treaty record survived DANN-E's queue.",
          "Human review preserved provenance, declassification judgment, and publication standards.",
          "The ruby buckram volume can enter the public record."
        ]
      : [
          "The record survived, but the certification packet still shows open work.",
          "Return to the board and close every visible process gate before publication.",
          "No shortcut may replace a certified documentary record."
        ],
    footer: complete
      ? "Published with visible deletions, complete apparatus, and no concealed defects."
      : "Certification withheld until every FRUS production gate is visible and complete."
  };
}
