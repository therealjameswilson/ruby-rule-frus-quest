import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompletionStatsReadout, resetGameState } from "../game/state";
import { swallowNextInputFrame, type InputState } from "../input/InputState";
import { PublicationSummary } from "./publicationSummary";

vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: () => ({ color: 0 }) } },
  Textures: { FilterMode: { NEAREST: 0 } }
} }));
vi.mock("../input/InputState", () => ({
  swallowNextInputFrame: vi.fn(),
  bindPointerDown: (node: Node, callback: () => void) => { node.press = callback; }
}));

class Node {
  name = "";
  text = "";
  width = 128;
  height = 128;
  scale = 1;
  children: Node[] = [];
  data: Record<string, unknown> = {};
  texture = { setFilter: vi.fn() };
  press?: () => void;
  setName(name: string) { this.name = name; return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setOrigin() { return this; }
  setStrokeStyle() { return this; }
  setScale(scale: number) { this.scale = scale; return this; }
  setData(key: string, value: unknown) { this.data[key] = value; return this; }
  add(node: Node) { this.children.push(node); return this; }
  removeAll() { this.children = []; return this; }
}

function fixture(appealed = false, hasTexture = true) {
  const content = new Node();
  const scene = {
    add: {
      container: () => content,
      rectangle: () => new Node(),
      image: () => new Node(),
      text: (_x: number, _y: number, text: string) => Object.assign(new Node(), { text })
    },
    textures: { exists: () => hasTexture }
  } as unknown as Phaser.Scene;
  const stats = getCompletionStatsReadout();
  if (appealed) {
    stats.unresolvedEquities = 2;
    stats.publicationOutcome = { ...stats.publicationOutcome, id: "published_under_appeal", label: "Published under appeal" };
  }
  const onTitle = vi.fn();
  const canAct = vi.fn(() => true);
  const onPageChange = vi.fn();
  const summary = new PublicationSummary(scene, { compiler: "Sam", stats, volumesCompleted: 1, textureKeys: ["hero"], onTitle, canAct, onPageChange });
  const press = (name: string) => content.children.find((node) => node.name === `publication-${name}`)?.press?.();
  return { summary, content, onTitle, canAct, press, onPageChange };
}

const input = (fields: Partial<InputState>) => fields as Readonly<InputState>;
beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("publication reward and record pages", () => {
  it("shows the native hero without stats covering it", () => {
    const { content } = fixture();
    expect(content.children.find((node) => node.name === "published-frus-volume-hero")?.scale).toBe(1);
    expect(content.children.map((node) => node.text)).toContain("PUBLISHED CLEAN");
    expect(content.children.map((node) => node.text)).not.toContain("RELIABILITY");
  });

  it("opens the record with a single confirm without returning to title", () => {
    const { summary, content, onTitle } = fixture();
    summary.update(input({ aJustPressed: true }));
    expect(content.data.page).toBe("record");
    expect(onTitle).not.toHaveBeenCalled();
    expect(swallowNextInputFrame).toHaveBeenCalledOnce();
    for (const field of ["TIME", "RELIABILITY", "DANN-E DEFEATED", "COVER PIECES", "FIRST EDITION", "VOLUMES FINISHED", "SKILLS PRACTICED"]) {
      expect(content.children.map((node) => node.text)).toContain(field);
    }
  });

  it("supports touch page changes and an explicit title button", () => {
    const { content, onTitle, press, onPageChange } = fixture();
    press("record");
    expect(content.data.page).toBe("record");
    press("volume");
    expect(content.data.page).toBe("volume");
    press("title");
    expect(onTitle).toHaveBeenCalledOnce();
    expect(onPageChange.mock.calls).toEqual([["volume"], ["record"], ["volume"]]);
  });

  it("supports cancel from the record and direction selection of title", () => {
    const { summary, content, onTitle } = fixture();
    summary.update(input({ aJustPressed: true }));
    summary.update(input({ bJustPressed: true }));
    expect(content.data.page).toBe("volume");
    summary.update(input({ navRightJustPressed: true }));
    summary.update(input({ aJustPressed: true }));
    expect(onTitle).toHaveBeenCalledOnce();
  });

  it("does not accept keyboard or touch while the ceremony is locked", () => {
    const { summary, content, onTitle, press, canAct } = fixture();
    canAct.mockReturnValue(false);
    press("title");
    summary.update(input({ aJustPressed: true }));
    expect(content.data.page).toBe("volume");
    expect(onTitle).not.toHaveBeenCalled();
  });

  it("keeps the appeal outcome and unresolved count visible", () => {
    const { content } = fixture(true);
    expect(content.children.map((node) => node.text)).toEqual(expect.arrayContaining([
      "PUBLISHED UNDER APPEAL", "2 UNRESOLVED EQUITIES ON RECORD"
    ]));
  });

  it("retains a readable volume fallback when art is unavailable", () => {
    const { content } = fixture(false, false);
    expect(content.children.map((node) => node.text)).toContain("FRUS");
  });
});
