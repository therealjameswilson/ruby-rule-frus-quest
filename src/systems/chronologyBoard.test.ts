import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChronologyBoard, WithholdingChronologyBoard } from "./withholdingChronologyBoard";
import { bindPointerDown, getInput, type InputState } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";
import { EDITOR_CHRONOLOGY_EVIDENCE, editorChronologySequence, restoreEditorChronology,
  shiftEditorChronology, validateEditorChronology } from "../game/editorChronology";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } },
  Geom: { Rectangle: class { static Contains() { return true; } } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), blip: vi.fn() } }));
class Display {
  visible = true;
  constructor(public width = 0, public height = 0) {}
  add() { return this; } setName() { return this; } setDepth() { return this; }
  setScrollFactor() { return this; } setStrokeStyle() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setText() { return this; } setOrigin() { return this; } setInteractive() { return this; }
  setColor() { return this; } setFillStyle() { return this; }
}
function fixture(legacy = false) {
  const scene = { events: { emit: vi.fn() }, add: { container: () => new Display(),
    rectangle: (_x: number, _y: number, w: number, h: number) => new Display(w, h), text: () => new Display() } };
  const board = legacy ? new WithholdingChronologyBoard(scene as unknown as Phaser.Scene)
    : new ChronologyBoard(scene as unknown as Phaser.Scene, { title: "CHRONOLOGY", heading: "CHRONOLOGY",
      evidence: EDITOR_CHRONOLOGY_EVIDENCE, initialMessage: "OUT OF ORDER", restore: restoreEditorChronology,
      shift: shiftEditorChronology, sequence: editorChronologySequence, validate: validateEditorChronology });
  const change = vi.fn(), approve = vi.fn();
  const press = (input: Partial<InputState>) => { vi.mocked(getInput).mockReturnValue(input as InputState); board.updateInput(); };
  const tap = (index: number) => vi.mocked(bindPointerDown).mock.calls[index][1]();
  return { board, change, approve, press, tap };
}
beforeEach(() => { resetGameState(); vi.clearAllMocks(); });
describe("chronology board controls", () => {
  it("rejects the faulty order, moves the record, then files explicitly", () => {
    const f = fixture(); f.board.show(undefined, f.change, f.approve);
    f.tap(2); expect(f.approve).not.toHaveBeenCalled(); expect(f.board.active).toBe(true);
    f.tap(0); expect(f.change).toHaveBeenCalledExactlyOnceWith(2);
    expect(gameState.currentChoice?.options[1].value).toBe("memcon");
    expect(f.approve).not.toHaveBeenCalled();
    f.tap(2); expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);
    f.tap(0); f.tap(2); expect(f.change).toHaveBeenCalledOnce(); expect(f.approve).toHaveBeenCalledOnce();
  });
  it("restores a correct unfiled placement and files through keyboard", () => {
    const f = fixture(); f.board.show(2, f.change, f.approve);
    expect(f.approve).not.toHaveBeenCalled();
    f.press({ navDownJustPressed: true }); f.press({ confirmJustPressed: true });
    expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);
  });
  it.each(["cancelJustPressed", "bJustPressed", "pauseJustPressed"] as const)("swallows %s before simultaneous confirm", key => {
    const f = fixture(); f.board.show(2, f.change, f.approve);
    f.press({ [key]: true, confirmJustPressed: true });
    expect(f.board.active).toBe(false); expect(f.approve).not.toHaveBeenCalled();
    expect(gameState.currentChoice).toBeNull();
  });
  it("preserves the original withheld-record insertion task", () => {
    const f = fixture(true); f.board.show(0, f.change, f.approve);
    expect(gameState.currentChoice?.options).toHaveLength(2);
    f.tap(2); expect(f.approve).not.toHaveBeenCalled();
    f.tap(1); f.tap(1); f.tap(2);
    expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);
  });
});
