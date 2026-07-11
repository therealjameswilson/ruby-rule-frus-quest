import { describe, expect, it } from "vitest";
import {
  getAdventureSubscreenReadout,
  renderGameToText,
  resetGameState
} from "./state";
import type { AdventureSubscreenReadout } from "./state";

describe("adventure subscreen source card", () => {
  it("keeps the next FRUS Production Board task tied to its source basis and URL", () => {
    resetGameState();

    const subscreen = getAdventureSubscreenReadout();

    expect(subscreen.productionBoard.nextStep).toMatchObject({
      id: "series_concept",
      shortLabel: "GRD",
      sourceUrl: "https://history.state.gov/historicaldocuments/frus-history/stages"
    });
    expect(subscreen.productionBoard.nextStep?.sourceBasis).toContain("organizational scheme");
    expect(subscreen.productionBoard.nextStep?.gameplayTask).toContain("whole-series plan");
  });

  it("exposes the active source card through render_game_to_text", () => {
    resetGameState();

    const textState = JSON.parse(renderGameToText()) as { adventureSubscreen: AdventureSubscreenReadout };
    const nextStep = textState.adventureSubscreen.productionBoard.nextStep;

    expect(nextStep).not.toBeNull();
    if (!nextStep) throw new Error("Expected active FRUS Production Board step");
    expect(nextStep.id).toBe("series_concept");
    expect(nextStep.sourceUrl).toBe("https://history.state.gov/historicaldocuments/frus-history/stages");
    expect(nextStep.sourceBasis).toContain("organizational scheme");
  });
});
