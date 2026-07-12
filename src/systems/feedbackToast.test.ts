import { describe, expect, it } from "vitest";
import {
  computeToastPlacement,
  FEEDBACK_TOAST_FADE_MS,
  FEEDBACK_TOAST_HOLD_MS,
  FEEDBACK_TOAST_TOTAL_MS,
  isToastExpired,
  toastAlpha
} from "./feedbackToastPlacement";

describe("computeToastPlacement", () => {
  it("floats the toast above the anchor by the default gap", () => {
    const placement = computeToastPlacement({ x: 128, y: 184 });
    expect(placement.x).toBe(128);
    expect(placement.y).toBe(184 - 26);
  });

  it("clamps Y below the top HUD band so it never hides behind it", () => {
    const placement = computeToastPlacement({ x: 100, y: 60 }, { top: 54, bottom: 214, left: 8, right: 248 });
    expect(placement.y).toBeGreaterThanOrEqual(54);
  });

  it("clamps Y above the bottom hint band so it stays readable", () => {
    const placement = computeToastPlacement({ x: 100, y: 400 }, { top: 54, bottom: 214, left: 8, right: 248 });
    expect(placement.y).toBeLessThanOrEqual(214);
  });

  it("clamps X so the panel stays on-screen", () => {
    const left = computeToastPlacement({ x: -20, y: 120 }, { top: 54, bottom: 214, left: 8, right: 248 });
    expect(left.x).toBeGreaterThanOrEqual(8);
    const right = computeToastPlacement({ x: 999, y: 120 }, { top: 54, bottom: 214, left: 8, right: 248 });
    expect(right.x).toBeLessThanOrEqual(248);
  });

  it("clamps the whole panel when a wide toast follows an edge anchor", () => {
    const bounds = { top: 54, bottom: 214, left: 8, right: 248 };
    const left = computeToastPlacement({ x: 12, y: 120 }, bounds, 26, 80);
    const right = computeToastPlacement({ x: 244, y: 120 }, bounds, 26, 80);

    expect(left.x).toBe(88);
    expect(right.x).toBe(168);
    expect(left.x - 80).toBe(bounds.left);
    expect(right.x + 80).toBe(bounds.right);
  });

  it("centers a panel that is wider than the available bounds", () => {
    const bounds = { top: 54, bottom: 214, left: 8, right: 248 };
    const placement = computeToastPlacement({ x: 12, y: 120 }, bounds, 26, 500);
    expect(placement.x).toBe(128);
  });
});

describe("toast timing", () => {
  it("holds at full opacity for the whole hold window", () => {
    expect(toastAlpha(0)).toBe(1);
    expect(toastAlpha(FEEDBACK_TOAST_HOLD_MS)).toBe(1);
  });

  it("fades out linearly after the hold window", () => {
    const mid = toastAlpha(FEEDBACK_TOAST_HOLD_MS + FEEDBACK_TOAST_FADE_MS / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(toastAlpha(FEEDBACK_TOAST_TOTAL_MS)).toBe(0);
  });

  it("lives long enough to read (well past the old 900ms swap)", () => {
    expect(FEEDBACK_TOAST_TOTAL_MS).toBeGreaterThan(900);
    expect(isToastExpired(900)).toBe(false);
    expect(isToastExpired(FEEDBACK_TOAST_TOTAL_MS)).toBe(true);
  });
});
