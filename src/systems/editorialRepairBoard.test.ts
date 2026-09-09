import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorialRepairBoard } from "./editorialRepairBoard";
import { EDITORIAL_REPAIR_RECORDS } from "../game/editorialRepair";
import { bindPointerDown, getInput, swallowNextInputFrame, type InputState } from "../input/InputState";
import { resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), stamp: vi.fn() } }));

class Display {
  visible = true;
  text = "";
  constructor(readonly width = 0) {}
  add() { return this; }
  setName() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setStrokeStyle() { return this; }
  setOrigin() { return this; }
  setText(value: string) { this.text = value; return this; }
}

function fixture(proof = false) {
  const objects: Display[] = [];
  const create = (width = 0) => { const object = new Display(width); objects.push(object); return object; };
  const scene = { events: { emit: vi.fn() }, add: {
    container: () => create(), rectangle: (_x: number, _y: number, width: number) => create(width),
    text: (_x: number, _y: number, text: string) => create().setText(text)
  } };
  const board = new EditorialRepairBoard(scene as unknown as Phaser.Scene);
  const change = vi.fn(), file = vi.fn();
  const open = (repaired = proof) => board.show(EDITORIAL_REPAIR_RECORDS[0], repaired, proof, change, file);
  const pointer = (index: number) => {
    const target = objects.filter(object => [216, 112, 100].includes(object.width))[index];
    const call = vi.mocked(bindPointerDown).mock.calls.find(([object]) => object === target as unknown);
    if (!call) throw new Error("Missing pointer target");
    call[1]();
  };
  const input = (value: Partial<InputState>) => { vi.mocked(getInput).mockReturnValue(value as InputState); board.updateInput(); };
  return { board, objects, change, file, open, pointer, input };
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); vi.mocked(getInput).mockReturnValue({} as InputState); });

describe("editable withholding indication board", () => {
  it("names the repair action and replaces it with the authored indication after repair", () => {
    const f = fixture(); f.open();
    expect(f.objects.some(object => object.text === "+ ADD WITHHOLDING INDICATION")).toBe(true);
    f.pointer(0);
    expect(f.objects.some(object => object.text === "+ ADD WITHHOLDING INDICATION")).toBe(false);
    expect(f.objects.some(object => object.text === EDITORIAL_REPAIR_RECORDS[0].indication)).toBe(true);
    expect(f.file).not.toHaveBeenCalled();
  });

  it("requires separate repair and filing presses, then ignores hidden input", () => {
    const f = fixture(); f.open();
    expect(f.change).not.toHaveBeenCalled(); expect(f.file).not.toHaveBeenCalled();
    f.input({ aJustPressed: true });
    expect(f.change).toHaveBeenCalledOnce(); expect(f.file).not.toHaveBeenCalled();
    f.input({ aJustPressed: true });
    expect(f.file).toHaveBeenCalledOnce(); expect(f.board.active).toBe(false);
    f.pointer(1); f.input({ aJustPressed: true }); expect(f.file).toHaveBeenCalledOnce();
  });

  it("rejects a missing indication without damage and supports direct touch repair", () => {
    const f = fixture(); f.open(); f.pointer(1);
    expect(f.file).not.toHaveBeenCalled(); expect(f.board.active).toBe(true);
    expect(f.objects.some(object => object.text === "THE WITHHOLDING IS INVISIBLE")).toBe(true);
    f.pointer(0); f.pointer(0); expect(f.change).toHaveBeenCalledOnce();
    f.pointer(1); expect(f.file).toHaveBeenCalledOnce();
  });

  it("swallows cancel ahead of A and resumes an edited first-time draft without filing it", () => {
    const f = fixture(); f.open(); f.input({ aJustPressed: true });
    f.input({ bJustPressed: true, aJustPressed: true });
    expect(f.board.active).toBe(false); expect(f.file).not.toHaveBeenCalled();
    expect(swallowNextInputFrame).toHaveBeenCalled();
    f.open(true); expect(f.file).not.toHaveBeenCalled();
    f.input({ confirmJustPressed: true }); expect(f.file).toHaveBeenCalledOnce();
  });

  it("compares a proof without editing it and still requires human filing", () => {
    const f = fixture(true); f.open(); f.pointer(0);
    expect(f.change).not.toHaveBeenCalled(); expect(f.file).not.toHaveBeenCalled();
    f.input({ aJustPressed: true }); expect(f.file).toHaveBeenCalledOnce();
    expect(f.objects.some(object => object.text === "FILE PROOF")).toBe(true);
  });

  it("lets both keyboard and touch return without applying a correction", () => {
    const f = fixture(); f.open();
    f.input({ navLeftJustPressed: true }); f.input({ aJustPressed: true });
    expect(f.board.active).toBe(false);
    f.open(); f.pointer(2);
    expect(f.board.active).toBe(false); expect(f.file).not.toHaveBeenCalled(); expect(f.change).not.toHaveBeenCalled();
  });
});
