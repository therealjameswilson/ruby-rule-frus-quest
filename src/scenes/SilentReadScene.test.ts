import { beforeEach, describe, expect, it, vi } from "vitest";
import { SilentReadScene } from "./SilentReadScene";
import { SILENT_READ_REVIEW_ITEMS, type SilentReadReviewItem, type SilentReadReviewStatus, type SilentReadStationId } from "../game/silentReadReview";
import { gameState, resetGameState } from "../game/state";
import type { ChoiceOption } from "../game/types";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../entities/enemies/DanneLurker", () => ({ DanneLurker: class {} }));
vi.mock("../systems/audio", () => ({ retroAudio: { confirm: vi.fn(), warning: vi.fn(), stamp: vi.fn(), blip: vi.fn() } }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));
vi.mock("../systems/reliability", () => ({ adjustReliability: vi.fn(), canAutoApplyProposal: vi.fn(), ReliabilityHud: class {} }));
vi.mock("../input/InputState", () => ({ tickInput: vi.fn(), getInput: () => ({ aJustPressed: true }), bindPointerDown: vi.fn() }));

interface Flag extends SilentReadReviewItem {
  status: SilentReadReviewStatus;
  x: number;
  y: number;
  routedStation?: string;
}

class Decision {
  active = false;
  options: ChoiceOption[] = [];
  callback?: (option: ChoiceOption) => void;
  show(_title: string, options: ChoiceOption[], callback: (option: ChoiceOption) => void) {
    this.active = true;
    this.options = options;
    this.callback = callback;
  }
  choose(key: string) {
    const option = this.options.find((candidate) => candidate.key === key)!;
    this.active = false;
    this.callback?.(option);
  }
  updateInput() { this.choose("A"); }
}

interface ReviewInternals {
  currentRoomId: "E1" | "S1";
  physicalFlags: Flag[];
  player: { position: { x: number; y: number }; update: ReturnType<typeof vi.fn> };
  reviewChoice: Decision;
  toast: { show: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  interactionPrompt: { update: ReturnType<typeof vi.fn> };
  actionHint: { setText: ReturnType<typeof vi.fn> };
  reliability: { update: ReturnType<typeof vi.fn> };
  findActionWorkstation: ReturnType<typeof vi.fn>;
  updatePhysicalVerification: ReturnType<typeof vi.fn>;
  addVerificationMark: ReturnType<typeof vi.fn>;
  addProcessStampMark: ReturnType<typeof vi.fn>;
  applyFlagReward: ReturnType<typeof vi.fn>;
  syncVisibleEntities: ReturnType<typeof vi.fn>;
  syncRoomTraversalState: ReturnType<typeof vi.fn>;
  updateProofMinimap: ReturnType<typeof vi.fn>;
  redrawCurrentRoom: ReturnType<typeof vi.fn>;
  updateDanneLurker: ReturnType<typeof vi.fn>;
  physicalPromptTargets(): { strictTarget: unknown; hintTarget: unknown };
  updateActionHint(flag: Flag, station: { id: SilentReadStationId; label: string }): void;
  handlePhysicalAction(): void;
  update(time: number, delta: number): void;
}

function fixture(step: number, status: SilentReadReviewStatus) {
  const scene = new SilentReadScene() as unknown as ReviewInternals;
  scene.currentRoomId = step === 0 ? "E1" : "S1";
  scene.physicalFlags = SILENT_READ_REVIEW_ITEMS.map((item, index) => ({
    ...item, status: index < step ? "stamped" : index === step ? status : "waiting", x: 128, y: 166
  }));
  const flag = scene.physicalFlags[step];
  scene.player = { position: { x: 128, y: 185 }, update: vi.fn() };
  scene.reviewChoice = new Decision();
  scene.toast = { show: vi.fn(), update: vi.fn() };
  scene.interactionPrompt = { update: vi.fn() };
  scene.actionHint = { setText: vi.fn() };
  scene.reliability = { update: vi.fn() };
  scene.findActionWorkstation = vi.fn(() => ({ id: flag.destination, label: "Test desk", x: 128, y: 166 }));
  scene.updatePhysicalVerification = vi.fn();
  scene.addVerificationMark = vi.fn();
  scene.addProcessStampMark = vi.fn();
  scene.applyFlagReward = vi.fn(() => true);
  scene.syncVisibleEntities = vi.fn();
  scene.syncRoomTraversalState = vi.fn();
  scene.updateProofMinimap = vi.fn();
  scene.redrawCurrentRoom = vi.fn();
  scene.updateDanneLurker = vi.fn();
  return { scene, flag };
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("live editor and proof decisions", () => {
  it.each([[0, "A", "B"], [4, "B", "A"]] as const)("keeps decision %i unresolved until corrected and separately stamped", (step, wrong, correct) => {
    const { scene, flag } = fixture(step, "routed");
    scene.handlePhysicalAction();
    expect(scene.reviewChoice.active).toBe(true);
    scene.reviewChoice.choose(wrong);
    expect(flag.status).toBe("routed");
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    scene.reviewChoice.choose(correct);
    expect(flag.status).toBe("verified");
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    expect(flag.status).toBe("stamped");
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
    scene.reviewChoice.choose(correct);
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
  });

  it("hands off the next file at the desk and saves its carried status", () => {
    const { scene } = fixture(1, "verified");
    scene.handlePhysicalAction();
    expect(scene.physicalFlags[2].status).toBe("carried");
    expect(gameState.heldItem).toBe("Review Folder: CLASS NOTE");
    expect(gameState.sceneProgress).toMatchObject({ silentReadReviewStep: 2, silentReadReviewStatus: 1 });
  });

  it("keeps a misrouted file in hand for a nearby retry", () => {
    const { scene, flag } = fixture(1, "carried");
    scene.findActionWorkstation.mockReturnValue({ id: "classnet", label: "ClassNet", x: 214, y: 180 });
    scene.handlePhysicalAction();
    expect(flag.status).toBe("carried");
    expect(gameState.heldItem).toBe("Review Folder: OPEN NOTE");
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
  });

  it("does not advertise the previous desk after handing off the next file", () => {
    const { scene, flag } = fixture(2, "carried");
    const wrongDesk = { id: "opennet" as const, label: "OpenNet", x: 43, y: 180 };
    scene.findActionWorkstation.mockReturnValue(wrongDesk);
    expect(scene.physicalPromptTargets()).toMatchObject({ strictTarget: null, hintTarget: null });
    scene.updateActionHint(flag, wrongDesk);
    expect(gameState.nearestInteractable).toBeNull();
    const correctDesk = { id: "classnet" as const, label: "ClassNet", x: 214, y: 180 };
    scene.findActionWorkstation.mockReturnValue(correctDesk);
    expect(scene.physicalPromptTargets().strictTarget).toMatchObject({ id: "proof-workstation-classnet" });
    scene.updateActionHint(flag, correctDesk);
    expect(gameState.nearestInteractable).toBe("ROUTE to ClassNet");
  });

  it("swallows the answer frame and freezes movement and DANN-E during a decision", () => {
    const { scene, flag } = fixture(4, "routed");
    scene.handlePhysicalAction();
    scene.findActionWorkstation.mockClear();
    scene.update(100, 16);
    expect(flag.status).toBe("verified");
    expect(scene.player.update).toHaveBeenCalledWith(16, false);
    expect(scene.updateDanneLurker).toHaveBeenCalledWith(16, false);
    expect(scene.findActionWorkstation).not.toHaveBeenCalled();
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
  });
});
