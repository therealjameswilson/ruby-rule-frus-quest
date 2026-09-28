import { retroAudio } from "./audio";
import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrossReferenceBoard } from "./crossReferenceBoard";
import { gameState, resetGameState } from "../game/state";
vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ getInput: () => ({ aJustPressed: true }), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), paperPickup: vi.fn() } }));
const view = vi.hoisted(() => ({ select: (_value: number) => {}, file: () => {}, leave: () => {}, render: vi.fn(), input: vi.fn(), close: vi.fn() }));
vi.mock("./crossReferenceDesk", () => ({ CrossReferenceDesk: class {
  active = true;
  constructor(select: typeof view.select, file: () => void, leave: () => void) { Object.assign(view, { select, file, leave }); }
  render(...args: unknown[]) { view.render(...args); }
  updateInput(input: unknown) { view.input(input); }
  close() { this.active = false; view.close(); }
} }));
function fixture(draft = 0) {
  const scene = { events: { emit: vi.fn(), once: vi.fn() } };
  const board = new CrossReferenceBoard(scene as unknown as Phaser.Scene);
  const change = vi.fn(), file = vi.fn();
  board.show(draft, change, file);
  return { board, scene, change, file };
}
beforeEach(() => { resetGameState(); vi.clearAllMocks(); });
describe("cross-reference catalog decisions", () => {
  it("requires a selected record and explicit filing", () => {
    const f = fixture(); view.file(); expect(f.file).not.toHaveBeenCalled();
    expect(gameState.latestMessage).toBe("SELECT A RECORD FIRST");
    view.select(2); expect(f.change).toHaveBeenCalledWith(2); expect(f.file).not.toHaveBeenCalled();
    expect(gameState.currentChoice?.options[1].value).toBe("pinned");
    view.file(); expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
    view.file(); view.select(1); expect(f.file).toHaveBeenCalledOnce(); expect(f.change).toHaveBeenCalledOnce();
  });
  it.each([1, 3])("rejects candidate %i with specific feedback and no resource charge", draft => {
    const f = fixture(draft), before = [gameState.reliability, gameState.documentPoints];
    view.file(); expect(gameState.latestMessage).toContain("WRONG");
    expect(f.file).not.toHaveBeenCalled(); expect(f.board.active).toBe(true);
    expect([gameState.reliability, gameState.documentPoints]).toEqual(before);
    view.select(2); view.file(); expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
  });
  it("only rustles when a different record is pinned", () => {
    const f = fixture(2); view.select(2);
    expect(f.change).not.toHaveBeenCalled(); expect(retroAudio.paperPickup).not.toHaveBeenCalled();
    view.select(1); expect(f.change).toHaveBeenCalledExactlyOnceWith(1);
    expect(retroAudio.paperPickup).toHaveBeenCalledOnce(); expect(f.file).not.toHaveBeenCalled();
  });
  it("restores unfiled drafts and delegates input", () => {
    const f = fixture(2); expect(f.file).not.toHaveBeenCalled();
    expect(gameState.currentChoice?.options[1].value).toBe("pinned");
    f.board.updateInput(); expect(view.input).toHaveBeenCalledWith({ aJustPressed: true });
    view.file(); expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
  });
  it("leaves without approval and removes choice state", () => {
    const f = fixture(2); view.leave(); expect(f.board.active).toBe(false);
    expect(gameState.currentChoice).toBeNull(); expect(f.file).not.toHaveBeenCalled(); expect(f.change).not.toHaveBeenCalled();
  });
  it("closes replaced desks and cleans up on shutdown", () => {
    const f = fixture(); f.board.show(2, f.change, f.file); expect(view.close).toHaveBeenCalledOnce();
    f.scene.events.once.mock.calls[0][1](); expect(view.close).toHaveBeenCalledTimes(2); expect(f.board.active).toBe(false);
  });
});
