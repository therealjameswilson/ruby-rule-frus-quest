import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkScene } from "./NetworkScene";
import { ReferralVaultScene } from "./ReferralVaultScene";
import { gameState, resetGameState } from "../game/state";
import { getNetworkRoutePacket } from "../game/networkRouting";
import { getClassNetVaultDocket } from "../game/classNetVaultReview";
import { getReferralTreatmentDocket } from "../game/referralVaultReview";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} },
  Math: { Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)) } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/audio", () => ({ retroAudio: { warning: vi.fn() } }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));

function feedback(scene: object) {
  const toast = { show: vi.fn() };
  Object.assign(scene, {
    player: { position: { x: 100, y: 120 } }, toast,
    reliability: { update: vi.fn() }, routeText: { setVisible: vi.fn() },
    syncNetworkSplitEntities: vi.fn(), refreshRoutingRouteCue: vi.fn(),
    classNetVaultObjective: () => "FILE REVIEW", syncClassNetVaultEntities: vi.fn(), refreshClearanceTokenRouteCue: vi.fn(),
    referralObjective: () => "FILE TREATMENT", syncReferralVisibleEntities: vi.fn()
  });
  return toast;
}

beforeEach(() => { resetGameState(); gameState.mode = "explore"; });

describe("visible routing corrections", () => {
  it.each([0, 1, 2, 3])("names the correct network for packet %i without filing it", step => {
    const scene = new NetworkScene(), toast = feedback(scene), packet = getNetworkRoutePacket(step);
    Object.assign(scene, { currentRoute: step, routingCarriedPacket: () => packet });
    gameState.sceneProgress.networkRoutingCarried = packet.order;
    const reliability = gameState.reliability;
    (scene as unknown as { routeCarriedPacket(network: string): void }).routeCarriedPacket(packet.network === "OpenNet" ? "ClassNet" : "OpenNet");
    expect(toast.show).toHaveBeenCalledWith(`ROUTE TO ${packet.network.toUpperCase()}`, { x: 100, y: 120 }, "warn");
    expect(gameState.sceneProgress.networkRoutingCarried).toBe(packet.order);
    expect(gameState.reliability).toBe(reliability - 2);
    expect(gameState.mode).toBe("explore");
  });
  it("names the review board and retains its docket", () => {
    const scene = new NetworkScene(), toast = feedback(scene), docket = getClassNetVaultDocket(1);
    Object.assign(scene, { classNetReviewStep: 1, vaultCarriedDocket: () => docket });
    gameState.sceneProgress.classNetVaultDocketCarried = docket.order;
    (scene as unknown as { routeVaultDocket(station: string): void }).routeVaultDocket("human_desk");
    expect(toast.show).toHaveBeenCalledWith("USE RELEASE STANDARD BOARD", { x: 100, y: 120 }, "warn");
    expect(gameState.sceneProgress.classNetVaultDocketCarried).toBe(docket.order);
  });
  it("names the appeal ledger and retains the treatment", () => {
    const scene = new ReferralVaultScene(), toast = feedback(scene), docket = getReferralTreatmentDocket(1);
    Object.assign(scene, { treatmentStep: 1, carriedTreatmentDocket: () => docket });
    gameState.sceneProgress.referralTreatmentDocketCarried = docket.order;
    (scene as unknown as { routeTreatmentDocket(station: string): void }).routeTreatmentDocket("permission_desk");
    expect(toast.show).toHaveBeenCalledWith("USE APPEAL LEDGER", { x: 100, y: 120 }, "warn");
    expect(gameState.sceneProgress.referralTreatmentDocketCarried).toBe(docket.order);
  });
});
