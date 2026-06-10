import Phaser from "phaser";
import { PALETTE, PROCESS_STAMPS } from "../game/constants";
import { gameState, setLatestMessage } from "../game/state";
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
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly roleLabel: Phaser.GameObjects.Text;
  private readonly soundLabel: Phaser.GameObjects.Text;
  private readonly stampTexts: Phaser.GameObjects.Text[] = [];
  private readonly details: Phaser.GameObjects.Container;
  private readonly detailsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.add.rectangle(88, 24, 64, 8, 0x050505, 0.85).setDepth(800);
    scene.add.rectangle(88, 24, 64, 8).setStrokeStyle(1, 0xd6a84f).setDepth(801);
    this.fill = scene.add.rectangle(58, 24, 60, 4, 0x4cff6b).setOrigin(0, 0.5).setDepth(802);
    this.label = scene.add.text(122, 20, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setDepth(802);
    this.roleLabel = scene.add.text(96, 5, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setDepth(802);
    this.soundLabel = scene.add.text(58, 13, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setDepth(802);
    PROCESS_STAMPS.forEach((stamp, index) => {
      const stampText = scene.add.text(174 + index * 13, 23, stamp.label.slice(0, 3), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.sepiaInk,
        backgroundColor: PALETTE.black
      }).setDepth(802);
      this.stampTexts.push(stampText);
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
    const value = gameState.reliability;
    this.fill.width = Math.max(1, Math.round((60 * value) / 100));
    const color = value < 35 ? 0xff3b3b : value < 70 ? 0xd6a84f : 0x4cff6b;
    this.fill.setFillStyle(color);
    this.label.setText(`REL ${value}`);
    this.soundLabel.setText(gameState.audioStatus.includes("muted") ? "SND OFF" : "SND ON");
    this.roleLabel.setText(gameState.playerProfile.roleLabel.toUpperCase().slice(0, 12));
    for (const [index, stamp] of PROCESS_STAMPS.entries()) {
      const earned = gameState.processStamps.includes(stamp.id);
      this.stampTexts[index].setColor(earned ? PALETTE.goldStamp : PALETTE.sepiaInk);
      this.stampTexts[index].setAlpha(earned ? 1 : 0.6);
    }
  }

  toggleDetails() {
    if (this.active) {
      this.details.setVisible(false);
      return;
    }
    this.detailsText.setText(
      [
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
