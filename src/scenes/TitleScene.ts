import Phaser from "phaser";
import { CONTROLS_TEXT, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { resetGameState, setSceneState } from "../game/state";
import { getSkipWarningPreference, setSkipWarningPreference } from "../game/warningSettings";
import { bindPointerPress, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";
import { addSnesWorkflowRelicRack } from "../systems/snesPixelArt";
import { shouldStartTitle, TITLE_LAYOUT } from "./titleLayout";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class TitleScene extends Phaser.Scene {
  private started = false;
  private skipWarning = false;
  private skipWarningText?: Phaser.GameObjects.Text;
  private ignoreNextPointerStart = false;
  private inputReadyAt = 0;

  constructor() {
    super("TitleScene");
  }

  create() {
    setSceneState("TitleScene", "title", "Press start to verify.");
    this.started = false;
    this.skipWarning = getSkipWarningPreference();
    this.ignoreNextPointerStart = false;
    // The WarningScene advances on a *held* A/start, then hands off to the title
    // with that key still physically down. A rising-edge-only check (aJustPressed)
    // then never fires until the player releases and re-presses, so the title
    // looked stuck to keyboard-only play and required a pointer click (live audit,
    // 2026-06-15). After a short grace we also accept the held confirm, so a
    // continuously-held key carries straight through warning -> title.
    this.inputReadyAt = this.time.now + 350;
    retroAudio.startMusic("TitleScene");

    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.drawWallpaper();
    this.drawHeaderPlaque();
    this.drawFilmstrip(TITLE_LAYOUT.topFilmstripY);
    this.drawFilmstrip(TITLE_LAYOUT.bottomFilmstripY);
    this.drawWorldMapBriefing();
    this.drawTitlePlate();
    this.drawRelicShelf(128, TITLE_LAYOUT.relicShelf.y);

    this.add
      .text(128, TITLE_LAYOUT.pressStartY, "PRESS START TO VERIFY", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: PALETTE.terminalCyan
      })
      .setOrigin(0.5)
      .setResolution(2);
    this.add
      .text(128, TITLE_LAYOUT.controlsY, CONTROLS_TEXT, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        align: "center",
        lineSpacing: 2
      })
      .setOrigin(0.5)
      .setResolution(2);
    this.createSkipWarningToggle();
  }

  update() {
    tickInput();
    const input = getInput();
    if (input.soundJustPressed) this.toggleAudio();
    if (input.bJustPressed) this.toggleSkipWarning();
    if (this.ignoreNextPointerStart && input.pointerPrimaryJustPressed) {
      this.ignoreNextPointerStart = false;
      return;
    }
    if (shouldStartTitle(input, this.time.now >= this.inputReadyAt)) this.start();
  }

  /**
   * A small beveled panel: dark drop shadow, mid base, light top-left edge,
   * dark bottom-right edge. Reads as a raised plate at 8-bit scale.
   */
  private bevelPanel(
    cx: number,
    cy: number,
    w: number,
    h: number,
    base: string,
    light: string,
    dark: string,
    depth = 0
  ) {
    this.add.rectangle(cx, cy, w, h, color(base)).setDepth(depth);
    // top + left highlight
    this.add.rectangle(cx, cy - h / 2 + 1, w, 2, color(light)).setDepth(depth + 1);
    this.add.rectangle(cx - w / 2 + 1, cy, 2, h, color(light)).setDepth(depth + 1);
    // bottom + right shadow
    this.add.rectangle(cx, cy + h / 2 - 1, w, 2, color(dark)).setDepth(depth + 1);
    this.add.rectangle(cx + w / 2 - 1, cy, 2, h, color(dark)).setDepth(depth + 1);
  }

  /**
   * An ornate double gold frame around a region (used for the map and the
   * title plate). Outer dark mat, gold band, inner dark reveal, plus corner
   * rivets so it feels like a mounted archival display.
   */
  private goldFrame(cx: number, cy: number, w: number, h: number, depth = 0) {
    this.add
      .rectangle(cx + 2, cy + 3, w + 8, h + 8, color(PALETTE.black), 0.55)
      .setDepth(depth);
    this.add.rectangle(cx, cy, w + 8, h + 8, color(PALETTE.deepBrown)).setDepth(depth + 1);
    this.add
      .rectangle(cx, cy, w + 4, h + 4, color(PALETTE.goldStamp))
      .setStrokeStyle(1, color(PALETTE.paleGold))
      .setDepth(depth + 2);
    this.add.rectangle(cx, cy, w, h, color(PALETTE.bronze)).setDepth(depth + 3);
    this.add
      .rectangle(cx, cy, w - 4, h - 4, color(PALETTE.sepiaInk))
      .setStrokeStyle(1, color(PALETTE.deepBrown))
      .setDepth(depth + 4);
    // corner rivets
    const rx = w / 2 - 1;
    const ry = h / 2 - 1;
    for (const [dx, dy] of [
      [-rx, -ry],
      [rx, -ry],
      [-rx, ry],
      [rx, ry]
    ]) {
      this.add.rectangle(cx + dx, cy + dy, 3, 3, color(PALETTE.paleGold)).setDepth(depth + 5);
      this.add.rectangle(cx + dx, cy + dy, 1, 1, color(PALETTE.deepBrown)).setDepth(depth + 6);
    }
  }

  /**
   * Deep ruby buckram wallpaper with a repeating gold damask diamond motif and
   * a darkened vignette toward the edges, so the bright center reads first.
   */
  private drawWallpaper() {
    const key = "title-buckram-wallpaper";
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      g.fillStyle(color(PALETTE.deepRuby));
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // buckram weave: alternating horizontal threads
      g.fillStyle(color(PALETTE.buckramRed), 0.35);
      for (let y = 0; y < GAME_HEIGHT; y += 8) g.fillRect(0, y, GAME_WIDTH, 1);
      // damask diamonds on a staggered grid (drawn as rotated squares)
      const diamond = (cx: number, cy: number, r: number, fill: string, alpha: number) => {
        g.fillStyle(color(fill), alpha);
        for (let i = -r; i <= r; i += 1) {
          const span = r - Math.abs(i);
          g.fillRect(cx - span, cy + i, span * 2 + 1, 1);
        }
      };
      for (let gy = 0; gy <= GAME_HEIGHT; gy += 24) {
        for (let gx = 0; gx <= GAME_WIDTH; gx += 24) {
          const cx = gx + ((gy / 24) % 2 === 0 ? 0 : 12);
          diamond(cx, gy, 4, PALETTE.buckramRed, 0.7);
          diamond(cx, gy, 2, PALETTE.goldStamp, 0.5);
          g.fillStyle(color(PALETTE.paleGold), 0.7);
          g.fillRect(cx, gy, 1, 1);
          g.fillStyle(color(PALETTE.goldStamp), 0.3);
          g.fillRect(cx + 12, gy + 12, 1, 1);
        }
      }
      g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
      g.destroy();
    }
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key).setDepth(0);

    // vignette: darken the frame edges so the bright center reads first
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 40, color(PALETTE.black), 0.28).setOrigin(0.5, 0).setDepth(1);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT, GAME_WIDTH, 40, color(PALETTE.black), 0.28)
      .setOrigin(0.5, 1)
      .setDepth(1);
    this.add.rectangle(0, GAME_HEIGHT / 2, 28, GAME_HEIGHT, color(PALETTE.black), 0.28).setOrigin(0, 0.5).setDepth(1);
    this.add
      .rectangle(GAME_WIDTH, GAME_HEIGHT / 2, 28, GAME_HEIGHT, color(PALETTE.black), 0.28)
      .setOrigin(1, 0.5)
      .setDepth(1);
  }

  /**
   * Brass header plaque with a beveled mini-map readout, engraved title, and a
   * classification stamp strip on the right.
   */
  private drawHeaderPlaque() {
    // plaque body with bevel
    this.bevelPanel(128, 15, 256, 30, PALETTE.deepBrown, PALETTE.bronze, PALETTE.black, 2);
    this.add.rectangle(128, 27, 256, 2, color(PALETTE.goldStamp)).setDepth(4);
    this.add.rectangle(128, 30, 256, 2, color(PALETTE.paleGold)).setDepth(4);

    // mini-map readout module (beveled screen)
    this.bevelPanel(28, 15, 44, 22, PALETTE.black, PALETTE.stoneGray, PALETTE.deepBrown, 6);
    this.add.rectangle(28, 15, 38, 16, color(PALETTE.stoneDark)).setDepth(8);
    this.add.rectangle(20, 14, 6, 5, color(PALETTE.goldStamp)).setDepth(9);
    this.add.rectangle(29, 14, 5, 5, color(PALETTE.stoneLight)).setDepth(9);
    this.add.rectangle(38, 14, 5, 5, color(PALETTE.buckramHighlight)).setDepth(9);
    // scanline shimmer on the readout
    this.add.rectangle(28, 11, 38, 1, color(PALETTE.white), 0.25).setDepth(10);

    this.add
      .text(58, 7, "FRUS MAP", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp
      })
      .setDepth(9)
      .setResolution(2);
    this.add
      .text(58, 16, "ARCHIVE TERMINAL", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.bronze
      })
      .setDepth(9)
      .setResolution(2);

    // classification stamp
    this.add
      .text(184, 6, "-CONF-", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: PALETTE.buckramHighlight
      })
      .setDepth(9)
      .setResolution(2);
    for (let i = 0; i < 5; i += 1) {
      this.add.rectangle(214 + i * 7, 20, 5, 5, color(PALETTE.classNetRed)).setDepth(8);
      this.add.rectangle(213 + i * 7, 19, 2, 2, color(PALETTE.white), 0.6).setDepth(9);
    }
  }

  /**
   * Stylized filmstrip / sprocket border band. Brass rail with shaded
   * perforations and gold trim lines, used at the top and bottom of the scene.
   */
  private drawFilmstrip(y: number) {
    this.add.rectangle(128, y, 256, 16, color(PALETTE.deepBrown)).setDepth(2);
    this.add.rectangle(128, y - 7, 256, 1, color(PALETTE.goldStamp)).setDepth(3);
    this.add.rectangle(128, y + 7, 256, 1, color(PALETTE.black)).setDepth(3);
    for (let x = 8; x <= 248; x += 16) {
      // sprocket hole with bevel
      this.add.rectangle(x, y, 11, 11, color(PALETTE.black)).setDepth(3);
      this.add.rectangle(x, y, 9, 9, color(PALETTE.stoneDark)).setDepth(4);
      this.add.rectangle(x - 1, y - 1, 5, 5, color(PALETTE.stoneGray)).setDepth(5);
      this.add.rectangle(x - 2, y - 2, 2, 2, color(PALETTE.stoneLight)).setDepth(6);
    }
  }

  private drawWorldMapBriefing() {
    const centerX = 128;
    const centerY = TITLE_LAYOUT.map.y;
    const frameWidth = 120;
    const frameHeight = TITLE_LAYOUT.map.frameHeight;

    this.goldFrame(centerX, centerY, frameWidth, frameHeight, 8);

    if (this.textures.exists("frus_world_map")) {
      const source = this.textures.get("frus_world_map").getSourceImage() as { width?: number; height?: number };
      const width = source.width ?? frameWidth;
      const height = source.height ?? frameHeight;
      const scale = Math.min(frameWidth / width, frameHeight / height);
      this.add.image(centerX, centerY, "frus_world_map").setOrigin(0.5).setScale(scale).setDepth(16);
    } else {
      this.add.rectangle(centerX, centerY, frameWidth, frameHeight, color(PALETTE.mapWater)).setDepth(16);
    }

    // engraved title ribbon mounted on the top rail of the frame
    const ribbonY = centerY - frameHeight / 2 - 5;
    this.add.rectangle(centerX, ribbonY, frameWidth - 6, 9, color(PALETTE.deepBrown)).setDepth(17);
    this.add
      .rectangle(centerX, ribbonY, frameWidth - 6, 9, color(PALETTE.black), 0)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(18);
    this.add
      .text(centerX, ribbonY - 3, "FRUS PRODUCTION MAP", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp
      })
      .setOrigin(0.5, 0)
      .setDepth(19)
      .setResolution(2);
  }

  /**
   * "RUBY RULE" rendered as a layered, beveled gold logo on its own mounted
   * plate so it no longer collides with the map, plus the FRUS QUEST subtitle.
   */
  private drawTitlePlate() {
    const plateY = TITLE_LAYOUT.titlePlate.y;
    this.goldFrame(128, plateY, 168, TITLE_LAYOUT.titlePlate.frameHeight, 20);

    // layered title: dark shadow, ruby outline, gold face, pale highlight
    const titleStyle = (size: string, c: string) => ({
      fontFamily: "monospace",
      fontSize: size,
      color: c,
      fontStyle: "bold" as const
    });
    const titleY = plateY - 4;
    this.add
      .text(129, titleY + 1, "RUBY RULE", titleStyle("14px", PALETTE.black))
      .setOrigin(0.5)
      .setDepth(26)
      .setResolution(2);
    this.add
      .text(127, titleY - 1, "RUBY RULE", titleStyle("14px", PALETTE.mutedRuby))
      .setOrigin(0.5)
      .setDepth(27)
      .setResolution(2);
    this.add
      .text(128, titleY, "RUBY RULE", titleStyle("14px", PALETTE.goldStamp))
      .setOrigin(0.5)
      .setDepth(28)
      .setResolution(2);

    this.add
      .text(128, plateY + 8, "THE FRUS QUEST", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: PALETTE.creamPaper
      })
      .setOrigin(0.5)
      .setDepth(28)
      .setResolution(2);
  }

  /**
   * Wraps the existing relic rack in a framed wooden display case with a
   * brass nameplate so it matches the mounted-archive look of the map.
   */
  private drawRelicShelf(x: number, y: number) {
    this.goldFrame(x, y, 150, TITLE_LAYOUT.relicShelf.frameHeight, 20);
    addSnesWorkflowRelicRack(this, x, y - 5);
  }

  private toggleAudio() {
    retroAudio.toggle();
  }

  private start() {
    if (this.started) return;
    this.started = true;
    retroAudio.confirm();
    resetGameState();
    transitionTo(this, "CharacterCreateScene");
  }

  private createSkipWarningToggle() {
    const hit = this.add.rectangle(191, 229, 112, 12, color(PALETTE.black), 0.01).setDepth(40);
    bindPointerPress(hit, {
      down: () => {
        this.ignoreNextPointerStart = true;
        this.toggleSkipWarning();
      }
    });
    this.skipWarningText = this.add
      .text(191, 226, "", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp
      })
      .setOrigin(0.5, 0)
      .setDepth(40)
      .setResolution(2);
    this.renderSkipWarningToggle();
  }

  private toggleSkipWarning() {
    this.skipWarning = !this.skipWarning;
    setSkipWarningPreference(this.skipWarning);
    this.renderSkipWarningToggle();
  }

  private renderSkipWarningToggle() {
    const mark = this.skipWarning ? "X" : " ";
    this.skipWarningText?.setText(`B SKIP WARNING [${mark}]`);
  }
}
