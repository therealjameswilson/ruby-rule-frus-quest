import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, resetGameState } from "../game/state";
import { retroAudio } from "../systems/audio";
import { applyRoomClearGate, isRoomCleared } from "../systems/roomClear";
import type * as DanneEnemyModule from "./DanneEnemy";
import type { DanneEnemyVariantId } from "./danneVariants";

type DanneEnemyInstance = DanneEnemyModule.DanneEnemy;
type TestRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};
type TestPhaser = {
  GameObjects: { Sprite: new () => { destroy(): void } };
  Geom: {
    Rectangle: new (x: number, y: number, width: number, height: number) => TestRectangle;
    Intersects: { RectangleToRectangle(left: TestRectangle, right: TestRectangle): boolean };
  };
  Display: { Color: { HexStringToColor(hex: string): { color: number } } };
  Math: {
    Between(min: number, max: number): number;
    Clamp(value: number, min: number, max: number): number;
    Distance: { Between(x1: number, y1: number, x2: number, y2: number): number };
  };
};
type TestEnemy = DanneEnemyInstance & {
  x: number;
  y: number;
  scene: { time: { now: number } };
  destroy: ReturnType<typeof vi.fn>;
};

let Phaser: TestPhaser;
let DanneEnemy: typeof DanneEnemyModule.DanneEnemy;
let danneEnemyVariant: typeof import("./danneVariants").danneEnemyVariant;

function dummyVisual() {
  return {
    setVisible: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };
}

function dummyText() {
  return {
    y: 100,
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };
}

function makeEnemy(variantId: DanneEnemyVariantId, hp = 2) {
  const config = danneEnemyVariant(variantId);
  const body = { enable: true };
  const enemy = Object.assign(Object.create(DanneEnemy.prototype), {
    id: `${variantId}-test`,
    roomId: "test-room",
    config,
    maxHp: hp,
    hp,
    speed: config.speed,
    damage: config.damage,
    weakness: config.weakness,
    aggroRadius: config.aggroRadius,
    state: "patrol",
    x: 100,
    y: 100,
    nextToolHitAt: 0,
    lastPlayerSwingId: -1,
    stunnedUntil: 0,
    projectiles: [],
    scene: {
      time: { now: 1000 },
      add: { text: vi.fn(() => dummyText()) },
      tweens: { add: vi.fn() }
    },
    shadow: dummyVisual(),
    hpBack: dummyVisual(),
    hpFill: dummyVisual(),
    label: dummyVisual(),
    attackRing: dummyVisual(),
    attackMark: dummyVisual(),
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    },
    setActive: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    arcadeBody: vi.fn(() => body),
    flash: vi.fn(),
    maybeShowTaunt: vi.fn(),
    destroy: vi.fn()
  });
  return enemy as unknown as TestEnemy;
}

function activeHitbox(): Parameters<DanneEnemyInstance["tryPlayerToolHit"]>[0] {
  return new Phaser.Geom.Rectangle(88, 84, 32, 32) as unknown as Parameters<DanneEnemyInstance["tryPlayerToolHit"]>[0];
}

