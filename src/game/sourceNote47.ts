import type { DocumentCandidate, FirstFootnoteMetadata } from "./types";

export const SOURCE_NOTE_47_ID = "source_note_047";
export const SOURCE_NOTE_47_TITLE = "SOURCE NOTE 47 / HUMAN REVIEW";

// These are the authored A1 clues, not a locator for a real historical record.
export const SOURCE_NOTE_47_LOCATOR = {
  repository: "Fictional National Archives Collection",
  collection: "Office Files of the Policy Planning Staff",
  folder: "Alliance Consultation"
} as const;

export const SOURCE_NOTE_47_METADATA: Readonly<FirstFootnoteMetadata> = {
  originalClassification: null,
  distribution: null,
  draftingInformation: null,
  policyBackground: "Alliance consultation (folder title only; fictional training record).",
  readership: null
};

const WORKSHEET_PLACEHOLDERS = {
  repository: "",
  collection: "Compiler source-note worksheet",
  folder: "Repository missing until research table verification"
} as const;

export function sourceNote47ReviewEarned(progress: Readonly<Record<string, number>>) {
  return progress.archiveSourceNoteCollected === 1
    && progress.archiveSourceNoteRouted === 1
    && progress.sourceNoteProvenanceStep === 3
    && progress.sourceNoteProvenanceComplete === 1
    && progress.aboutSeriesFirstFootnoteComplete === 1;
}

export function restoreSourceNote47(document: DocumentCandidate, progress: Readonly<Record<string, number>>): DocumentCandidate {
  if (document.id !== SOURCE_NOTE_47_ID || !sourceNote47ReviewEarned(progress)) return document;
  const fields = ["repository", "collection", "folder"] as const;
  if (fields.some(field => document[field].trim()
    && document[field] !== SOURCE_NOTE_47_LOCATOR[field]
    && document[field] !== WORKSHEET_PLACEHOLDERS[field])) return document;
  // Repair only absent data and the exact old worksheet placeholders. Never
  // splice this training trail into an edited locator or infer review from tools.
  return {
    ...document,
    repository: document.repository.trim() ? document.repository : SOURCE_NOTE_47_LOCATOR.repository,
    collection: !document.collection.trim() || document.collection === WORKSHEET_PLACEHOLDERS.collection
      ? SOURCE_NOTE_47_LOCATOR.collection : document.collection,
    folder: !document.folder.trim() || document.folder === WORKSHEET_PLACEHOLDERS.folder
      ? SOURCE_NOTE_47_LOCATOR.folder : document.folder,
    firstFootnote: document.firstFootnote ? { ...document.firstFootnote } : { ...SOURCE_NOTE_47_METADATA }
  };
}

export function sourceNote47Pages(document: DocumentCandidate) {
  const metadata = document.firstFootnote;
  const field = (value: string | null | undefined) => value?.trim() || "Not recorded in the surviving training packet.";
  return [
    `FICTIONAL TRAINING RECORD\n${document.repository || "Repository not yet traced."}`,
    `COLLECTION\n${document.collection}\nFOLDER\n${document.folder}`,
    `ORIGINAL CLASSIFICATION\n${field(metadata?.originalClassification)}\nThis is not release approval.`,
    `DISTRIBUTION\n${field(metadata?.distribution)}`,
    `DRAFTING\n${field(metadata?.draftingInformation)}`,
    `POLICY BACKGROUND\n${field(metadata?.policyBackground)}`,
    `WHO READ IT?\n${field(metadata?.readership)}\nNo evidence does not prove that someone did not read it.`
  ];
}
