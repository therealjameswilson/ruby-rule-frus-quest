import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type DigitalReleasePromptId =
  | "ebook_citation"
  | "tei_master"
  | "ebook_catalog";

export interface DigitalReleasePrompt {
  id: DigitalReleasePromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface DigitalReleaseEvaluation {
  ok: boolean;
  prompt: DigitalReleasePrompt;
  message: string;
  violation: StandardViolation | null;
}

export const DIGITAL_RELEASE_SOURCE_URL = "https://history.state.gov/historicaldocuments/ebooks";
export const DIGITAL_RELEASE_DEVELOPER_SOURCE_URL = "https://history.state.gov/developer";

export const DIGITAL_RELEASE_PROMPTS = [
  {
    id: "ebook_citation",
    question: "DIGITAL RELEASE: HOW SHOULD WEB/EBOOK READERS CITE DOCUMENTS?",
    options: [
      { key: "A", label: "Use persistent document numbers", value: "document_numbers" },
      { key: "B", label: "Use unstable page-screen guesses", value: "page_guesses" },
      { key: "C", label: "Use StateChat paragraph hashes", value: "machine_hashes" }
    ],
    correctValue: "document_numbers",
    sourceBasis: "The FRUS eBooks guidance says to use document numbers rather than page numbers because document numbers are persistent, media-neutral identifiers.",
    successMessage: "Digital citation keyed: document numbers survive print, web, and eBook forms.",
    failureMessage: "The public release needs stable document-number citations, not page guesses or machine hashes."
  },
  {
    id: "tei_master",
    question: "DIGITAL RELEASE: WHAT FILE BECOMES THE PUBLIC DIGITAL MASTER?",
    options: [
      { key: "A", label: "A TEI-encoded volume master", value: "tei_master" },
      { key: "B", label: "Screenshots of the printed pages", value: "page_screenshots" },
      { key: "C", label: "A DANN-E summary bundle", value: "summary_bundle" }
    ],
    correctValue: "tei_master",
    sourceBasis: "The developer page says article- and book-length content is encoded as TEI, and a single digital master TEI file can store an entire FRUS volume.",
    successMessage: "TEI master filed: the public volume can transform cleanly to HTML and eBook forms.",
    failureMessage: "The digital edition cannot be replaced by screenshots or a summary bundle."
  },
  {
    id: "ebook_catalog",
    question: "DIGITAL RELEASE: HOW SHOULD EBOOK DISCOVERY BE EXPOSED?",
    options: [
      { key: "A", label: "Queue OPDS catalog and eBook forms", value: "opds_catalog" },
      { key: "B", label: "Hide the volume until warehouses ship", value: "hide_until_ship" },
      { key: "C", label: "Publish a private terminal copy only", value: "private_terminal" }
    ],
    correctValue: "opds_catalog",
    sourceBasis: "The developer page says the ebook catalog API uses the Open Publication Distribution System, an Atom XML-based standard for ebook catalogs.",
    successMessage: "EBook catalog queued: the public record can be discovered beyond the shelf.",
    failureMessage: "The public digital edition needs a cataloged release path, not a hidden or private copy."
  }
] as const satisfies readonly DigitalReleasePrompt[];

export function getDigitalReleasePrompt(step: number) {
  return DIGITAL_RELEASE_PROMPTS[Math.max(0, Math.min(DIGITAL_RELEASE_PROMPTS.length - 1, step))];
}

export function digitalReleaseComplete(step: number) {
  return step >= DIGITAL_RELEASE_PROMPTS.length;
}

export function evaluateDigitalReleaseAnswer(
  promptId: DigitalReleasePromptId,
  value?: string
): DigitalReleaseEvaluation {
  const prompt = DIGITAL_RELEASE_PROMPTS.find((candidate) => candidate.id === promptId) ?? DIGITAL_RELEASE_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "page_guesses" || value === "page_screenshots") violation = "altered_text";
    else if (value === "hide_until_ship" || value === "private_terminal") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
