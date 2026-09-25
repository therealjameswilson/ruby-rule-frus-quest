import type Phaser from "phaser";
import { afterEach, expect, it, vi } from "vitest";
import { bossBoastPresentation } from "./bossBoastPresentation";
import { DANNE_BOSS_HD, DANNE_BOSS_FORM_FRAMES } from "../art/danneBossPresentation";

function fixture(reduced = false, available = true) {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }) });
  const visual = () => {
    const v = { setStrokeStyle: vi.fn(), setOrigin: vi.fn(), setScale: vi.fn(), setDepth: vi.fn(), setScrollFactor: vi.fn(), play: vi.fn(), name: "" };
    for (const method of Object.values(v)) if (typeof method === "function") method.mockReturnValue(v);
    return v;
  };
  const actor = visual();
  const scene = { textures: { exists: () => available }, anims: { exists: () => true },
    add: { rectangle: vi.fn(visual), ellipse: vi.fn(visual), text: vi.fn(visual), sprite: vi.fn(() => actor), container: vi.fn(visual) } };
  return { scene, actor, typed: scene as unknown as Phaser.Scene };
}
afterEach(() => vi.unstubAllGlobals());
it.each(Object.keys(DANNE_BOSS_FORM_FRAMES) as Array<keyof typeof DANNE_BOSS_FORM_FRAMES>)("introduces the %s combat form", phase => {
  const { scene, actor, typed } = fixture();
  const stage = bossBoastPresentation(typed, phase, true);
  expect(stage?.name).toBe("boss-boast-stage");
  expect(scene.add.sprite).toHaveBeenCalledWith(128, 84, DANNE_BOSS_HD.key, DANNE_BOSS_FORM_FRAMES[phase][0]);
  expect(actor.play).toHaveBeenCalledWith(`${DANNE_BOSS_HD.key}-${phase}`);
  expect(actor.setScale).toHaveBeenCalledWith(66 / DANNE_BOSS_HD.frameH);
});
it("holds the correct art still in reduced-motion mode", () => {
  const { actor, typed } = fixture(true);
  expect(bossBoastPresentation(typed, "cloud", false)).not.toBeNull();
  expect(actor.play).not.toHaveBeenCalled();
});
it("preserves defeated artwork and missing-texture fallback", () => {
  const { typed } = fixture();
  expect(bossBoastPresentation(typed, "defeated", false)).toBeNull();
  expect(bossBoastPresentation(fixture(false, false).typed, "colossus", false)).toBeNull();
});
