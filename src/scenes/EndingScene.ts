import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, PROCESS_STAMPS } from "../game/constants";
import { gameState, setSceneState, setVisibleEntities } from "../game/state";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class EndingScene extends Phaser.Scene {
  private canRestart = false;

  constructor() {
    super("EndingScene");
  }

  create() {
    setSceneState("EndingScene", "ending", "Team sign-off complete.");
    retroAudio.startMusic("EndingScene");
    retroAudio.ending();
    setVisibleEntities(["Elena", "Marcus", "Priya", gameState.playerProfile.displayName, "FRUS volume"]);
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby));
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 2 : 10; x < GAME_WIDTH; x += 16) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramRed), 0.7);
      }
    }

    this.add.image(33, 35, "frus-volume").setScale(0.85);
    this.add.text(82, 13, "FRUS QUEST COMPLETE", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: PALETTE.goldStamp
    });
    this.add.text(82, 29, `${gameState.playerProfile.displayName.toUpperCase()} / ${gameState.playerProfile.roleLabel.toUpperCase()}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper
    });
    this.add.text(82, 41, `RELIABILITY ${gameState.reliability}/100`, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.openNetGreen
    });
    this.add.text(82, 53, `FRAGMENTS ${gameState.volumeFragments.length}/5  DOC PTS ${gameState.documentPoints}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    });

    this.add.rectangle(128, 77, 236, 31, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.goldStamp));
    PROCESS_STAMPS.forEach((stamp, index) => {
      const earned = gameState.processStamps.includes(stamp.id);
      this.add.text(24 + index * 43, 68, stamp.label, {
        fontFamily: "monospace",
        fontSize: stamp.label.length > 3 ? "6px" : "8px",
        color: earned ? PALETTE.goldStamp : PALETTE.sepiaInk
      });
      this.add.text(24 + index * 43, 80, earned ? "OK" : "--", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: earned ? PALETTE.openNetGreen : PALETTE.sepiaInk
      });
    });

    const lines = [
      "ELENA: SELECTION COMPLETE",
      "MARCUS: REFERRALS CLOSED",
      "PRIYA: QUERIES RESOLVED",
      `${gameState.playerProfile.displayName.toUpperCase()}: ${gameState.playerProfile.ability.toUpperCase()}`
    ];
    lines.forEach((line, index) => {
      this.add.text(14, 102 + index * 11, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: PALETTE.creamPaper
      });
    });

    this.add.rectangle(128, 160, 236, 48, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.terminalCyan));
    const practiced = [
      "SOURCE NOTES NEED PROVENANCE.",
      "OPENNET AND CLASSNET STAY SEPARATE.",
      "REFERRALS LEAVE A VISIBLE TRACE.",
      "PROOFREADERS CATCH FACTS, NOT JUST TYPOS."
    ];
    practiced.forEach((line, index) => {
      this.add.text(16, 143 + index * 9, line, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.terminalCyan
      });
    });

    this.add.text(128, 194, "EVERY PROPOSAL REVIEWED", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.add.text(128, 208, "EVERY DECISION HUMAN", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.add.text(128, 223, "THE RECORD ENDURES", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.time.delayedCall(350, () => {
      this.canRestart = true;
    });
    this.input.keyboard?.on("keydown-ENTER", () => this.restart());
    this.input.keyboard?.on("keydown-SPACE", () => this.restart());
    this.input.keyboard?.on("keydown-N", () => retroAudio.toggle());
  }

  private restart() {
    if (!this.canRestart) return;
    transitionTo(this, "TitleScene");
  }
}
