import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, PROCESS_STAMPS } from "../game/constants";
import { addProcessItem, gameState, setSceneState, setVisibleEntities } from "../game/state";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

const COVER_PIECES = [
  { fragment: "Front Matter Fragment", label: "TITLE", x: 10, y: 10, width: 56, height: 24 },
  { fragment: "Source Note Fragment", label: "DATES", x: 10, y: 34, width: 56, height: 19 },
  { fragment: "Routing Fragment", label: "START", x: 10, y: 53, width: 56, height: 32 },
  { fragment: "Referral Fragment", label: "SEAL", x: 10, y: 85, width: 56, height: 15 },
  { fragment: "Proof Fragment", label: "READ", x: 10, y: 100, width: 56, height: 7 }
] as const;

export class EndingScene extends Phaser.Scene {
  private canRestart = false;

  constructor() {
    super("EndingScene");
  }

  create() {
    setSceneState("EndingScene", "ending", "Team sign-off complete.");
    addProcessItem("buckram_key");
    retroAudio.startMusic("EndingScene");
    retroAudio.ending();
    setVisibleEntities(["Elena", "Marcus", "Priya", gameState.playerProfile.displayName, "Buckram Key", "FRUS cover prize"]);
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby));
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 2 : 10; x < GAME_WIDTH; x += 16) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramRed), 0.7);
      }
    }

    this.drawAssembledPrize(128, 78, 1);
    this.add.text(128, 5, "FRUS QUEST COMPLETE", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.add.text(128, 16, `${gameState.playerProfile.displayName.toUpperCase()} / ${gameState.playerProfile.roleLabel.toUpperCase()}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.add.text(128, 140, `COVER PIECES ${gameState.volumeFragments.length}/5`, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.add.text(128, 149, `RELIABILITY ${gameState.reliability}/100  DOC PTS ${gameState.documentPoints}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.openNetGreen
    }).setOrigin(0.5);
    this.add.image(218, 145, "buckram-key").setDepth(40);
    this.add.text(218, 157, "BUCKRAM\nKEY", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5);

    this.add.rectangle(128, 170, 236, 29, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.goldStamp));
    PROCESS_STAMPS.forEach((stamp, index) => {
      const earned = gameState.processStamps.includes(stamp.id);
      const x = 15 + index * 39;
      this.add.text(x, 161, stamp.label, {
        fontFamily: "monospace",
        fontSize: stamp.label.length > 3 ? "6px" : "8px",
        color: earned ? PALETTE.goldStamp : PALETTE.sepiaInk
      });
      this.add.text(x, 173, earned ? "OK" : "--", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: earned ? PALETTE.openNetGreen : PALETTE.sepiaInk
      });
    });

    const lines = [
      "ELENA: SELECTION COMPLETE",
      "MARCUS: REFERRALS CLOSED",
      "PRIYA: QUERIES RESOLVED"
    ];
    lines.forEach((line, index) => {
      this.add.text(14, 184 + index * 6, line, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper
      });
    });

    this.add.rectangle(128, 213, 236, 28, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.terminalCyan));
    const practiced = [
      "SOURCE NOTES NEED PROVENANCE.",
      "OPENNET AND CLASSNET STAY SEPARATE.",
      "REFERRALS LEAVE A VISIBLE TRACE.",
      "AI TOOLS PROPOSE; HUMANS DECIDE."
    ];
    practiced.forEach((line, index) => {
      this.add.text(16, 203 + index * 6, line, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.terminalCyan
      });
    });

    this.add.text(128, 231, "THE RECORD ENDURES", {
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

  private drawAssembledPrize(x: number, y: number, scale: number) {
    this.add.rectangle(x + 4, y + 5, 80 * scale, 120 * scale, color(PALETTE.black), 0.55);
    this.add.image(x, y, "frus-prize-cover").setScale(scale);

    const left = x - (80 * scale) / 2;
    const top = y - (120 * scale) / 2;
    COVER_PIECES.forEach((piece) => {
      const earned = gameState.volumeFragments.includes(piece.fragment);
      const pieceX = left + (piece.x + piece.width / 2) * scale;
      const pieceY = top + (piece.y + piece.height / 2) * scale;
      const pieceWidth = piece.width * scale;
      const pieceHeight = piece.height * scale;
      this.add.rectangle(pieceX, pieceY, pieceWidth, pieceHeight)
        .setStrokeStyle(1, color(earned ? PALETTE.goldStamp : PALETTE.sepiaInk), earned ? 0.9 : 0.4);
      if (!earned) {
        this.add.rectangle(pieceX, pieceY, pieceWidth, pieceHeight, color(PALETTE.black), 0.75);
        this.add.text(pieceX, pieceY - 3, piece.label, {
          fontFamily: "monospace",
          fontSize: "5px",
          color: PALETTE.sepiaInk
        }).setOrigin(0.5);
      }
    });

    this.add.rectangle(x, y + 50, 68, 10, color(PALETTE.black), 0.7)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.7);
    this.add.text(x, y + 47, "ASSEMBLED FRUS", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
  }
}
