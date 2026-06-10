import Phaser from "phaser";
import { PALETTE, PROCESS_ROLES, SCENE_ORDER } from "../game/constants";
import { resetGameState, seedProgressForScene, setPlayerProfile, setSceneState } from "../game/state";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.json("items", "assets/data/items.json");
    this.load.json("dialogue", "assets/data/dialogue.json");
    this.load.json("scenes", "assets/data/scenes.json");
    this.preloadSvgAssets();
  }

  create() {
    setSceneState("BootScene", "boot", "Loading original pixel assets.");
    this.createTextures();
    const startScene = this.getStartScene();
    if (startScene !== "TitleScene") {
      resetGameState();
      this.applyRoleFromQuery();
      seedProgressForScene(startScene);
    }
    this.scene.start(startScene);
  }

  private getStartScene() {
    const requested = new URLSearchParams(window.location.search).get("scene");
    if (requested && SCENE_ORDER.includes(requested as (typeof SCENE_ORDER)[number])) {
      return requested;
    }
    return "TitleScene";
  }

  private applyRoleFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const roleId = params.get("role");
    const role = PROCESS_ROLES.find((item) => item.id === roleId) ?? PROCESS_ROLES[0];
    const rawName = params.get("name")?.trim() || "Sam";
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1, 10);
    setPlayerProfile(name, role);
  }

  private createTextures() {
    this.makeCharacterTextureIfMissing("sam", PALETTE.creamPaper);
    this.makeCharacterTextureIfMissing("elena", PALETTE.archiveAmber);
    this.makeCharacterTextureIfMissing("marcus", PALETTE.classNetRed);
    this.makeCharacterTextureIfMissing("priya", PALETTE.goldStamp);
    for (const role of PROCESS_ROLES) {
      this.makeCharacterTextureIfMissing(role.spriteKey, PALETTE[role.color]);
    }
    this.makeManuscriptTextureIfMissing();
    this.makeVolumeTextureIfMissing();
    this.makeCitationStampTextureIfMissing();
    this.makeVolumeFragmentTextureIfMissing();
    this.makeArchiveColleagueTextureIfMissing();
    this.makeBureaucraticWallTextureIfMissing();
    this.makeTileTextureIfMissing("office-tiles", PALETTE.creamPaper, PALETTE.archiveAmber);
    this.makeTileTextureIfMissing("archive-tiles", PALETTE.archiveAmber, PALETTE.sepiaInk);
    this.makeTileTextureIfMissing("network-tiles", PALETTE.shadowNavy, PALETTE.terminalCyan);
    this.makeTileTextureIfMissing("vault-tiles", PALETTE.deepRuby, PALETTE.goldStamp);
    this.makeUiTextureIfMissing("dialog-box", PALETTE.black, PALETTE.creamPaper);
    this.makeUiTextureIfMissing("terminal-panel", PALETTE.black, PALETTE.terminalCyan);
    this.makeUiTextureIfMissing("reliability-meter", PALETTE.shadowNavy, PALETTE.goldStamp);
  }

  private preloadSvgAssets() {
    const sprites: Array<[string, string, number, number]> = [
      ["sam", "sam.svg", 16, 16],
      ["elena", "elena.svg", 16, 16],
      ["marcus", "marcus.svg", 16, 16],
      ["priya", "priya.svg", 16, 16],
      ["player-proofreader", "player-proofreader.svg", 16, 16],
      ["player-compiler", "player-compiler.svg", 16, 16],
      ["player-editor", "player-editor.svg", 16, 16],
      ["player-declass-reviewer", "player-declass-reviewer.svg", 16, 16],
      ["player-source-note-specialist", "player-source-note-specialist.svg", 16, 16],
      ["archive-colleague", "archive-colleague.svg", 16, 16],
      ["citation-stamp", "citation-stamp.svg", 18, 18],
      ["volume-fragment", "volume-fragment.svg", 20, 18],
      ["bureaucratic-wall", "bureaucratic-wall.svg", 36, 32],
      ["manuscript", "manuscript.svg", 18, 18],
      ["frus-volume", "frus-volume.svg", 52, 42]
    ];
    for (const [key, file, width, height] of sprites) {
      this.load.svg(key, `assets/sprites/${file}`, { width, height });
    }

    for (const key of ["office-tiles", "archive-tiles", "network-tiles", "vault-tiles"]) {
      this.load.svg(key, `assets/tiles/${key}.svg`, { width: 16, height: 16 });
    }

    for (const key of ["dialog-box", "terminal-panel", "reliability-meter"]) {
      this.load.svg(key, `assets/ui/${key}.svg`, { width: 32, height: 16 });
    }
  }

  private makeCharacterTextureIfMissing(key: string, bodyHex: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(5, 1, 6, 1);
    g.fillRect(4, 2, 8, 2);
    g.fillRect(4, 4, 1, 4);
    g.fillRect(11, 4, 1, 4);
    g.fillRect(3, 9, 10, 5);
    g.fillRect(4, 14, 3, 2);
    g.fillRect(9, 14, 3, 2);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(5, 4, 6, 5);
    g.fillStyle(color(bodyHex));
    g.fillRect(4, 9, 8, 5);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(2, 10, 2, 4);
    g.fillRect(12, 10, 2, 4);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(6, 5, 1, 1);
    g.fillRect(9, 5, 1, 1);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(8, 6, 1, 1);
    g.fillRect(7, 8, 3, 1);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(5, 10, 6, 1);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeManuscriptTextureIfMissing() {
    if (this.textures.exists("manuscript")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(3, 2, 13, 15);
    g.fillStyle(color(PALETTE.white));
    g.fillRect(1, 0, 14, 16);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(12, 0, 3, 3);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(4, 4, 8, 1);
    g.fillRect(4, 6, 6, 1);
    g.fillRect(4, 8, 9, 1);
    g.fillRect(4, 11, 7, 1);
    g.fillStyle(color(PALETTE.classNetRed));
    g.fillRect(1, 0, 2, 16);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(11, 13, 2, 1);
    g.generateTexture("manuscript", 18, 18);
    g.destroy();
  }

  private makeVolumeTextureIfMissing() {
    if (this.textures.exists("frus-volume")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(3, 5, 48, 34);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(0, 2, 48, 34);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(4, 6, 40, 26);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(8, 10, 32, 2);
    g.fillRect(14, 18, 20, 2);
    g.fillRect(12, 25, 24, 2);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(8, 13, 32, 1);
    g.fillRect(43, 7, 2, 24);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(47, 7, 2, 29);
    g.generateTexture("frus-volume", 52, 42);
    g.destroy();
  }

  private makeCitationStampTextureIfMissing() {
    if (this.textures.exists("citation-stamp")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(4, 4, 12, 13);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(3, 2, 12, 13);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(6, 0, 6, 4);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(7, 1, 4, 1);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(4, 4, 10, 1);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(5, 6, 8, 2);
    g.fillRect(5, 9, 8, 1);
    g.fillRect(6, 12, 6, 1);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(4, 15, 10, 2);
    g.generateTexture("citation-stamp", 18, 18);
    g.destroy();
  }

  private makeVolumeFragmentTextureIfMissing() {
    if (this.textures.exists("volume-fragment")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(5, 3, 13, 14);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(2, 1, 14, 14);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(5, 4, 8, 8);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(6, 5, 6, 1);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(6, 7, 6, 1);
    g.fillRect(7, 10, 4, 1);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(2, 1, 3, 14);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(13, 13, 4, 3);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(16, 15, 2, 2);
    g.generateTexture("volume-fragment", 20, 18);
    g.destroy();
  }

  private makeArchiveColleagueTextureIfMissing() {
    if (this.textures.exists("archive-colleague")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(5, 1, 6, 1);
    g.fillRect(4, 2, 8, 2);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(5, 4, 6, 5);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(6, 5, 1, 1);
    g.fillRect(9, 5, 1, 1);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(8, 6, 1, 1);
    g.fillRect(7, 8, 3, 1);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(3, 9, 10, 5);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(4, 10, 2, 4);
    g.fillRect(10, 10, 2, 4);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(8, 10, 5, 4);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(2, 10, 2, 4);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(5, 14, 2, 2);
    g.fillRect(9, 14, 2, 2);
    g.generateTexture("archive-colleague", 16, 16);
    g.destroy();
  }

  private makeBureaucraticWallTextureIfMissing() {
    if (this.textures.exists("bureaucratic-wall")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black), 0);
    g.fillRect(0, 0, 36, 32);
    g.fillStyle(color(PALETTE.stoneDark));
    g.fillRect(3, 6, 30, 22);
    g.fillStyle(color(PALETTE.stoneGray));
    g.fillRect(5, 4, 26, 20);
    g.fillStyle(color(PALETTE.stoneLight));
    g.fillRect(6, 5, 10, 7);
    g.fillRect(19, 6, 11, 6);
    g.fillRect(9, 15, 9, 8);
    g.fillRect(21, 16, 8, 7);
    g.fillStyle(color(PALETTE.stoneDark));
    g.fillRect(5, 3, 5, 3);
    g.fillRect(14, 2, 7, 3);
    g.fillRect(27, 3, 4, 3);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(2, 12, 32, 4);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(4, 13, 28, 1);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(11, 11, 3, 3);
    g.fillRect(22, 11, 3, 3);
    g.fillRect(10, 10, 5, 1);
    g.fillRect(21, 10, 5, 1);
    g.fillRect(14, 22, 8, 2);
    g.fillRect(12, 23, 3, 1);
    g.fillRect(21, 23, 3, 1);
    g.lineStyle(1, color(PALETTE.black), 0.65);
    g.lineBetween(17, 5, 20, 23);
    g.generateTexture("bureaucratic-wall", 36, 32);
    g.destroy();
  }

  private makeTileTextureIfMissing(key: string, baseHex: string, accentHex: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color(baseHex));
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(color(accentHex), 0.6);
    g.fillRect(0, 0, 16, 1);
    g.fillRect(0, 0, 1, 16);
    g.fillStyle(color(PALETTE.black), 0.18);
    g.fillRect(8, 8, 2, 2);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeUiTextureIfMissing(key: string, fillHex: string, borderHex: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color(fillHex));
    g.fillRect(0, 0, 32, 16);
    g.lineStyle(2, color(borderHex));
    g.strokeRect(1, 1, 30, 14);
    g.generateTexture(key, 32, 16);
    g.destroy();
  }
}
