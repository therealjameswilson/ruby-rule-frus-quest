import type { ChoiceOption } from "./types";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { readAnnotationPacket } from "./annotationPacket";
import { awardProcessStamp, gameState, hasProcessItem, refreshQuestWorkflowState } from "./state";

export type ArchiveResearchReviewId = "standards" | "coverage";

interface ArchiveResearchReview {
  sourceUrl: string;
  question: string;
  context: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  successMessage: string;
  failureMessage: string;
}

export const ARCHIVE_RESEARCH_REVIEWS = {
  standards: {
    sourceUrl: ABOUT_SERIES_SOURCE.url,
    question: "A cited cable exposes a policy mistake. Keep it?",
    context: "The record must not hide policy defects.",
    options: [
      { key: "A", label: "Keep the evidence; explain it", value: "retain" },
      { key: "B", label: "Omit the embarrassing passage", value: "omit" }
    ],
    correctValue: "retain",
    successMessage: "STANDARDS SEAL EARNED",
    failureMessage: "Keep material facts, including policy mistakes. Try again."
  },
  coverage: {
    sourceUrl: ABOUT_SERIES_SOURCE.url,
    question: "One folder is verified. What goes on the source map?",
    context: "A source note identifies a document, not the whole record.",
    options: [
      { key: "A", label: "Only this verified folder", value: "single_folder" },
      { key: "B", label: "Relevant repositories + access gaps", value: "coverage" }
    ],
    correctValue: "coverage",
    successMessage: "REPOSITORY MAP FILED",
    failureMessage: "Map the other relevant repositories and access gaps. Try again."
  }
} as const satisfies Record<ArchiveResearchReviewId, ArchiveResearchReview>;

export function nextArchiveResearchReview(): ArchiveResearchReviewId | null {
  if (!gameState.processStamps.includes("rule")) return "standards";
  if (!gameState.sceneProgress.repositoryCoverageMapComplete) return "coverage";
  return null;
}

export function recordArchiveResearchReview(id: ArchiveResearchReviewId, value?: string) {
  const review = ARCHIVE_RESEARCH_REVIEWS[id];
  if (!hasProcessItem("citation_stamp") || !gameState.sceneProgress.sourceNoteProvenanceComplete) {
    return { ok: false, message: "Verify the repository, collection, and folder first." };
  }
  const packet = readAnnotationPacket(gameState.sceneProgress);
  if (id === "coverage" && !packet.ready && !packet.complete) {
    return { ok: false, message: "Gather the source, context, and selection notes first." };
  }
  if (value !== review.correctValue) return { ok: false, message: review.failureMessage };

  if (id === "standards") {
    gameState.sceneProgress.archiveStandardsReviewComplete = 1;
    awardProcessStamp("rule");
  } else {
    gameState.sceneProgress.archiveCoverageReviewComplete = 1;
    gameState.sceneProgress.repositoryCoverageMapComplete = 1;
  }
  // These two decisions do not silently complete the optional Office curricula.
  refreshQuestWorkflowState();
  return { ok: true, message: review.successMessage };
}
