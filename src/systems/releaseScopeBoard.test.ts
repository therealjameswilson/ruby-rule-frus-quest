import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReleaseScopeBoard } from "./releaseScopeBoard";
import { bindPointerDown, getInput, type InputState } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), blip: vi.fn() } }));
class Display {
  visible = true;
  add() { return this; } setName() { return this; } setDepth() { return this; }
  setScrollFactor() { return this; } setStrokeStyle() { return this; } setOrigin() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setText() { return this; } setFillStyle() { return this; }
}
function fixture() {
  const scene = { events: { emit: vi.fn() }, add: { container: () => new Display(), rectangle: () => new Display(), text: () => new Display() } };
  const board = new ReleaseScopeBoard(scene as unknown as Phaser.Scene);
  const change = vi.fn(), file = vi.fn();
  const tap = (index: number) => vi.mocked(bindPointerDown).mock.calls[index][1]();
  const press = (input: Partial<InputState>) => { vi.mocked(getInput).mockReturnValue(input as InputState); board.updateInput(); };
  return { board, change, file, tap, press };
}
beforeEach(() => { resetGameState(); vi.clearAllMocks(); });
describe("release-scope marking controls", () => {
  it("rejects all and none, then files only the excerpt without automatic approval", () => {
    const f = fixture(); f.board.show(undefined, f.change, f.file);
    f.tap(3); expect(f.file).not.toHaveBeenCalled();
    f.tap(0); f.tap(1); f.tap(2); f.tap(3);
    expect(gameState.latestMessage).toBe("KEEP THE CLEARED EXCERPT");
    expect(f.file).not.toHaveBeenCalled();
    f.tap(1); expect(f.change).toHaveBeenLastCalledWith(2);
    expect(f.file).not.toHaveBeenCalled();
    f.tap(3); expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
    f.tap(0); f.tap(3); expect(f.file).toHaveBeenCalledOnce();
  });
  it("restores an unfiled draft and supports keyboard marking and filing", () => {
    const f = fixture(); f.board.show(6, f.change, f.file);
    expect(gameState.currentChoice?.options.map(option => option.value)).toEqual(["hold", "print", "print"]);
    f.press({ navRightJustPressed: true }); f.press({ navRightJustPressed: true });
    f.press({ confirmJustPressed: true }); expect(f.change).toHaveBeenCalledWith(2);
    f.press({ navRightJustPressed: true }); f.press({ confirmJustPressed: true });
    expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
  });
  it.each(["cancelJustPressed", "bJustPressed", "pauseJustPressed"] as const)("swallows %s without editing or filing", key => {
    const f = fixture(); f.board.show(2, f.change, f.file);
    f.press({ [key]: true, aJustPressed: true });
    expect(f.board.active).toBe(false); expect(gameState.currentChoice).toBeNull();
    expect(f.change).not.toHaveBeenCalled(); expect(f.file).not.toHaveBeenCalled();
  });
});
