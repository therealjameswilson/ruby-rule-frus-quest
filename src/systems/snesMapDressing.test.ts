import { describe, expect, it } from "vitest";
import {
  frusProductionFloorStageReadout,
  frusProductionFloorGateReadouts,
  frusProductionFloorGateCount,
  frusProductionFloorGateCountReadout,
  frusProductionFloorGateSummary,
  frusProductionFloorGateInstruction,
  frusProductionFloorGateToolCue,
  frusProductionFloorGateToolSummary,
  frusProductionFloorNextGate,
  frusProductionFloorNextGateInteractionReadout,
  frusProductionFloorNextGateReadout,
  frusProductionFloorNextGateRouteReadout,
  frusProductionFloorNextGateToolReadout,
  frusProductionFloorRailReadout,
  frusProductionFloorStepForRatio,
  frusProductionFloorTaskReadout,
  gameplayMapFlowReadout,
  gameplayMapRouteBadgeLabel,
  gameplayMapRouteReadout
} from "../game/gameplayMapFlow";

describe("SNES gameplay-map flow readout", () => {
  it("maps gameplay maps to compact FRUS production stage cues", () => {
    expect(gameplayMapFlowReadout("historian_office")).toBe("01 RESEARCH: CHARTER");
    expect(gameplayMapFlowReadout("nara_stacks")).toBe("02 STACKS: CITE");
    expect(gameplayMapFlowReadout("black_vault")).toBe("08 FINAL: CERTIFY");
  });

  it("keeps the FRUS production floor rail in workflow order", () => {
    expect(frusProductionFloorRailReadout()).toBe(
      "FRUS FLOOR RAIL: 1 RESEARCH > 2 COMPILE > 3 DECLASS > 4 ANNOTATE > 5 PUBLISH"
    );
  });

  it("maps player position on the FRUS production floor to the nearest workflow stage", () => {
    expect(frusProductionFloorStepForRatio(-1).fullLabel).toBe("RESEARCH");
    expect(frusProductionFloorStepForRatio(-1).taskLabel).toBe("VERIFY SRC");
    expect(frusProductionFloorStepForRatio(0.31).fullLabel).toBe("COMPILE");
    expect(frusProductionFloorStepForRatio(0.5).fullLabel).toBe("DECLASS");
    expect(frusProductionFloorStepForRatio(0.7).fullLabel).toBe("ANNOTATE");
    expect(frusProductionFloorStepForRatio(3).fullLabel).toBe("PUBLISH");
    expect(frusProductionFloorStageReadout(0.86)).toBe("FRUS FLOOR CURRENT: 5 PUBLISH");
    expect(frusProductionFloorTaskReadout(0.5)).toBe("FRUS FLOOR TASK: ROUTE EQUITIES");
  });

  it("summarizes FRUS production floor gate completion", () => {
    const emptyGates = frusProductionFloorGateReadouts({
      citationStamp: false,
      selectionReady: false,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    });
    expect(emptyGates.map((gate) => gate.readout)).toEqual([
      "1 NEED CITE",
      "2 NEED SEL",
      "3 NEED EQ",
      "4 NEED EDIT",
      "5 NEED BIND"
    ]);
    expect(emptyGates.every((gate) => gate.status === "waiting")).toBe(true);
    expect(frusProductionFloorGateCount({
      citationStamp: false,
      selectionReady: false,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toEqual({ complete: 0, total: 5 });
    expect(frusProductionFloorGateCountReadout({
      citationStamp: false,
      selectionReady: false,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toBe("FRUS FLOOR GATE COUNT: 0/5");

    const partialSummary = frusProductionFloorGateSummary({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    });
    expect(partialSummary).toBe("FRUS FLOOR GATES: 1 OK CITE > 2 OK SEL > 3 NEED EQ > 4 NEED EDIT > 5 NEED BIND");
    expect(frusProductionFloorGateToolSummary({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toBe(
      "FRUS FLOOR LOCKS: 1 CITE Citation Stamp OK > 2 SEL Review Folder OK > 3 EQ Clearance Token NEED > 4 EDIT Red Pencil NEED > 5 BIND Buckram Key NEED"
    );
    expect(frusProductionFloorNextGateReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toBe("FRUS FLOOR NEXT GATE: 3 EQ");
    expect(frusProductionFloorNextGateRouteReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toBe("FRUS FLOOR ROUTE: TO 3 EQ");
    expect(frusProductionFloorNextGateInteractionReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toBe("FRUS FLOOR INTERACT: GATE 3 EQ");
    expect(frusProductionFloorNextGateToolReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    })).toBe("FRUS FLOOR TOOL: EQ Clearance Token");
    expect(frusProductionFloorNextGate({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: true,
      editorialReady: true,
      buckramReady: true
    })).toBeNull();
    expect(frusProductionFloorNextGateReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: true,
      editorialReady: true,
      buckramReady: true
    })).toBe("FRUS FLOOR NEXT GATE: READY");
    expect(frusProductionFloorNextGateRouteReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: true,
      editorialReady: true,
      buckramReady: true
    })).toBe("FRUS FLOOR ROUTE: TO GATE READY");
    expect(frusProductionFloorNextGateInteractionReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: true,
      editorialReady: true,
      buckramReady: true
    })).toBe("FRUS FLOOR INTERACT: GATE READY");
    expect(frusProductionFloorNextGateToolReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: true,
      editorialReady: true,
      buckramReady: true
    })).toBe("FRUS FLOOR TOOL: NONE");
    expect(frusProductionFloorGateCountReadout({
      citationStamp: true,
      selectionReady: true,
      clearanceReady: true,
      editorialReady: true,
      buckramReady: true
    })).toBe("FRUS FLOOR GATE COUNT: 5/5");
  });

  it("maps FRUS production floor gates to Zelda-like process item locks", () => {
    expect(frusProductionFloorGateToolCue("1")).toMatchObject({
      itemId: "citation_stamp",
      displayName: "Citation Stamp",
      shortLabel: "CITE"
    });
    expect(frusProductionFloorGateToolCue("2")).toMatchObject({
      itemId: "review_folder",
      displayName: "Review Folder"
    });
    expect(frusProductionFloorGateToolCue("3")).toMatchObject({
      itemId: "clearance_token",
      displayName: "Clearance Token"
    });
    expect(frusProductionFloorGateToolCue("4")).toMatchObject({
      itemId: "red_pencil",
      displayName: "Red Pencil"
    });
    expect(frusProductionFloorGateToolCue("5")).toMatchObject({
      itemId: "buckram_key",
      displayName: "Buckram Key"
    });
    expect(frusProductionFloorGateToolCue(null)).toBeNull();
  });

  it("gives concise instructions for the active FRUS production floor gate", () => {
    const [citationGate, , clearanceGate] = frusProductionFloorGateReadouts({
      citationStamp: false,
      selectionReady: true,
      clearanceReady: false,
      editorialReady: false,
      buckramReady: false
    });
    expect(frusProductionFloorGateInstruction(citationGate).speaker).toBe("GATE 1 CITE");
    expect(frusProductionFloorGateInstruction(citationGate).pages[0]).toContain("Citation gate needs");
    expect(frusProductionFloorGateInstruction(clearanceGate).pages[1]).toContain("Clearance Token");
    expect(frusProductionFloorGateInstruction(null).pages[0]).toContain("All workflow gates");
  });

  it("summarizes route destinations for SNES door badges", () => {
    expect(gameplayMapRouteBadgeLabel({ scene: "WorldMapScene" })).toBe("WORLD");
    expect(gameplayMapRouteBadgeLabel({ scene: "GameplayMapScene", mapKey: "foggy_bottom" })).toBe("03 ENTER");
    expect(gameplayMapRouteBadgeLabel({ scene: "GameplayMapScene", mapKey: "black_vault", locked: true })).toBe("LOCK");
    expect(gameplayMapRouteReadout({ scene: "GameplayMapScene", mapKey: "foggy_bottom" }))
      .toBe("ROUTE 03 ENTER");
    expect(gameplayMapRouteReadout({ scene: "GameplayMapScene", mapKey: "black_vault", locked: true }))
      .toBe("LOCKED 08 FINAL: CERTIFY");
  });
});
