// Fictional practice records, not documents from the cited START I volume.
export const CROSS_REFERENCE_TITLE = "OPENNET / CROSS-REFERENCE";
export const CROSS_REFERENCE_TARGET = "BERLIN MEMCON / 10 JAN";
export const CROSS_REFERENCE_CATALOG = [
  { number: 17, label: "BERLIN CABLE", date: "10 JAN", hint: "RIGHT DATE; WRONG RECORD TYPE" },
  { number: 18, label: "BERLIN MEMCON", date: "10 JAN", hint: "CROSS-REFERENCE MATCHED" },
  { number: 19, label: "BERLIN MEMCON", date: "12 JAN", hint: "RIGHT TYPE; WRONG CONVERSATION" }
] as const;

export function restoreCrossReferenceDraft(value: number | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= CROSS_REFERENCE_CATALOG.length ? value : 0;
}

export function crossReferenceMatches(value: number): boolean {
  const entry = CROSS_REFERENCE_CATALOG[restoreCrossReferenceDraft(value) - 1];
  return entry !== undefined && `${entry.label} / ${entry.date}` === CROSS_REFERENCE_TARGET;
}
