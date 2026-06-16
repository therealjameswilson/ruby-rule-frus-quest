import { describe, expect, it } from "vitest";
import {
  FRUS_PRODUCTION_BOARD_STEPS,
  type FrusProductionBoardReadout,
  type FrusProductionBoardStatus,
  type FrusProductionBoardStepId
} from "./frusProductionBoard";
import { FRUS_PRODUCTION_PHASES, getFrusProductionPhaseReadout } from "./frusProductionPhases";

function boardWith(completedIds: readonly FrusProductionBoardStepId[], activeId: FrusProductionBoardStepId): FrusProductionBoardReadout {
  const completed = new Set(completedIds);
  const steps = FRUS_PRODUCTION_BOARD_STEPS.map((step) => {
    const complete = completed.has(step.id);
    const status: FrusProductionBoardStatus = complete ? "complete" : step.id === activeId ? "active" : "locked";
    return {
      ...step,
      complete,
      status,
      locked: status === "locked"
    };
  });
  return {
    completed: steps.filter((step) => step.complete).length,
    total: steps.length,
    nextStep: steps.find((step) => step.status === "active") ?? null,
    steps,
    sourceUrls: [],
    researchCoverage: {
      sourceUrl: "https://history.state.gov/historicaldocuments/about-frus",
      sourceBasis: "test",
      complete: false,
      completed: 0,
      total: 0,
      covered: [],
      missing: [],
      selectedDocumentIds: [],
      summary: "test"
    }
  };
}

describe("FRUS production phase readout", () => {
  it("covers every production board step exactly once", () => {
    const phaseStepIds = FRUS_PRODUCTION_PHASES.flatMap((phase) => phase.stepIds);
    const boardStepIds = FRUS_PRODUCTION_BOARD_STEPS.map((step) => step.id);
    expect(new Set(phaseStepIds).size).toBe(boardStepIds.length);
    expect(phaseStepIds.sort()).toEqual([...boardStepIds].sort());
  });

  it("marks the current source-backed phase from the active board gate", () => {
    const phases = getFrusProductionPhaseReadout(boardWith([], "series_concept"));
    expect(phases.find((phase) => phase.id === "concept")).toMatchObject({
      status: "active",
      completed: 0,
      total: 2,
      nextStep: { id: "series_concept", shortLabel: "GRD" }
    });
    expect(phases.find((phase) => phase.id === "research")?.status).toBe("locked");
  });

  it("advances phase progress as board gates complete", () => {
    const phases = getFrusProductionPhaseReadout(boardWith([
      "series_concept",
      "volume_concept",
      "records_access",
      "record_collection",
      "research_selection",
      "source_notes",
      "annotation"
    ], "manuscript_review"));
    expect(phases.find((phase) => phase.id === "concept")).toMatchObject({ status: "complete", completed: 2, total: 2 });
    expect(phases.find((phase) => phase.id === "research")).toMatchObject({ status: "complete", completed: 5, total: 5 });
    expect(phases.find((phase) => phase.id === "clearance")).toMatchObject({
      status: "active",
      completed: 0,
      total: 6,
      nextStep: { id: "manuscript_review", shortLabel: "REV" }
    });
  });
});
