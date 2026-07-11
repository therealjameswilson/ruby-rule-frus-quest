import { describe, expect, it } from "vitest";
import { cloneDocumentCandidate, INITIAL_DOCUMENT_CANDIDATES } from "./documentWorkflow";
import {
  getResearchCoverageReadout,
  researchCoverageComplete,
  researchLanesForDocument,
  RESEARCH_COVERAGE_LANES,
  RESEARCH_COVERAGE_SOURCE_URL
} from "./researchCoverage";
import type { DocumentCandidate } from "./types";

function selected(ids: readonly string[]) {
  return INITIAL_DOCUMENT_CANDIDATES.map((document) => {
    const clone = cloneDocumentCandidate(document);
    if (ids.includes(clone.id)) {
      clone.selected = true;
      clone.workflowState = "selected";
    }
    return clone;
  });
}

describe("FRUS repository coverage", () => {
  it("tracks the history.state.gov source-backed research lanes", () => {
    expect(RESEARCH_COVERAGE_SOURCE_URL).toContain("history.state.gov");
    expect(RESEARCH_COVERAGE_LANES.map((lane) => lane.id)).toEqual([
      "white_house_nsc",
      "state_department",
      "defense",
      "central_intelligence",
      "other_foreign_affairs",
      "private_papers"
    ]);
  });

  it("is incomplete until the selected document set covers the full research base", () => {
    const readout = getResearchCoverageReadout(selected([]));

    expect(readout.complete).toBe(false);
    expect(readout.completed).toBe(0);
    expect(readout.missing).toHaveLength(RESEARCH_COVERAGE_LANES.length);
  });

  it("treats the balanced candidate set as complete research coverage", () => {
    const documents = selected([
      "telegram_001",
      "source_note_047",
      "sbu_annotation_001",
      "proof_page_412"
    ]);
    const readout = getResearchCoverageReadout(documents);

    expect(readout.complete).toBe(true);
    expect(readout.completed).toBe(readout.total);
    expect(readout.covered.map((lane) => lane.id)).toEqual(RESEARCH_COVERAGE_LANES.map((lane) => lane.id));
    expect(researchCoverageComplete(documents)).toBe(true);
  });

  it("keeps public-only selection incomplete even if some documents are valid", () => {
    const readout = getResearchCoverageReadout(selected(["cross_reference_001", "proof_page_412"]));

    expect(readout.complete).toBe(false);
    expect(readout.covered.map((lane) => lane.id)).toEqual(["state_department", "other_foreign_affairs"]);
    expect(readout.missing.map((lane) => lane.id)).toContain("white_house_nsc");
    expect(readout.missing.map((lane) => lane.id)).toContain("central_intelligence");
  });

  it("infers lanes for newly authored documents when no explicit mapping exists", () => {
    const document: Pick<DocumentCandidate, "id" | "repository" | "collection" | "folder" | "equities"> = {
      id: "new-defense-intel-record",
      repository: "National Archives",
      collection: "CIA and Department of Defense working files",
      folder: "Agency referral sample",
      equities: [
        {
          agencyId: "new-equity",
          fictionalName: "New Intelligence Equity",
          issueType: "intelligence",
          response: "not_submitted"
        }
      ]
    };

    expect(researchLanesForDocument(document)).toEqual([
      "defense",
      "central_intelligence",
      "other_foreign_affairs"
    ]);
  });
});
