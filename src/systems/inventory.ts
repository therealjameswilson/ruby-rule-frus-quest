import Phaser from "phaser";
import { FRUS_VOLUMES } from "../assets/registry";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { ProcessItemId } from "../game/constants";
import { DANNE_ITEM_CATALOG } from "../game/danneItemCatalog";
import type { DanneItemCatalogEntry, DanneItemId } from "../game/danneItemCatalog";
import {
  SNES_DUNGEON_STATUS_RELIC_ASSET,
  SNES_EQUITY_CRYSTAL_RELIC_ASSET,
  SNES_RESEARCH_PENDANT_RELIC_ASSET,
  SNES_WORKFLOW_TOOL_RELIC_ASSET
} from "../game/snesAtlas";
import type { GameMode } from "../game/types";
import {
  equipDanneItem,
  equipProcessItem,
  getAdventureSubscreenReadout,
  gameState,
  getAdventureHudReadout,
  getDanneItemReadout,
  getProcessItemReadout,
  setLatestMessage,
  getWorkflowToolReadout
} from "../game/state";
import type { AdventureSubscreenReadout } from "../game/state";
import { bindPointerPress, isTouchInputCapable, updateInputCallbacks } from "../input/InputState";
import { retroAudio } from "./audio";
import { openCodex } from "./codexOverlay";
import { cycleLanguage, getLanguage, getString } from "./i18n";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function thumbnailKey(asset: DanneItemCatalogEntry) {
  return `${asset.key}-thumb16`;
}

function ensureItemThumbnail(scene: Phaser.Scene, asset: DanneItemCatalogEntry) {
  const key = thumbnailKey(asset);
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists(asset.key)) return asset.key;
  const source = scene.textures.get(asset.key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const texture = scene.textures.createCanvas(key, 16, 16);
  if (!texture) return asset.key;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 16, 16);
  context.drawImage(source, 0, 0, 16, 16);
  texture.refresh();
  return key;
}

function compactPauseLine(value: string, max = 36) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const lastSlash = cut.lastIndexOf("/");
  const lastSpace = cut.lastIndexOf(" ");
  const splitAt = Math.max(lastSlash, lastSpace);
  return `${(splitAt > 14 ? cut.slice(0, splitAt) : cut).trim()}...`;
}

const COMPACT_TOOL_LINES: Record<string, string> = {
  citation_stamp: "source locks = provenance",
  source_note_card: "repository trail = source note",
  cross_reference_thread: "published status = x-ref",
  referral_manifest: "agency equities = referral queue",
  excision_bracket_marker: "withheld text = visible bracket",
  red_pencil: "unsupported text = editor judgment",
  proof_lens: "tiny discrepancies = silent read",
  buckram_key: "publication gate = certified"
};

const MODAL_BOUNDS = { left: 8, right: 248, top: 12, bottom: 228 };
const CLOSE_HIT = { x: 223, y: 35, width: 44, height: 44 };
const CODEX_HIT = { x: 171, y: 35, width: 58, height: 44 };
const LANGUAGE_HIT = { x: 205, y: 204, width: 64, height: 44 };
const FRUS_VOLUME_ROW_TEXTURE: keyof typeof FRUS_VOLUMES = "ui_row_six";
const FRUS_VOLUME_SLOT_X = [26, 51, 76, 101, 126, 151] as const;
type DungeonStatusFrame = (typeof SNES_DUNGEON_STATUS_RELIC_ASSET.frames)[number];
type ResearchPendantFrame = (typeof SNES_RESEARCH_PENDANT_RELIC_ASSET.frames)[number];
type EquityCrystalFrame = (typeof SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames)[number];
type WorkflowToolFrame = (typeof SNES_WORKFLOW_TOOL_RELIC_ASSET.frames)[number];

const PROCESS_ITEM_TOOL_FRAMES: Record<ProcessItemId, WorkflowToolFrame> = {
  citation_stamp: "citation_stamp",
  red_pencil: "red_pencil",
  review_folder: "cross_reference_thread",
  clearance_token: "terminal",
  concurrence_slip: "concurrence_slip",
  proof_lens: "proof_pages",
  buckram_key: "frus_volume"
};

