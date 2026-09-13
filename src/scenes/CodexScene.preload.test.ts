import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodexScene } from "./CodexScene";
import { gameState, resetGameState } from "../game/state";
import { DANNE_PORTRAIT_ASSETS, DANNE_VARIANT_ASSETS } from "../game/danneAtlas";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));

beforeEach(() => resetGameState());

describe("field-guide loading safety", () => {
  it("pauses the parent before queuing unlocked portraits and leaves locked variants unloaded", () => {
    const order: string[] = [];
    const label = { setOrigin: vi.fn().mockReturnThis(), setName: vi.fn().mockReturnThis() };
    const image = vi.fn(() => order.push("load"));
    const camera = { setBackgroundColor: vi.fn().mockReturnThis(), setRoundPixels: vi.fn().mockReturnThis() };
    const guide = Object.assign(new CodexScene(), {
      scene: { key: "CodexScene", isActive: () => true, pause: () => order.push("pause") },
      textures: { exists: () => false }, load: { image }, add: { text: () => label }, cameras: { main: camera }
    });
    gameState.heldItem = "Source Note 47";
    guide.init({ returnScene: "ArchiveScene" });
    guide.preload();
    expect(order[0]).toBe("pause");
    expect(gameState.mode).toBe("pause");
    expect(gameState.currentScene).toBe("CodexScene");
    expect((guide as unknown as { previousState: { heldItem: string } }).previousState.heldItem).toBe("Source Note 47");
    for (const asset of DANNE_PORTRAIT_ASSETS.slice(0, 3)) expect(image).toHaveBeenCalledWith(asset.key, asset.path);
    for (const asset of DANNE_VARIANT_ASSETS) expect(image).not.toHaveBeenCalledWith(asset.key, asset.path);
    expect(label.setName).toHaveBeenCalledWith("codex-loading");
  });

  it("does not fetch or show a loading indicator when known art is already cached", () => {
    const image = vi.fn(), text = vi.fn();
    const guide = Object.assign(new CodexScene(), { textures: { exists: () => true }, load: { image }, add: { text } });
    guide.preload();
    expect(image).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });
});
