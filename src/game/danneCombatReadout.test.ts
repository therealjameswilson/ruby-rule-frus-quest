import { beforeEach, describe, expect, it } from "vitest";
import { getDanneCombatReadout, resetGameState, setVisibleThreats } from "./state";

describe("DANN-E combat readout", () => {
  beforeEach(() => resetGameState());

  it("preserves the active attack tell for nonvisual QA", () => {
    const target = { x: 96, y: 172 };
    setVisibleThreats([{
      label: "DANN-E COLOSSUS",
      x: 128,
      y: 118,
      hp: 40,
      maxHp: 48,
      enemyState: "colossus",
      weakness: "red_pencil",
      telegraph: {
        kind: "cannon_lock",
        label: "EGO CANNON LOCK",
        msRemaining: 420,
        target,
        destination: null
      }
    }]);
    target.x = 4;

    expect(getDanneCombatReadout().enemies[0].telegraph).toEqual({
      kind: "cannon_lock",
      label: "EGO CANNON LOCK",
      msRemaining: 420,
      target: { x: 96, y: 172 },
      destination: null
    });
  });
});
