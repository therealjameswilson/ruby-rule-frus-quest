import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { ProcessItemId } from "../game/constants";
import { DANNE_ITEM_CATALOG } from "../game/danneItemCatalog";
import type { DanneItemCatalogEntry, DanneItemId } from "../game/danneItemCatalog";
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

export class InventoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly subscreenGraphics: Phaser.GameObjects.Graphics;
  private readonly summary: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private previousMode: GameMode | null = null;
  private readonly itemSlots: Array<{
    id: ProcessItemId;
    box: Phaser.GameObjects.Rectangle;
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
    const title = scene.add.text(16, 18, "FRUS QUEST SUBSCREEN", {
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
    const closeLabel = scene.add.text(220, 29, "X", {
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
    const codexLabel = scene.add.text(171, 31, "CODEX", {
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
    const slotObjects = this.createToolGrid(scene);
    const danneObjects = this.createDanneItemGrid(scene);
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
        title,
        this.subscreenGraphics,
        codexBox,
        codexLabel,
        codexHit,
        closeBox,
        closeLabel,
        closeHit,
        ...slotObjects,
        ...danneObjects,
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
    const danneSummary = treaty ? `TREATY ${treaty.count}/${treaty.total}` : "TREATY 0/3";
    const pendantSummary = subscreen.pendants
      .map((pendant) => `${pendant.label}:${pendant.acquired ? "OK" : "--"}`)
      .join(" ");
    const boardNext = subscreen.productionBoard.nextStep?.shortLabel ?? "DONE";
    this.summary.setText([
      `${pendantSummary}  CRYSTALS ${subscreen.crystals.earned}/${subscreen.crystals.total || 0}  HEARTS ${subscreen.reliabilityHearts.filled}/${subscreen.reliabilityHearts.total}`,
      `BOARD ${subscreen.productionBoard.completed}/${subscreen.productionBoard.total} NEXT ${boardNext}  ${danneSummary}`,
      `TOOL ${subscreen.equippedTool?.displayName.toUpperCase() ?? hud.equippedItem?.displayName.toUpperCase() ?? "NONE"}`
    ].join("\n"));
    this.body.setText([
      `NEXT BOARD: ${subscreen.productionBoard.nextStep?.label.toUpperCase() ?? "CERTIFY BUCKRAM GATE"}`,
      "DUNGEON MAP / KEYS",
      dungeons,
      "",
      tools ? "READY TOOLS" : "READY TOOLS --",
      tools.split("\n").slice(0, 2).join("\n")
    ].join("\n"));
    this.renderSubscreenGraphics(subscreen);
    this.renderToolGrid();
    this.renderDanneItemGrid();
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

    const crystalTotal = Math.max(1, subscreen.crystals.total);
    const visibleCrystals = Math.min(8, crystalTotal);
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
    this.renderRoomMap(g, subscreen);
  }

  private renderProductionBoardTrack(
    g: Phaser.GameObjects.Graphics,
    board: AdventureSubscreenReadout["productionBoard"]
  ) {
    const x = 18;
    const y = 113;
    const width = 148;
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
      g.fillRect(beadX - 1, y + 2, 2, 3);
      if (step.status === "active") {
        g.lineStyle(1, color(PALETTE.white), 1);
        g.strokeRect(beadX - 2, y + 1, 4, 5);
      }
    });
    const progressWidth = Math.max(1, Math.round((width - 2) * board.completionRatio));
    g.fillStyle(color(PALETTE.goldStamp), 0.32);
    g.fillRect(x + 1, y + height - 2, progressWidth, 1);
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
      const label = scene.add.text(x, y - 4, item.shortLabel, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.stoneGray,
        align: "center"
      }).setOrigin(0.5).setScrollFactor(0);
      bindPointerPress(hit, { down: () => this.tapTool(item.id as ProcessItemId) });
      this.itemSlots.push({ id: item.id as ProcessItemId, box, label });
      objects.push(hit, box, label);
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
    }
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
