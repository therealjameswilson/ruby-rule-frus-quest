import { beforeEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { enterCutscene, exitCutscene, isCutsceneActive, playLine } from "./cutscene";

const device = vi.hoisted(() => ({ touch: false }));
vi.mock("../input/InputState", () => ({ isTouchInputCapable: () => device.touch }));
vi.mock("../game/state", () => ({
  clearDialogState: vi.fn(), setDialogState: vi.fn(), setGameMode: vi.fn(), setLatestMessage: vi.fn()
}));
vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: () => ({ color: 0 }) } },
  Scenes: { Events: { SHUTDOWN: "shutdown" } }
} }));

class Visual {
  visible = true;
  scale = 1;
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setText() { return this; }
  setTexture() { return this; }
  setScale(value: number) { this.scale = value; return this; }
  add() { return this; }
}

function fixture() {
  const rectangles: Visual[] = [];
  const portraits: Visual[] = [];
  let text = new Visual();
  const scene = {
    add: {
      rectangle: (x: number, y: number, w: number, h: number) => {
        const result = new Visual(x, y, w, h); rectangles.push(result); return result;
      },
      image: (x: number, y: number) => {
        const result = new Visual(x, y, 24, 24); portraits.push(result); return result;
      },
      text: (x: number, y: number) => { text = new Visual(x, y); return text; },
      container: () => new Visual()
    },
    textures: { exists: (key: string) => key === "portrait", get: () => ({ getSourceImage: () => ({ width: 24, height: 24 }) }) },
    events: { once: vi.fn() },
    tweens: { add: (config: { onComplete: () => void }) => config.onComplete() }
  } as unknown as Phaser.Scene;
  return { scene, rectangles, portraits, get text() { return text; } };
}

describe("compact cutscene layout", () => {
  beforeEach(() => { device.touch = false; });
  it.each([false, true])("separates portrait, text and touch controls (touch=%s)", async touch => {
    device.touch = touch;
    const f = fixture();
    await enterCutscene(f.scene);
    playLine(f.scene, "Your source notes will be empty brackets.", "portrait");
    expect(isCutsceneActive(f.scene)).toBe(true);
    expect(f.portraits[0].x + 12).toBeLessThan(f.text.x);
    const frame = f.rectangles[2];
    expect(f.text.y).toBeGreaterThan(frame.y - frame.height / 2);
    expect(f.text.y + 27).toBeLessThan(frame.y + frame.height / 2);
    if (touch) expect(frame.y + frame.height / 2).toBeLessThanOrEqual(168);
    playLine(f.scene, "Without a portrait.");
    expect(f.portraits[0].visible).toBe(false);
    await exitCutscene(f.scene);
    expect(isCutsceneActive(f.scene)).toBe(false);
  });
});
