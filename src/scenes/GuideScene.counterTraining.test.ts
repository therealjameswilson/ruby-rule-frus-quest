import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./GuideScene.ts", import.meta.url), "utf8");

describe("GuideScene Citation Stamp counter lesson", () => {
  it("starts a real secondary-tool swing and requires its active Citation Stamp hitbox", () => {
    expect(source).toContain('this.updateCounterSwing(input.bJustPressed)');
    expect(source).toContain("tryEquippedToolSwing(this.player)");
    expect(source).toContain("this.player.activeActionHitbox");
    expect(source).toContain('combat.weapon.tool === "stapler"');
    expect(source).toContain('hasProcessItem(combat.weapon.tool)');
    expect(source).toContain("this.counterTraining.update(delta, this.player.position, hitbox)");
    expect(source).toContain('if (event !== "complete") return');
    expect(source).not.toContain("GUIDE_EGO_SEAL_BOUNDS");
  });

  it("persists the completed lesson before revealing the fragment", () => {
    expect(source).toContain("gameState.sceneProgress.guideCitationCounterTrained = 1");
    expect(source).toContain("saveGameNow()");
    expect(source).toContain("Returned bolt broke the seal. Interact with the Front Matter");
    expect(source).toContain('.setVisible(!this.hasFragment && stage !== "counter")');
  });

  it("clears the transient readout on shutdown and hides the bolt outside the lesson", () => {
    expect(source).toContain("Phaser.Scenes.Events.SHUTDOWN, () => setGuideCounterReadout(null)");
    expect(source).toContain("this.practiceBolt.setVisible(false)");
    expect(source).toContain("if (!this.hasCounterTraining)");
  });

  it("keeps successful-return feedback off the player and the reward", () => {
    expect(source).toContain('this.prompt.update(delta, promptTarget?.kind === "npc" ? promptTarget : null)');
    expect(source).toContain("this.toast.hide()");
    expect(source).toContain("this.pickupFocus.setPosition(promptTarget.x, promptTarget.y + 7)");
  });
});
