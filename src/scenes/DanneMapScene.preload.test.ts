import { describe, expect, it, vi } from "vitest";
import { DANNE_MAP_ASSETS, DANNE_SHARED_IMAGE_ASSETS } from "../game/danneAtlas";
import { NaraStacksScene } from "./NaraStacksScene";

vi.mock("phaser", () => ({ default: {
  Scene: class {}, GameObjects: { Sprite: class {} }
} }));

describe("expansion-map demand loading", () => {
  it("loads its own painting but no paintings from other rooms", () => {
    const image = vi.fn();
    const scene = Object.assign(new NaraStacksScene(), {
      load: { image, spritesheet: vi.fn() }, textures: { exists: () => false }
    });
    scene.preload();
    for (const map of DANNE_MAP_ASSETS) {
      if (map.sceneKey === "NaraStacksScene") expect(image).toHaveBeenCalledWith(map.key, map.path);
      else expect(image).not.toHaveBeenCalledWith(map.key, map.path);
    }
    for (const asset of DANNE_SHARED_IMAGE_ASSETS) expect(image).toHaveBeenCalledWith(asset.key, asset.path);
  });

  it("reuses every texture already loaded on a return visit", () => {
    const image = vi.fn(), spritesheet = vi.fn();
    const scene = Object.assign(new NaraStacksScene(), {
      load: { image, spritesheet }, textures: { exists: () => true }
    });
    scene.preload();
    expect(image).not.toHaveBeenCalled();
    expect(spritesheet).not.toHaveBeenCalled();
  });
});
