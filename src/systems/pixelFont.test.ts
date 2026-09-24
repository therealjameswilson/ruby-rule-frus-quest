// Legacy bitmap compatibility remains available at native rendering density.
vi.mock("./renderDensity", () => ({ RENDER_DENSITY: 1 }));
import Phaser from "phaser";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installPixelTextFactory } from "./pixelFont";
import { PIXEL_FONT_KEY, SMALL_PIXEL_FONT_KEY } from "./pixelFontMetrics";

vi.mock("phaser", () => ({ default: {
  GameObjects: { GameObjectFactory: { prototype: { text: vi.fn() } } }
} }));

function createText(size: string) {
  const bitmap = {
    font: "", fontSize: 0, tint: 0xffffff, text: "", x: 0, y: 0,
    setText(value: string) { this.text = value; return this; },
    setFontSize(value: number) { this.fontSize = value; return this; },
    setFont(key: string, value: number) { this.font = key; this.fontSize = value; return this; },
    setTint(value: number) { this.tint = value; return this; }
  };
  const factory = {
    scene: { cache: { bitmapFont: { has: () => true } } },
    bitmapText(x: number, y: number, key: string, text: string, fontSize: number) {
      Object.assign(bitmap, { x, y, font: key, text, fontSize });
      return bitmap;
    }
  };
  const text = Phaser.GameObjects.GameObjectFactory.prototype.text.call(
    factory as unknown as Phaser.GameObjects.GameObjectFactory,
    10.4, 20.7, "READ", { fontSize: size, color: "#ffaa00" }
  );
  return { bitmap, text };
}

describe("pixel text compatibility", () => {
  beforeAll(() => installPixelTextFactory());

  it("chooses the native face and snaps its initial position", () => {
    const { bitmap } = createText("7px");
    expect(bitmap).toMatchObject({ font: SMALL_PIXEL_FONT_KEY, fontSize: 6, x: 10, y: 21 });
  });

  it("switches native faces when an existing label is resized", () => {
    const { bitmap, text } = createText("7px");
    text.setFontSize(8);
    expect(bitmap).toMatchObject({ font: PIXEL_FONT_KEY, fontSize: 8 });
    text.setFontSize(5);
    expect(bitmap).toMatchObject({ font: SMALL_PIXEL_FONT_KEY, fontSize: 6 });
  });

  it("keeps font size and color on unrelated style changes", () => {
    const { bitmap, text } = createText("6px");
    text.setStyle({ backgroundColor: "#000000" });
    expect(bitmap).toMatchObject({ fontSize: 6, tint: 0xffaa00 });
    text.setStyle({ color: "#ff0000" });
    expect(bitmap).toMatchObject({ fontSize: 6, tint: 0xff0000 });
    text.setStyle({ fontSize: "16px" });
    expect(bitmap).toMatchObject({ font: PIXEL_FONT_KEY, fontSize: 16, tint: 0xff0000 });
  });
});
