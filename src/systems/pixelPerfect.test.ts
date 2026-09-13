import { describe, expect, it } from "vitest";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";
import { computeDeviceIntegerZoom, computeIntegerCanvasLayout, computeIntegerZoom,
  isIntegerScale, measurePixelScale, normalizeDevicePixelRatio } from "./pixelPerfect";

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
    for (const dpr of [0.75, 1, 1.25, 2, 2.625, 3]) {
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

describe("physical canvas layout and honest readout", () => {
  it.each([0.75, 1, 1.25, 2, 2.625, 3])("preserves the actual DPR %s", dpr => {
    expect(normalizeDevicePixelRatio(dpr)).toBe(dpr);
  });

  it.each([0, -1, NaN, Infinity])("defaults invalid DPR %s to one", dpr => {
    expect(normalizeDevicePixelRatio(dpr)).toBe(1);
  });

  it("uses four equally wide device pixels on the fractional-DPR Pixel profile", () => {
    const layout = computeIntegerCanvasLayout({ x: 8, y: 8, width: 396, height: 899, dpr: 2.625 });
    expect(layout.deviceZoom).toBe(4);
    expect(layout.width * layout.dpr).toBeCloseTo(1024);
    expect(layout.height * layout.dpr).toBeCloseTo(960);
    expect(layout.width).toBeGreaterThan(390);
    expect(measurePixelScale(layout, layout.dpr, layout.deviceZoom).integerZoom).toBe(true);
  });

  it("centers inside asymmetric safe areas on whole physical pixels before and after rotation", () => {
    for (const dpr of [1, 1.25, 2, 2.625, 3]) {
      for (const [width, height] of [[359, 651], [651, 359], [795, 354], [343, 759]]) {
        const viewport = { x: 18.5, y: 34.25, width, height, dpr };
        const layout = computeIntegerCanvasLayout(viewport);
        const proof = measurePixelScale(layout, dpr, layout.deviceZoom);
        expect(proof.integerZoom).toBe(true);
        expect(layout.x).toBeGreaterThanOrEqual(viewport.x);
        expect(layout.y).toBeGreaterThanOrEqual(viewport.y);
        expect(layout.x + layout.width).toBeLessThanOrEqual(viewport.x + width + 1e-8);
        expect(layout.y + layout.height).toBeLessThanOrEqual(viewport.y + height + 1e-8);
        expect(Math.abs(layout.x + layout.width / 2 - (viewport.x + width / 2))).toBeLessThanOrEqual(1 / dpr);
        expect(Math.abs(layout.y + layout.height / 2 - (viewport.y + height / 2))).toBeLessThanOrEqual(1 / dpr);
      }
    }
  });

  it("rejects the old false pass at DPR 2.625 even when rounded-DPR math would pass", () => {
    const proof = measurePixelScale({ x: 35.328125, y: 297.5, width: 341.328125, height: 320 }, 2.625, 4);
    expect(proof.dpr).toBe(2.625);
    expect(proof.physicalPixelsY).toBe(3.5);
    expect(proof.integerZoom).toBe(false);
  });

  it("checks both dimensions, origin, target and browser magnification independently", () => {
    const rect = { x: 26, y: 266, width: 1024 / 3, height: 320 };
    expect(measurePixelScale(rect, 3, 4).integerZoom).toBe(true);
    expect(measurePixelScale({ ...rect, height: 310 }, 3, 4).integerZoom).toBe(false);
    expect(measurePixelScale({ ...rect, x: 26.5 }, 3, 4).originAligned).toBe(false);
    expect(measurePixelScale({ ...rect, y: 266.5 }, 3, 4).integerZoom).toBe(false);
    expect(measurePixelScale(rect, 3, 5).integerZoom).toBe(false);
    expect(measurePixelScale(rect, 3, 4, 1.1).integerZoom).toBe(false);
  });

  it("tolerates sub-texel CSS quantization without accepting a half-device-pixel shift", () => {
    const layout = computeIntegerCanvasLayout({ x: 8, y: 8, width: 359, height: 651, dpr: 3 });
    const quantized = { x: Math.floor(layout.x * 64) / 64, y: Math.floor(layout.y * 64) / 64,
      width: Math.floor(layout.width * 64) / 64, height: Math.floor(layout.height * 64) / 64 };
    expect(measurePixelScale(quantized, 3, 4).integerZoom).toBe(true);
    expect(measurePixelScale({ ...layout, x: layout.x + 1 / 6 }, 3, 4).integerZoom).toBe(false);
  });
});
