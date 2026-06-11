import Phaser from "phaser";
import { PALETTE, PROCESS_ROLES, SCENE_ORDER } from "../game/constants";
import {
  SNES_ANTAGONIST_ASSETS,
  SNES_AREA_MAP_ASSETS,
  SNES_BUREAUCRATIC_WALL_ASSETS,
  SNES_MAIN_MAP_ASSET,
  SNES_NPC_ASSETS,
  SNES_PRODUCTION_COLLEAGUE_ASSETS,
  SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET,
  SNES_ROLE_FRAME_SHEETS
} from "../game/snesAtlas";
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
    this.makeFrusPrizeCoverTextureIfMissing();
    this.makeCitationStampTextureIfMissing();
    this.makeVolumeFragmentTextureIfMissing();
    this.makeArchiveColleagueTextureIfMissing();
    for (const npcAsset of SNES_NPC_ASSETS) {
      this.makeSnesNpcTextureIfMissing(npcAsset.key, npcAsset.characterId);
    }
    for (const colleagueAsset of SNES_PRODUCTION_COLLEAGUE_ASSETS) {
      this.makeSnesProductionColleagueTextureIfMissing(colleagueAsset.key, colleagueAsset.id);
    }
    this.makeSnesProductionColleagueFrameSheetIfMissing();
    for (const antagonistAsset of SNES_ANTAGONIST_ASSETS) {
      this.makeSnesAntagonistTextureIfMissing(antagonistAsset.key);
    }
    this.makeBureaucraticWallTextureIfMissing();
    for (const wallAsset of SNES_BUREAUCRATIC_WALL_ASSETS) {
      this.makeSnesWallTextureIfMissing(wallAsset.key);
    }
    this.makeSnesMapTextureIfMissing(SNES_MAIN_MAP_ASSET.key);
    for (const mapAsset of SNES_AREA_MAP_ASSETS) {
      this.makeSnesMapTextureIfMissing(mapAsset.key);
    }
    this.makeSnesWorkflowToolsTextureIfMissing();
    for (const role of PROCESS_ROLES) {
      this.makeSnesRoleTextureIfMissing(role.snesSpriteKey, PALETTE[role.color], role.id);
    }
    this.registerSnesProductionColleagueFrameSheet();
    this.registerSnesRoleFrameSheets();
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
      ["snes-player-proofreader", "snes-player-proofreader.svg", 32, 32],
      ["snes-player-compiler", "snes-player-compiler.svg", 32, 32],
      ["snes-player-editor", "snes-player-editor.svg", 32, 32],
      ["snes-player-declass-reviewer", "snes-player-declass-reviewer.svg", 32, 32],
      ["snes-player-source-note-specialist", "snes-player-source-note-specialist.svg", 32, 32],
      ["archive-colleague", "archive-colleague.svg", 16, 16],
      ["citation-stamp", "citation-stamp.svg", 24, 24],
      ["volume-fragment", "volume-fragment.svg", 24, 24],
      ["telegram", "telegram.svg", 24, 24],
      ["source-note", "source-note.svg", 24, 24],
      ["cross-reference", "cross-reference.svg", 24, 24],
      ["opennet-terminal", "opennet-terminal.svg", 24, 24],
      ["classnet-terminal", "classnet-terminal.svg", 24, 24],
      ["proof-page", "proof-page.svg", 24, 24],
      ["red-pencil", "red-pencil.svg", 24, 24],
      ["review-folder", "review-folder.svg", 24, 24],
      ["clearance-token", "clearance-token.svg", 24, 24],
      ["concurrence-slip", "concurrence-slip.svg", 24, 24],
      ["proof-lens", "proof-lens.svg", 24, 24],
      ["buckram-key", "buckram-key.svg", 24, 24],
      ["agency-equity-seal", "agency-equity-seal.svg", 24, 24],
      ["referral-manifest", "referral-manifest.svg", 24, 24],
      ["excision-bracket-marker", "excision-bracket-marker.svg", 24, 24],
      ["bureaucratic-wall", "bureaucratic-wall.svg", 36, 32],
      ["manuscript", "manuscript.svg", 18, 18],
      ["frus-volume", "frus-volume.svg", 52, 42],
      ["frus-prize-cover", "frus-prize-cover.svg", 80, 120]
    ];
    for (const [key, file, width, height] of sprites) {
      this.load.svg(key, `assets/sprites/${file}`, { width, height });
    }
    for (const npcAsset of SNES_NPC_ASSETS) {
      this.load.svg(npcAsset.key, npcAsset.path, { width: 32, height: 32 });
    }
    for (const colleagueAsset of SNES_PRODUCTION_COLLEAGUE_ASSETS) {
      this.load.svg(colleagueAsset.key, colleagueAsset.path, { width: 32, height: 32 });
    }
    this.load.svg(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key, SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.path, {
      width: SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.dimensions.width,
      height: SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.dimensions.height
    });
    for (const sheet of SNES_ROLE_FRAME_SHEETS) {
      this.load.svg(sheet.key, sheet.path, {
        width: sheet.dimensions.width,
        height: sheet.dimensions.height
      });
    }
    for (const antagonistAsset of SNES_ANTAGONIST_ASSETS) {
      this.load.svg(antagonistAsset.key, antagonistAsset.path, { width: 32, height: 32 });
    }
    for (const wallAsset of SNES_BUREAUCRATIC_WALL_ASSETS) {
      this.load.svg(wallAsset.key, wallAsset.path, { width: 32, height: 32 });
    }
    this.load.svg(SNES_MAIN_MAP_ASSET.key, SNES_MAIN_MAP_ASSET.path, {
      width: SNES_MAIN_MAP_ASSET.dimensions.width,
      height: SNES_MAIN_MAP_ASSET.dimensions.height
    });
    for (const mapAsset of SNES_AREA_MAP_ASSETS) {
      this.load.svg(mapAsset.key, mapAsset.path, { width: mapAsset.dimensions.width, height: mapAsset.dimensions.height });
    }
    this.load.svg("snes-workflow-tools", "assets/sprites/snes-workflow-tools.svg", { width: 128, height: 32 });

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

  private makeFrusPrizeCoverTextureIfMissing() {
    if (this.textures.exists("frus-prize-cover")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(5, 7, 70, 108);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(2, 3, 70, 108);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(2, 3, 7, 108);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(9, 8, 58, 98);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(10, 9, 56, 1);
    g.fillRect(10, 105, 56, 1);
    g.fillStyle(color(PALETTE.goldStamp));
    for (const y of [31, 51, 86, 104]) {
      g.fillRect(15, y, 46, 1);
    }
    g.fillRect(20, 17, 36, 2);
    g.fillRect(22, 25, 32, 2);
    g.fillRect(25, 43, 26, 2);
    g.fillRect(25, 68, 26, 3);
    g.fillRect(22, 76, 32, 2);
    g.lineStyle(1, color(PALETTE.goldStamp));
    g.strokeCircle(38, 94, 8);
    g.fillRect(35, 90, 6, 8);
    g.fillRect(32, 93, 3, 2);
    g.fillRect(41, 93, 3, 2);
    g.fillRect(36, 88, 4, 2);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(64, 12, 2, 89);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(69, 13, 2, 96);
    g.generateTexture("frus-prize-cover", 80, 120);
    g.destroy();
  }

  private makeCitationStampTextureIfMissing() {
    if (this.textures.exists("citation-stamp")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(7, 3, 10, 3);
    g.fillRect(6, 6, 12, 4);
    g.fillRect(5, 9, 14, 8);
    g.fillRect(4, 16, 16, 5);
    g.fillRect(3, 20, 18, 2);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(8, 1, 8, 5);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(9, 2, 6, 1);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(7, 6, 10, 3);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(6, 10, 12, 6);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(7, 11, 10, 1);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(7, 14, 10, 1);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(5, 17, 14, 3);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(6, 18, 12, 1);
    g.generateTexture("citation-stamp", 24, 24);
    g.destroy();
  }

  private makeVolumeFragmentTextureIfMissing() {
    if (this.textures.exists("volume-fragment")) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(6, 3, 14, 18);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(3, 2, 15, 18);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(3, 2, 4, 18);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(7, 5, 9, 12);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(8, 6, 7, 1);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(8, 9, 7, 1);
    g.fillRect(8, 12, 6, 1);
    g.fillRect(8, 16, 7, 1);
    g.fillStyle(color(PALETTE.buckramHighlight));
    g.fillRect(20, 8, 1, 11);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(17, 7, 2, 12);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(18, 18, 3, 3);
    g.generateTexture("volume-fragment", 24, 24);
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
    g.lineStyle(1, color(PALETTE.black));
    g.lineBetween(17, 5, 20, 23);
    g.generateTexture("bureaucratic-wall", 36, 32);
    g.destroy();
  }

  private makeSnesRoleTextureIfMissing(key: string, bodyHex: string, roleId: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(10, 2, 12, 2);
    g.fillRect(8, 4, 16, 5);
    g.fillRect(10, 9, 12, 8);
    g.fillRect(8, 17, 17, 11);
    g.fillRect(5, 18, 6, 10);
    g.fillRect(21, 18, 6, 10);
    g.fillRect(7, 28, 7, 3);
    g.fillRect(18, 28, 7, 3);
    g.fillStyle(color(bodyHex));
    g.fillRect(9, 5, 14, 5);
    g.fillRect(9, 18, 15, 9);
    g.fillRect(6, 19, 5, 8);
    g.fillRect(21, 19, 5, 8);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(11, 9, 10, 8);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(12, 11, 2, 1);
    g.fillRect(18, 11, 2, 1);
    g.fillRect(14, 15, 5, 1);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(12, 19, 8, 7);
    g.fillStyle(color(PALETTE.goldStamp));
    if (roleId === "compiler") {
      g.fillRect(5, 20, 7, 5);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(6, 21, 5, 1);
      g.fillStyle(color(PALETTE.white));
      g.fillRect(13, 12, 1, 1);
      g.fillRect(19, 12, 1, 1);
    } else if (roleId === "declass_reviewer") {
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(5, 20, 5, 5);
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(6, 21, 3, 2);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(24, 19, 4, 7);
      g.fillStyle(color(PALETTE.shadowNavy));
      g.fillRect(25, 20, 2, 4);
    } else if (roleId === "editor") {
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(21, 3, 1, 8);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(22, 4, 1, 7);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(5, 24, 9, 2);
    } else if (roleId === "proofreader") {
      g.fillStyle(color(PALETTE.white));
      g.fillRect(5, 21, 5, 6);
      g.fillRect(10, 22, 4, 5);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(6, 23, 3, 1);
    } else {
      g.fillStyle(color(PALETTE.buckramRed));
      g.fillRect(5, 22, 5, 5);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(6, 23, 3, 1);
      g.fillRect(23, 22, 6, 4);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(24, 23, 4, 1);
    }
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeSnesNpcTextureIfMissing(key: string, characterId: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    const bodyHex = characterId === "marcus"
      ? PALETTE.classNetRed
      : characterId === "priya"
        ? PALETTE.goldStamp
        : characterId === "sam"
          ? PALETTE.creamPaper
          : characterId === "archive-colleague"
            ? PALETTE.buckramRed
            : PALETTE.archiveAmber;
    g.fillStyle(color(PALETTE.black));
    g.fillRect(10, 2, 12, 2);
    g.fillRect(8, 4, 16, 5);
    g.fillRect(10, 9, 12, 8);
    g.fillRect(8, 17, 17, 11);
    g.fillRect(5, 18, 7, 10);
    g.fillRect(21, 18, 7, 10);
    g.fillRect(7, 28, 7, 3);
    g.fillRect(18, 28, 7, 3);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(9, 5, 14, 5);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(11, 9, 10, 8);
    g.fillStyle(color(bodyHex));
    g.fillRect(9, 18, 15, 9);
    g.fillRect(6, 19, 5, 8);
    g.fillRect(21, 19, 5, 8);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(12, 11, 2, 1);
    g.fillRect(18, 11, 2, 1);
    g.fillRect(14, 15, 5, 1);
    if (characterId === "sam") {
      g.fillStyle(color(PALETTE.white));
      g.fillRect(5, 20, 8, 7);
      g.fillRect(20, 19, 8, 8);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(6, 22, 5, 1);
      g.fillRect(22, 21, 5, 1);
    } else if (characterId === "elena") {
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(5, 20, 8, 6);
      g.fillStyle(color(PALETTE.white));
      g.fillRect(13, 12, 1, 1);
      g.fillRect(19, 12, 1, 1);
    } else if (characterId === "marcus") {
      g.fillStyle(color(PALETTE.shadowNavy));
      g.fillRect(22, 19, 6, 8);
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(23, 20, 4, 1);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(6, 20, 5, 5);
    } else if (characterId === "priya") {
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(4, 24, 10, 2);
      g.fillRect(22, 4, 1, 8);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(23, 5, 1, 7);
    } else {
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(5, 19, 8, 8);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(6, 21, 6, 1);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(22, 20, 5, 5);
    }
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeSnesProductionColleagueTextureIfMissing(key: string, colleagueId: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    const jacketHex = colleagueId === "reviewer"
      ? PALETTE.stoneDark
      : colleagueId === "declass_coordinator"
        ? PALETTE.openNetGreen
        : colleagueId === "editor"
          ? PALETTE.creamPaper
          : colleagueId === "review_specialist"
            ? PALETTE.stoneGray
            : PALETTE.archiveAmber;
    g.fillStyle(color(PALETTE.black));
    g.fillRect(9, 2, 13, 2);
    g.fillRect(7, 4, 17, 5);
    g.fillRect(10, 9, 12, 8);
    g.fillRect(7, 17, 18, 11);
    g.fillRect(5, 19, 6, 9);
    g.fillRect(21, 19, 6, 9);
    g.fillRect(7, 28, 7, 3);
    g.fillRect(18, 28, 7, 3);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(8, 5, 16, 5);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(11, 9, 10, 8);
    g.fillStyle(color(jacketHex));
    g.fillRect(8, 18, 16, 9);
    g.fillRect(6, 19, 5, 8);
    g.fillRect(21, 19, 5, 8);
    g.fillStyle(color(PALETTE.deepRuby));
    g.fillRect(14, 18, 4, 8);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(12, 11, 2, 1);
    g.fillRect(18, 11, 2, 1);
    g.fillRect(14, 15, 5, 1);
    if (colleagueId === "compiler") {
      g.fillStyle(color(PALETTE.white));
      g.fillRect(11, 11, 4, 2);
      g.fillRect(17, 11, 4, 2);
      g.fillStyle(color(PALETTE.black));
      g.fillRect(15, 12, 2, 1);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(4, 20, 9, 7);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(5, 21, 7, 1);
      g.fillRect(5, 23, 6, 1);
    } else if (colleagueId === "declass_coordinator") {
      g.fillStyle(color(PALETTE.stoneGray));
      g.fillRect(2, 20, 10, 8);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(3, 18, 8, 6);
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(4, 19, 6, 1);
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(23, 20, 5, 5);
    } else if (colleagueId === "reviewer") {
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(20, 19, 3, 4);
      g.fillStyle(color(PALETTE.sepiaInk));
      g.fillRect(3, 22, 9, 7);
      g.fillStyle(color(PALETTE.black));
      g.fillRect(4, 21, 7, 1);
    } else if (colleagueId === "editor") {
      g.fillStyle(color(PALETTE.sepiaInk));
      g.fillRect(2, 20, 14, 7);
      g.fillStyle(color(PALETTE.white));
      g.fillRect(3, 17, 10, 6);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(4, 23, 12, 2);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(24, 17, 4, 6);
    } else {
      g.fillStyle(color(PALETTE.stoneDark));
      g.fillRect(7, 2, 18, 2);
      g.fillRect(10, 0, 12, 3);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(21, 18, 7, 4);
      g.fillRect(24, 15, 3, 4);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(4, 21, 8, 6);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(5, 23, 6, 1);
    }
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeSnesProductionColleagueFrameSheetIfMissing() {
    if (this.textures.exists(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key)) return;
    const g = this.add.graphics();
    const frame = SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frame;
    SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.roles.forEach((roleId, row) => {
      SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frames.forEach((pose, column) => {
        const x = column * frame.width;
        const y = row * frame.height;
        const jacketHex = roleId === "reviewer"
          ? PALETTE.stoneDark
          : roleId === "declass_coordinator"
            ? PALETTE.openNetGreen
            : roleId === "editor"
              ? PALETTE.creamPaper
              : roleId === "review_specialist"
                ? PALETTE.stoneGray
                : PALETTE.archiveAmber;
        g.fillStyle(color(PALETTE.black));
        g.fillRect(x + 9, y + 2, 14, 2);
        g.fillRect(x + 7, y + 4, 18, 5);
        g.fillRect(x + 10, y + 9, 12, 8);
        g.fillRect(x + 7, y + 17, 18, 11);
        g.fillRect(x + 7, y + 28, 7, 3);
        g.fillRect(x + 18, y + 28, 7, 3);
        g.fillStyle(color(PALETTE.sepiaInk));
        g.fillRect(x + 8, y + 5, 16, 5);
        g.fillStyle(color(PALETTE.creamPaper));
        g.fillRect(x + 11, y + 9, 10, 8);
        g.fillStyle(color(jacketHex));
        g.fillRect(x + 8, y + 18, 16, 9);
        g.fillRect(x + 6, y + 19, 5, 8);
        g.fillRect(x + 21, y + 19, 5, 8);
        g.fillStyle(color(PALETTE.deepRuby));
        g.fillRect(x + 14, y + 18, 4, 8);
        g.fillStyle(color(PALETTE.black));
        g.fillRect(x + 12, y + 11, 2, 1);
        g.fillRect(x + 18, y + 11, 2, 1);
        g.fillRect(x + 14, y + 15, 5, 1);
        if (pose === "back") {
          g.fillStyle(color(jacketHex));
          g.fillRect(x + 9, y + 11, 14, 16);
          g.fillStyle(color(PALETTE.sepiaInk));
          g.fillRect(x + 9, y + 5, 14, 5);
        } else if (pose === "side" || pose === "walk") {
          g.fillStyle(color(PALETTE.black));
          g.fillRect(x + 9, y + 5, 15, 6);
          g.fillStyle(color(PALETTE.sepiaInk));
          g.fillRect(x + 10, y + 6, 13, 5);
          g.fillStyle(color(PALETTE.creamPaper));
          g.fillRect(x + 13, y + 10, 8, 7);
          g.fillStyle(color(jacketHex));
          g.fillRect(x + 11, y + 18, 11, 9);
          if (pose === "walk") {
            g.fillStyle(color(PALETTE.black));
            g.fillRect(x + 9, y + 27, 5, 3);
          }
        } else if (pose === "work") {
          const propHex = roleId === "review_specialist"
            ? PALETTE.goldStamp
            : roleId === "declass_coordinator"
              ? PALETTE.stoneGray
              : roleId === "editor"
                ? PALETTE.sepiaInk
                : roleId === "reviewer"
                  ? PALETTE.archiveAmber
                  : PALETTE.goldStamp;
          g.fillStyle(color(PALETTE.black));
          g.fillRect(x + 3, y + 21, 11, 7);
          g.fillStyle(color(propHex));
          g.fillRect(x + 4, y + 21, 9, 6);
          g.fillStyle(color(PALETTE.white));
          g.fillRect(x + 5, y + 22, 7, 1);
          if (roleId === "editor") {
            g.fillStyle(color(PALETTE.buckramHighlight));
            g.fillRect(x + 4, y + 24, 8, 1);
            g.fillStyle(color(PALETTE.goldStamp));
            g.fillRect(x + 24, y + 17, 5, 6);
          }
          if (roleId === "review_specialist") {
            g.fillStyle(color(PALETTE.goldStamp));
            g.fillRect(x + 23, y + 16, 5, 5);
            g.fillRect(x + 25, y + 14, 2, 4);
          }
        } else if (pose === "approve") {
          g.fillStyle(color(PALETTE.creamPaper));
          g.fillRect(x + 25, y + 13, 3, 8);
          g.fillRect(x + 27, y + 12, 2, 4);
        }
      });
    });
    g.generateTexture(
      SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key,
      SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.dimensions.width,
      SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.dimensions.height
    );
    g.destroy();
  }

  private makeSnesAntagonistTextureIfMissing(key: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    if (key.includes("mice")) {
      const mice = [
        { x: 4, y: 8, w: 9, h: 4 },
        { x: 9, y: 14, w: 11, h: 5 },
        { x: 17, y: 24, w: 9, h: 3 }
      ];
      for (const mouse of mice) {
        g.fillStyle(color(PALETTE.black));
        g.fillRect(mouse.x - 1, mouse.y - 1, mouse.w + 2, mouse.h + 2);
        g.fillRect(mouse.x - 2, mouse.y + 1, 3, 2);
        g.fillRect(mouse.x + mouse.w, mouse.y + 1, 3, 2);
        g.fillStyle(color(PALETTE.stoneGray));
        g.fillRect(mouse.x, mouse.y, mouse.w, mouse.h);
        g.fillRect(mouse.x - 1, mouse.y + 2, 2, 1);
        g.fillStyle(color(PALETTE.stoneDark));
        g.fillRect(mouse.x + 1, mouse.y - 1, 2, 1);
        g.fillRect(mouse.x + mouse.w - 3, mouse.y - 1, 2, 1);
        g.fillStyle(color(PALETTE.sepiaInk));
        g.fillRect(mouse.x + mouse.w + 2, mouse.y + 2, 4, 1);
      }
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(2, 22, 8, 5);
      g.fillRect(20, 6, 8, 5);
      g.fillStyle(color(PALETTE.deepRuby));
      g.fillRect(4, 25, 4, 1);
      g.fillRect(22, 9, 4, 1);
      g.generateTexture(key, 32, 32);
      g.destroy();
      return;
    }
    if (key.includes("bees")) {
      const bees = [
        { x: 4, y: 16, w: 4, h: 2 },
        { x: 13, y: 9, w: 5, h: 3 },
        { x: 23, y: 17, w: 5, h: 3 },
        { x: 14, y: 23, w: 4, h: 2 }
      ];
      for (const bee of bees) {
        g.fillStyle(color(PALETTE.black));
        g.fillRect(bee.x - 1, bee.y, bee.w + 2, bee.h + 1);
        g.fillStyle(color(PALETTE.terminalCyan));
        g.fillRect(bee.x, bee.y - 2, 2, 2);
        g.fillRect(bee.x + bee.w, bee.y - 1, 2, 2);
        g.fillStyle(color(PALETTE.goldStamp));
        g.fillRect(bee.x, bee.y, bee.w, bee.h);
        g.fillStyle(color(PALETTE.black));
        g.fillRect(bee.x + 1, bee.y, 1, bee.h);
        g.fillRect(bee.x + bee.w - 1, bee.y, 1, bee.h);
        g.fillStyle(color(PALETTE.creamPaper));
        g.fillRect(bee.x + bee.w + 2, bee.y + 1, 1, 1);
      }
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(9, 13, 2, 1);
      g.fillRect(20, 14, 2, 1);
      g.fillRect(11, 21, 2, 1);
      g.generateTexture(key, 32, 32);
      g.destroy();
      return;
    }
    if (key.includes("federal-shutdown")) {
      g.fillStyle(color(PALETTE.black));
      g.fillRect(7, 3, 18, 3);
      g.fillRect(5, 6, 22, 4);
      g.fillRect(4, 10, 24, 14);
      g.fillRect(3, 22, 26, 5);
      g.fillStyle(color(PALETTE.stoneGray));
      g.fillRect(7, 6, 18, 3);
      g.fillStyle(color(PALETTE.deepRuby));
      g.fillRect(5, 11, 22, 12);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(7, 12, 18, 2);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(7, 16, 18, 5);
      g.fillStyle(color(PALETTE.black));
      g.fillRect(9, 17, 3, 1);
      g.fillRect(14, 17, 4, 1);
      g.fillRect(20, 17, 3, 1);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(4, 23, 24, 3);
      g.fillStyle(color(PALETTE.deepRuby));
      g.fillRect(6, 23, 4, 3);
      g.fillRect(14, 23, 4, 3);
      g.fillRect(22, 23, 4, 3);
      g.fillStyle(color(PALETTE.black));
      g.fillRect(2, 27, 6, 3);
      g.fillRect(24, 27, 6, 3);
      g.generateTexture(key, 32, 32);
      g.destroy();
      return;
    }
    g.fillStyle(color(PALETTE.black));
    g.fillRect(10, 2, 12, 2);
    g.fillRect(8, 4, 16, 5);
    g.fillRect(10, 9, 12, 8);
    g.fillRect(7, 17, 18, 11);
    g.fillRect(4, 13, 9, 7);
    g.fillRect(21, 18, 8, 10);
    g.fillRect(7, 28, 7, 3);
    g.fillRect(18, 28, 7, 3);
    g.fillStyle(color(PALETTE.sepiaInk));
    g.fillRect(9, 5, 14, 5);
    g.fillStyle(color(PALETTE.creamPaper));
    g.fillRect(11, 9, 10, 8);
    g.fillStyle(color(PALETTE.stoneDark));
    g.fillRect(8, 18, 16, 9);
    g.fillStyle(color(PALETTE.buckramRed));
    g.fillRect(12, 18, 8, 9);
    g.fillStyle(color(PALETTE.white));
    g.fillRect(5, 14, 7, 5);
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(13, 22, 6, 3);
    g.fillRect(22, 19, 6, 8);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(12, 11, 2, 1);
    g.fillRect(18, 11, 2, 1);
    g.fillRect(13, 15, 6, 1);
    g.fillRect(14, 23, 1, 1);
    g.fillRect(16, 23, 1, 1);
    g.fillRect(18, 23, 1, 1);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeSnesWallTextureIfMissing(key: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    const accent = key.includes("firewall") || key.includes("danne")
      ? PALETTE.classNetRed
      : key.includes("wait")
        ? PALETTE.terminalCyan
        : key.includes("pending") || key.includes("ambiguous")
          ? PALETTE.goldStamp
          : PALETTE.buckramHighlight;
    g.fillStyle(color(PALETTE.black));
    g.fillRect(2, 7, 28, 21);
    g.fillStyle(color(PALETTE.stoneDark));
    g.fillRect(4, 5, 24, 20);
    g.fillStyle(color(PALETTE.stoneGray));
    g.fillRect(5, 6, 9, 6);
    g.fillRect(16, 7, 11, 5);
    g.fillRect(8, 15, 8, 7);
    g.fillRect(18, 16, 8, 6);
    g.fillStyle(color(accent));
    g.fillRect(6, 12, 20, 3);
    g.fillStyle(color(PALETTE.black));
    g.fillRect(10, 10, 3, 2);
    g.fillRect(20, 10, 3, 2);
    g.fillRect(13, 23, 7, 2);
    if (key.includes("no-repo")) {
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(9, 17, 7, 1);
      g.fillRect(15, 18, 1, 5);
    } else if (key.includes("firewall")) {
      g.fillStyle(color(PALETTE.openNetGreen));
      g.fillRect(8, 17, 4, 5);
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(20, 17, 4, 5);
    } else if (key.includes("pending")) {
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(18, 3, 8, 6);
    } else if (key.includes("wait")) {
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(14, 16, 5, 7);
    } else if (key.includes("hold")) {
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(8, 17, 16, 2);
      g.fillRect(8, 19, 2, 4);
      g.fillRect(22, 19, 2, 4);
    } else if (key.includes("ambiguous")) {
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(7, 17, 7, 5);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(19, 17, 7, 5);
    } else if (key.includes("danne")) {
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(6, 18, 20, 2);
      g.fillRect(18, 15, 4, 8);
    }
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeSnesMapTextureIfMissing(key: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color(PALETTE.black));
    g.fillRect(0, 0, 80, 56);
    const base = key.includes("network") ? PALETTE.shadowNavy : key.includes("vault") || key.includes("buckram") ? PALETTE.deepRuby : PALETTE.creamPaper;
    const accent = key.includes("network") ? PALETTE.terminalCyan : key.includes("vault") || key.includes("buckram") ? PALETTE.classNetRed : PALETTE.goldStamp;
    g.fillStyle(color(base));
    g.fillRect(4, 4, 72, 48);
    g.fillStyle(color(PALETTE.buckramRed));
    if (key === "archive-cavern-map") {
      g.fillStyle(color(PALETTE.sepiaInk));
      g.fillRect(4, 4, 72, 48);
      g.fillStyle(color(PALETTE.buckramRed));
      g.fillRect(5, 5, 70, 3);
      g.fillRect(5, 48, 70, 3);
      const rooms = [
        [PALETTE.goldStamp, PALETTE.buckramRed, PALETTE.buckramRed],
        [PALETTE.buckramRed, PALETTE.shadowNavy, PALETTE.buckramRed],
        [PALETTE.buckramRed, PALETTE.buckramRed, PALETTE.black],
        [PALETTE.goldStamp, PALETTE.black, PALETTE.buckramHighlight]
      ];
      rooms.forEach((row, rowIndex) => {
        row.forEach((fill, colIndex) => {
          const x = 8 + colIndex * 18;
          const y = [11, 22, 33, 43][rowIndex];
          g.fillStyle(color(fill));
          g.fillRect(x, y, 12, rowIndex === 3 ? 5 : 7);
          g.fillStyle(color(PALETTE.black));
          g.fillRect(x + 3, y + 2, 6, 1);
        });
      });
      g.fillStyle(color(PALETTE.black));
      for (let row = 0; row < 3; row += 1) {
        g.fillRect(20, 14 + row * 11, 6, 1);
        g.fillRect(38, 14 + row * 11, 6, 1);
        g.fillRect(14, 18 + row * 11, 1, 4);
        g.fillRect(32, 18 + row * 11, 1, 4);
        g.fillRect(50, 18 + row * 11, 1, 4);
      }
      g.fillStyle(color(PALETTE.shadowNavy));
      g.fillRect(61, 10, 11, 7);
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(63, 12, 7, 3);
      g.fillStyle(color(PALETTE.buckramRed));
      g.fillRect(61, 20, 11, 7);
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(63, 22, 7, 3);
      g.fillStyle(color(PALETTE.black));
      g.fillRect(61, 30, 11, 7);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(63, 32, 7, 3);
      g.fillStyle(color(PALETTE.buckramRed));
      g.fillRect(61, 40, 11, 7);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(63, 42, 7, 3);
      g.generateTexture(key, 80, 56);
      g.destroy();
      return;
    } else if (key === "frus-snes-atlas") {
      g.fillStyle(color(PALETTE.sepiaInk));
      g.fillRect(2, 2, 236, 164);
      g.fillStyle(color(PALETTE.creamPaper));
      g.fillRect(5, 5, 230, 158);
      g.fillStyle(color(PALETTE.stoneDark));
      g.fillRect(10, 144, 220, 14);
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(15, 147, 24, 1);
      g.fillRect(103, 148, 30, 1);
      g.fillRect(203, 148, 22, 1);
      g.fillStyle(color(PALETTE.stoneDark));
      g.fillRect(78, 80, 9, 66);
      g.fillRect(155, 81, 9, 65);
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(81, 83, 1, 58);
      g.fillRect(158, 85, 1, 55);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(77, 43, 13, 4);
      g.fillRect(89, 45, 3, 20);
      g.fillRect(56, 82, 41, 4);
      g.fillRect(145, 75, 24, 4);
      g.fillRect(153, 42, 22, 4);
      g.fillRect(121, 89, 4, 38);
      g.fillRect(76, 130, 29, 4);
      g.fillRect(137, 130, 36, 4);
      const green = PALETTE.openNetGreen;
      const darkGreen = "#003300";
      const sites = [
        { x: 14, y: 55, w: 63, h: 51, accent: PALETTE.terminalCyan },
        { x: 17, y: 22, w: 61, h: 29, accent: PALETTE.stoneGray },
        { x: 86, y: 13, w: 69, h: 33, accent: PALETTE.stoneGray },
        { x: 91, y: 58, w: 63, h: 34, accent: PALETTE.goldStamp },
        { x: 171, y: 22, w: 56, h: 31, accent: PALETTE.terminalCyan },
        { x: 165, y: 64, w: 63, h: 50, accent: PALETTE.black },
        { x: 93, y: 101, w: 58, h: 42, accent: PALETTE.white },
        { x: 20, y: 119, w: 59, h: 23, accent: PALETTE.stoneGray },
        { x: 170, y: 119, w: 58, h: 24, accent: PALETTE.stoneGray }
      ];
      for (const site of sites) {
        g.fillStyle(color(site.accent === PALETTE.black ? PALETTE.black : green));
        g.fillRect(site.x, site.y, site.w, site.h);
        g.fillStyle(color(site.accent === PALETTE.black ? PALETTE.black : darkGreen));
        g.fillRect(site.x + 2, site.y + 2, site.w - 4, site.h - 4);
        g.fillStyle(color(site.accent));
        g.fillRect(site.x + Math.floor(site.w / 3), site.y + Math.floor(site.h / 3), Math.max(3, Math.floor(site.w / 3)), Math.max(2, Math.floor(site.h / 3)));
      }
      g.fillStyle(color(PALETTE.black));
      const tags = [
        [16, 87], [171, 21], [17, 21], [20, 118], [169, 118], [93, 122], [164, 82], [93, 101]
      ];
      for (const [x, y] of tags) {
        g.fillRect(x, y, 12, 12);
        g.fillStyle(color(PALETTE.white));
        g.fillRect(x + 2, y + 2, 8, 8);
        g.fillStyle(color(PALETTE.black));
      }
      g.generateTexture(key, 240, 168);
      g.destroy();
      return;
    } else if (key.includes("network")) {
      g.fillRect(8, 9, 24, 34);
      g.fillRect(48, 9, 24, 34);
      g.fillStyle(color(PALETTE.terminalCyan));
      g.fillRect(12, 13, 16, 4);
      g.fillStyle(color(PALETTE.classNetRed));
      g.fillRect(52, 13, 16, 4);
    } else if (key.includes("referral")) {
      for (let x = 14; x <= 56; x += 21) {
        g.fillStyle(color(PALETTE.goldStamp));
        g.fillRect(x, 20, 10, 10);
      }
    } else if (key.includes("editor") || key.includes("silent")) {
      g.fillStyle(color(PALETTE.white));
      g.fillRect(16, 18, 18, 22);
      g.fillRect(46, 18, 18, 22);
      g.fillStyle(color(PALETTE.buckramHighlight));
      g.fillRect(36, 26, 8, 3);
    } else if (key.includes("buckram")) {
      g.fillStyle(color(PALETTE.buckramRed));
      g.fillRect(28, 16, 24, 24);
    } else {
      g.fillRect(12, 14, 14, 10);
      g.fillRect(54, 14, 14, 10);
      g.fillRect(32, 34, 16, 8);
    }
    g.fillStyle(color(PALETTE.goldStamp));
    g.fillRect(31, 18, 8, 6);
    g.fillRect(36, 45, 8, 3);
    g.fillStyle(color(accent));
    g.fillRect(6, 7, 68, 3);
    g.generateTexture(key, 80, 56);
    g.destroy();
  }

  private makeSnesWorkflowToolsTextureIfMissing() {
    if (this.textures.exists("snes-workflow-tools")) return;
    const g = this.add.graphics();
    const colors = [
      PALETTE.goldStamp,
      PALETTE.creamPaper,
      PALETTE.terminalCyan,
      PALETTE.classNetRed,
      PALETTE.buckramHighlight,
      PALETTE.white,
      PALETTE.sepiaInk,
      PALETTE.buckramRed
    ];
    colors.forEach((fill, index) => {
      const x = 4 + index * 15;
      g.fillStyle(color(PALETTE.black));
      g.fillRect(x, 6, 12, 18);
      g.fillStyle(color(fill));
      g.fillRect(x + 2, 8, 8, 14);
      g.fillStyle(color(PALETTE.goldStamp));
      g.fillRect(x + 3, 11, 6, 2);
    });
    g.generateTexture("snes-workflow-tools", 128, 32);
    g.destroy();
  }

  private registerSnesProductionColleagueFrameSheet() {
    if (!this.textures.exists(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key)) return;
    const texture = this.textures.get(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key);
    const { width, height } = SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frame;
    SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.roles.forEach((roleId, rowIndex) => {
      SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frames.forEach((frameName, columnIndex) => {
        const name = `${roleId}-${frameName}`;
        if (!texture.has(name)) {
          texture.add(name, 0, columnIndex * width, rowIndex * height, width, height);
        }
      });
    });
  }

  private registerSnesRoleFrameSheets() {
    for (const sheet of SNES_ROLE_FRAME_SHEETS) {
      if (!this.textures.exists(sheet.key)) continue;
      const texture = this.textures.get(sheet.key);
      const { width, height } = sheet.frame;
      sheet.frames.forEach((frameName, index) => {
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, index * width, 0, width, height);
        }
      });
    }
  }

  private makeTileTextureIfMissing(key: string, baseHex: string, accentHex: string) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color(baseHex));
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(color(accentHex));
    g.fillRect(0, 0, 16, 1);
    g.fillRect(0, 0, 1, 16);
    g.fillStyle(color(PALETTE.black));
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
