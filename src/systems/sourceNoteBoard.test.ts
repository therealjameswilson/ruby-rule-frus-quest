import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceNoteBoard } from "./sourceNoteBoard";
import { bindPointerDown, getInput, swallowNextInputFrame, type InputState } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), stamp: vi.fn() } }));

class Display {
  visible = true;
  text = "";
  children: Display[] = [];
  add(value: Display | Display[]) { this.children.push(...(Array.isArray(value) ? value : [value])); return this; }
  setName() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setStrokeStyle() { return this; }
  setLineSpacing() { return this; }
  setText(value: string) { this.text = value; return this; }
}

function fixture(repaired = false) {
  const objects: Display[] = [];
  const create = () => { const object = new Display(); objects.push(object); return object; };
  const scene = { events: { emit: vi.fn() }, add: { container: create, rectangle: create,
    text: (_x: number, _y: number, text: string) => create().setText(text) } };
  const board = new SourceNoteBoard(scene as unknown as Phaser.Scene);
  const onChange = vi.fn(), onFile = vi.fn(), onCancel = vi.fn();
  const pointer = (index: number) => vi.mocked(bindPointerDown).mock.calls[index][1]();
  const input = (input: Partial<InputState>) => { vi.mocked(getInput).mockReturnValue(input as InputState); board.updateInput(); };
  const open = () => board.show(repaired, onChange, onFile, onCancel);
  return { board, objects, onChange, onFile, onCancel, pointer, input, open };
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); vi.mocked(getInput).mockReturnValue({} as InputState); });

describe("source note evidence repair board", () => {
  it("does not grant progress on open or from hidden controls", () => {
    const f = fixture(); f.pointer(0); f.pointer(1);
    expect(f.onChange).not.toHaveBeenCalled(); expect(f.onFile).not.toHaveBeenCalled();
    f.open();
    expect(f.board.active).toBe(true);
    expect(f.onFile).not.toHaveBeenCalled();
    expect(gameState.currentChoice?.options[0].value).toBe("unsupported_readership");
    expect(swallowNextInputFrame).toHaveBeenCalled();
  });

  it("rejects unsupported filing without charging hearts or points", () => {
    const f = fixture(); f.open();
    const before = [gameState.reliability, gameState.documentPoints];
    f.pointer(1);
    expect(f.board.active).toBe(true);
    expect(f.onFile).not.toHaveBeenCalled();
    expect(f.objects.some(object => object.text === "CHECK THE READERSHIP CLAIM")).toBe(true);
    expect([gameState.reliability, gameState.documentPoints]).toEqual(before);
  });

  it("repairs once, then requires a distinct human filing input", () => {
    const f = fixture(); f.open(); f.input({ aJustPressed: true });
    f.pointer(0);
    expect(f.onChange).toHaveBeenCalledOnce(); expect(f.onFile).not.toHaveBeenCalled();
    expect(gameState.currentChoice?.options[0].value).toBe("evidence_limited");
    f.input({ confirmJustPressed: true });
    expect(f.onFile).toHaveBeenCalledOnce(); expect(f.onCancel).not.toHaveBeenCalled();
    expect(f.board.active).toBe(false);
    f.pointer(1); expect(f.onFile).toHaveBeenCalledOnce();
  });

  it("names the repair action before selection and the retained evidence limit afterward", () => {
    const f = fixture(); f.open();
    expect(f.objects.some(object => object.text === "DRAFT: PRESIDENT READ IT\nREMOVE UNSUPPORTED CLAIM")).toBe(true);
    f.pointer(0);
    expect(f.objects.some(object => object.text === "READERS: NOT ESTABLISHED\nEVIDENCE LIMIT RETAINED")).toBe(true);
    expect(f.onFile).not.toHaveBeenCalled();
  });

  it("allows pointer repair and filing and resumes a repaired but unfiled packet", () => {
    const f = fixture(true); f.open(); f.pointer(0); f.pointer(1);
    expect(f.onChange).not.toHaveBeenCalled(); expect(f.onFile).toHaveBeenCalledOnce();
  });

  it("supports Return, B, Esc and cancel without falling through to combat", () => {
    const f = fixture(); f.open(); f.pointer(2);
    expect(f.onCancel).toHaveBeenCalledOnce();
    for (const key of ["bJustPressed", "pauseJustPressed", "cancelJustPressed"] as const) {
      f.open(); f.input({ [key]: true, aJustPressed: true });
      expect(f.board.active).toBe(false);
    }
    expect(f.onCancel).toHaveBeenCalledTimes(4); expect(f.onFile).not.toHaveBeenCalled();
    expect(gameState.currentChoice).toBeNull();
  });

  it("can select Return in either navigation direction", () => {
    const f = fixture(); f.open(); f.input({ navLeftJustPressed: true }); f.input({ aJustPressed: true });
    expect(f.onCancel).toHaveBeenCalledOnce();
  });
});
