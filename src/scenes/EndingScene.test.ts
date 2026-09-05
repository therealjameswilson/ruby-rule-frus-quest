import { beforeEach, describe, expect, it, vi } from "vitest";
import { EndingScene } from "./EndingScene";
import { BUCKRAM_BINDING_PACKETS, type BuckramBindingStationId, type BuckramBindingStatus } from "../game/buckramBinding";
import { gameState, resetGameState } from "../game/state";
import { saveGameNow } from "../systems/save";
import { adjustReliability } from "../systems/reliability";
import { INITIAL_DOCUMENT_CANDIDATES } from "../game/documentWorkflow";

vi.mock("phaser", () => ({ default: {
  Scene: class {}, GameObjects: { Sprite: class {} },
  Math: { Distance: { Between: (x: number, y: number, a: number, b: number) => Math.hypot(x - a, y - b) } }
} }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/audio", () => ({ retroAudio: { confirm: vi.fn(), warning: vi.fn(), stamp: vi.fn(), blip: vi.fn() } }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));
vi.mock("../systems/reliability", () => ({ adjustReliability: vi.fn(), ReliabilityHud: class {} }));

interface Packet {
  id: string;
  label: string;
  shortLabel: string;
  station: BuckramBindingStationId;
  status: BuckramBindingStatus;
  checkCount: number;
  x: number;
  y: number;
}

interface BindingInternals {
  bindingPackets: Packet[];
  player: { position: { x: number; y: number } };
  toast: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  indexRouter: { active: boolean; show: ReturnType<typeof vi.fn> };
  standardsBoard: { active: boolean; show: ReturnType<typeof vi.fn> };
  reliability: { update: ReturnType<typeof vi.fn> };
  updateBindingRoomVisuals: ReturnType<typeof vi.fn>;
  syncRoomTraversal: ReturnType<typeof vi.fn>;
  syncVisibleState: ReturnType<typeof vi.fn>;
  findActionBindingStation: ReturnType<typeof vi.fn>;
  handleBindingPacketAction(packet: Packet): void;
}

function fixture(step = 0, status: BuckramBindingStatus = "waiting") {
  const scene = new EndingScene() as unknown as BindingInternals;
  scene.bindingPackets = BUCKRAM_BINDING_PACKETS.map((packet, index) => ({
    ...packet, checkCount: packet.checkIds.length,
    status: index < step ? "sealed" : index === step ? status : "waiting", x: 128, y: 177
  }));
  scene.player = { position: { x: 128, y: 190 } };
  scene.toast = { show: vi.fn(), hide: vi.fn() };
  scene.indexRouter = { active: false, show: vi.fn() };
  scene.standardsBoard = { active: false, show: vi.fn() };
  scene.reliability = { update: vi.fn() };
  scene.updateBindingRoomVisuals = vi.fn();
  scene.syncRoomTraversal = vi.fn();
  scene.syncVisibleState = vi.fn();
  scene.findActionBindingStation = vi.fn(() => ({ id: scene.bindingPackets[step].station, label: "Test desk", x: 42, y: 102 }));
  return { scene, packet: scene.bindingPackets[step] };
}

beforeEach(() => {
  resetGameState();
  vi.clearAllMocks();
  vi.mocked(saveGameNow).mockReset();
});

describe("live binding packet handoffs", () => {
  it("saves the initial pickup immediately without completing the packet", () => {
    const { scene, packet } = fixture();
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("carried");
    expect(gameState.sceneProgress).toMatchObject({ buckramBindingStep: 0, buckramBindingStatus: 1 });
    expect(gameState.heldItem).toBe("Binding Folder: FRONT PACKET");
    expect(saveGameNow).toHaveBeenCalledOnce();
    expect(gameState.sceneProgress.frontMatterAssemblyComplete).not.toBe(1);
  });

  it("keeps a wrong-desk packet in hand, with the existing penalty and no progress", () => {
    const { scene, packet } = fixture(0, "carried");
    scene.findActionBindingStation.mockReturnValue({ id: "index-desk", label: "Index", x: 42, y: 164 });
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("carried");
    expect(gameState.heldItem).toBe("Binding Folder: FRONT PACKET");
    expect(adjustReliability).toHaveBeenCalledWith(-2, expect.any(String));
    expect(gameState.sceneProgress.buckramBindingStep).toBe(0);
    expect(saveGameNow).toHaveBeenCalledOnce();
  });

  it("files an ordinary delivery in one action and immediately hands off the next packet", () => {
    const { scene, packet } = fixture(0, "carried");
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("sealed");
    expect(gameState.sceneProgress).toMatchObject({ buckramBindingStep: 1, buckramBindingStatus: 1 });
    expect(gameState.sceneProgress.frontMatterAssemblyComplete).toBe(1);
    expect(gameState.heldItem).toBe("Binding Folder: INDEX DOCKET");
  });

  it("hands off the next packet at the desk before saving, without duplicate rewards", () => {
    const { scene, packet } = fixture(0, "routed");
    scene.player.position = { x: 42, y: 123 };
    vi.mocked(saveGameNow).mockImplementation(() => {
      expect(scene.bindingPackets[1].status).toBe("carried");
      expect(gameState.sceneProgress).toMatchObject({ buckramBindingStep: 1, buckramBindingStatus: 1 });
      return true;
    });
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("sealed");
    expect(gameState.heldItem).toBe("Binding Folder: INDEX DOCKET");
    expect(gameState.sceneProgress.frontMatterAssemblyComplete).toBe(1);
    expect(gameState.sceneProgress.readerAidRegistersComplete).toBe(1);
    const points = gameState.documentPoints;
    scene.handleBindingPacketAction(packet);
    expect(gameState.documentPoints).toBe(points);
    expect(saveGameNow).toHaveBeenCalledOnce();
  });

  it("requires the document-number router before sealing the index packet", () => {
    const { scene, packet } = fixture(1, "routed");
    scene.player.position = { x: 42, y: 164 };
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("routed");
    expect(scene.indexRouter.show).toHaveBeenCalledOnce();
    expect(gameState.sceneProgress.indexDocketComplete).not.toBe(1);

    const callbacks = scene.indexRouter.show.mock.calls[0][0] as {
      onComplete: (message: string) => void;
      onCancel: () => void;
    };
    callbacks.onComplete("INDEX ENTRY 87 -> DOCUMENT 87");
    expect(gameState.sceneProgress.aboutSeriesIndexRoutingComplete).toBe(1);
    expect(gameState.sceneProgress.indexDocketComplete).toBe(1);
    expect(packet.status).toBe("sealed");
    expect(scene.bindingPackets[2].status).toBe("carried");
    expect(scene.toast.show).toHaveBeenCalledWith("DOC 87 INDEXED", scene.player.position, "info", expect.any(Object));
    expect(saveGameNow).toHaveBeenCalledOnce();
  });

  it("opens the index decision upon delivery rather than needing another empty confirmation", () => {
    const { scene, packet } = fixture(1, "carried");
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("routed");
    expect(scene.indexRouter.show).toHaveBeenCalledOnce();
    expect(gameState.sceneProgress.indexDocketComplete).not.toBe(1);
    expect(gameState.sceneProgress.buckramBindingStatus).toBe(2);
  });

  it("requires human attestation of live evidence, preserves cancellation and prevents duplicate seals", () => {
    const { scene, packet } = fixture(2, "carried");
    gameState.documentCandidates = [{ ...INITIAL_DOCUMENT_CANDIDATES[0], selected: true,
      citationComplete: true, annotationNeeded: false, workflowState: "proofed", reviewStatus: "resolved",
      equities: [{ agencyId: "test", fictionalName: "Test", issueType: "military", response: "cleared" }] }];
    scene.handleBindingPacketAction(packet);
    expect(packet.status).toBe("routed");
    expect(gameState.sceneProgress.kelloggFinalCertificationComplete).not.toBe(1);
    const [, onSeal] = scene.standardsBoard.show.mock.calls[0] as [() => { ready: boolean }, () => void, () => void];
    gameState.documentCandidates[0].undisclosedDeletion = true;
    onSeal();
    expect(packet.status).toBe("routed");
    gameState.documentCandidates[0].undisclosedDeletion = false;
    onSeal();
    expect(packet.status).toBe("sealed");
    expect(gameState.sceneProgress.kelloggFinalCertificationComplete).toBe(1);
    const points = gameState.documentPoints;
    onSeal();
    expect(gameState.documentPoints).toBe(points);
  });

  it("saves five sealed packets without bypassing final readiness or publishing", () => {
    vi.mocked(saveGameNow).mockReset();
    const { scene, packet } = fixture(4, "routed");
    scene.player.position = { x: 214, y: 181 };
    scene.handleBindingPacketAction(packet);
    expect(scene.bindingPackets.every((entry) => entry.status === "sealed")).toBe(true);
    expect(gameState.sceneProgress).toMatchObject({ buckramBindingStep: 5, buckramBindingStatus: 0, buckramGateOpen: 0 });
    expect(gameState.finalGateCertification?.status).not.toBe("published");
    expect(scene.toast.show).toHaveBeenCalledWith("PRESS LOCKED", scene.player.position, "warn", expect.any(Object));
    expect(saveGameNow).toHaveBeenCalledOnce();
  });
});
