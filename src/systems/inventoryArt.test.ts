import { EventEmitter } from "node:events";
import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { INVENTORY_ART, InventoryArtLoader } from "./inventoryArt";

vi.mock("phaser", () => ({ default: { Loader: { Events: { COMPLETE: "complete" } } } }));

function fixture() {
  const loaded = new Set<string>();
  const events = new EventEmitter();
  const image = vi.fn(), start = vi.fn(), changed = vi.fn();
  const load = Object.assign(events, { image, start, isLoading: () => false });
  const scene = { load, textures: { exists: (key: string) => loaded.has(key) } } as unknown as Phaser.Scene;
  return { loaded, events, image, start, changed, art: new InventoryArtLoader(scene, changed) };
}

describe("inventory art loading", () => {
  it("loads once, completes only with every texture, and reuses cache", () => {
    const f = fixture();
    f.art.load(); f.art.load();
    expect(f.art.status).toBe("loading");
    expect(f.image).toHaveBeenCalledTimes(INVENTORY_ART.length);
    expect(f.start).toHaveBeenCalledOnce();
    for (const asset of INVENTORY_ART) f.loaded.add(asset.key);
    f.events.emit("complete");
    expect(f.art.status).toBe("ready");
    expect(f.changed).toHaveBeenCalledOnce();
    f.art.load();
    expect(f.start).toHaveBeenCalledOnce();
  });
  it("reports a failed asset and retries only the missing texture", () => {
    const f = fixture();
    for (const asset of INVENTORY_ART.slice(1)) f.loaded.add(asset.key);
    f.art.load(); f.events.emit("complete");
    expect(f.art.status).toBe("error");
    f.art.load();
    expect(f.image.mock.calls).toEqual([[INVENTORY_ART[0].key, INVENTORY_ART[0].path],
      [INVENTORY_ART[0].key, INVENTORY_ART[0].path]]);
    f.loaded.add(INVENTORY_ART[0].key); f.events.emit("complete");
    expect(f.art.status).toBe("ready");
  });
  it("detaches on scene shutdown so a late completion cannot redraw", () => {
    const f = fixture(); f.art.load(); f.art.destroy();
    f.events.emit("complete");
    expect(f.changed).not.toHaveBeenCalled();
  });
});
