import { beforeEach, describe, expect, it } from "vitest";
import {
  gameState,
  getBlackVaultClimaxReadiness,
  getFinalGateReadiness,
  getPublicationReadinessReadout,
  recordStandardsViolation,
  resetGameState,
  resolveStandardsViolationsByType,
  seedProgressForScene
} from "./state";

function completeBindingApparatus() {
  Object.assign(gameState.sceneProgress, {
    frontMatterAssemblyComplete: 1,
    readerAidRegistersComplete: 1,
    indexDocketComplete: 1,
    typesetterCorrectionsComplete: 1
  });
}

describe("Black Vault climax progression", () => {
  beforeEach(() => {
    resetGameState();
    seedProgressForScene("BlackVaultLairScene");
  });

  it("seeds a complete pre-bindery review packet without pretending the boss is defeated", () => {
    const climax = getBlackVaultClimaxReadiness();

    expect(climax).toMatchObject({
      ready: true,
      bossDefeated: false,
      requiredTool: "red_pencil",
      buckramKeyHeld: true,
      hasRedPencil: true,
      typesetterProofReady: true,
      standardsClear: true,
      missingSummary: []
    });
    expect(gameState.equippedProcessItem).toBe("red_pencil");
  });

  it("blocks the climax when the Red Pencil is missing", () => {
    gameState.inventory = gameState.inventory.filter((item) => item !== "Red Pencil");
    gameState.equippedProcessItem = null;

    const climax = getBlackVaultClimaxReadiness();

    expect(climax.ready).toBe(false);
    expect(climax.missingSummary).toContain("Red Pencil");
  });

  it("keeps the publication gate closed after apparatus work until DANN-E is defeated", () => {
    completeBindingApparatus();

    expect(getFinalGateReadiness()).toMatchObject({
      blackVaultRequired: true,
      blackVaultBossCleared: false,
      buckramGateOpen: false,
      ready: false
    });
    expect(getPublicationReadinessReadout().missingSummary).toContain("DANN-E final review");
  });

  it("opens the publication gate only after the Black Vault boss and apparatus are both clear", () => {
    completeBindingApparatus();
    gameState.sceneProgress.blackVaultBossCleared = 1;

    expect(getFinalGateReadiness()).toMatchObject({
      blackVaultRequired: true,
      blackVaultBossCleared: true,
      buckramGateOpen: true,
      ready: true
    });
    expect(getPublicationReadinessReadout().missingSummary).not.toContain("DANN-E final review");
  });

  it("restores the clean route when the player rejects a deadline omission shortcut", () => {
    recordStandardsViolation("missed_30_year_deadline", "Black Vault statutory clock");
    expect(getBlackVaultClimaxReadiness()).toMatchObject({ ready: false, standardsClear: false });

    expect(resolveStandardsViolationsByType("missed_30_year_deadline")).toBe(1);
    expect(getBlackVaultClimaxReadiness()).toMatchObject({ ready: true, standardsClear: true });
    expect(gameState.reliability).toBe(100);
  });
});