describe("DanneEnemy combat", () => {
  beforeAll(async () => {
    class Rectangle {
      x: number;
      y: number;
      width: number;
      height: number;
      left: number;
      right: number;
      top: number;
      bottom: number;

      constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.left = x;
        this.right = x + width;
        this.top = y;
        this.bottom = y + height;
      }
    }
    Phaser = {
      GameObjects: {
        Sprite: class {
          destroy() {}
        }
      },
      Geom: {
        Rectangle,
        Intersects: {
          RectangleToRectangle(left: Rectangle, right: Rectangle) {
            return left.left < right.right
              && left.right > right.left
              && left.top < right.bottom
              && left.bottom > right.top;
          }
        }
      },
      Display: {
        Color: {
          HexStringToColor: () => ({ color: 0xffffff })
        }
      },
      Math: {
        Between: (min: number, max: number) => min + Math.floor((max - min) / 2),
        Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
        }
      }
    };
    vi.doMock("phaser", () => ({ default: Phaser }));

    class HTMLCanvasElementStub {
      style = {};
      width = 1;
      height = 1;
      parentNode = null;

      getContext() {
        return {
          createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          putImageData: vi.fn(),
          getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 0, 0, 255]) }))
        };
      }
    }
    const documentStub = {
      pointerLockElement: null,
      documentElement: { style: {} },
      createElement: vi.fn(() => new HTMLCanvasElementStub())
    };
    class ImageStub {
      onload: (() => void) | null = null;
      set src(_: string) {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "window", {
      value: {
        navigator: globalThis.navigator ?? { userAgent: "vitest" },
        location: { href: "http://localhost/" },
        document: documentStub
      },
      configurable: true
    });
    Object.defineProperty(globalThis, "document", {
      value: documentStub,
      configurable: true
    });
    Object.defineProperty(globalThis, "Image", {
      value: ImageStub,
      configurable: true
    });
    Object.defineProperty(globalThis, "HTMLCanvasElement", {
      value: HTMLCanvasElementStub,
      configurable: true
    });
    ({ DanneEnemy } = await import("./DanneEnemy"));
    ({ danneEnemyVariant } = await import("./danneVariants"));
  });

  beforeEach(() => {
    resetGameState();
    vi.spyOn(retroAudio, "toolHit").mockImplementation(() => undefined);
    vi.spyOn(retroAudio, "bossHit").mockImplementation(() => undefined);
    vi.spyOn(retroAudio, "bossDefeat").mockImplementation(() => undefined);
    vi.spyOn(retroAudio, "warning").mockImplementation(() => undefined);
  });

  it("takes damage from the matching FRUS tool", () => {
    const enemy = makeEnemy("danne-mark-i-prototype", 2);

    const result = enemy.tryPlayerToolHit(activeHitbox(), "review_folder", { x: 80, y: 100 }, 1);

    expect(result).toBe("damaged");
    expect(enemy.currentHp).toBe(1);
    expect(retroAudio.toolHit).toHaveBeenCalledWith("review_folder");
  });

  it("knocks back but does not damage on the wrong tool", () => {
    const enemy = makeEnemy("danne-mark-i-prototype", 2);
    const startX = enemy.x;

    const result = enemy.tryPlayerToolHit(activeHitbox(), "red_pencil", { x: 80, y: 100 }, 1);

    expect(result).toBe("wrong-tool");
    expect(enemy.currentHp).toBe(2);
    expect(enemy.x).toBeGreaterThan(startX);
    expect(retroAudio.warning).toHaveBeenCalled();
  });

  it("does not apply damage twice for one active swing id", () => {
    const enemy = makeEnemy("danne-mark-i-prototype", 3);

    expect(enemy.tryPlayerToolHit(activeHitbox(), "review_folder", { x: 80, y: 100 }, 7)).toBe("damaged");
    enemy.scene.time.now = 1300;
    expect(enemy.tryPlayerToolHit(activeHitbox(), "review_folder", { x: 80, y: 100 }, 7)).toBe("cooldown");
    expect(enemy.currentHp).toBe(2);
  });

  it("defeat triggers configured loot and volume assembly progress", () => {
    const enemy = makeEnemy("danne-colossus-final-form", 1);

    const result = enemy.tryPlayerToolHit(activeHitbox(), "red_pencil", { x: 80, y: 100 }, 11);

    expect(result).toBe("defeated");
    expect(enemy.defeated).toBe(true);
    expect(gameState.documentPoints).toBe(8);
    expect(gameState.processStamps).toContain("sop");
    expect(gameState.volumeFragments).toContain("Black Vault Review Fragment");
    expect(gameState.volumeAssembly.earnedPieces).toContain("front_board");
    expect(enemy.destroy).toHaveBeenCalled();
  });

  it("room-clear gates unlock only after every DANN-E enemy is defeated", () => {
    const first = { defeated: true } as DanneEnemyInstance;
    const second = { defeated: false } as DanneEnemyInstance;

    applyRoomClearGate("test-room", [first, second], ["testGateOpen"], "Room opened.");
    expect(isRoomCleared("test-room")).toBe(false);
    expect(gameState.sceneProgress.testGateOpen).toBeUndefined();

    const status = applyRoomClearGate("test-room", [first, { defeated: true } as DanneEnemyInstance], ["testGateOpen"], "Room opened.");
    expect(status.cleared).toBe(true);
    expect(isRoomCleared("test-room")).toBe(true);
    expect(gameState.sceneProgress.testGateOpen).toBe(1);
  });
});
