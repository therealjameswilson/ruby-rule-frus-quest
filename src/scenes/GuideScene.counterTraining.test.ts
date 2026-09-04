import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./GuideScene.ts", import.meta.url), "utf8");

describe("GuideScene Citation Stamp counter lesson", () => {
  it("starts a real secondary-tool swing and requires its active Citation Stamp hitbox", () => {
    expect(source).toContain('input.bJustPressed && this.currentStage() === "counter"');
    expect(source).toContain("tryEquippedToolSwing(this.player)");
    expect(source).toContain("this.player.activeActionHitbox");
    expect(source).toContain('combat.weapon.tool !== "citation_stamp"');
    expect(source).toContain("RectangleToRectangle(hitbox, GUIDE_EGO_SEAL_BOUNDS)");
  });

  it("persists the completed lesson before revealing the fragment", () => {
    expect(source).toContain("gameState.sceneProgress.guideCitationCounterTrained = 1");
    expect(source).toContain("saveGameNow()");
    expect(source).toContain("EGO SEAL RETURNED - FRAGMENT OPEN");
    expect(source).toContain('.setVisible(!this.hasFragment && stage !== "counter")');
  });
});
