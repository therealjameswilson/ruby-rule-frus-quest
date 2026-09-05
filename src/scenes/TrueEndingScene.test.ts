import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, resetGameState, seedProgressForScene } from "../game/state";
import type { PublicationSummary } from "../systems/publicationSummary";
import { transitionTo } from "../systems/sceneTransitions";
import { TrueEndingScene } from "./TrueEndingScene";

const summary = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
type SummaryOptions = ConstructorParameters<typeof PublicationSummary>[1];

vi.mock("phaser", () => ({ default: {
  Scene: class { time = { now: 1000 }; }
} }));
vi.mock("../systems/publicationSummary", () => ({ PublicationSummary: class {
  constructor(_scene: unknown, options: SummaryOptions) { summary.create(options); }
  update(input: unknown) { summary.update(input); }
} }));
vi.mock("../input/InputState", () => ({ getInput: () => ({ aJustPressed: true }), tickInput: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: { startMusic: vi.fn() } }));
vi.mock("../systems/sceneTransitions", () => ({ transitionTo: vi.fn() }));

const options = (): SummaryOptions => summary.create.mock.calls.at(-1)?.[0] as SummaryOptions;

beforeEach(() => {
  vi.clearAllMocks();
  resetGameState();
  seedProgressForScene("EndingScene");
});

describe("TrueEndingScene reward continuity", () => {
  it("uses the shared reward with earned certificate checks and volume textures", () => {
    const scene = new TrueEndingScene();
    scene.create();
    expect(options().certificate?.checklist).toHaveLength(9);
    expect(options().textureKeys).toHaveLength(3);
    expect(options().certificate?.complete).toBe(false);
    expect(gameState.objective).toBe("CERTIFICATION STILL OPEN");
    scene.update();
    expect(summary.update).toHaveBeenCalledWith({ aJustPressed: true });
  });

  it("does not award another completion or alter earned stats when revisited", () => {
    gameState.volumesCompleted = 2;
    gameState.completionStats.completedAtMs = 1234;
    gameState.completionStats.finalReliabilityScore = 87;
    const stats = structuredClone(gameState.completionStats);
    const inventory = [...gameState.inventory];
    const scene = new TrueEndingScene();
    scene.create();
    scene.create();
    expect(gameState.volumesCompleted).toBe(2);
    expect(gameState.completionStats).toEqual(stats);
    expect(gameState.inventory).toEqual(inventory);
    expect(options().stats.finalReliabilityScore).toBe(87);
  });

  it("waits for the arrival input to clear and locks immediately on leaving", () => {
    const scene = new TrueEndingScene();
    scene.create();
    expect(options().canAct()).toBe(false);
    Object.assign(scene.time, { now: 1350 });
    expect(options().canAct()).toBe(true);
    options().onTitle();
    expect(options().canAct()).toBe(false);
    expect(transitionTo).toHaveBeenCalledWith(scene, "TitleScene");
  });

  it("keeps QA readouts synchronized with the visible certificate and stats pages", () => {
    new TrueEndingScene().create();
    options().onPageChange?.("certificate");
    expect(gameState.visibleEntities).toContain("Certification record");
    expect(gameState.visibleEntities.some((line) => line.startsWith("TREATY RECORD: 0/3"))).toBe(true);
    options().onPageChange?.("record");
    expect(gameState.visibleEntities).toContain("Completion stats");
    expect(gameState.visibleEntities).toContain("Skills practiced");
    expect(gameState.visibleThreats).toEqual([]);
    expect(gameState.nearestInteractable).toBeNull();
  });
});
