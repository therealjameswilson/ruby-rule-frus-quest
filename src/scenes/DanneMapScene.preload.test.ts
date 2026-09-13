import { describe, expect, it, vi } from "vitest";
import { DANNE_BOSS_HUD_ASSET, DANNE_BOSS_PORTRAIT_ASSET, DANNE_LETTERBOX_ASSET, DANNE_MAP_ASSETS, DANNE_SHARED_IMAGE_ASSETS } from "../game/danneAtlas";
import { NaraStacksScene } from "./NaraStacksScene";
import { BlackVaultLairScene } from "./BlackVaultLairScene";

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
    expect(image).not.toHaveBeenCalledWith(DANNE_BOSS_PORTRAIT_ASSET.key, DANNE_BOSS_PORTRAIT_ASSET.path);
    expect(image).not.toHaveBeenCalledWith(DANNE_BOSS_HUD_ASSET.key, DANNE_BOSS_HUD_ASSET.path);
    expect(image).not.toHaveBeenCalledWith(DANNE_LETTERBOX_ASSET.key, DANNE_LETTERBOX_ASSET.path);
    for (const map of DANNE_MAP_ASSETS) {
      if (map.sceneKey === "NaraStacksScene") expect(image).toHaveBeenCalledWith(map.key, map.path);
      else expect(image).not.toHaveBeenCalledWith(map.key, map.path);
    }
    for (const asset of DANNE_SHARED_IMAGE_ASSETS) expect(image).toHaveBeenCalledWith(asset.key, asset.path);
  });

  it("loads the boss speaker portrait before entering Black Vault", () => {
    const image = vi.fn();
    const scene = Object.assign(new BlackVaultLairScene(), {
      load: { image, spritesheet: vi.fn() }, textures: { exists: () => false }
    });
    scene.preload();
    expect(image).toHaveBeenCalledWith(DANNE_BOSS_PORTRAIT_ASSET.key, DANNE_BOSS_PORTRAIT_ASSET.path);
    expect(image).toHaveBeenCalledWith(DANNE_BOSS_HUD_ASSET.key, DANNE_BOSS_HUD_ASSET.path);
    expect(DANNE_SHARED_IMAGE_ASSETS).not.toContain(DANNE_BOSS_HUD_ASSET);
    expect(image).toHaveBeenCalledWith(DANNE_LETTERBOX_ASSET.key, DANNE_LETTERBOX_ASSET.path);
    expect(DANNE_SHARED_IMAGE_ASSETS).not.toContain(DANNE_LETTERBOX_ASSET);
    expect(DANNE_SHARED_IMAGE_ASSETS).not.toContain(DANNE_BOSS_PORTRAIT_ASSET);
  });

  it.each([NaraStacksScene, BlackVaultLairScene])("reuses every texture already loaded on a return visit", Scene => {
    const image = vi.fn(), spritesheet = vi.fn();
    const scene = Object.assign(new Scene(), {
      load: { image, spritesheet }, textures: { exists: () => true }
    });
    scene.preload();
    expect(image).not.toHaveBeenCalled();
    expect(spritesheet).not.toHaveBeenCalled();
  });

  it("retains the boss HUD in other rooms for the UI debug controls", () => {
    vi.stubGlobal("window", { location: { search: "?debug=ui" } });
    try {
      const image = vi.fn();
      const scene = Object.assign(new NaraStacksScene(), {
        load: { image, spritesheet: vi.fn() }, textures: { exists: () => false }
      });
      scene.preload();
      expect(image).toHaveBeenCalledWith(DANNE_BOSS_HUD_ASSET.key, DANNE_BOSS_HUD_ASSET.path);
      expect(image).toHaveBeenCalledWith(DANNE_LETTERBOX_ASSET.key, DANNE_LETTERBOX_ASSET.path);
    } finally { vi.unstubAllGlobals(); }
  });
});
