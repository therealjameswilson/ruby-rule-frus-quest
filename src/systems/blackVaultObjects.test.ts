import { beforeEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { BlackVaultObjects } from "./blackVaultObjects";
import { gameState, resetGameState } from "../game/state";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));

function node(x: number, y: number) {
  return { x, y, name: "", visible: true, width: 0, height: 0,
    setName(name: string) { this.name = name; return this; },
    setVisible(visible: boolean) { this.visible = visible; return this; },
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setSize(width: number, height: number) { this.width = width; this.height = height; return this; },
    setScale: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setStrokeStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis() };
}

function room(art = true) {
  const nodes: ReturnType<typeof node>[] = [];
  const add = (x: number, y: number) => { const n = node(x, y); nodes.push(n); return n; };
  const images = vi.fn(add);
  const scene = { add: { rectangle: add, ellipse: add, container: add, image: images },
    textures: { exists: () => art, get: () => ({ has: () => true }) } };
  const objects = new BlackVaultObjects(scene as unknown as Phaser.Scene);
  const targets = DANNE_SCENE_GEOMETRY.BlackVaultLairScene.interactions.map((target) => ({ ...target, onInteract: vi.fn() }));
  return { objects, targets, images, named: (name: string) => nodes.find((n) => n.name === name)! };
}

beforeEach(() => resetGameState());

describe("Black Vault physical objects", () => {
  it("places original terminal/book/paper art at their real interaction coordinates", () => {
    const { named, targets, images } = room();
    expect(images).toHaveBeenCalledTimes(3);
    for (const target of targets.filter((target) => target.action !== "return-office")) {
      expect(named(`black-vault-object-${target.id}`)).toMatchObject({ x: target.x, y: target.y });
    }
  });

  it("honors spent-cache and claimed-fragment saves on entry", () => {
    gameState.sceneProgress.blackVaultReliabilityCacheUsed = 1;
    gameState.sceneProgress.blackVaultBossCleared = 1;
    gameState.inventory.push("Treaty Fragment III");
    const { objects, named, targets } = room();
    expect(named("black-vault-object-vault-reliability-cache").visible).toBe(false);
    expect(named("black-vault-object-vault-treaty-fragment").visible).toBe(false);
    expect(named("black-vault-object-vault-core-trigger").visible).toBe(true);
    objects.syncTargets(targets);
    expect(targets.some((target) => target.id === "vault-treaty-fragment")).toBe(false);
    expect(objects.visibleLabels()).toEqual(["DANN-E Core Trigger"]);
  });

  it("outlines only an available nearby object and clears cues for menus and combat", () => {
    const { objects, named, targets } = room();
    const cache = targets.find((target) => target.action === "reliability-cache")!;
    objects.update(cache);
    expect(named("black-vault-target-outline")).toMatchObject({ x: 128, y: 174, width: 16, height: 20, visible: true });
    objects.update(cache, false);
    expect(named("black-vault-target-outline").visible).toBe(false);
    objects.update(cache, true, true);
    expect(named("black-vault-object-vault-core-trigger").visible).toBe(false);
    expect(named("black-vault-object-vault-reliability-cache").visible).toBe(false);
    expect(objects.visibleLabels()).toEqual([]);
  });

  it("retains fallback props when the art is missing without inventing new hotspots", () => {
    const { objects, named, targets, images } = room(false);
    expect(images).not.toHaveBeenCalled();
    objects.update(targets.find((target) => target.action === "return-office")!);
    expect(named("black-vault-target-outline")).toMatchObject({ x: 128, y: 220, width: 38, height: 12 });
  });
});
