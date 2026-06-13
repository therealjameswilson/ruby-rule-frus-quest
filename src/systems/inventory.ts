import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { ProcessItemId } from "../game/constants";
import { DANNE_ITEM_CATALOG } from "../game/danneItemCatalog";
import type { DanneItemCatalogEntry, DanneItemId } from "../game/danneItemCatalog";
import type { GameMode } from "../game/types";
import {
  equipDanneItem,
  equipProcessItem,
  gameState,
  getAdventureHudReadout,
  getAreaProgressReadout,
  getDanneItemReadout,
  getDocumentWorkflowReadout,
  getProcessItemReadout,
  setLatestMessage,
  getWorkflowToolReadout
} from "../game/state";
import { bindPointerPress, isTouchInputCapable, updateInputCallbacks } from "../input/InputState";
import { retroAudio } from "./audio";

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

const MODAL_BOUNDS = { left: 10, right: 246, top: 20, bottom: 188 };
const CLOSE_HIT = { x: 223, y: 35, width: 44, height: 44 };

export class InventoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
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
      .rectangle(128, 104, 236, 168, color(PALETTE.black))
      .setScrollFactor(0);
    const border = scene.add
      .rectangle(128, 104, 236, 168)
      .setStrokeStyle(2, color(PALETTE.goldStamp))
      .setScrollFactor(0);
    const title = scene.add.text(16, 25, "MANUSCRIPT INVENTORY", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setScrollFactor(0);
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
    this.body = scene.add.text(16, touch ? 126 : 122, "", {
      fontFamily: "monospace",
      fontSize: touch ? "6px" : "5px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 224, useAdvancedWrap: true },
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
    this.container = scene.add
      .container(0, 0, [dim, box, border, title, closeBox, closeLabel, closeHit, ...slotObjects, ...danneObjects, this.dannePopover, this.body])
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
    const tools = getWorkflowToolReadout()
      .filter((tool) => tool.acquired)
      .slice(0, 3)
      .map((tool) => `${tool.shortLabel}: ${COMPACT_TOOL_LINES[tool.id]}`)
      .join("\n");
    const areas = getAreaProgressReadout()
      .map((area) => {
        const marker = area.active ? ">" : " ";
        const status = area.completed ? "OK" : "--";
        return `${marker}${status} ${area.displayName}: ${area.reward}`;
      })
      .join("\n");
    const documents = getDocumentWorkflowReadout()
      .filter((document) => document.selected || document.state !== "found")
      .slice(0, 5)
      .map((document) => `${document.selected ? "OK" : "--"} ${document.id.replace(/_001|_047|_412/g, "").toUpperCase()}: ${document.state}`)
      .join("\n") || "-- NO DOCUMENTS ROUTED";
    const hud = getAdventureHudReadout();
    const danneItems = getDanneItemReadout();
    const danneSummary = danneItems
      .map((item) => {
        if (item.id === "treaty-fragments") return `TREATY ${item.count}/${item.total}`;
        return `${item.displayName.toUpperCase()}: ${item.acquired ? item.equipped ? "EQ" : "OK" : "--"}`;
      })
      .join("  ");
    this.body.setText([
      `DOCUMENT POINTS: ${gameState.documentPoints}`,
      `FRUS VOLUME PARTS: ${gameState.volumeFragments.length}/5`,
      `EQUIPPED TOOL: ${hud.equippedItem?.displayName ?? "NONE"}`,
      `DANN-E ITEMS: ${danneSummary}`,
      `CONF ${hud.confidence.meter}  CLAR ${hud.clarity.meter}`,
      "TAP TOOL/CARD TO EQUIP OR INSPECT. X CLOSES.",
      "",
      "QUEST ROUTE",
      areas.split("\n").slice(0, 3).join("\n"),
      "",
      "DOCUMENT FLOW",
      documents.split("\n").slice(0, 1).join("\n"),
      tools ? "READY TOOLS" : "",
      tools.split("\n").slice(0, 2).join("\n")
    ].join("\n"));
    this.renderToolGrid();
    this.renderDanneItemGrid();
    this.renderDannePopover();
  }

  private createToolGrid(scene: Phaser.Scene) {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const items = getProcessItemReadout();
    items.forEach((item, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 35 + col * 47;
      const y = 53 + row * 26;
      const hit = scene.add
        .rectangle(x, y, 44, 44, color(PALETTE.black), 0.01)
        .setScrollFactor(0);
      const box = scene.add
        .rectangle(x, y, 34, 20, color(PALETTE.black))
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
    const readout = getDanneItemReadout();
    const selected = readout.find((item) => item.id === this.selectedDanneItemId && item.acquired)
      ?? readout.find((item) => item.acquired);
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
