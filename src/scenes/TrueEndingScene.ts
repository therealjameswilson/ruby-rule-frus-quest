import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  gameState,
  getDanneItemReadout,
  getFinalGateReadiness,
  getProductionBoardReadout,
  getPublicationReadinessReadout,
  setLatestMessage,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import { buildTrueEndingCertificate, type TrueEndingCertificate } from "../game/trueEndingCertificate";
import { hiddenFirstEditionBonusLabel } from "../game/secretReadingRoom";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class TrueEndingScene extends Phaser.Scene {
  constructor() {
    super("TrueEndingScene");
  }

  create() {
    const readiness = getFinalGateReadiness();
    const publication = getPublicationReadinessReadout();
    const board = getProductionBoardReadout();
    const treatyFragments = getDanneItemReadout().find((item) => item.id === "treaty-fragments")?.count ?? 0;
    const certificate = buildTrueEndingCertificate({
      processStamps: gameState.processStamps,
      documentCandidates: gameState.documentCandidates,
      volumeFragments: gameState.volumeFragments,
      reliability: gameState.reliability,
      documentPoints: gameState.documentPoints,
      treatyFragmentsCollected: treatyFragments,
      publicationBoardCompleted: board.completed,
      publicationBoardTotal: board.total,
      publicationApparatusCompleted: readiness.publicationApparatus.completed,
      publicationApparatusTotal: readiness.publicationApparatus.total,
      buckramGateOpen: publication.buckramGateOpen,
      standardsClear: publication.standards.clear,
      publicRecordComplete: Boolean(gameState.sceneProgress.publicCitationComplete)
        && Boolean(gameState.sceneProgress.releaseCalendarComplete)
        && gameState.finalGateCertification?.status === "published"
    });

    setSceneState("TrueEndingScene", "ending", certificate.complete
      ? "True ending: certified FRUS volume published after DANN-E was defeated by a complete record."
      : "True ending review: certification packet still has visible open work.");
    setVisibleEntities([
      certificate.title,
      "Ruby Buckram Certified Volume",
      `Treaty Record ${Math.min(treatyFragments, 3)}/3`,
      `Production Board ${board.completed}/${board.total}`,
      hiddenFirstEditionBonusLabel(gameState)
    ]);
    setVisibleThreats([]);
    setLatestMessage(certificate.complete
      ? "True ending reached: certified FRUS volume entered the public record."
      : "True ending reached, but certification remains visibly incomplete.");
    retroAudio.startMusic("EndingScene");

    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.drawBuckramBackground();
    this.drawHeader(certificate);
    this.drawCertifiedVolume(certificate.complete);
    this.drawChecklist(certificate);
    this.drawSummary(certificate);
    this.drawPrompt();
  }

  update() {
    tickInput();
    const input = getInput();
    if (input.aJustPressed || input.startJustPressed) {
      transitionTo(this, "TitleScene");
    }
  }

  private drawBuckramBackground() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby));
    for (let y = 10; y < GAME_HEIGHT; y += 12) {
      for (let x = 10; x < GAME_WIDTH; x += 12) {
        const offset = ((x + y) / 12) % 2 === 0 ? 0 : 5;
        this.add.rectangle(x + offset, y, 2, 2, color(PALETTE.buckramHighlight), 0.45);
      }
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 14, GAME_HEIGHT - 14, color(PALETTE.deepRuby), 0)
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 24, GAME_HEIGHT - 24, color(PALETTE.deepRuby), 0)
      .setStrokeStyle(1, color(PALETTE.oldGold));
  }

  private drawHeader(certificate: TrueEndingCertificate) {
    this.add.text(GAME_WIDTH / 2, 17, certificate.subtitle.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.paleGold,
      align: "center"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 30, certificate.title, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: certificate.complete ? PALETTE.goldStamp : PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, 42, 164, 2, color(PALETTE.oldGold));
  }

  private drawCertifiedVolume(complete: boolean) {
    const x = 54;
    const y = 76;
    this.add.rectangle(x + 4, y + 5, 58, 76, color(PALETTE.black), 0.5);
    this.add.rectangle(x, y, 58, 76, color(PALETTE.buckramRed))
      .setStrokeStyle(2, color(complete ? PALETTE.goldStamp : PALETTE.stoneGray));
    this.add.rectangle(x, y - 26, 52, 2, color(PALETTE.goldStamp));
    this.add.rectangle(x, y, 52, 2, color(PALETTE.goldStamp));
    this.add.rectangle(x, y + 29, 52, 2, color(PALETTE.goldStamp));
    this.add.rectangle(x - 22, y, 4, 68, color(PALETTE.deepRuby));
    this.add.rectangle(x - 15, y, 2, 68, color(PALETTE.goldStamp));
    this.add.text(x, y - 24, ["FOREIGN", "RELATIONS"], {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.paleGold,
      align: "center",
      lineSpacing: 1
    }).setOrigin(0.5, 0);
    this.add.text(x, y - 4, ["COMPLETE", "RECORD"], {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.paleGold,
      align: "center",
      lineSpacing: 1
    }).setOrigin(0.5);
    this.add.circle(x, y + 20, 10, color(PALETTE.oldGold))
      .setStrokeStyle(1, color(PALETTE.paleGold));
    this.add.rectangle(x, y + 19, 12, 2, color(PALETTE.deepRuby));
    this.add.rectangle(x, y + 23, 6, 2, color(PALETTE.deepRuby));
    if (complete) {
      this.add.text(x, y + 38, "PUBLISHED", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.paleGold
      }).setOrigin(0.5);
    }
  }

  private drawChecklist(certificate: TrueEndingCertificate) {
    const panelX = 148;
    const panelY = 62;
    this.add.rectangle(panelX, panelY + 42, 160, 92, color(PALETTE.black), 0.82)
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    this.add.text(panelX, panelY, "CERTIFICATION LEDGER", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    certificate.checklist.forEach((line, index) => {
      const rowY = panelY + 12 + index * 9;
      this.add.rectangle(panelX - 71, rowY + 2, 5, 5, color(line.complete ? PALETTE.openNetGreen : PALETTE.classNetRed));
      this.add.text(panelX - 62, rowY - 1, line.label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper
      });
      this.add.text(panelX + 69, rowY - 1, line.value, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: line.complete ? PALETTE.terminalCyan : PALETTE.classNetRed,
        align: "right"
      }).setOrigin(1, 0);
    });
  }

  private drawSummary(certificate: TrueEndingCertificate) {
    this.add.rectangle(GAME_WIDTH / 2, 174, GAME_WIDTH - 42, 42, color(PALETTE.creamPaper))
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(GAME_WIDTH / 2, 158, certificate.summaryLines, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.deepRuby,
      align: "center",
      wordWrap: { width: GAME_WIDTH - 54, useAdvancedWrap: true },
      lineSpacing: 2
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 203, certificate.footer, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.paleGold,
      align: "center",
      wordWrap: { width: GAME_WIDTH - 42, useAdvancedWrap: true }
    }).setOrigin(0.5);
  }

  private drawPrompt() {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, "PRESS A TO RETURN TO TITLE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
  }
}
