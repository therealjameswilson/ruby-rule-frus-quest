import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindingCertificationEvidence } from "../game/bindingCertification";
import {
  createGameSaveData, gameState, recordStandardsViolation, resetGameState,
  restoreGameSaveData, setSceneState, unresolvedStandardsViolations
} from "../game/state";
import { applyProcessPressure, PROCESS_PRESSURE_DAMAGE } from "./dannePressure";
import { applyStandardsViolation } from "./reliability";
import { VIOLATION_DAMAGE } from "./standardsDamage";

vi.mock("phaser", () => ({ default: {
  Math: { Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) }
} }));
vi.mock("./audio", () => ({ retroAudio: { confirm: vi.fn(), warning: vi.fn() } }));

const wallContexts = ["NO REPO", "FIREWALL", "PENDING", "WAIT", "HOLD", "AMBIGUOUS", "DANN-E QUEUE"]
  .map(type => `${type} process wall delayed source work.`);
const enemyContexts = ["ego bolt", "telegraphed pressure strike"]
  .map(attack => `DANN-E ${attack} disrupted room-clear review.`);
const expiredClock = "Statutory Clock expired before the Buckram Gate opened.";

beforeEach(() => {
  resetGameState();
  setSceneState("ArchiveScene", "explore", "Check source note");
  vi.clearAllMocks();
});

describe("combat pressure is not a record violation", () => {
  it.each([100, 4, 2, 0])("keeps the old four-point hit cost and clamps at zero from %i", reliability => {
    gameState.reliability = reliability;
    const saved = createGameSaveData();
    expect(applyProcessPressure("NO REPO collision. The record is unchanged.")).toBe(4);
    expect(PROCESS_PRESSURE_DAMAGE).toBe(4);
    expect(gameState.reliability).toBe(Math.max(0, reliability - 4));
    expect(gameState.standardsViolations).toEqual([]);
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.inventory).toEqual(saved.state.inventory);
    expect(gameState.documentPoints).toBe(saved.state.documentPoints);
    const hit = createGameSaveData();
    resetGameState(); restoreGameSaveData(hit);
    expect(gameState.reliability).toBe(Math.max(0, reliability - 4));
    expect(unresolvedStandardsViolations()).toEqual([]);
  });

  it("does not resolve a genuine deadline or unsafe edit while applying combat damage", () => {
    applyStandardsViolation("missed_30_year_deadline", expiredClock);
    applyStandardsViolation("undisclosed_deletion", "Withholding indication missing", "source_note_047");
    const records = structuredClone(gameState.standardsViolations);
    const before = gameState.reliability;
    applyProcessPressure("DANN-E ego bolt. The record is unchanged.");
    const hit = createGameSaveData(); resetGameState(); restoreGameSaveData(hit);
    expect(gameState.reliability).toBe(before - 4);
    expect(gameState.standardsViolations).toEqual(records);
    expect(unresolvedStandardsViolations()).toHaveLength(2);
    expect(records[0].violation).toBe("missed_30_year_deadline");
    expect(VIOLATION_DAMAGE.missed_30_year_deadline).toBe(4);
  });

  it("wires both accepted collision paths to pressure but keeps actual clock expiry separate", () => {
    for (const scene of ["ArchiveScene", "GameplayMapScene"]) {
      const source = readFileSync(new URL(`../scenes/${scene}.ts`, import.meta.url), "utf8");
      expect(source).toContain("applyProcessPressure(");
      expect(source).not.toContain('applyStandardsViolation("missed_30_year_deadline"');
      expect(source).toContain("this.player.takeHit(");
    }
    const boss = readFileSync(new URL("../entities/enemies/DanneBoss.ts", import.meta.url), "utf8");
    expect(boss).toContain('applyStandardsViolation("missed_30_year_deadline"');
    expect(boss).toContain(expiredClock);
  });
});

describe("legacy collision ledger repair", () => {
  it.each([...wallContexts, ...enemyContexts])("retains the audit and hit cost but removes the false blocker: %s", context => {
    recordStandardsViolation("missed_30_year_deadline", context);
    recordStandardsViolation("missed_30_year_deadline", context);
    gameState.reliability = 72;
    const saved = createGameSaveData();
    resetGameState(); restoreGameSaveData(saved);
    expect(gameState.standardsViolations).toEqual(saved.state.standardsViolations.map(record => ({ ...record, unresolved: false })));
    expect(saved.state.standardsViolations[0].unresolved).toBe(true);
    expect(gameState.reliability).toBe(72);
    expect(gameState.latestMessage).toBe("Combat-hit labels corrected. Record review is unchanged.");
    expect(gameState.documentPoints).toBe(saved.state.documentPoints);
    expect(gameState.inventory).toEqual(saved.state.inventory);
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.sceneProgress).toEqual(saved.state.sceneProgress);
    const repaired = createGameSaveData(); resetGameState(); restoreGameSaveData(repaired);
    expect(gameState.standardsViolations).toEqual(repaired.state.standardsViolations);
  });

  it("never matches actual clocks, unknown contexts, document-scoped entries or other violations", () => {
    for (const context of [expiredClock, "Black Vault statutory clock", "A delayed publication", `${wallContexts[0]} Additional finding.`]) {
      recordStandardsViolation("missed_30_year_deadline", context);
    }
    recordStandardsViolation("missed_30_year_deadline", wallContexts[0], "source_note_047");
    recordStandardsViolation("altered_text", enemyContexts[0]);
    const saved = createGameSaveData(); resetGameState(); restoreGameSaveData(saved);
    expect(gameState.standardsViolations).toEqual(saved.state.standardsViolations);
    expect(unresolvedStandardsViolations()).toHaveLength(6);
  });

  it("unblocks a sound proof, not incomplete evidence or a real standards finding", () => {
    const proof = {
      ...gameState.documentCandidates[0], selected: true, workflowState: "proofed" as const,
      citationComplete: true, annotationNeeded: false, undisclosedDeletion: false,
      equities: [{ agencyId: "training", fictionalName: "Training equity", issueType: "military" as const, response: "cleared" as const }]
    };
    recordStandardsViolation("missed_30_year_deadline", wallContexts[0]);
    expect(bindingCertificationEvidence([proof], gameState.standardsViolations).ready).toBe(false);
    const saved = createGameSaveData(); resetGameState(); restoreGameSaveData(saved);
    expect(bindingCertificationEvidence([proof], gameState.standardsViolations).ready).toBe(true);
    expect(bindingCertificationEvidence([{ ...proof, citationComplete: false }], gameState.standardsViolations).ready).toBe(false);
    recordStandardsViolation("missed_30_year_deadline", expiredClock);
    expect(bindingCertificationEvidence([proof], gameState.standardsViolations).ready).toBe(false);
  });
});
