import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { gameState, getProductionStatusReadout, setLatestMessage } from "../game/state";
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
  private readonly details: Phaser.GameObjects.Container;
  private readonly detailsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.add.rectangle(152, 16, 204, 30, 0x050505, 0.92).setDepth(860);
    scene.add.rectangle(152, 16, 204, 30).setStrokeStyle(1, 0xd6a84f).setDepth(861);
    [3, 13, 23].forEach((y, index) => {
      const line = scene.add.text(52, y, "", {
        fontFamily: "monospace",
        fontSize: index === 0 ? "6px" : "5px",
        color: index === 0 ? PALETTE.goldStamp : PALETTE.creamPaper
      }).setDepth(862);
      this.statusLines.push(line);
    });

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
  }

  toggleDetails() {
    if (this.active) {
      this.details.setVisible(false);
      return;
    }
    this.detailsText.setText(
      [
        ...getProductionStatusReadout(),
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
}
