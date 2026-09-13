import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { addSnesTreasurePedestal } from "./snesPixelArt";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));

class Visual {
  name = "";
  visible = true;
  text = "";
  setName(name: string) { this.name = name; return this; }
  setVisible(visible: boolean) { this.visible = visible; return this; }
  setText(text: string) { this.text = text; return this; }
  setColor() { return this; }
  setDepth() { return this; }
  setStrokeStyle() { return this; }
  setOrigin() { return this; }
}

describe("treasure pedestal presentation", () => {
  it.each([true, false])("retires collectible art, including texture fallback=%s", (fallback) => {
    const objects: Visual[] = [];
    const create = () => { const object = new Visual(); objects.push(object); return object; };
    const scene = { textures: { exists: () => !fallback }, add: { ellipse: create, rectangle: create, image: create, text: create } } as unknown as Phaser.Scene;
    const pedestal = addSnesTreasurePedestal(scene, { x: 128, y: 132, label: "Fragment", textureKey: "volume-fragment" });
    const pickup = objects.filter(o => /icon|spark/.test(o.name));
    expect(pickup.length).toBe(9);
    expect(pickup.every(o => o.visible)).toBe(true);
    pedestal.markCollected();
    pedestal.markCollected();
    expect(pickup.every(o => !o.visible)).toBe(true);
    expect(objects.find(o => o.name === "snes-treasure-label")?.text).toBe("FILED");
    expect(objects.find(o => o.name === "snes-treasure-case")?.visible).toBe(true);
    objects.length = 0;
    addSnesTreasurePedestal(scene, { x: 128, y: 132, label: "Fragment", textureKey: "volume-fragment", collected: true });
    expect(objects.filter(o => /icon|spark/.test(o.name)).every(o => !o.visible)).toBe(true);
  });
});
