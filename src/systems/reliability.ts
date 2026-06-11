import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { gameState, getCurrentAreaReadout, getProcessItemReadout, getProductionStatusReadout, setLatestMessage } from "../game/state";
import type { ProposalKind } from "../game/types";
import { retroAudio } from "./audio";

export function canAutoApplyProposal(kind: ProposalKind): boolean {
  return kind === "mechanical";
}

export function adjustReliability(amount: number, reason: string) {
  gameState.reliability = Phaser.Math.Clamp(gameState.reliability + amount, 0, 100);
  const sign = amount >= 0 ? "+" : "";
  setLatestMessage(`${sign}${amount} reliability: ${reason}`);
  if (amount >= 0) retroAudio.confirm();
  else retroAudio.warning();
}

export class ReliabilityHud {
  private readonly scene: Phaser.Scene;
  private readonly statusLines: Phaser.GameObjects.Text[] = [];
  private readonly itemSlots: Array<{
    id: string;
    box: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image;
  }> = [];
  private readonly details: Phaser.GameObjects.Container;
  private readonly detailsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.add.rectangle(152, 20, 204, 38, 0x050505, 0.92).setDepth(860);
    scene.add.rectangle(152, 20, 204, 38).setStrokeStyle(1, 0xd6a84f).setDepth(861);
    [3, 13, 23].forEach((y, index) => {
      const line = scene.add.text(52, y, "", {
        fontFamily: "monospace",
        fontSize: index === 0 ? "6px" : "5px",
        color: index === 0 ? PALETTE.goldStamp : PALETTE.creamPaper
      }).setDepth(862);
      this.statusLines.push(line);
    });
    this.createItemStrip();

    const box = scene.add.rectangle(128, 77, 224, 86, 0x050505, 0.97);
    const border = scene.add.rectangle(128, 77, 224, 86).setStrokeStyle(2, 0xd6a84f);
    this.detailsText = scene.add.text(23, 42, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 210, useAdvancedWrap: true },
      lineSpacing: 2
    });
    this.details = scene.add
      .container(0, 0, [box, border, this.detailsText])
      .setDepth(990)
      .setVisible(false);
    this.update();
  }

  get active() {
    return this.details.visible;
  }

  update() {
    getProductionStatusReadout().forEach((line, index) => {
      this.statusLines[index].setText(line);
    });
    const readout = getProcessItemReadout();
    for (const slot of this.itemSlots) {
      const item = readout.find((candidate) => candidate.id === slot.id);
      const acquired = Boolean(item?.acquired);
      slot.box.setFillStyle(acquired ? 0x3a0710 : 0x050505, acquired ? 0.95 : 0.68);
      slot.box.setStrokeStyle(1, acquired ? 0xd6a23a : 0x707070);
      slot.icon.setAlpha(acquired ? 1 : 0.22);
      slot.icon.clearTint();
      if (!acquired) slot.icon.setTint(0x707070);
    }
  }

  toggleDetails() {
    if (this.active) {
      this.details.setVisible(false);
      return;
    }
    const area = getCurrentAreaReadout();
    this.detailsText.setText(
      [
        ...getProductionStatusReadout(),
        `AREA: ${area.displayName}`,
        `ROLE: ${area.zeldaRole}`,
        `REWARD: ${area.reward}`,
        `RELIABILITY ${gameState.reliability}/100`,
        "AI ANNOTATION REVIEW: TOOL ONLY",
        "MECHANICAL: MAY AUTO-APPLY",
        "PROVENANCE, CLASSIFICATION, STATUS:",
        "COMMENT-ONLY UNTIL HUMAN REVIEW",
        `ROLE: ${gameState.playerProfile.roleLabel}`,
        `ABILITY: ${gameState.playerProfile.ability}`,
        `AUDIO: ${gameState.audioStatus}`,
        gameState.latestMessage || "No recent change."
      ].join("\n")
    );
    this.details.setVisible(true);
  }

  private createItemStrip() {
    const items = getProcessItemReadout();
    for (const item of items) {
      const x = 183 + item.hudSlot * 10;
      const y = 34;
      const box = this.scene.add
        .rectangle(x, y, 9, 9, 0x050505, 0.68)
        .setStrokeStyle(1, 0x707070)
        .setDepth(863);
      const icon = this.scene.add
        .image(x, y, item.icon)
        .setScale(1 / 3)
        .setDepth(864)
        .setAlpha(0.22)
        .setTint(0x707070);
      this.itemSlots.push({ id: item.id, box, icon });
    }
  }
}
