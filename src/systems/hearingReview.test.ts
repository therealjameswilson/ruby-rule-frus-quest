import { beforeEach, describe, expect, it, vi } from "vitest";
import { HearingReview } from "./hearingReview";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "../game/state";
import { readHearingReview } from "../game/hearingReview";
import { TREATY_FRAGMENT_LABELS } from "../game/danneItemCatalog";
import { saveGameNow } from "./save";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";

vi.mock("phaser", () => ({ default: { Math: { Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)) } } }));
vi.mock("./save", () => ({ saveGameNow: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { confirm: vi.fn(), warning: vi.fn(), blip: vi.fn(), danneItemPickup: vi.fn() } }));

function controller(): HearingReview {
  // Exercise real interaction handlers without constructing a renderer in Vitest.
  return Object.assign(Object.create(HearingReview.prototype) as HearingReview, {
    toast: { show: vi.fn() }, playerPosition: () => ({ x: 128, y: 169 })
  });
}
beforeEach(() => {
  resetGameState();
  setSceneState("SenateHearingChamberScene", "explore", "COMPARE EXHIBITS");
  gameState.reliability = 60;
  vi.clearAllMocks();
});

describe("live hearing review rewards and saves", () => {
  it("uses short action labels and removes claimed-paper interaction zones", () => {
    const review = controller();
    const targets = DANNE_SCENE_GEOMETRY.SenateHearingChamberScene.interactions.map((item) => ({ ...item, onInteract: vi.fn() }));
    review.syncTargets(targets);
    expect(targets[0].label).toBe("Take Exhibit");
    review.handle("hearing-exhibit-left");
    review.syncTargets(targets);
    expect(targets[0].label).toBe("Bring to Desk");
    expect(targets[1].label).toBe("Swap Exhibit");
    review.handle("witness-table");
    review.syncTargets(targets);
    expect(targets[0].label).toBe("Sign at Desk");
    gameState.sceneProgress.senateHacReviewComplete = 1;
    review.syncTargets(targets);
    expect(targets.map((item) => item.action)).toEqual(["witness-table", "return-office"]);
    review.handle("witness-table");
    review.syncTargets(targets);
    expect(targets.map((item) => item.action)).toEqual(["return-office"]);
  });

  it("retries an unfiled practice exhibit without damage or a blocking dialogue", () => {
    const review = controller();
    expect(review.handle("return-office")).toBe(false);
    review.handle("witness-table");
    review.handle("hearing-exhibit-right");
    review.handle("witness-table");
    expect(gameState.reliability).toBe(60);
    expect(gameState.activeDialog).toBeNull();
    expect(gameState.sceneProgress.senateHacReviewComplete).toBeUndefined();
    expect(readHearingReview(gameState.sceneProgress)).toMatchObject({ step: 0, carried: "right", placed: false });
    expect(saveGameNow).toHaveBeenCalledOnce();
  });

  it("awards reliability on the final signature, then one separately claimed fragment", () => {
    const review = controller();
    for (const action of ["hearing-exhibit-left", "hearing-exhibit-right"] as const) {
      review.handle(action);
      review.handle("witness-table");
      expect(gameState.reliability).toBe(60);
      review.handle("witness-table");
    }
    expect(gameState.reliability).toBe(66);
    expect(gameState.sceneProgress.senateHacReviewComplete).toBe(1);
    expect(gameState.inventory).not.toContain(TREATY_FRAGMENT_LABELS[1]);
    expect(review.objective).toBe("CLAIM TREATY FRAGMENT");
    review.handle("witness-table");
    review.handle("witness-table");
    review.handle("hearing-exhibit-left");
    expect(gameState.inventory.filter((item) => item === TREATY_FRAGMENT_LABELS[1])).toHaveLength(1);
    expect(gameState.reliability).toBe(66);
    expect(gameState.documentPoints).toBe(0);
    expect(saveGameNow).toHaveBeenCalledTimes(7);
    expect(review.objective).toBe("SOUTH TO OFFICE");
  });

  it("lets a legacy completed review claim its missing fragment without a repeat bonus", () => {
    gameState.sceneProgress.senateHacReviewComplete = 1;
    const review = controller();
    review.handle("witness-table");
    review.handle("witness-table");
    expect(gameState.inventory.filter((item) => item === TREATY_FRAGMENT_LABELS[1])).toHaveLength(1);
    expect(gameState.reliability).toBe(60);
    expect(saveGameNow).toHaveBeenCalledExactlyOnceWith("manual");
  });

  it("continues carried or placed evidence without replacing another quest's held item", () => {
    for (const placed of [false, true]) {
      resetGameState();
      setSceneState("SenateHearingChamberScene", "explore", "COMPARE EXHIBITS");
      gameState.sceneProgress.senateEvidenceStep = 1;
      gameState.heldItem = "Source Note 47";
      gameState.documentPoints = 42;
      const review = controller();
      review.handle("hearing-exhibit-right");
      if (placed) review.handle("witness-table");
      const saved = createGameSaveData();
      resetGameState();
      expect(restoreGameSaveData(JSON.parse(JSON.stringify(saved)))).toBe("SenateHearingChamberScene");
      expect(readHearingReview(gameState.sceneProgress)).toEqual({ step: 1, carried: "right", placed, complete: false });
      expect(gameState.heldItem).toBe("Source Note 47");
      expect(gameState.documentPoints).toBe(42);
      if (!placed) review.handle("witness-table");
      review.handle("witness-table");
      expect(gameState.sceneProgress.senateHacReviewComplete).toBe(1);
      expect(gameState.inventory).not.toContain(TREATY_FRAGMENT_LABELS[1]);
    }
  });
});
