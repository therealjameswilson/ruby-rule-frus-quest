import Phaser from "phaser";
import { SCREENS, publicAssetPath } from "../assets/registry";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { resetGameState, setSceneState } from "../game/state";
import { getSkipWarningPreference, setSkipWarningPreference } from "../game/warningSettings";
import { bindPointerPress, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { cycleLanguage, getLanguage, getString } from "../systems/i18n";
import { transitionTo } from "../systems/sceneTransitions";
import { addSnesWorkflowRelicRack } from "../systems/snesPixelArt";
import { shouldStartTitle, TITLE_LAYOUT } from "./titleLayout";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function compactTitleLine(value: string, max = 56) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 18 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

export class TitleScene extends Phaser.Scene {
  private started = false;
  private skipWarning = false;
  private skipWarningText?: Phaser.GameObjects.Text;
  private languageText?: Phaser.GameObjects.Text;
  private ignoreNextPointerStart = false;
  private languageKeyHandler?: () => void;

  constructor() {
    super("TitleScene");
  }

  preload() {
    for (const [key, path] of Object.entries(SCREENS)) {
      if (!this.textures.exists(key)) this.load.image(key, publicAssetPath(path));
    }
  }

  create() {
    setSceneState("TitleScene", "title", getString("mission.objective"));
    this.started = false;
    this.skipWarning = getSkipWarningPreference();
    this.ignoreNextPointerStart = false;
    retroAudio.startMusic("TitleScene");

    this.cameras.main.setBackgroundColor(PALETTE.black);
    const usingArtPackTitle = this.drawArtPackTitleScreen();
    if (!usingArtPackTitle) this.drawCleanTitleCard();
    this.drawStartAffordance(TITLE_LAYOUT.pressStartY);
    if (!usingArtPackTitle) this.drawMissionPlaque(false);
    else this.drawHistoryStateSourceTag();
    this.createSkipWarningToggle();
    this.createLanguageSelector();
    this.installLanguageShortcut();
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
    if (shouldStartTitle(input)) this.start();
  }

  /**
   * Prefer the repository-local 16-bit title card when it is loaded at native
   * resolution. The procedural title stays as a fallback so deep links still
   * boot if the art pack is absent.
   */
  private drawArtPackTitleScreen() {
    const sharpKey = "title_screen_16bit_sharp_256x240" satisfies keyof typeof SCREENS;
    if (this.textures.exists(sharpKey)) {
      const source = this.textures.get(sharpKey).getSourceImage() as { width?: number; height?: number };
      if (source.width === GAME_WIDTH && source.height === GAME_HEIGHT) {
        this.add.image(0, 0, sharpKey).setName("title-art-sharp-card").setOrigin(0).setDepth(0);
        return true;
      }
    }

    const key = "title_screen_256x224" satisfies keyof typeof SCREENS;
    if (!this.textures.exists(key)) return false;
    const source = this.textures.get(key).getSourceImage() as { width?: number; height?: number };
    if (source.width !== GAME_WIDTH || source.height !== 224) return false;

    this.add.image(0, 0, key).setOrigin(0).setDepth(0);
    this.add.rectangle(GAME_WIDTH / 2, 232, GAME_WIDTH, 16, color(PALETTE.black), 0.92).setDepth(38);
    this.add.text(7, 226, "A / ENTER START", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setDepth(40);
    this.drawQuestRouteStrip(128, 211, 41);
    return true;
  }

  private drawHistoryStateSourceTag() {
    this.add.rectangle(128, 28, 86, 7, color(PALETTE.black), 0.84)
      .setName("title-history-state-artpack-tag-plate")
      .setDepth(41);
    this.add.text(128, 25, "SOURCE: HISTORY.STATE.GOV", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper
    }).setName("title-history-state-artpack-shoutout").setOrigin(0.5, 0).setDepth(42).setResolution(2);
  }

  private drawCleanTitleCard() {
    this.add.rectangle(128, 120, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby)).setName("title-clean-bg");
    this.add.rectangle(128, 120, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black), 0.18).setName("title-clean-vignette");
    for (let y = 14; y < GAME_HEIGHT - 18; y += 28) {
      for (let x = (y / 28) % 2 === 0 ? 14 : 30; x < GAME_WIDTH; x += 32) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramHighlight), 0.28)
          .setName("title-clean-buckram-dot");
      }
    }

    this.add.rectangle(128, 72, 178, 86, color(PALETTE.black), 0.55)
      .setName("title-clean-card-shadow");
    this.add.rectangle(128, 69, 170, 82, color(PALETTE.shadowNavy), 0.96)
      .setName("title-clean-card")
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.rectangle(128, 103, 124, 1, color(PALETTE.goldStamp), 0.86)
      .setName("title-clean-divider");

    this.add.text(128, 34, getString("title.title"), {
      fontFamily: "monospace",
      fontSize: "18px",
      color: PALETTE.goldStamp,
      fontStyle: "bold"
    }).setName("title-clean-logo").setOrigin(0.5, 0).setResolution(2);
    this.add.text(128, 56, getString("title.subtitle"), {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper
    }).setName("title-clean-subtitle").setOrigin(0.5, 0).setResolution(2);

    this.add.rectangle(128, 84, 24, 30, color(PALETTE.deepRuby))
      .setName("title-clean-volume")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    this.add.rectangle(121, 84, 4, 30, color(PALETTE.buckramHighlight), 0.82)
      .setName("title-clean-volume-spine");
    this.add.rectangle(132, 77, 10, 2, color(PALETTE.goldStamp))
      .setName("title-clean-volume-band");
    this.add.rectangle(132, 91, 10, 2, color(PALETTE.goldStamp))
      .setName("title-clean-volume-band");
    this.add.circle(132, 84, 4, color(PALETTE.goldStamp), 0.82)
      .setName("title-clean-volume-seal");

    this.add.text(128, 114, getString("title.pressStart"), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan
    }).setName("title-clean-start-text").setOrigin(0.5, 0).setResolution(2);
    this.add.text(128, 126, getString("title.sourceTrail"), {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper
    }).setName("title-history-state-shoutout").setOrigin(0.5, 0).setResolution(2);
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
      .text(58, 7, getString("title.frusMap"), {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp
      })
      .setDepth(9)
      .setResolution(2);
    this.add
      .text(58, 16, getString("title.archiveTerminal"), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.bronze
      })
      .setDepth(9)
      .setResolution(2);

    // classification stamp
    this.add
      .text(184, 6, getString("title.conf"), {
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
      .text(centerX, ribbonY - 3, getString("title.productionMap"), {
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
      .text(129, titleY + 1, getString("title.title"), titleStyle("14px", PALETTE.black))
      .setOrigin(0.5)
      .setDepth(26)
      .setResolution(2);
    this.add
      .text(127, titleY - 1, getString("title.title"), titleStyle("14px", PALETTE.mutedRuby))
      .setOrigin(0.5)
      .setDepth(27)
      .setResolution(2);
    this.add
      .text(128, titleY, getString("title.title"), titleStyle("14px", PALETTE.goldStamp))
      .setOrigin(0.5)
      .setDepth(28)
      .setResolution(2);

    this.add
      .text(128, plateY + 8, getString("title.subtitle"), {
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

  private drawQuestRouteStrip(x: number, y: number, depth: number) {
    const steps = [
      { label: getString("title.arch"), color: PALETTE.archiveAmber, kind: "stamp" },
      { label: getString("title.net"), color: PALETTE.terminalCyan, kind: "terminal" },
      { label: getString("title.ref"), color: PALETTE.classNetRed, kind: "seal" },
      { label: getString("title.read"), color: PALETTE.creamPaper, kind: "pages" },
      { label: getString("title.gate"), color: PALETTE.goldStamp, kind: "volume" }
    ] as const;
    const spacing = 38;
    const startX = x - spacing * 2;
    this.add.rectangle(x + 2, y + 3, 206, 23, color(PALETTE.black), 0.72)
      .setName("title-quest-route-shadow")
      .setDepth(depth);
    this.add.rectangle(x, y, 206, 23, color(PALETTE.deepRuby), 0.9)
      .setName("title-quest-route-strip")
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(depth + 1);
    this.add.text(x, y - 10, getString("title.questRoute"), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setName("title-quest-route-heading").setOrigin(0.5, 0).setDepth(depth + 3).setResolution(2);

    steps.forEach((step, index) => {
      const nodeX = startX + index * spacing;
      if (index > 0) {
        this.add.rectangle(nodeX - spacing / 2, y + 1, spacing - 17, 2, color(PALETTE.goldStamp), 0.86)
          .setName("title-quest-route-link")
          .setDepth(depth + 2);
        this.add.rectangle(nodeX - spacing / 2 + 5, y - 2, 4, 4, color(PALETTE.black), 0.82)
          .setName("title-quest-route-link-rivet")
          .setDepth(depth + 2);
      }
      this.add.rectangle(nodeX, y + 1, 19, 15, color(PALETTE.black), 0.95)
        .setName("title-quest-route-node")
        .setStrokeStyle(1, color(step.color))
        .setDepth(depth + 3);
      this.drawQuestRouteIcon(nodeX, y - 1, step.kind, step.color, depth + 4);
      this.add.text(nodeX, y + 9, step.label, {
        fontFamily: "monospace",
        fontSize: "4px",
        color: step.color,
        align: "center"
      }).setName("title-quest-route-label").setOrigin(0.5, 0).setDepth(depth + 5).setResolution(2);
    });
  }

  private drawQuestRouteIcon(x: number, y: number, kind: "stamp" | "terminal" | "seal" | "pages" | "volume", accent: string, depth: number) {
    if (kind === "stamp") {
      this.add.rectangle(x, y - 3, 8, 3, color(accent)).setName("title-quest-route-icon").setDepth(depth);
      this.add.rectangle(x, y + 1, 12, 5, color(PALETTE.creamPaper)).setName("title-quest-route-icon").setDepth(depth);
      this.add.rectangle(x, y + 3, 8, 1, color(PALETTE.buckramRed)).setName("title-quest-route-icon").setDepth(depth + 1);
      return;
    }
    if (kind === "terminal") {
      this.add.rectangle(x, y, 12, 9, color(PALETTE.black)).setName("title-quest-route-icon").setStrokeStyle(1, color(accent)).setDepth(depth);
      this.add.rectangle(x, y - 1, 7, 3, color(accent), 0.9).setName("title-quest-route-icon").setDepth(depth + 1);
      return;
    }
    if (kind === "seal") {
      this.add.circle(x, y, 5, color(PALETTE.deepRuby)).setName("title-quest-route-icon").setStrokeStyle(1, color(accent)).setDepth(depth);
      this.add.rectangle(x, y, 7, 1, color(accent)).setName("title-quest-route-icon").setDepth(depth + 1);
      return;
    }
    if (kind === "pages") {
      this.add.rectangle(x - 3, y, 7, 9, color(PALETTE.creamPaper)).setName("title-quest-route-icon").setStrokeStyle(1, color(PALETTE.black)).setDepth(depth);
      this.add.rectangle(x + 3, y + 1, 7, 9, color(PALETTE.creamPaper)).setName("title-quest-route-icon").setStrokeStyle(1, color(PALETTE.black)).setDepth(depth);
      this.add.rectangle(x + 3, y + 3, 5, 1, color(PALETTE.buckramRed)).setName("title-quest-route-icon").setDepth(depth + 1);
      return;
    }
    this.add.rectangle(x, y, 9, 11, color(PALETTE.deepRuby)).setName("title-quest-route-icon").setStrokeStyle(1, color(accent)).setDepth(depth);
    this.add.rectangle(x - 3, y, 2, 11, color(PALETTE.buckramRed)).setName("title-quest-route-icon").setDepth(depth + 1);
    this.add.rectangle(x + 1, y - 2, 5, 1, color(accent)).setName("title-quest-route-icon").setDepth(depth + 1);
    this.add.rectangle(x + 1, y + 2, 5, 1, color(accent)).setName("title-quest-route-icon").setDepth(depth + 1);
  }

  private drawStartAffordance(y: number) {
    const depth = 42;
    const group = this.add.container(128, y).setName("title-start-affordance").setDepth(depth);
    const left = this.add.triangle(-76, 0, 0, 0, 7, 4, 0, 8, color(PALETTE.goldStamp))
      .setName("title-start-affordance-arrow-left");
    const right = this.add.triangle(76, 0, 7, 0, 0, 4, 7, 8, color(PALETTE.goldStamp))
      .setName("title-start-affordance-arrow-right");
    const underlineBack = this.add.rectangle(0, 9, 102, 3, color(PALETTE.black), 0.72)
      .setName("title-start-affordance-underline-back");
    const underline = this.add.rectangle(0, 9, 86, 1, color(PALETTE.terminalCyan), 0.95)
      .setName("title-start-affordance-underline");
    const sparkLeft = this.add.rectangle(-49, 9, 3, 3, color(PALETTE.terminalCyan), 0.85)
      .setName("title-start-affordance-spark");
    const sparkRight = this.add.rectangle(49, 9, 3, 3, color(PALETTE.terminalCyan), 0.85)
      .setName("title-start-affordance-spark");
    group.add([left, right, underlineBack, underline, sparkLeft, sparkRight]);
    this.tweens.add({
      targets: [left, right, underline, sparkLeft, sparkRight],
      alpha: 0.38,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
  }

  private drawMissionPlaque(usingArtPackTitle: boolean) {
    const y = usingArtPackTitle ? 204 : 192;
    const depth = 43;
    const plaqueHeight = usingArtPackTitle ? 28 : 24;
    this.add.rectangle(128, y, 238, plaqueHeight + 2, color(PALETTE.black), 0.84)
      .setName("title-mission-plaque-shadow")
      .setDepth(depth);
    this.add.rectangle(128, y - 1, 232, plaqueHeight, color(PALETTE.deepRuby), 0.92)
      .setName("title-mission-plaque")
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(depth + 1);
    this.add.text(128, y - 11, compactTitleLine(getString("mission.goalBanner"), 48), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setName("title-mission-text").setOrigin(0.5, 0).setDepth(depth + 2).setResolution(2);
    this.add.text(128, y - 2, compactTitleLine(getString("mission.loop"), 58), {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setName("title-mission-loop-text").setOrigin(0.5, 0).setDepth(depth + 2).setResolution(2);
    this.add.text(128, y + 6, compactTitleLine(getString("mission.heartsHint"), 54), {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper,
      align: "center"
    }).setName("title-mission-stakes-text").setOrigin(0.5, 0).setDepth(depth + 2).setResolution(2);
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
    this.add
      .rectangle(207, 232, 82, 9, color(PALETTE.black), 0.72)
      .setName("title-skip-warning-backplate")
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(39);
    const hit = this.add.rectangle(207, 231, 88, 12, color(PALETTE.black), 0.01).setDepth(40);
    bindPointerPress(hit, {
      down: () => {
        this.ignoreNextPointerStart = true;
        this.toggleSkipWarning();
      }
    });
    this.skipWarningText = this.add
      .text(207, 229, "", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.goldStamp
      })
      .setOrigin(0.5, 0)
      .setDepth(40)
      .setResolution(2);
    this.renderSkipWarningToggle();
  }

  private createLanguageSelector() {
    this.add
      .rectangle(49, 232, 82, 9, color(PALETTE.black), 0.72)
      .setName("title-language-backplate")
      .setStrokeStyle(1, color(PALETTE.terminalCyan))
      .setDepth(39);
    const hit = this.add.rectangle(49, 231, 88, 12, color(PALETTE.black), 0.01).setDepth(40);
    bindPointerPress(hit, {
      down: () => {
        this.ignoreNextPointerStart = true;
        this.changeLanguage();
      }
    });
    this.languageText = this.add
      .text(49, 229, "", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.terminalCyan
      })
      .setOrigin(0.5, 0)
      .setDepth(40)
      .setResolution(2);
    this.renderLanguageSelector();
  }

  private installLanguageShortcut() {
    if (!this.input.keyboard) return;
    this.languageKeyHandler = () => this.changeLanguage();
    this.input.keyboard.on("keydown-L", this.languageKeyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.languageKeyHandler) this.input.keyboard?.off("keydown-L", this.languageKeyHandler);
      this.languageKeyHandler = undefined;
    });
  }

  private toggleSkipWarning() {
    this.skipWarning = !this.skipWarning;
    setSkipWarningPreference(this.skipWarning);
    this.renderSkipWarningToggle();
  }

  private renderSkipWarningToggle() {
    const mark = this.skipWarning ? "X" : " ";
    this.skipWarningText?.setText(getString("title.skipWarning", { mark }));
  }

  private changeLanguage() {
    const language = cycleLanguage();
    retroAudio.confirm();
    this.registry.set("ruby-rule-language", language);
    this.scene.restart();
  }

  private renderLanguageSelector() {
    const language = getLanguage();
    this.languageText?.setText(getString("language.label", { language: language.toUpperCase() }));
  }
}
