import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DANNE_SCENE_GEOMETRY, danneMapInteractionAvailable } from "../game/danneSceneCollisions";
import { nearestInteractable } from "../systems/interaction";
import { blackVaultApproachTargets, blackVaultReturnRoute } from "../game/blackVaultApproach";

const silentReadSource = readFileSync(new URL("./SilentReadScene.ts", import.meta.url), "utf8");
const mapSource = readFileSync(new URL("./DanneMapScene.ts", import.meta.url), "utf8");
const bossSource = readFileSync(new URL("../entities/enemies/DanneBoss.ts", import.meta.url), "utf8");
const verificationSource = readFileSync(new URL("../systems/verification.ts", import.meta.url), "utf8");

describe("normal quest climax route", () => {
  const vaultTargets = () => DANNE_SCENE_GEOMETRY.BlackVaultLairScene.interactions
    .filter((definition) => danneMapInteractionAvailable(definition.action, false))
    .map((definition) => ({ ...definition, onInteract: () => undefined }));

  it("offers the unused cache at arrival, but permits a deliberate south exit", () => {
    for (const y of [201, 202, 206]) {
      const position = { x: 128, y };
      expect(nearestInteractable(position, blackVaultApproachTargets(position, vaultTargets(), false))?.id)
        .toBe("vault-reliability-cache");
    }
    const south = { x: 128, y: 216 };
    expect(nearestInteractable(south, blackVaultApproachTargets(south, vaultTargets(), false))?.id).toBe("vault-return");
  });

  it("removes a spent cache without intercepting the core or extending its reach", () => {
    const position = { x: 128, y: 152 };
    const targets = blackVaultApproachTargets(position, vaultTargets(), true);
    expect(targets.some((target) => target.id === "vault-reliability-cache")).toBe(false);
    expect(nearestInteractable(position, targets)?.id).toBe("vault-core-trigger");
    const farAway = { x: 30, y: 202 };
    expect(nearestInteractable(farAway, blackVaultApproachTargets(farAway, vaultTargets(), false))).toBeNull();
    expect(mapSource).toContain("blackVaultApproachTargets(this.player.position");
  });

  it("keeps the real room without overlaying a checklist or fake stations", () => {
    expect(mapSource).not.toContain("addSnesDanneArena");
    expect(mapSource).not.toContain("black-vault-publication-board");
    expect(mapSource).toContain("this.cacheToast.show(\"REVIEW RESTORED\"");
  });

  it("names the actual return room for both the main and legacy entrances", () => {
    expect(blackVaultReturnRoute(true)).toEqual({ sceneKey: "SilentReadScene", label: "Return to Proof" });
    expect(blackVaultReturnRoute(false)).toEqual({ sceneKey: "ArchiveScene", label: "Return to Archive" });
    expect(mapSource).toContain("blackVaultReturnRoute(Boolean(gameState.sceneProgress.blackVaultEnteredFromSilentRead), Boolean(nextArchiveResearchReview())).label");
    expect(mapSource).toContain("blackVaultReturnRoute(Boolean(gameState.sceneProgress.blackVaultEnteredFromSilentRead), Boolean(nextArchiveResearchReview())).sceneKey");
  });

  it("routes an old incomplete research packet back to its repair desk", () => {
    expect(blackVaultReturnRoute(true, true)).toEqual({ sceneKey: "ArchiveScene", label: "Return to Archive" });
    expect(blackVaultReturnRoute(false, true)).toEqual({ sceneKey: "ArchiveScene", label: "Return to Archive" });
    expect(mapSource).toContain("Complete the missing review at the Archive Research Table.");
  });
  it("does not let the unearned reward intercept the boss-core approach", () => {
    const geometry = DANNE_SCENE_GEOMETRY.BlackVaultLairScene;
    const targets = geometry.interactions
      .filter((definition) => danneMapInteractionAvailable(definition.action, false))
      .map((definition) => ({ ...definition, onInteract: () => undefined }));
    expect(nearestInteractable({ x: 128, y: 144 }, targets)?.id).toBe("vault-core-trigger");
    expect(targets.some((target) => target.id === "vault-treaty-fragment")).toBe(false);
    expect(danneMapInteractionAvailable("treaty-fragment-vault", true)).toBe(true);
    expect(danneMapInteractionAvailable("reliability-cache", false)).toBe(true);
    expect(danneMapInteractionAvailable("treaty-fragment-nara", false)).toBe(true);
    expect(mapSource.match(/danneMapInteractionAvailable\(/g)).toHaveLength(2);
  });

  it("routes the Silent Read reward exit into the Black Vault instead of skipping to publication", () => {
    expect(silentReadSource).toContain('east: "DV1"');
    expect(silentReadSource).toContain('transitionTo(this, "BlackVaultLairScene")');
    expect(silentReadSource).not.toContain('transitionTo(this, "EndingScene")');
  });

  it("routes a legitimate boss clear to the physical bindery", () => {
    expect(mapSource).toContain('transitionTo(this, "EndingScene")');
    expect(mapSource).toContain("this.syncBlackVaultTraversal()");
    expect(mapSource).toContain('equipProcessItem("red_pencil")');
  });

  it("defeats DANN-E from pre-bindery readiness without publishing inside the boss", () => {
    expect(bossSource).toContain("getBlackVaultClimaxReadiness()");
    expect(bossSource).not.toContain("certifyFinalPublicationAfterDanne()");
    expect(bossSource).toContain('weakness: "red_pencil"');
    expect(bossSource).toContain('addDanneItem("treaty-fragments", 2)');
  });

  it("lets touch and controller B reject the displayed B choice", () => {
    expect(verificationSource).toContain("input.bJustPressed || input.cancelJustPressed || input.choiceBJustPressed");
  });
});
