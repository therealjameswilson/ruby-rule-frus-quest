import { describe, expect, it } from "vitest";
import {
  evaluateRepositoryCoverageMapAnswer,
  getRepositoryCoverageMapPrompt,
  REPOSITORY_COVERAGE_MAP_PROMPTS,
  REPOSITORY_COVERAGE_MAP_SOURCE_URL,
  repositoryCoverageLaneCount,
  repositoryCoverageMapComplete
} from "./repositoryCoverageMap";
import { RESEARCH_COVERAGE_LANES } from "./researchCoverage";

describe("repository coverage map", () => {
  it("anchors the map to the history.state.gov FRUS source-base lanes", () => {
    expect(REPOSITORY_COVERAGE_MAP_SOURCE_URL).toContain("history.state.gov");
    expect(repositoryCoverageLaneCount()).toBe(RESEARCH_COVERAGE_LANES.length);
    expect(REPOSITORY_COVERAGE_MAP_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "source_lanes",
      "private_papers",
      "missing_lane_response"
    ]);
  });

  it("requires all prompts before the repository map is filed", () => {
    expect(repositoryCoverageMapComplete(0)).toBe(false);
    expect(repositoryCoverageMapComplete(REPOSITORY_COVERAGE_MAP_PROMPTS.length - 1)).toBe(false);
    expect(repositoryCoverageMapComplete(REPOSITORY_COVERAGE_MAP_PROMPTS.length)).toBe(true);
  });

  it("returns the bounded prompt for any step", () => {
    expect(getRepositoryCoverageMapPrompt(-10).id).toBe("source_lanes");
    expect(getRepositoryCoverageMapPrompt(99).id).toBe("missing_lane_response");
  });

  it("maps unsafe source-map shortcuts to standards violations", () => {
    expect(evaluateRepositoryCoverageMapAnswer("source_lanes", "full_source_lanes")).toMatchObject({
      ok: true,
      violation: null
    });
    expect(evaluateRepositoryCoverageMapAnswer("source_lanes", "machine_summary_lanes").violation).toBe("altered_text");
    expect(evaluateRepositoryCoverageMapAnswer("missing_lane_response", "claim_complete").violation).toBe("concealed_policy_defect");
    expect(evaluateRepositoryCoverageMapAnswer("private_papers", "memoirs_only").violation).toBe("omitted_material_fact");
  });
});
