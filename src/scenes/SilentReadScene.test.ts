import { beforeEach, describe, expect, it, vi } from "vitest";
import { SilentReadScene } from "./SilentReadScene";
import { SILENT_READ_REVIEW_ITEMS, type SilentReadReviewItem, type SilentReadReviewStatus, type SilentReadStationId } from "../game/silentReadReview";
import { addProcessItem, gameState, resetGameState } from "../game/state";
import type { ChoiceOption } from "../game/types";
import type { EditorialRepairRecord } from "../game/editorialRepair";

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

class Comparison {
  active = false;
  repairs = 0;
  onChange?: (repairs: number) => void;
  onApprove?: (repairs: number) => void;
  show(repairs: number, onChange: (repairs: number) => void, onApprove: (repairs: number) => void) {
    this.active = true;
    this.repairs = repairs;
    this.onChange = onChange;
    this.onApprove = onApprove;
  }
  updateInput = vi.fn();
}

class Bracket {
  active = false;
  repaired = false;
  onChange?: () => void;
  onFile?: () => void;
  show(_record: EditorialRepairRecord, repaired: boolean, _proof: boolean, onChange: () => void, onFile: () => void) {
    this.active = true; this.repaired = repaired; this.onChange = onChange; this.onFile = onFile;
  }
  updateInput = vi.fn();
}

