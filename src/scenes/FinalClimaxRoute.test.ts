import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const silentReadSource = readFileSync(new URL("./SilentReadScene.ts", import.meta.url), "utf8");
const mapSource = readFileSync(new URL("./DanneMapScene.ts", import.meta.url), "utf8");
const bossSource = readFileSync(new URL("../entities/enemies/DanneBoss.ts", import.meta.url), "utf8");
const verificationSource = readFileSync(new URL("../systems/verification.ts", import.meta.url), "utf8");

describe("normal quest climax route", () => {
  it("routes the Silent Read reward exit into the Black Vault instead of skipping to publication", () => {
    expect(silentReadSource).toContain('east: "BlackVaultLairScene"');
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
