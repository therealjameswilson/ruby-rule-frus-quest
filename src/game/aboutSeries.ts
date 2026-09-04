export const ABOUT_SERIES_SOURCE = {
  url: "https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries",
  title: "About the Series",
  volume: "1989-1992, Volume XXXI",
  topic: "START I, 1989-1991"
} as const;

export const ABOUT_SERIES_RULES = {
  evidence: "Keep decisive facts and policy defects visible.",
  coverage: "Consult relevant agency and presidential records; document access gaps.",
  text: "Preserve original text. Obvious typos may be silently corrected; other corrections need brackets.",
  chronology: "Order conversations by when they occurred, using Washington time, not the memo's drafting date.",
  withholding: "Retain a fully withheld document's chronological entry, heading, source note, and page count.",
  access: "Released excerpts do not make their still-classified source documents wholly public.",
  review: "Release review under E.O. 13526 requires appropriate bureau, agency, and foreign-government concurrence.",
  index: "Index references point to document numbers, not page numbers.",
  deadline: "Publication is required within 30 years of the recorded events."
} as const;

export type AboutSeriesRuleId = keyof typeof ABOUT_SERIES_RULES;

export type IndexReferenceTarget = "page" | "document";

export interface IndexReferenceResult {
  ok: boolean;
  message: string;
}

export function evaluateIndexReferenceTarget(target: IndexReferenceTarget): IndexReferenceResult {
  return target === "document"
    ? { ok: true, message: "INDEX ENTRY 87 -> DOCUMENT 87" }
    : { ok: false, message: "PAGES MOVE - ROUTE TO DOCUMENT" };
}
