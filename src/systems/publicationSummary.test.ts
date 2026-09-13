import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, getCompletionStatsReadout, getStatutoryClockStateReadout, resetGameState } from "../game/state";
import { swallowNextInputFrame, type InputState } from "../input/InputState";
import { PublicationSummary } from "./publicationSummary";
import type { TrueEndingCertificate } from "../game/trueEndingCertificate";

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
  x = 0;
  y = 0;
  fontSize = "";
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

function fixture(appealed = false, hasTexture = true, certificate?: TrueEndingCertificate) {
  const content = new Node();
  const scene = {
    add: {
      container: () => content,
      rectangle: () => new Node(),
      image: () => new Node(),
      text: (x: number, y: number, text: string, style: { fontSize: string }) => Object.assign(new Node(), { text, x, y, fontSize: style.fontSize })
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
  const summary = new PublicationSummary(scene, { compiler: "Sam", stats, clock: getStatutoryClockStateReadout(), volumesCompleted: 1, textureKeys: ["hero"], certificate, onTitle, canAct, onPageChange });
  const press = (name: string) => content.children.find((node) => node.name === `publication-${name}`)?.press?.();
  return { summary, content, onTitle, canAct, press, onPageChange };
}

const input = (fields: Partial<InputState>) => fields as Readonly<InputState>;
beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("publication reward and record pages", () => {
  it("shows a missed deadline without relabeling the record as under appeal", () => {
    gameState.sceneProgress.statutoryDeadlineMissed = 1;
    const { content, press } = fixture();
    press("record");
    const text = content.children.map(node => node.text);
    expect(text).toContain("MISSED");
    expect(text).toContain("DEADLINE");
    expect(text).not.toContain("MET");
    const row = content.children.find(node => node.text === "DEADLINE")!;
    expect(row.y).toBe(76);
    expect(content.children.find(node => node.text === "VOLUMES FINISHED")!.y).toBeLessThan(152);
  });
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

const certificate = (complete = true): TrueEndingCertificate => ({
  title: complete ? "FRUS VOLUME CERTIFIED" : "FRUS VOLUME REVIEWED",
  subtitle: "Foreign Relations of the United States",
  complete,
  sourceUrl: "https://history.state.gov/historicaldocuments/about-frus",
  stagesSourceUrl: "https://history.state.gov/historicaldocuments/frus-history/stages",
  checklist: ["PENDANTS", "EQUITY CRYSTALS", "COVER FRAGMENTS", "TREATY RECORD", "APPARATUS", "PRODUCTION BOARD", "PUBLIC RECORD", "RELIABILITY", "KELLOGG STANDARDS"]
    .map((label) => ({ label, value: complete ? "CLEAR" : "OPEN", complete })),
  summaryLines: [],
  footer: ""
});

describe("secret publication reward", () => {
  it("celebrates the complete treaty record using the native hero, without covering it", () => {
    const { content } = fixture(false, true, certificate());
    expect(content.children.map((node) => node.text)).toEqual(expect.arrayContaining([
      "FRUS VOLUME CERTIFIED", "COMPLETE TREATY RECORD", "DANN-E COULD NOT ERASE YOUR WORK."
    ]));
    expect(content.children.find((node) => node.name === "published-frus-volume-hero")?.scale).toBe(1);
    expect(content.children.map((node) => node.text)).not.toContain("PRODUCTION BOARD");
  });

  it("cycles volume, certificate, stats, and volume without leaving the reward", () => {
    const { summary, content, onTitle } = fixture(false, true, certificate());
    for (const page of ["certificate", "record", "volume"]) {
      summary.update(input({ aJustPressed: true }));
      expect(content.data.page).toBe(page);
    }
    expect(onTitle).not.toHaveBeenCalled();
    expect(swallowNextInputFrame).toHaveBeenCalledTimes(3);
  });

  it("keeps both navigation targets and all checks available after repeated paging", () => {
    const { summary, content, onTitle } = fixture(false, true, certificate());
    for (let turn = 0; turn < 12; turn += 1) {
      summary.update(input({ aJustPressed: true }));
      expect(content.children.filter((node) => node.press)).toHaveLength(2);
      expect(content.children.map((node) => node.text)).toContain("TITLE");
      if (content.data.page === "certificate") {
        expect(content.children.filter((node) => node.text === "+")).toHaveLength(9);
      }
    }
    expect(onTitle).not.toHaveBeenCalled();
  });

  it("shows every check at 8 pixels within the page, with non-color status markers", () => {
    const { content, press } = fixture(false, true, certificate());
    press("certificate");
    for (const line of certificate().checklist) {
      const node = content.children.find((child) => child.text === line.label);
      expect(node?.fontSize).toBe("8px");
      expect(node?.y).toBeGreaterThanOrEqual(50);
      expect(node?.y).toBeLessThanOrEqual(170);
    }
    expect(content.children.filter((node) => node.text === "+")).toHaveLength(9);
  });

  it("retains honest open checks for incomplete or older saved records", () => {
    const { content, press } = fixture(false, false, certificate(false));
    expect(content.children.map((node) => node.text)).toContain("CERTIFICATION STILL OPEN");
    expect(content.children.map((node) => node.text)).not.toContain("PUBLISHED CLEAN");
    press("certificate");
    expect(content.children.filter((node) => node.text === "!")).toHaveLength(9);
    expect(content.children.filter((node) => node.text === "OPEN")).toHaveLength(9);
  });

  it("supports touch cycling, cancel to the volume, and deliberate title navigation", () => {
    const { summary, content, press, onTitle } = fixture(false, true, certificate());
    press("certificate");
    summary.update(input({ bJustPressed: true }));
    expect(content.data.page).toBe("volume");
    press("certificate");
    press("record");
    expect(content.children.map((node) => node.text)).toContain("SKILLS PRACTICED");
    summary.update(input({ cancelJustPressed: true }));
    expect(content.data.page).toBe("volume");
    press("title");
    expect(onTitle).toHaveBeenCalledOnce();
  });
});
