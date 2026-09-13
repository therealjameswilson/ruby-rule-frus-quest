import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrossReferenceBoard } from "./crossReferenceBoard";
import { bindPointerDown, getInput, swallowNextInputFrame, type InputState } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), blip: vi.fn() } }));

class Display {
  visible = true;
  text = "";
  add() { return this; }
  setName() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setStrokeStyle() { return this; }
  setOrigin() { return this; }
  setLineSpacing() { return this; }
  setText(value: string) { this.text = value; return this; }
}

function fixture(draft = 0) {
  const objects: Display[] = [];
  const rectangles: { x: number; y: number; width: number; height: number }[] = [];
  const create = () => { const object = new Display(); objects.push(object); return object; };
  const scene = { events: { emit: vi.fn() }, add: { container: create, rectangle: (x: number, y: number, width: number, height: number) => {
    rectangles.push({ x, y, width, height }); return create();
  },
    text: (_x: number, _y: number, text: string) => create().setText(text) } };
  const board = new CrossReferenceBoard(scene as unknown as Phaser.Scene);
  const onChange = vi.fn(), onFile = vi.fn();
  const pointer = (index: number) => vi.mocked(bindPointerDown).mock.calls[index][1]();
  const input = (value: Partial<InputState>) => { vi.mocked(getInput).mockReturnValue(value as InputState); board.updateInput(); };
  const open = () => board.show(draft, onChange, onFile);
  return { board, objects, rectangles, onChange, onFile, pointer, input, open };
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); vi.mocked(getInput).mockReturnValue({} as InputState); });

describe("cross-reference catalog interaction", () => {
  it("keeps cards and filing outside the full virtual control hit rectangles", () => {
    const f = fixture();
    const actions = f.rectangles.slice(2);
    const filing = actions[3];
    expect(filing.x - filing.width / 2).toBeGreaterThan(256 / 3);
    for (const r of actions) {
      expect(r.width).toBeGreaterThanOrEqual(34);
      expect(r.height).toBeGreaterThanOrEqual(34);
      // Current TouchControls hit zones, not only their smaller visible circles.
      for (const p of [{ x: 174, y: 216, width: 48, height: 48 },
        { x: 225, y: 205, width: 58, height: 58 },
        { x: 224, y: 16, width: 54, height: 28 },
        { x: 128, y: 17, width: 50, height: 26 }]) {
        expect(Math.abs(p.x - r.x) <= (p.width + r.width) / 2
          && Math.abs(p.y - r.y) <= (p.height + r.height) / 2).toBe(false);
      }
    }
  });
  it("cannot file from hidden controls, opening, or a missing selection", () => {
    const f = fixture(); f.pointer(1); f.pointer(3); f.open(); f.pointer(3);
    expect(f.onChange).not.toHaveBeenCalled();
    expect(f.onFile).not.toHaveBeenCalled();
    expect(f.board.active).toBe(true);
    expect(f.objects.some(o => o.text === "SELECT A RECORD FIRST")).toBe(true);
  });
  it.each([0, 2])("gives a specific hint for mismatch %i without charging resources", index => {
    const f = fixture(); f.open();
    const before = [gameState.reliability, gameState.documentPoints];
    f.pointer(index); f.pointer(3);
    expect(f.board.active).toBe(true);
    expect(f.onFile).not.toHaveBeenCalled();
    expect(f.objects.some(o => o.text.includes("WRONG"))).toBe(true);
    expect([gameState.reliability, gameState.documentPoints]).toEqual(before);
  });
  it("pins with keyboard, files separately, and ignores late clicks", () => {
    const f = fixture(); f.open();
    f.input({ navDownJustPressed: true }); f.input({ aJustPressed: true });
    expect(f.onChange).toHaveBeenCalledWith(2);
    expect(f.onFile).not.toHaveBeenCalled();
    expect(gameState.currentChoice?.options[1].value).toBe("pinned");
    f.input({ confirmJustPressed: true });
    expect(f.onFile).toHaveBeenCalledExactlyOnceWith(2);
    expect(f.board.active).toBe(false);
    f.pointer(3);
    expect(f.onFile).toHaveBeenCalledOnce();
  });
  it("restores a correct-but-unfiled draft without granting approval", () => {
    const f = fixture(2); f.open();
    expect(gameState.currentChoice?.options[1].value).toBe("pinned");
    expect(f.onFile).not.toHaveBeenCalled();
    f.pointer(3); expect(f.onFile).toHaveBeenCalledWith(2);
  });
  it("allows wrong drafts to be changed, not permanently locked", () => {
    const f = fixture(1); f.open(); f.pointer(2); f.pointer(3); f.pointer(1); f.pointer(3);
    expect(f.onChange.mock.calls).toEqual([[3], [2]]);
    expect(f.onFile).toHaveBeenCalledExactlyOnceWith(2);
  });
  it.each(["cancelJustPressed", "bJustPressed", "pauseJustPressed"] as const)("swallows %s before action", key => {
    const f = fixture(2); f.open(); f.input({ [key]: true, aJustPressed: true });
    expect(f.board.active).toBe(false);
    expect(f.onChange).not.toHaveBeenCalled(); expect(f.onFile).not.toHaveBeenCalled();
    expect(gameState.currentChoice).toBeNull(); expect(swallowNextInputFrame).toHaveBeenCalled();
  });
});
