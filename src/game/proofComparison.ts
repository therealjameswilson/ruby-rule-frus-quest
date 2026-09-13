import { ABOUT_SERIES_SOURCE } from "./aboutSeries";

export const PROOF_COMPARISON_TITLE = "Compare the training proof";
export const PROOF_COMPARISON_SOURCE = ABOUT_SERIES_SOURCE.url;
export const PROOF_TOKENS = [
  { original: "Secto 214", draft: "214", repairBit: 1, x: 26, y: 114, width: 96 },
  { original: "We", draft: "We", repairBit: 0, x: 26, y: 148, width: 36 },
  { original: "may", draft: "will", repairBit: 2, x: 68, y: 148, width: 48 },
  { original: "agree.", draft: "agree.", repairBit: 0, x: 122, y: 148, width: 66 }
] as const;

export function restoreProofRepairs(value?: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0;
}

export function proofTokenText(index: number, repairs: number) {
  const token = PROOF_TOKENS[index];
  if (!token) return "";
  return token.repairBit && !(restoreProofRepairs(repairs) & token.repairBit) ? token.draft : token.original;
}

export function repairProofToken(repairs: number, index: number) {
  return restoreProofRepairs(repairs) | (PROOF_TOKENS[index]?.repairBit ?? 0);
}

export function proofMatchesOriginal(repairs: number) {
  return PROOF_TOKENS.every((token, index) => proofTokenText(index, repairs) === token.original);
}

export function remainingProofRepairs(repairs: number) {
  return PROOF_TOKENS.filter((token, index) => proofTokenText(index, repairs) !== token.original).length;
}
