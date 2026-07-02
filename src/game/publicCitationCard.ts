import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type PublicCitationCardPromptId =
  | "document_number"
  | "citation_components"
  | "canonical_url"
  | "legacy_digitized";

export interface PublicCitationCardPrompt {
  id: PublicCitationCardPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface PublicCitationCardEvaluation {
  ok: boolean;
  prompt: PublicCitationCardPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const PUBLIC_CITATION_CARD_SOURCE_URL = "https://history.state.gov/historicaldocuments/citing-frus";

export const PUBLIC_CITATION_CARD_PROMPTS = [
  {
    id: "document_number",
    question: "PUBLIC CITATION CARD: WHAT IS THE STABLE DOCUMENT LOCATOR?",
    options: [
      { key: "A", label: "Document number", value: "document_number" },
      { key: "B", label: "Page guess from the current screen", value: "page_guess" },
      { key: "C", label: "DANN-E paragraph hash", value: "machine_hash" }
    ],
    correctValue: "document_number",
    sourceBasis: "The citing guide says document numbers are media neutral and remain consistent across print, web, and eBook.",
    successMessage: "Citation locator filed: document numbers remain stable across formats.",
    failureMessage: "The public citation card needs a stable document number, not a page guess or machine hash."
  },
  {
    id: "citation_components",
    question: "PUBLIC CITATION CARD: WHICH COMPONENTS MUST BE PRESENT?",
    options: [
      { key: "A", label: "Series, subseries, volume, editors, GPO, year, document", value: "full_components" },
      { key: "B", label: "Only the short title and a confidence score", value: "confidence_only" },
      { key: "C", label: "General Editor as the only editor", value: "general_editor_only" }
    ],
    correctValue: "full_components",
    sourceBasis: "The citing guide breaks sample citations into series title, subseries, volume number and title, editors, city, publisher, year, and location in the volume.",
    successMessage: "Citation components assembled: readers can reconstruct the exact FRUS source.",
    failureMessage: "A short title, confidence score, or collapsed editor credit is not enough for a FRUS citation."
  },
  {
    id: "canonical_url",
    question: "PUBLIC CITATION CARD: WHAT URL SHOULD WEB/EBOOK CITATIONS CARRY?",
    options: [
      { key: "A", label: "Canonical history.state.gov document URL", value: "canonical_url" },
      { key: "B", label: "Temporary tracking redirect", value: "tracking_redirect" },
      { key: "C", label: "Screenshot filename from the proof table", value: "screenshot_file" }
    ],
    correctValue: "canonical_url",
    sourceBasis: "The citing guide recommends appending the canonical URL for a volume or document, using the history.state.gov domain, historicaldocuments section, volume identifier, and document identifier.",
    successMessage: "Canonical URL set: readers can reach the public document directly.",
    failureMessage: "A public citation needs the canonical history.state.gov URL, not a redirect or screenshot filename."
  },
  {
    id: "legacy_digitized",
    question: "PUBLIC CITATION CARD: HOW DO EARLIER DIGITIZED VOLUMES NEED HANDLING?",
    options: [
      { key: "A", label: "Warn that print readers may need page citations", value: "print_caution" },
      { key: "B", label: "Pretend old print volumes had document numbers", value: "pretend_numbered" },
      { key: "C", label: "Hide legacy citation differences", value: "hide_legacy" }
    ],
    correctValue: "print_caution",
    sourceBasis: "The citing guide says document numbers were superimposed on digitized earlier volumes, but cautions that print readers will not be able to locate those citations by document number.",
    successMessage: "Legacy citation caution filed: web/eBook links and print-page citations stay honest.",
    failureMessage: "Legacy FRUS citation differences must remain visible to readers."
  }
] as const satisfies readonly PublicCitationCardPrompt[];

export function getPublicCitationCardPrompt(step: number) {
  return PUBLIC_CITATION_CARD_PROMPTS[Math.max(0, Math.min(PUBLIC_CITATION_CARD_PROMPTS.length - 1, step))];
}

export function publicCitationCardComplete(step: number) {
  return step >= PUBLIC_CITATION_CARD_PROMPTS.length;
}

export function evaluatePublicCitationCardAnswer(
  promptId: PublicCitationCardPromptId,
  value?: string
): PublicCitationCardEvaluation {
  const prompt = PUBLIC_CITATION_CARD_PROMPTS.find((candidate) => candidate.id === promptId) ?? PUBLIC_CITATION_CARD_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "confidence_only" || value === "hide_legacy") violation = "omitted_material_fact";
    else if (value === "pretend_numbered" || value === "general_editor_only") violation = "concealed_policy_defect";
    else violation = "altered_text";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