interface ReviewInternals {
  currentRoomId: "E1" | "S1";
  physicalFlags: Flag[];
  player: { position: { x: number; y: number }; update: ReturnType<typeof vi.fn> };
  reviewChoice: Decision;
  proofBoard: Comparison;
  editorialBoard: Bracket;
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
  awardBuckramKeyAfterTypesetterProof: ReturnType<typeof vi.fn>;
  reviewObjective(): string;
  physicalPromptTargets(): { strictTarget: unknown; hintTarget: unknown; strictText: string };
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
  scene.proofBoard = new Comparison();
  scene.editorialBoard = new Bracket();
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
  scene.awardBuckramKeyAfterTypesetterProof = vi.fn();
  return { scene, flag };
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("live editor and proof decisions", () => {
  it.each([0, 2, 3, 4, 5, 6])("opens the check on placing file %i without answering or stamping", (step) => {
    const { scene, flag } = fixture(step, "carried");
    scene.handlePhysicalAction();
    expect(flag.status).toBe("routed");
    expect(step === 0 ? scene.editorialBoard.active : scene.reviewChoice.active).toBe(true);
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    expect(gameState.heldItem).toBeNull();
    expect(gameState.sceneProgress.silentReadReviewStatus).toBe(2);
    expect(gameState.sceneProgress[`silentReadDecision_${flag.id}`]).toBeUndefined();
  });

  it("keeps the non-decision cross-reference available for a separate check", () => {
    const { scene, flag } = fixture(1, "carried");
    scene.handlePhysicalAction();
    expect(flag.status).toBe("routed");
    expect(scene.reviewChoice.active).toBe(false);
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
  });

  it.each([[4, "B", "A"], [5, "A", "B"], [6, "B", "A"]] as const)("keeps decision %i unresolved until corrected and separately stamped", (step, wrong, correct) => {
    const { scene, flag } = fixture(step, "routed");
    scene.handlePhysicalAction();
    expect(scene.reviewChoice.active).toBe(true);
    scene.reviewChoice.choose(wrong);
    expect(flag.status).toBe("routed");
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    expect(gameState.sceneProgress[`silentReadDecision_${flag.id}`]).toBeUndefined();
    expect(scene.awardBuckramKeyAfterTypesetterProof).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    scene.reviewChoice.choose(correct);
    expect(flag.status).toBe("verified");
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    expect(gameState.sceneProgress[`silentReadDecision_${flag.id}`]).toBe(1);
    expect(scene.awardBuckramKeyAfterTypesetterProof).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    expect(flag.status).toBe("stamped");
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
    expect(scene.awardBuckramKeyAfterTypesetterProof).not.toHaveBeenCalled();
    scene.reviewChoice.choose(correct);
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
  });

  it("requires a repaired bracket, explicit filing and a separate stamp for the Red Pencil", () => {
    const { scene, flag } = fixture(0, "carried");
    scene.handlePhysicalAction();
    expect(scene.editorialBoard.active).toBe(true);
    scene.editorialBoard.onFile?.();
    expect(flag.status).toBe("routed");
    scene.editorialBoard.onChange?.();
    expect(gameState.sceneProgress.silentReadBracketDraft).toBe(1);
    expect(flag.status).toBe("routed");
    scene.update(100, 16);
    expect(scene.player.update).toHaveBeenCalledWith(16, false);
    expect(scene.updateDanneLurker).toHaveBeenCalledWith(16, false);
    scene.editorialBoard.active = false;
    scene.handlePhysicalAction();
    expect(scene.editorialBoard.repaired).toBe(true);
    scene.editorialBoard.onFile?.();
    expect(flag.status).toBe("verified");
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    expect(flag.status).toBe("stamped");
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
    scene.editorialBoard.onFile?.();
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
  });

  it("requires the Proof Lens for final comparison, not mere placement", () => {
    const { scene, flag } = fixture(7, "carried");
    scene.handlePhysicalAction();
    expect(flag.status).toBe("routed");
    expect(scene.proofBoard.active).toBe(false);
    expect(scene.toast.show).toHaveBeenCalledWith("NEED PROOF LENS", expect.anything(), "warn", expect.anything());
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
  });

  it("saves edits but requires complete explicit filing and a separate final stamp", () => {
    const { scene, flag } = fixture(7, "carried");
    addProcessItem("proof_lens");
    gameState.sceneProgress.silentReadProofRepairs = 1;
    scene.handlePhysicalAction();
    expect(scene.reviewChoice.active).toBe(false);
    expect(scene.proofBoard.active).toBe(true);
    expect(scene.proofBoard.repairs).toBe(1);
    scene.proofBoard.onApprove?.(1);
    expect(flag.status).toBe("routed");
    scene.proofBoard.onChange?.(3);
    expect(gameState.sceneProgress.silentReadProofRepairs).toBe(3);
    expect(flag.status).toBe("routed");
    scene.proofBoard.onApprove?.(3);
    expect(flag.status).toBe("verified");
    expect(gameState.sceneProgress["silentReadDecision_typesetter-proof"]).toBe(1);
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    expect(flag.status).toBe("stamped");
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
    expect(scene.awardBuckramKeyAfterTypesetterProof).toHaveBeenCalledOnce();
    scene.proofBoard.onApprove?.(3);
    expect(scene.applyFlagReward).toHaveBeenCalledOnce();
  });

  it("freezes player and DANN-E while the proof is being repaired", () => {
    const { scene } = fixture(7, "routed");
    addProcessItem("proof_lens");
    scene.handlePhysicalAction();
    scene.update(100, 16);
    expect(scene.proofBoard.updateInput).toHaveBeenCalledOnce();
    expect(scene.player.update).toHaveBeenCalledWith(16, false);
    expect(scene.updateDanneLurker).toHaveBeenCalledWith(16, false);
    expect(scene.applyFlagReward).not.toHaveBeenCalled();
  });

  it.each([5, 6, 7])("shows VERIFY rather than STAMP for unreviewed production file %i", (step) => {
    const { scene, flag } = fixture(step, "routed");
    expect(scene.physicalPromptTargets().strictText).toBe(`VERIFY ${flag.shortLabel}`);
    scene.updateActionHint(flag, { id: flag.destination, label: "Test desk" });
    expect(gameState.nearestInteractable).toBe(`VERIFY ${flag.shortLabel}`);
  });

  it("names the immediate exit when backtracking after completing the proof", () => {
    const { scene } = fixture(7, "stamped");
    scene.currentRoomId = "E1";
    expect(scene.reviewObjective()).toBe("EXIT EAST - PROOF");
    scene.currentRoomId = "S1";
    expect(scene.reviewObjective()).toBe("EXIT EAST - VAULT");
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
