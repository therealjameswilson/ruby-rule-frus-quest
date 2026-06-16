import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SCREENS, publicAssetPath } from "../assets/registry";
import { GAME_HEIGHT } from "../game/constants";
import { TITLE_LAYOUT, framedPlateBounds, shouldStartTitle } from "./titleLayout";

function input(overrides: Partial<Parameters<typeof shouldStartTitle>[0]> = {}) {
  return {
    a: false,
    start: false,
    aJustPressed: false,
    startJustPressed: false,
    pointerPrimaryJustPressed: false,
    ...overrides
  };
}

describe("shouldStartTitle", () => {
  it("advances on a fresh A / start / pointer rising edge", () => {
    expect(shouldStartTitle(input({ aJustPressed: true }), false)).toBe(true);
    expect(shouldStartTitle(input({ startJustPressed: true }), false)).toBe(true);
    expect(shouldStartTitle(input({ pointerPrimaryJustPressed: true }), false)).toBe(true);
  });

  it("advances on a held A/start once input is ready (key carried over from the warning)", () => {
    // No rising edge: the key was already down when the warning handed off.
    expect(shouldStartTitle(input({ a: true }), true)).toBe(true);
    expect(shouldStartTitle(input({ start: true }), true)).toBe(true);
  });

  it("ignores a held key before the input-ready grace elapses", () => {
    expect(shouldStartTitle(input({ a: true }), false)).toBe(false);
    expect(shouldStartTitle(input({ start: true }), false)).toBe(false);
  });

  it("does not advance with no input", () => {
    expect(shouldStartTitle(input(), true)).toBe(false);
  });
});

describe("TitleScene layout", () => {
  it("keeps the map, title plate, and relic shelf from overlapping", () => {
    const map = framedPlateBounds(TITLE_LAYOUT.map);
    const title = framedPlateBounds(TITLE_LAYOUT.titlePlate);
    const relics = framedPlateBounds(TITLE_LAYOUT.relicShelf);

    // top-to-bottom stacking order with no vertical collisions
    expect(map.bottom).toBeLessThanOrEqual(title.top);
    expect(title.bottom).toBeLessThanOrEqual(relics.top);
    expect(relics.bottom).toBeLessThanOrEqual(TITLE_LAYOUT.pressStartY);
  });

  it("keeps every framed plate inside the filmstrip borders", () => {
    for (const plate of [TITLE_LAYOUT.map, TITLE_LAYOUT.titlePlate, TITLE_LAYOUT.relicShelf]) {
      const { top, bottom } = framedPlateBounds(plate);
      expect(top).toBeGreaterThanOrEqual(TITLE_LAYOUT.topFilmstripY - 8);
      expect(bottom).toBeLessThanOrEqual(TITLE_LAYOUT.bottomFilmstripY);
    }
  });

  it("keeps the controls line on screen", () => {
    expect(TITLE_LAYOUT.controlsY).toBeLessThan(GAME_HEIGHT);
    expect(TITLE_LAYOUT.pressStartY).toBeLessThan(TITLE_LAYOUT.controlsY);
  });

  it("uses the native 256x224 art-pack title card for the live title background", () => {
    const assetPath = `public/${publicAssetPath(SCREENS.title_screen_256x224)}`;
    const png = readFileSync(assetPath);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    expect(assetPath).toBe("public/assets/art-pack/screens/title_screen_256x224.png");
    expect({ width, height }).toEqual({ width: 256, height: 224 });
  });
});
