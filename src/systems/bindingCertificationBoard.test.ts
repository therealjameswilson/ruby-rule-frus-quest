import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BindingCertificationBoard } from "./bindingCertificationBoard";
import { bindPointerDown, getInput, swallowNextInputFrame, type InputState } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";
import type { BindingCertificationEvidence } from "../game/bindingCertification";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn() } }));

class Display {
  visible = true;
  children: Display[] = [];
  text = "";
  constructor(readonly width = 0) {}
  add(value: Display | Display[]) { this.children.push(...(Array.isArray(value) ? value : [value])); return this; }
  setName() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setStrokeStyle() { return this; }
  setOrigin() { return this; }
  setLineSpacing() { return this; }
  setText(value: string) { this.text = value; return this; }
}

function fixture() {
  const objects: Display[] = [];
  const create = (width = 0) => { const object = new Display(width); objects.push(object); return object; };
  const scene = {
    events: { emit: vi.fn() },
    add: { container: () => create(), rectangle: (_x: number, _y: number, width: number) => create(width),
      text: (_x: number, _y: number, text: string) => create().setText(text) }
  };
  const board = new BindingCertificationBoard(scene as unknown as Phaser.Scene);
  const evidence: BindingCertificationEvidence = { documents: 5, proofed: 5, equities: 2, resolved: 2, hiddenCuts: 0, unresolved: 0, ready: true };
  const onSeal = vi.fn(), onCancel = vi.fn();
  const pointer = (index: number) => {
    const target = objects.filter(object => object.width === 110 || object.width === 90)[index];
    const call = vi.mocked(bindPointerDown).mock.calls.find(([object]) => object === target as unknown);
    if (!call) throw new Error("Missing pointer target");
    call[1]();
  };
  return { board, objects, evidence, onSeal, onCancel, pointer, scene };
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); vi.mocked(getInput).mockReturnValue({} as InputState); });

describe("bindery human standards board", () => {
  it("opens with live evidence and swallows the delivery action", () => {
    const { board, evidence, onSeal, onCancel, objects } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    expect(board.active).toBe(true);
    expect(objects.some(object => object.text.includes("REVIEWS FILED   2/2"))).toBe(true);
    expect(swallowNextInputFrame).toHaveBeenCalledOnce();
    expect(onSeal).not.toHaveBeenCalled();
  });

  it("seals once on an actual confirmation, not on construction or a hidden tap", () => {
    const { board, evidence, onSeal, onCancel, pointer } = fixture();
    pointer(0);
    expect(onSeal).not.toHaveBeenCalled();
    board.show(() => evidence, onSeal, onCancel);
    vi.mocked(getInput).mockReturnValue({ aJustPressed: true } as InputState);
    board.updateInput();
    pointer(0);
    expect(onSeal).toHaveBeenCalledOnce();
    expect(board.active).toBe(false);
    expect(swallowNextInputFrame).toHaveBeenCalledTimes(2);
  });

  it("rechecks evidence at a touch seal and leaves the panel open when work is unresolved", () => {
    const { board, evidence, onSeal, onCancel, pointer, objects } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    evidence.hiddenCuts = 1; evidence.ready = false;
    pointer(0);
    expect(onSeal).not.toHaveBeenCalled();
    expect(board.active).toBe(true);
    expect(objects.some(object => object.text.includes("HIDDEN CUTS     1"))).toBe(true);
    expect(gameState.latestMessage).toContain("cannot clear");
  });

  it("supports touch return and B/cancel without granting progress or leaking input", () => {
    const { board, evidence, onSeal, onCancel, pointer } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    pointer(1);
    expect(onCancel).toHaveBeenCalledOnce();
    board.show(() => evidence, onSeal, onCancel);
    vi.mocked(getInput).mockReturnValue({ bJustPressed: true, aJustPressed: true } as InputState);
    board.updateInput();
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSeal).not.toHaveBeenCalled();
    expect(board.active).toBe(false);
  });

  it("allows keyboard selection of Return before confirming", () => {
    const { board, evidence, onSeal, onCancel } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    vi.mocked(getInput).mockReturnValue({ navDownJustPressed: true } as InputState);
    board.updateInput();
    vi.mocked(getInput).mockReturnValue({ confirmJustPressed: true } as InputState);
    board.updateInput();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSeal).not.toHaveBeenCalled();
  });
});
