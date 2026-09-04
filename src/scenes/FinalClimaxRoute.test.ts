import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DANNE_SCENE_GEOMETRY, danneMapInteractionAvailable } from "../game/danneSceneCollisions";
import { nearestInteractable } from "../systems/interaction";

const silentReadSource = readFileSync(new URL("./SilentReadScene.ts", import.meta.url), "utf8");
const mapSource = readFileSync(new URL("./DanneMapScene.ts", import.meta.url), "utf8");
const bossSource = readFileSync(new URL("../entities/enemies/DanneBoss.ts", import.meta.url), "utf8");
const verificationSource = readFileSync(new URL("../systems/verification.ts", import.meta.url), "utf8");

describe("normal quest climax route", () => {
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
