import { describe, expect, it } from "vitest";
import { PIXEL_FONT_KEY, SMALL_GLYPHS, SMALL_PIXEL_FONT_KEY, pixelFontMetrics } from "./pixelFontMetrics";

describe("native pixel text", () => {
  it("never renders glyphs at a fractional scale", () => {
    for (let requested = 4; requested <= 64; requested += 0.25) {
      const metrics = pixelFontMetrics(requested);
      expect(Number.isInteger(metrics.scale)).toBe(true);
      expect(metrics.scale).toBeGreaterThanOrEqual(1);
      expect(metrics.fontSize).toBeGreaterThanOrEqual(6);
      expect(Number.isInteger(metrics.advance)).toBe(true);
    }
  });

  it("uses compact glyphs for small captions and full glyphs for body text", () => {
    expect(pixelFontMetrics("7px")).toMatchObject({ key: SMALL_PIXEL_FONT_KEY, fontSize: 6, scale: 1 });
    expect(pixelFontMetrics("8px")).toMatchObject({ key: PIXEL_FONT_KEY, fontSize: 8, scale: 1 });
    expect(pixelFontMetrics(16)).toMatchObject({ key: PIXEL_FONT_KEY, fontSize: 16, scale: 2 });
    for (const input of [undefined, NaN, Infinity, "invalid"]) {
      expect(pixelFontMetrics(input).fontSize).toBe(8);
    }
  });

  it("authors every printable ASCII glyph at 3x5, including punctuation", () => {
    for (let code = 32; code < 127; code += 1) {
      const glyph = SMALL_GLYPHS[String.fromCharCode(code).toUpperCase()];
      expect(glyph).toHaveLength(5);
      expect(glyph.every((row) => /^[.#]{3}$/.test(row))).toBe(true);
      if (code !== 32) expect(glyph.some((row) => row.includes("#"))).toBe(true);
    }
    const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => SMALL_GLYPHS[letter].join(""));
    expect(new Set(letters).size).toBe(26);
  });
});
