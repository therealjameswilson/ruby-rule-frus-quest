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

export const ABOUT_SERIES_FIRST_FOOTNOTE_FIELDS = [
  "source",
  "original classification",
  "distribution",
  "drafting information",
  "policy background",
  "reader evidence"
] as const;

export const ABOUT_SERIES_FIRST_FOOTNOTE_RULE =
  "Keep source, original classification, distribution, drafting, policy background, and evidence of who read it.";

export const ABOUT_SERIES_VOLUME_REVIEW = {
  authority: "Executive Order 13526",
  startedYear: 2017,
  completedYear: 2024,
  withheldInFull: 1,
  paragraphOrMoreExcisions: 7,
  minorExcisions: 26
} as const;

// Short sections are paginated by the field guide without shrinking its 8px face.
export const ABOUT_SERIES_HANDBOOK_PAGES = [
  { title: "YOUR ASSIGNMENT", text: "Document major foreign-policy decisions and diplomacy. Office historians work under the General Editor." },
  { title: "KEEP THE EVIDENCE", text: "Keep material decision facts, even evidence of policy defects. Select for accuracy and historical objectivity." },
  { title: "TRACE THE RECORD", text: "Seek relevant agency and presidential records. A released excerpt may come from a still-classified document." },
  { title: "FIRST FOOTNOTE", text: ABOUT_SERIES_FIRST_FOOTNOTE_RULE },
  { title: "WHO READ IT?", text: "The first footnote notes whether the President or major policy advisers read it. Trace that evidence; do not guess." },
  { title: "PRESERVE THE TEXT", text: "Retain original text and marginalia. Obvious typos may be fixed silently; other corrections require brackets." },
  { title: "VISIBLE OMISSIONS", text: "Bracket omissions and record their extent. Unrelated text uses roman type; classified text uses italic type." },
  { title: "WITHHELD IN FULL", text: "Keep the chronological entry, heading, source note, and withheld page count even when the whole document is withheld." },
  { title: "ORDER AND INDEX", text: "Use Washington time and the conversation date, not the drafting date. Index by document numbers, not page numbers." },
  { title: "RELEASE REVIEW", text: "This volume used E.O. 13526. Seek bureau and agency concurrence, and foreign-government concurrence for their records." },
  { title: "THIS VOLUME ONLY", text: "START I review, 2017-2024: 1 document withheld; 7 with paragraph-plus cuts; 26 with smaller cuts. Not game quotas." },
  { title: "PUBLICATION", text: "The statute requires publication within 30 years of events. The game's clock compresses that duty into a challenge." },
  { title: "OVERSIGHT", text: "The Historical Advisory Committee monitors and advises on the series. It does not necessarily review each volume." }
] as const;

export const ABOUT_SERIES_HANDBOOK_LORE =
  "Preserve original text; index by document numbers; publish within 30 years. Read the handbook or open its official source.";

export function getAboutSeriesGameplayReadout(progress: Readonly<Record<string, number>>) {
  const complete = progress.aboutSeriesFirstFootnoteComplete === 1;
  return {
    source: { ...ABOUT_SERIES_SOURCE },
    firstFootnote: {
      complete,
      status: complete ? "verified" : progress.sourceNoteProvenanceComplete ? "legacy-credit" : "pending",
      fields: [...ABOUT_SERIES_FIRST_FOOTNOTE_FIELDS],
      rule: ABOUT_SERIES_FIRST_FOOTNOTE_RULE
    },
    declassificationReview: { ...ABOUT_SERIES_VOLUME_REVIEW }
  };
}

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
