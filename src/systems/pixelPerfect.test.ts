import { describe, expect, it } from "vitest";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";
import { computeDeviceIntegerZoom, computeIntegerZoom, isIntegerScale } from "./pixelPerfect";

describe("computeIntegerZoom (CSS pixels)", () => {
  it("floors to a whole-number CSS zoom", () => {
    expect(computeIntegerZoom(256, 240)).toBe(1);
    expect(computeIntegerZoom(1280, 960)).toBe(4);
  });

  it("never drops below 1x", () => {
    expect(computeIntegerZoom(100, 100)).toBe(1);
  });
});

describe("computeDeviceIntegerZoom (device pixels)", () => {
  it("matches CSS integer zoom on dpr=1 desktops", () => {
    for (const [w, h] of [[256, 240], [800, 600], [1280, 720], [1920, 1080]] as const) {
      expect(computeDeviceIntegerZoom(w, h, 1)).toBe(computeIntegerZoom(w, h));
    }
  });

  it("fills more of a high-DPR iPhone viewport than CSS integer zoom", () => {
    // iPhone 14 Pro portrait: ~393x659 CSS px at dpr 3.
    const cssZoom = computeIntegerZoom(393, 659);
    const deviceZoom = computeDeviceIntegerZoom(393, 659, 3);
    expect(cssZoom).toBe(1); // old behavior locked the game to 1x (256px wide)
    expect(deviceZoom).toBe(4); // 393*3/256 = 4.6 -> floor 4
    // Fills 256*4/3 ≈ 341 CSS px instead of 256 CSS px.
    expect((GAME_WIDTH * deviceZoom) / 3).toBeGreaterThan(GAME_WIDTH * cssZoom);
  });

  it("keeps the final CSS-to-device scale an exact integer", () => {
    for (const dpr of [1, 2, 3]) {
      const deviceZoom = computeDeviceIntegerZoom(393, 659, dpr);
      const cssZoom = deviceZoom / dpr;
      expect(isIntegerScale(cssZoom * dpr)).toBe(true);
    }
  });

  it("never drops below 1x and tolerates a missing dpr", () => {
    expect(computeDeviceIntegerZoom(100, 100, 1)).toBe(1);
    expect(computeDeviceIntegerZoom(256, 240, 0)).toBe(1);
  });
});
