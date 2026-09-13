import { describe, expect, it } from "vitest";
import { DANNE_LURKER_BOASTS, danneCombatBoastsForVariantPhase } from "../game/danneBoasts";
import { combatSpeechPlacement, combatSpeechText, COMBAT_SPEECH_BOUNDS, COMBAT_SPEECH_WIDTH } from "./combatSpeechPlacement";

describe("combat speech layout", () => {
  it.each(["reveal", "prototype", "colossus", "cloud", "infiltrator", "swarm", "defeated", "ascendant"] as const)(
    "preserves every %s combat punchline including its speaker prefix", phase => {
      for (const message of danneCombatBoastsForVariantPhase(phase)) {
        const layout = combatSpeechText(message);
        expect(layout.text.replace(/\s+/g, " ")).toBe(`DANN-E: ${message}`.replace(/\s+/g, " "));
        expect(layout.text.split("\n").length).toBeLessThanOrEqual(2);
        for (const line of layout.text.split("\n")) expect(line.length * 4 + 8).toBeLessThanOrEqual(COMBAT_SPEECH_WIDTH);
      }
    }
  );
  it.each([...DANNE_LURKER_BOASTS, "INTERRUPTED!", "REFUTED!"])("fits the complete line %s at native 6px", (message) => {
    const layout = combatSpeechText(message);
    expect(layout.text.replace(/\n/g, " ")).toBe(`DANN-E: ${message}`);
    expect(layout.text.split("\n").length).toBeLessThanOrEqual(2);
    expect(Math.max(...layout.text.split("\n").map(line => line.length)) * 4 + 8).toBeLessThanOrEqual(COMBAT_SPEECH_WIDTH);
    expect(layout.height).toBeLessThanOrEqual(22);
  });

  it("never puts a visible panel over either character or outside the play area", () => {
    let visible = 0;
    for (const x of [16, 50, 128, 214, 240]) for (const y of [42, 74, 120, 188, 218]) {
      for (const dx of [-70, 0, 70]) for (const dy of [-50, 0, 50]) {
        const enemy = { x, y }, player = { x: x + dx, y: y + dy };
        const p = combatSpeechPlacement(enemy, player, 22);
        if (!p) continue;
        visible++;
        expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(COMBAT_SPEECH_BOUNDS.left);
        expect(p.x + COMBAT_SPEECH_WIDTH).toBeLessThanOrEqual(COMBAT_SPEECH_BOUNDS.right);
        expect(p.y).toBeGreaterThanOrEqual(COMBAT_SPEECH_BOUNDS.top);
        expect(p.y + 22).toBeLessThanOrEqual(COMBAT_SPEECH_BOUNDS.bottom);
        const overlaps = (left: number, top: number, right: number, bottom: number) =>
          p.x < right && p.x + COMBAT_SPEECH_WIDTH > left && p.y < bottom && p.y + 22 > top;
        expect(overlaps(player.x - 18, player.y - 44, player.x + 18, player.y + 8)).toBe(false);
        expect(overlaps(x - 14, y - 35, x + 14, y + 15)).toBe(false);
      }
    }
    expect(visible).toBeGreaterThan(100);
  });

  it("moves below a northern enemy and stays quiet if no safe placement exists", () => {
    expect(combatSpeechPlacement({ x: 128, y: 55 }, { x: 230, y: 180 }, 22)?.y).toBeGreaterThan(55);
    expect(combatSpeechPlacement({ x: 128, y: 120 }, { x: 128, y: 120 }, 200)).toBeNull();
  });
});