export class InventoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly subscreenGraphics: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly codexText: Phaser.GameObjects.Text;
  private readonly summary: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private frusVolumeRowTitle!: Phaser.GameObjects.Text;
  private readonly frusVolumeSlotLights: Phaser.GameObjects.Rectangle[] = [];
  private readonly frusVolumeSlotLabels: Phaser.GameObjects.Text[] = [];
  private readonly dungeonStatusRelics: Array<{
    frame: DungeonStatusFrame;
    image: Phaser.GameObjects.Image;
  }> = [];
  private readonly researchPendantRelics: Array<{
    frame: ResearchPendantFrame;
    image: Phaser.GameObjects.Image;
  }> = [];
  private readonly equityCrystalRelics: Array<{
    frame: EquityCrystalFrame;
    image: Phaser.GameObjects.Image;
  }> = [];
  private previousMode: GameMode | null = null;
  private readonly itemSlots: Array<{
    id: ProcessItemId;
    box: Phaser.GameObjects.Rectangle;
    icon?: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
  }> = [];
  private readonly danneItemSlots: Array<{
    id: DanneItemId;
    box: Phaser.GameObjects.Rectangle;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
  }> = [];
  private readonly dannePopover: Phaser.GameObjects.Container;
  private readonly dannePopoverImage: Phaser.GameObjects.Image;
  private readonly dannePopoverText: Phaser.GameObjects.Text;
  private readonly languageLabel: Phaser.GameObjects.Text;
  private selectedDanneItemId: DanneItemId | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const touch = isTouchInputCapable();
    const dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black), 0.62)
      .setScrollFactor(0);
    bindPointerPress(dim, { down: () => this.hide() });
    const box = scene.add
      .rectangle(128, 120, 240, 216, color(PALETTE.black))
      .setScrollFactor(0);
    const border = scene.add
      .rectangle(128, 120, 240, 216)
      .setStrokeStyle(2, color(PALETTE.goldStamp))
      .setScrollFactor(0);
    this.titleText = scene.add.text(16, 18, getString("pause.title"), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setScrollFactor(0);
    this.subscreenGraphics = scene.add.graphics().setScrollFactor(0);
    const closeHit = scene.add
      .rectangle(223, 35, 44, 44, color(PALETTE.black), 0.01)
      .setScrollFactor(0);
    const closeBox = scene.add
      .rectangle(223, 35, 16, 16, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setScrollFactor(0);
    this.closeText = scene.add.text(220, 29, getString("pause.close"), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setScrollFactor(0);
    bindPointerPress(closeHit, { down: () => this.hide() });
    const codexHit = scene.add
      .rectangle(171, 35, 58, 44, color(PALETTE.black), 0.01)
      .setScrollFactor(0);
    const codexBox = scene.add
      .rectangle(171, 35, 44, 16, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.terminalCyan))
      .setScrollFactor(0);
    this.codexText = scene.add.text(171, 31, getString("pause.codex"), {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0).setScrollFactor(0);
    bindPointerPress(codexHit, { down: () => this.openCodexFromInventory() });
    this.summary = scene.add.text(14, 126, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      wordWrap: { width: 226, useAdvancedWrap: true },
      lineSpacing: 0
    }).setScrollFactor(0);
    this.body = scene.add.text(14, touch ? 151 : 147, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 150, useAdvancedWrap: true },
      lineSpacing: 0
    }).setScrollFactor(0);
    const frusRowObjects = this.createFrusVolumeRow(scene);
    const slotObjects = this.createToolGrid(scene);
    const danneObjects = this.createDanneItemGrid(scene);
    const researchPendantObjects = this.createResearchPendantRelics(scene);
    const equityCrystalObjects = this.createEquityCrystalRelics(scene);
    const dungeonStatusObjects = this.createDungeonStatusRelics(scene);
    const languageHit = scene.add
      .rectangle(LANGUAGE_HIT.x, LANGUAGE_HIT.y, LANGUAGE_HIT.width, LANGUAGE_HIT.height, color(PALETTE.black), 0.01)
      .setScrollFactor(0);
    const languageBox = scene.add
      .rectangle(LANGUAGE_HIT.x, LANGUAGE_HIT.y, 56, 13, color(PALETTE.deepRuby), 0.9)
      .setStrokeStyle(1, color(PALETTE.terminalCyan))
      .setScrollFactor(0);
    this.languageLabel = scene.add.text(LANGUAGE_HIT.x, LANGUAGE_HIT.y - 4, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setScrollFactor(0);
    bindPointerPress(languageHit, { down: () => this.changeLanguage() });
    const popoverBox = scene.add
      .rectangle(204, 88, 80, 62, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setScrollFactor(0);
    this.dannePopoverImage = scene.add.image(178, 82, DANNE_ITEM_CATALOG[0].key).setScrollFactor(0);
    this.dannePopoverText = scene.add.text(198, 62, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 42, useAdvancedWrap: true },
      lineSpacing: 0
    }).setScrollFactor(0);
    this.dannePopover = scene.add.container(0, 0, [popoverBox, this.dannePopoverImage, this.dannePopoverText]).setScrollFactor(0);
    updateInputCallbacks({ handlePauseTouch: (point) => this.handlePauseTouch(point.x, point.y) });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleScenePointerDown, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleScenePointerDown, this);
    });
    this.container = scene.add
      .container(0, 0, [
        dim,
        box,
        border,
        this.titleText,
        this.subscreenGraphics,
        codexBox,
        this.codexText,
        codexHit,
        closeBox,
        this.closeText,
        closeHit,
        ...frusRowObjects,
        ...slotObjects,
        ...danneObjects,
        ...researchPendantObjects,
        ...equityCrystalObjects,
        ...dungeonStatusObjects,
        languageBox,
        this.languageLabel,
        languageHit,
        this.dannePopover,
        this.summary,
        this.body
      ])
      .setDepth(980)
      .setVisible(false)
      .setScrollFactor(0);
  }

  get active() {
    return this.container.visible;
  }

  toggle() {
    if (this.active) {
      this.hide();
      return;
    }
    this.show();
  }

  hide() {
    this.container.setVisible(false);
    if (this.previousMode) {
      gameState.mode = this.previousMode;
      this.previousMode = null;
    }
  }

  private show() {
    this.previousMode = gameState.mode;
    gameState.mode = "pause";
    this.render();
    this.container.setVisible(true);
  }

  private render() {
    this.titleText.setText(getString("pause.title"));
    this.closeText.setText(getString("pause.close"));
    this.codexText.setText(getString("pause.codex"));
    const subscreen = getAdventureSubscreenReadout();
    const tools = getWorkflowToolReadout()
      .filter((tool) => tool.acquired)
      .slice(0, 3)
      .map((tool) => `${tool.shortLabel}: ${COMPACT_TOOL_LINES[tool.id]}`)
      .join("\n");
    const dungeons = subscreen.dungeons
      .map((dungeon) => {
        const marker = dungeon.active ? ">" : " ";
        const label = dungeon.displayName.toUpperCase().replace(/'S/g, "").slice(0, 11).padEnd(11, " ");
        const keyText = `${dungeon.smallKeys}/${dungeon.smallKeysRequired}`;
        const big = dungeon.bigKeyHeld ? "BIG" : "---";
        const map = dungeon.mapRevealed ? "MAP" : "---";
        const boss = dungeon.bossDefeated ? "BOSS" : "----";
        return `${marker}${label} K${keyText.padEnd(3, " ")} ${big} ${map} ${boss}`;
      })
      .join("\n");
    const hud = getAdventureHudReadout();
    const treaty = getDanneItemReadout().find((item) => item.id === "treaty-fragments");
    const danneSummary = treaty ? `${getString("pause.treaty")} ${treaty.count}/${treaty.total}` : `${getString("pause.treaty")} 0/3`;
    const pendantSummary = subscreen.pendants
      .map((pendant) => `${pendant.label}:${pendant.acquired ? "OK" : "--"}`)
      .join(" ");
    const boardNext = subscreen.productionBoard.nextStep?.shortLabel ?? "DONE";
    const boardSource = subscreen.productionBoard.nextStep?.sourceUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      ?? "history.state.gov";
    const activePhase = subscreen.productionBoard.activePhase;
    const phaseSummary = activePhase
      ? `${activePhase.shortLabel} ${activePhase.completed}/${activePhase.total}`
      : "DONE";
    this.summary.setText([
      `${pendantSummary}  ${getString("pause.crystals")} ${subscreen.crystals.earned}/${subscreen.crystals.total || 0}  ${getString("pause.hearts")} ${subscreen.reliabilityHearts.filled}/${subscreen.reliabilityHearts.total}`,
      `${getString("pause.board")} ${subscreen.productionBoard.completed}/${subscreen.productionBoard.total} ${getString("pause.next")} ${boardNext}  ${danneSummary}`,
      `${getString("pause.phase")} ${phaseSummary}  ${getString("pause.tool")} ${subscreen.equippedTool?.displayName.toUpperCase() ?? hud.equippedItem?.displayName.toUpperCase() ?? getString("hud.none")}`
    ].join("\n"));
    const dungeonPreview = dungeons.split("\n").slice(0, 3).join("\n");
    const shelfCount = Math.min(FRUS_VOLUME_SLOT_X.length, gameState.volumeFragments.length + (gameState.inventory.includes("Published FRUS Cover") ? 1 : 0));
    this.frusVolumeRowTitle.setText(getString("pause.frusShelf", { count: shelfCount, total: FRUS_VOLUME_SLOT_X.length }));
    this.body.setText([
      `${getString("pause.nextBoard")}: ${compactPauseLine(subscreen.productionBoard.nextStep?.label.toUpperCase() ?? getString("pause.certifyBuckramGate"), 31)}`,
      `${getString("pause.source")}: ${compactPauseLine(boardSource, 34)}`,
      getString("pause.dungeonMapKeys"),
      dungeonPreview,
      ""
    ].join("\n"));
    this.renderLanguageSelector();
    this.renderSubscreenGraphics(subscreen);
    this.renderToolGrid();
    this.renderDanneItemGrid();
    this.renderFrusVolumeRow();
    this.renderDannePopover();
  }

  private renderSubscreenGraphics(subscreen: AdventureSubscreenReadout) {
    const g = this.subscreenGraphics;
    g.clear();
    g.lineStyle(1, color(PALETTE.deepRuby), 1);
    g.fillStyle(color(PALETTE.deepRuby), 0.45);
    g.fillRect(14, 39, 228, 84);
    g.strokeRect(14, 39, 228, 84);
    g.fillStyle(color(PALETTE.black), 0.68);
    g.fillRect(172, 42, 66, 74);
    g.lineStyle(1, color(PALETTE.stoneGray), 1);
    g.strokeRect(172, 42, 66, 74);

    const renderedPendantRelics = this.renderResearchPendantRelics(subscreen);
    if (!renderedPendantRelics) {
      subscreen.pendants.forEach((pendant, index) => {
        const x = 184 + index * 16;
        const y = 55;
        g.lineStyle(1, color(pendant.acquired ? PALETTE.white : PALETTE.stoneGray), 1);
        g.fillStyle(color(pendant.acquired ? PALETTE.goldStamp : PALETTE.black), 1);
        g.fillTriangle(x, y - 8, x - 7, y + 7, x + 7, y + 7);
        g.lineBetween(x, y - 8, x - 7, y + 7);
        g.lineBetween(x - 7, y + 7, x + 7, y + 7);
        g.lineBetween(x + 7, y + 7, x, y - 8);
        if (pendant.acquired) {
          g.fillStyle(color(PALETTE.white), 1);
          g.fillRect(x - 1, y - 2, 2, 2);
        }
      });
    }

    const crystalTotal = Math.max(1, subscreen.crystals.total);
    const visibleCrystals = Math.min(8, crystalTotal);
    const renderedCrystalRelics = this.renderEquityCrystalRelics(subscreen);
    if (!renderedCrystalRelics) {
      for (let index = 0; index < visibleCrystals; index += 1) {
        const x = 181 + index * 6;
        const y = 77;
        const acquired = index < subscreen.crystals.earned;
        g.fillStyle(color(acquired ? PALETTE.terminalCyan : PALETTE.black), 1);
        g.lineStyle(1, color(acquired ? PALETTE.white : PALETTE.stoneGray), 1);
        g.fillTriangle(x, y - 5, x - 4, y, x + 4, y);
        g.fillTriangle(x, y + 5, x - 4, y, x + 4, y);
        g.lineBetween(x, y - 5, x - 4, y);
        g.lineBetween(x - 4, y, x, y + 5);
        g.lineBetween(x, y + 5, x + 4, y);
        g.lineBetween(x + 4, y, x, y - 5);
      }
    }

    for (let index = 0; index < subscreen.reliabilityHearts.total; index += 1) {
      const x = 180 + (index % 5) * 10;
      const y = 91 + Math.floor(index / 5) * 11;
      const filled = index < subscreen.reliabilityHearts.filled;
      g.fillStyle(color(filled ? PALETTE.classNetRed : PALETTE.black), 1);
      g.fillRect(x + 1, y, 2, 1);
      g.fillRect(x + 4, y, 2, 1);
      g.fillRect(x, y + 1, 7, 3);
      g.fillRect(x + 1, y + 4, 5, 1);
      g.fillRect(x + 2, y + 5, 3, 1);
      g.fillRect(x + 3, y + 6, 1, 1);
      g.lineStyle(1, color(filled ? PALETTE.goldStamp : PALETTE.stoneGray), 0.9);
      g.strokeRect(x, y + 1, 7, 4);
    }

    const toolColor = subscreen.equippedTool ? PALETTE.goldStamp : PALETTE.stoneGray;
    g.lineStyle(1, color(toolColor), 1);
    g.fillStyle(color(subscreen.equippedTool ? PALETTE.deepRuby : PALETTE.black), 1);
    g.strokeRect(216, 48, 15, 15);
    g.fillRect(220, 52, 7, 7);

    this.renderProductionBoardTrack(g, subscreen.productionBoard);
    this.renderPhaseChips(g, subscreen.productionBoard);
    this.renderDungeonStatusRelics(g, subscreen);
    this.renderRoomMap(g, subscreen);
  }

  private createResearchPendantRelics(scene: Phaser.Scene) {
    if (!scene.textures.exists(SNES_RESEARCH_PENDANT_RELIC_ASSET.key)) return [];
    return SNES_RESEARCH_PENDANT_RELIC_ASSET.frames.map((frame, index) => {
      const image = scene.add
        .image(184 + index * 16, 55, SNES_RESEARCH_PENDANT_RELIC_ASSET.key, frame)
        .setName(`subscreen-research-pendant-${frame}`)
        .setScrollFactor(0)
        .setVisible(false);
      this.researchPendantRelics.push({ frame, image });
      return image;
    });
  }

  private renderResearchPendantRelics(subscreen: AdventureSubscreenReadout) {
    if (this.researchPendantRelics.length !== SNES_RESEARCH_PENDANT_RELIC_ASSET.frames.length) {
      for (const relic of this.researchPendantRelics) relic.image.setVisible(false);
      return false;
    }

    for (const relic of this.researchPendantRelics) {
      const index = SNES_RESEARCH_PENDANT_RELIC_ASSET.frames.indexOf(relic.frame);
      const pendant = subscreen.pendants.find((candidate) => candidate.id === relic.frame);
      relic.image
        .setPosition(184 + index * 16, 55)
        .setVisible(true)
        .setAlpha(pendant?.acquired ? 1 : 0.3);
    }
    return true;
  }

  private createEquityCrystalRelics(scene: Phaser.Scene) {
    if (!scene.textures.exists(SNES_EQUITY_CRYSTAL_RELIC_ASSET.key)) return [];
    return SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.map((frame, index) => {
      const image = scene.add
        .image(181 + index * 9, 77, SNES_EQUITY_CRYSTAL_RELIC_ASSET.key, frame)
        .setName(`subscreen-equity-crystal-${frame}`)
        .setScrollFactor(0)
        .setVisible(false);
      this.equityCrystalRelics.push({ frame, image });
      return image;
    });
  }

  private renderEquityCrystalRelics(subscreen: AdventureSubscreenReadout) {
    if (this.equityCrystalRelics.length !== SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.length) {
      for (const relic of this.equityCrystalRelics) relic.image.setVisible(false);
      return false;
    }

    const availableCount = Math.min(
      SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.length,
      Math.max(1, subscreen.crystals.total)
    );
    for (const relic of this.equityCrystalRelics) {
      const index = SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.indexOf(relic.frame);
      const available = index < availableCount;
      const earned = index < subscreen.crystals.earned;
      relic.image
        .setPosition(181 + index * 9, 77)
        .setVisible(true)
        .setAlpha(earned ? 1 : available ? 0.34 : 0.16);
    }
    return true;
  }

  private createDungeonStatusRelics(scene: Phaser.Scene) {
    if (!scene.textures.exists(SNES_DUNGEON_STATUS_RELIC_ASSET.key)) return [];
    return SNES_DUNGEON_STATUS_RELIC_ASSET.frames.map((frame, index) => {
      const image = scene.add
        .image(181 + index * 14, 134, SNES_DUNGEON_STATUS_RELIC_ASSET.key, frame)
        .setName(`subscreen-dungeon-status-${frame}`)
        .setScrollFactor(0)
        .setVisible(false);
      this.dungeonStatusRelics.push({ frame, image });
      return image;
    });
  }

  private renderDungeonStatusRelics(
    g: Phaser.GameObjects.Graphics,
    subscreen: AdventureSubscreenReadout
  ) {
    const dungeon = subscreen.dungeons.find((candidate) => candidate.active) ?? subscreen.dungeons[0];
    if (!dungeon) {
      for (const relic of this.dungeonStatusRelics) relic.image.setVisible(false);
      return;
    }

    const states: Record<DungeonStatusFrame, { lit: boolean; available: boolean }> = {
      small_key: { lit: dungeon.smallKeys > 0, available: dungeon.smallKeysRequired > 0 },
      big_key: { lit: dungeon.bigKeyHeld, available: true },
      map: { lit: dungeon.mapRevealed, available: true },
      boss: { lit: dungeon.bossDefeated, available: true }
    };

    if (this.dungeonStatusRelics.length === SNES_DUNGEON_STATUS_RELIC_ASSET.frames.length) {
      for (const relic of this.dungeonStatusRelics) {
        const state = states[relic.frame];
        relic.image
          .setPosition(181 + SNES_DUNGEON_STATUS_RELIC_ASSET.frames.indexOf(relic.frame) * 14, 134)
          .setVisible(true)
          .setAlpha(state.lit ? 1 : state.available ? 0.36 : 0.2);
      }
      return;
    }

    SNES_DUNGEON_STATUS_RELIC_ASSET.frames.forEach((frame, index) => {
      const state = states[frame];
      const x = 176 + index * 14;
      g.lineStyle(1, color(state.lit ? PALETTE.goldStamp : PALETTE.stoneGray), state.available ? 1 : 0.4);
      g.fillStyle(color(state.lit ? PALETTE.deepRuby : PALETTE.black), state.lit ? 0.9 : 0.48);
      g.fillRect(x, 128, 10, 10);
      g.strokeRect(x, 128, 10, 10);
    });
  }

  private renderProductionBoardTrack(
    g: Phaser.GameObjects.Graphics,
    board: AdventureSubscreenReadout["productionBoard"]
  ) {
    const x = 178;
    const y = 119;
    const width = 61;
    const height = 7;
    const total = Math.max(1, board.total);
    g.fillStyle(color(PALETTE.black), 0.78);
    g.fillRect(x, y, width, height);
    g.lineStyle(1, color(PALETTE.goldStamp), 1);
    g.strokeRect(x, y, width, height);
    board.steps.forEach((step, index) => {
      const beadX = Math.round(x + 4 + (index * (width - 8)) / Math.max(1, total - 1));
      const beadColor = step.complete
        ? PALETTE.openNetGreen
        : step.status === "active"
          ? PALETTE.terminalCyan
          : PALETTE.stoneGray;
      g.fillStyle(color(beadColor), step.status === "locked" ? 0.55 : 1);
      g.fillRect(beadX, y + 2, 1, 3);
      if (step.status === "active") {
        g.lineStyle(1, color(PALETTE.white), 1);
        g.strokeRect(beadX - 1, y + 1, 3, 5);
      }
    });
    const progressWidth = Math.max(1, Math.round((width - 2) * board.completionRatio));
    g.fillStyle(color(PALETTE.goldStamp), 0.32);
    g.fillRect(x + 1, y + height - 2, progressWidth, 1);
  }

  private renderPhaseChips(
    g: Phaser.GameObjects.Graphics,
    board: AdventureSubscreenReadout["productionBoard"]
  ) {
    const x = 179;
    const y = 110;
    board.phases.forEach((phase, index) => {
      const chipX = x + index * 10;
      const active = phase.status === "active";
      const fill = phase.status === "complete"
        ? PALETTE.openNetGreen
        : active
          ? PALETTE.terminalCyan
          : PALETTE.black;
      const stroke = active
        ? PALETTE.white
        : phase.status === "complete"
          ? PALETTE.goldStamp
          : PALETTE.stoneGray;
      g.fillStyle(color(fill), phase.status === "locked" ? 0.5 : 0.9);
      g.fillRect(chipX, y, 8, 7);
      g.lineStyle(1, color(stroke), 1);
      g.strokeRect(chipX, y, 8, 7);
      const ticks = Math.max(1, phase.total);
      const tickWidth = Math.max(1, Math.floor(6 / ticks));
      for (let tick = 0; tick < ticks; tick += 1) {
        g.fillStyle(color(tick < phase.completed ? PALETTE.goldStamp : PALETTE.stoneGray), tick < phase.completed ? 1 : 0.45);
        g.fillRect(chipX + 1 + tick * tickWidth, y + 5, 1, 1);
      }
    });
  }

  private renderRoomMap(g: Phaser.GameObjects.Graphics, subscreen: AdventureSubscreenReadout) {
    const rooms = subscreen.roomMap.rooms;
    if (!rooms.length) return;
    const minX = Math.min(...rooms.map((room) => room.grid.x));
    const minY = Math.min(...rooms.map((room) => room.grid.y));
    const cell = 7;
    const originX = 188;
    const originY = 151;
    g.fillStyle(color(PALETTE.black), 0.86);
    g.fillRect(178, 143, 61, 74);
    g.lineStyle(1, color(PALETTE.goldStamp), 1);
    g.strokeRect(178, 143, 61, 74);
    for (const room of rooms) {
      if (!room.revealed) continue;
      const x = originX + (room.grid.x - minX) * (cell + 2);
      const y = originY + (room.grid.y - minY) * (cell + 2);
      const current = room.id === subscreen.roomMap.currentRoomId;
      const fill = current
        ? PALETTE.goldStamp
        : room.visited
          ? PALETTE.terminalCyan
          : room.roomType === "boss"
            ? PALETTE.classNetRed
            : PALETTE.stoneGray;
      g.fillStyle(color(fill), current ? 1 : 0.78);
      g.fillRect(x, y, cell, cell);
      g.lineStyle(1, color(current ? PALETTE.white : PALETTE.black), 1);
      g.strokeRect(x, y, cell, cell);
    }
  }

  private createToolGrid(scene: Phaser.Scene) {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const items = getProcessItemReadout();
    items.forEach((item, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 36 + col * 38;
      const y = 53 + row * 26;
      const hit = scene.add
        .rectangle(x, y, 34, 34, color(PALETTE.black), 0.01)
        .setScrollFactor(0);
      const box = scene.add
        .rectangle(x, y, 30, 18, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.stoneGray))
        .setScrollFactor(0);
      const icon = scene.textures.exists(SNES_WORKFLOW_TOOL_RELIC_ASSET.key)
        ? scene.add
          .image(x, y - 4, SNES_WORKFLOW_TOOL_RELIC_ASSET.key, PROCESS_ITEM_TOOL_FRAMES[item.id as ProcessItemId])
          .setName(`inventory-tool-icon-${item.id}`)
          .setScale(0.5)
          .setScrollFactor(0)
        : undefined;
      const label = scene.add.text(x, y + (icon ? 7 : -4), item.shortLabel, {
        fontFamily: "monospace",
        fontSize: icon ? "4px" : "5px",
        color: PALETTE.stoneGray,
        align: "center"
      }).setOrigin(0.5).setScrollFactor(0);
      bindPointerPress(hit, { down: () => this.tapTool(item.id as ProcessItemId) });
      this.itemSlots.push({ id: item.id as ProcessItemId, box, icon, label });
      objects.push(hit, box);
      if (icon) objects.push(icon);
      objects.push(label);
    });
    return objects;
  }

  private createFrusVolumeRow(scene: Phaser.Scene) {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const frame = scene.add
      .rectangle(88, 203, 154, 44, color(PALETTE.black), 0.82)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("inventory-frus-volume-row-frame")
      .setScrollFactor(0);
    objects.push(frame);

    if (scene.textures.exists(FRUS_VOLUME_ROW_TEXTURE)) {
      const rowArt = scene.add.image(88, 203, FRUS_VOLUME_ROW_TEXTURE)
        .setCrop(105, 470, 1500, 410)
        .setScale(0.1)
        .setAlpha(0.42)
        .setName("inventory-frus-volume-row-art")
        .setScrollFactor(0);
      rowArt.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      objects.push(rowArt);
    } else {
      const fallback = scene.add
        .rectangle(88, 203, 150, 32, color(PALETTE.deepRuby), 0.5)
        .setStrokeStyle(1, color(PALETTE.sepiaInk))
        .setName("inventory-frus-volume-row-fallback")
        .setScrollFactor(0);
      objects.push(fallback);
    }

    const dim = scene.add
      .rectangle(88, 203, 154, 44, color(PALETTE.black), 0.52)
      .setName("inventory-frus-volume-row-dim")
      .setScrollFactor(0);
    this.frusVolumeRowTitle = scene.add.text(17, 184, "FRUS VOLUME SHELF 0/6", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setName("inventory-frus-volume-row-title").setScrollFactor(0);
    objects.push(dim, this.frusVolumeRowTitle);

    FRUS_VOLUME_SLOT_X.forEach((x, index) => {
      const light = scene.add
        .rectangle(x, 219, 15, 6, color(PALETTE.black), 0.95)
        .setStrokeStyle(1, color(PALETTE.stoneGray))
        .setName("inventory-frus-volume-slot-light")
        .setScrollFactor(0);
      const label = scene.add.text(x, 214, String(index + 1), {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.stoneGray,
        align: "center"
      }).setOrigin(0.5, 0).setName("inventory-frus-volume-slot-label").setScrollFactor(0);
      this.frusVolumeSlotLights.push(light);
      this.frusVolumeSlotLabels.push(label);
      objects.push(light, label);
    });

    return objects;
  }

  private handlePauseTouch(x: number, y: number) {
    if (!this.active) return false;
    if (this.hitRect(x, y, CLOSE_HIT.x, CLOSE_HIT.y, CLOSE_HIT.width, CLOSE_HIT.height)) {
      this.hide();
      return true;
    }
    if (this.hitRect(x, y, CODEX_HIT.x, CODEX_HIT.y, CODEX_HIT.width, CODEX_HIT.height)) {
      this.openCodexFromInventory();
      return true;
    }
    if (this.hitRect(x, y, LANGUAGE_HIT.x, LANGUAGE_HIT.y, LANGUAGE_HIT.width, LANGUAGE_HIT.height)) {
      this.changeLanguage();
      return true;
    }
    const slot = this.itemSlots.find((candidate) => this.hitRect(x, y, candidate.box.x, candidate.box.y, 44, 44));
    if (slot) {
      this.tapTool(slot.id);
      return true;
    }
    const danneSlot = this.danneItemSlots.find((candidate) => this.hitRect(x, y, candidate.box.x, candidate.box.y, 44, 44));
    if (danneSlot) {
      this.tapDanneItem(danneSlot.id);
      return true;
    }
    if (x < MODAL_BOUNDS.left || x > MODAL_BOUNDS.right || y < MODAL_BOUNDS.top || y > MODAL_BOUNDS.bottom) {
      this.hide();
      return true;
    }
    return true;
  }

  private hitRect(x: number, y: number, cx: number, cy: number, width: number, height: number) {
    return Math.abs(x - cx) <= width / 2 && Math.abs(y - cy) <= height / 2;
  }

  private handleScenePointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.active) return;
    this.handlePauseTouch(Math.round(pointer.x), Math.round(pointer.y));
  }

  private renderToolGrid() {
    const readout = getProcessItemReadout();
    for (const slot of this.itemSlots) {
      const item = readout.find((candidate) => candidate.id === slot.id);
      const acquired = Boolean(item?.acquired);
      const equipped = Boolean(item?.equipped);
      slot.box.setFillStyle(color(equipped ? PALETTE.goldStamp : acquired ? PALETTE.deepRuby : PALETTE.black));
      slot.box.setStrokeStyle(1, color(equipped ? PALETTE.white : acquired ? PALETTE.goldStamp : PALETTE.stoneGray));
      slot.label.setColor(equipped ? PALETTE.black : acquired ? PALETTE.goldStamp : PALETTE.stoneGray);
      slot.label.setText(item?.shortLabel ?? "--");
      slot.icon?.setAlpha(equipped ? 1 : acquired ? 0.88 : 0.22);
      slot.icon?.setTint(equipped ? color(PALETTE.black) : color(PALETTE.white));
    }
  }

  private renderFrusVolumeRow() {
    const published = gameState.inventory.includes("Published FRUS Cover");
    const filledCount = Math.min(FRUS_VOLUME_SLOT_X.length, gameState.volumeFragments.length + (published ? 1 : 0));
    for (let index = 0; index < this.frusVolumeSlotLights.length; index += 1) {
      const filled = index < filledCount;
      const finalSlot = published && index === this.frusVolumeSlotLights.length - 1;
      const fill = finalSlot ? PALETTE.openNetGreen : filled ? PALETTE.goldStamp : PALETTE.black;
      const stroke = finalSlot ? PALETTE.white : filled ? PALETTE.goldStamp : PALETTE.stoneGray;
      this.frusVolumeSlotLights[index].setFillStyle(color(fill), filled ? 0.95 : 0.82);
      this.frusVolumeSlotLights[index].setStrokeStyle(1, color(stroke));
      this.frusVolumeSlotLabels[index].setColor(finalSlot ? PALETTE.openNetGreen : filled ? PALETTE.goldStamp : PALETTE.stoneGray);
      this.frusVolumeSlotLabels[index].setText(finalSlot ? "PUB" : String(index + 1));
    }
  }

  private changeLanguage() {
    cycleLanguage();
    retroAudio.confirm();
    setLatestMessage(getString("language.changed", { language: getLanguage().toUpperCase() }));
    this.render();
  }

  private renderLanguageSelector() {
    this.languageLabel.setText(getString("language.label", { language: getLanguage().toUpperCase() }));
  }

  private createDanneItemGrid(scene: Phaser.Scene) {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const title = scene.add.text(16, 91, "DANN-E ITEMS", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setScrollFactor(0);
    objects.push(title);
    DANNE_ITEM_CATALOG.forEach((asset, index) => {
      const x = 35 + index * 47;
      const y = 105;
      const thumb = ensureItemThumbnail(scene, asset);
      const hit = scene.add.rectangle(x, y, 44, 44, color(PALETTE.black), 0.01).setScrollFactor(0);
      const box = scene.add
        .rectangle(x, y, 24, 22, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.stoneGray))
        .setScrollFactor(0);
      const image = scene.add.image(x, y - 2, thumb).setScrollFactor(0);
      const label = scene.add.text(x, y + 12, asset.id === "treaty-fragments" ? "TRTY" : asset.id === "master-declass-key" ? "KEY" : "PEN", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.stoneGray
      }).setOrigin(0.5).setScrollFactor(0);
      bindPointerPress(hit, { down: () => this.tapDanneItem(asset.id) });
      hit.on("pointerover", () => {
        this.selectedDanneItemId = asset.id;
        this.render();
      });
      this.danneItemSlots.push({ id: asset.id, box, image, label });
      objects.push(hit, box, image, label);
    });
    return objects;
  }

  private renderDanneItemGrid() {
    const readout = getDanneItemReadout();
    for (const slot of this.danneItemSlots) {
      const item = readout.find((candidate) => candidate.id === slot.id);
      const acquired = Boolean(item?.acquired);
      const equipped = Boolean(item?.equipped);
      const selected = slot.id === this.selectedDanneItemId;
      slot.box.setFillStyle(color(equipped ? PALETTE.goldStamp : acquired ? PALETTE.deepRuby : PALETTE.black));
      slot.box.setStrokeStyle(1, color(selected ? PALETTE.white : acquired ? PALETTE.goldStamp : PALETTE.stoneGray));
      slot.image.setVisible(acquired);
      slot.image.setAlpha(equipped ? 1 : acquired ? 0.88 : 0.25);
      slot.label.setColor(equipped ? PALETTE.black : acquired ? PALETTE.goldStamp : PALETTE.stoneGray);
      if (item?.id === "treaty-fragments") slot.label.setText(`T${item.count}/${item.total}`);
    }
  }

  private renderDannePopover() {
    if (!this.selectedDanneItemId) {
      this.dannePopover.setVisible(false);
      return;
    }
    const readout = getDanneItemReadout();
    const selected = readout.find((item) => item.id === this.selectedDanneItemId && item.acquired);
    if (!selected) {
      this.dannePopover.setVisible(false);
      return;
    }
    this.selectedDanneItemId = selected.id;
    const source = this.scene.textures.get(selected.key).getSourceImage() as { width?: number; height?: number };
    const width = Math.max(1, source.width ?? 64);
    const height = Math.max(1, source.height ?? 64);
    const scale = Math.min(48 / width, 48 / height);
    this.dannePopoverImage
      .setTexture(selected.key)
      .setScale(scale)
      .setVisible(true);
    this.dannePopoverText.setText([
      selected.displayName.toUpperCase(),
      selected.id === "ruby-pen" ? "+5 ATK" : selected.id === "treaty-fragments" ? `${selected.count}/${selected.total}` : "KEY",
      selected.description
    ].join("\n"));
    this.dannePopover.setVisible(true);
  }

  private tapDanneItem(itemId: DanneItemId) {
    this.selectedDanneItemId = itemId;
    const item = getDanneItemReadout().find((candidate) => candidate.id === itemId);
    if (!item?.acquired) {
      setLatestMessage("DANN-E item not acquired.");
      retroAudio.warning();
      this.render();
      return;
    }
    if (itemId === "ruby-pen") {
      equipDanneItem(itemId);
      retroAudio.confirm();
      this.render();
      return;
    }
    setLatestMessage(`${item.displayName} inspected.`);
    retroAudio.confirm();
    this.render();
  }

  private openCodexFromInventory() {
    this.hide();
    openCodex(this.scene);
  }

  private tapTool(itemId: ProcessItemId) {
    const item = getProcessItemReadout().find((candidate) => candidate.id === itemId);
    if (!item?.acquired) {
      setLatestMessage("Tool not in the folder yet.");
      retroAudio.warning();
      this.render();
      return;
    }
    if (item.equipped) {
      setLatestMessage(`${item.displayName} ready.`);
      retroAudio.confirm();
      this.render();
      return;
    }
    equipProcessItem(itemId);
    setLatestMessage(`${item.displayName} equipped.`);
    retroAudio.confirm();
    this.render();
  }
}
