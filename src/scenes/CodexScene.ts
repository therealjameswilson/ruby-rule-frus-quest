import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { CODEX_CATEGORIES, getCodexEntries, getCodexReadout, type CodexCategory, type CodexEntryReadout } from "../game/codex";
import { gameState, setLatestMessage, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import type { GameMode } from "../game/types";
import { bindPointerPress, getInput, swallowNextInputFrame, tickInput } from "../input/InputState";

interface CodexSceneData {
  returnScene?: string;
  category?: CodexCategory;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function preferredCategoryFromQuery(): CodexCategory | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("codex")?.toLowerCase();
  if (raw === "enemies") return "Enemies";
  if (raw === "npcs") return "NPCs";
  if (raw === "variants" || raw === "danne") return "DANN-E Variants";
  if (raw === "items") return "Items";
  return null;
}

export class CodexScene extends Phaser.Scene {
  private returnScene = "TitleScene";
  private categoryIndex = 0;
  private entryIndex = 0;
  private entryOffset = 0;
  private content?: Phaser.GameObjects.Container;
  private readyAt = 0;
  private previousState: { scene: string; mode: GameMode; objective: string } = { scene: "TitleScene", mode: "title", objective: "" };

  constructor() {
    super("CodexScene");
  }

  create(data: CodexSceneData = {}) {
    this.returnScene = data.returnScene ?? "TitleScene";
    this.previousState = {
      scene: gameState.currentScene,
      mode: gameState.mode,
      objective: gameState.objective
    };
    const preferred = data.category ?? preferredCategoryFromQuery();
    if (preferred) this.categoryIndex = Math.max(0, CODEX_CATEGORIES.indexOf(preferred));
    this.entryIndex = 0;
    this.entryOffset = 0;
    this.readyAt = this.time.now + 160;
    if (this.returnScene !== this.scene.key && this.scene.isActive(this.returnScene)) {
      this.scene.pause(this.returnScene);
    }
    setSceneState("CodexScene", "pause", "Codex: review enemies, NPCs, DANN-E variants, and tools.");
    setLatestMessage("Codex opened.");
    setVisibleThreats([]);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.drawFrame();
    this.render();
  }

  update() {
    tickInput();
    const input = getInput();
    if (this.time.now >= this.readyAt && (input.pauseJustPressed || input.selectJustPressed || input.bJustPressed)) {
      this.close();
      return;
    }
    if (input.navLeftJustPressed) {
      this.categoryIndex = (this.categoryIndex + CODEX_CATEGORIES.length - 1) % CODEX_CATEGORIES.length;
      this.entryIndex = 0;
      this.entryOffset = 0;
      this.render();
    }
    if (input.navRightJustPressed) {
      this.categoryIndex = (this.categoryIndex + 1) % CODEX_CATEGORIES.length;
      this.entryIndex = 0;
      this.entryOffset = 0;
      this.render();
    }
    if (input.upJustPressed) {
      this.entryIndex = Math.max(0, this.entryIndex - 1);
      this.clampOffset();
      this.render();
    }
    if (input.downJustPressed) {
      const entries = this.currentEntries();
      this.entryIndex = Math.min(entries.length - 1, this.entryIndex + 1);
      this.clampOffset();
      this.render();
    }
  }

  private drawFrame() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black), 0.72);
    this.add.rectangle(128, 120, 244, 226, color(PALETTE.shadowNavy), 0.97)
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.rectangle(128, 17, 236, 20, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    this.add.text(128, 10, "FRUS FIELD CODEX", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    this.add.text(128, 223, "LEFT/RIGHT CATEGORY  UP/DOWN ENTRY  TAB/ESC CLOSE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0);
    const closeHit = this.add.rectangle(229, 17, 34, 34, color(PALETTE.black), 0.01);
    const closeBox = this.add.rectangle(229, 17, 16, 16, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    const closeLabel = this.add.text(229, 13, "X", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    bindPointerPress(closeHit, { down: () => this.close() });
    closeBox.setDepth(2);
    closeLabel.setDepth(3);
  }

  private render() {
    this.content?.destroy();
    const objects: Phaser.GameObjects.GameObject[] = [];
    const category = this.currentCategory();
    const entries = this.currentEntries();
    const selected = entries[this.entryIndex] ?? entries[0];
    setVisibleEntities(entries.map((entry) => `${entry.unlocked ? "UNLOCKED" : "LOCKED"} ${entry.displayName}`));
    this.drawCategories(objects, category);
    this.drawEntryList(objects, entries);
    if (selected) this.drawEntryDetail(objects, selected);
    this.drawCounter(objects);
    this.content = this.add.container(0, 0, objects).setDepth(20);
  }

  private drawCategories(objects: Phaser.GameObjects.GameObject[], activeCategory: CodexCategory) {
    CODEX_CATEGORIES.forEach((category, index) => {
      const y = 38 + index * 18;
      const active = category === activeCategory;
      const hit = this.add.rectangle(43, y + 7, 66, 18, color(PALETTE.black), 0.01);
      const box = this.add.rectangle(43, y + 7, 66, 15, color(active ? PALETTE.goldStamp : PALETTE.black), active ? 0.92 : 0.6)
        .setStrokeStyle(1, color(active ? PALETTE.white : PALETTE.stoneGray));
      const label = this.add.text(43, y + 3, category.toUpperCase().replace("DANN-E ", "D-"), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: active ? PALETTE.black : PALETTE.creamPaper
      }).setOrigin(0.5, 0);
      bindPointerPress(hit, {
        down: () => {
          this.categoryIndex = index;
          this.entryIndex = 0;
          this.entryOffset = 0;
          this.render();
        }
      });
      objects.push(hit, box, label);
    });
  }

  private drawEntryList(objects: Phaser.GameObjects.GameObject[], entries: CodexEntryReadout[]) {
    const visible = entries.slice(this.entryOffset, this.entryOffset + 7);
    this.addTo(objects, this.add.rectangle(43, 134, 66, 92, color(PALETTE.black), 0.45)
      .setStrokeStyle(1, color(PALETTE.stoneGray)));
    visible.forEach((entry, visibleIndex) => {
      const index = this.entryOffset + visibleIndex;
      const selected = index === this.entryIndex;
      const y = 94 + visibleIndex * 13;
      const hit = this.add.rectangle(43, y + 5, 66, 13, color(PALETTE.black), 0.01);
      const marker = selected ? ">" : " ";
      const locked = entry.unlocked ? " " : "?";
      const text = `${marker}${locked} ${entry.unlocked ? entry.displayName : "???"}`;
      const label = this.add.text(13, y, text.slice(0, 22), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: selected ? PALETTE.goldStamp : entry.unlocked ? PALETTE.creamPaper : PALETTE.stoneGray
      });
      bindPointerPress(hit, {
        down: () => {
          this.entryIndex = index;
          this.render();
        }
      });
      objects.push(hit, label);
    });
  }

  private drawEntryDetail(objects: Phaser.GameObjects.GameObject[], entry: CodexEntryReadout) {
    this.addTo(objects, this.add.rectangle(162, 113, 144, 153, color(PALETTE.black), 0.58)
      .setStrokeStyle(1, color(PALETTE.goldStamp)));
    const title = entry.unlocked ? entry.displayName : "???";
    this.addTo(objects, this.add.text(96, 43, title.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: entry.unlocked ? PALETTE.goldStamp : PALETTE.classNetRed
    }));
    this.addTo(objects, this.add.text(96, 56, entry.category.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }));
    if (entry.unlocked) this.drawEntryArt(objects, entry);
    else this.drawLockedSilhouette(objects);
    const lore = entry.unlocked ? entry.lore : "Encounter this entry in the field to reveal its notes.";
    this.addTo(objects, this.add.text(96, 149, lore, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: entry.unlocked ? PALETTE.creamPaper : PALETTE.stoneGray,
      wordWrap: { width: 126, useAdvancedWrap: true },
      lineSpacing: 1
    }));
  }

  private drawEntryArt(objects: Phaser.GameObjects.GameObject[], entry: CodexEntryReadout) {
    if (!entry.artKey || !this.textures.exists(entry.artKey)) {
      this.drawLockedSilhouette(objects, "NO ART");
      return;
    }
    const object = entry.spriteSheet
      ? this.add.sprite(160, 108, entry.artKey, 0).setOrigin(0.5, 0.72)
      : this.add.image(160, 108, entry.artKey).setOrigin(0.5);
    const width = Math.max(1, object.width);
    const height = Math.max(1, object.height);
    object.setScale(Math.min(68 / width, 66 / height, entry.spriteSheet ? 0.32 : 1));
    this.addTo(objects, this.add.ellipse(160, 135, 48, 8, color(PALETTE.black), 0.62));
    this.addTo(objects, object);
  }

  private drawLockedSilhouette(objects: Phaser.GameObjects.GameObject[], label = "???") {
    this.addTo(objects, this.add.rectangle(160, 104, 58, 68, color(PALETTE.black), 0.92)
      .setStrokeStyle(1, color(PALETTE.classNetRed)));
    this.addTo(objects, this.add.rectangle(160, 95, 46, 7, color(PALETTE.classNetRed), 0.86));
    this.addTo(objects, this.add.rectangle(160, 118, 52, 7, color(PALETTE.classNetRed), 0.78));
    this.addTo(objects, this.add.text(160, 101, label, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0));
  }

  private drawCounter(objects: Phaser.GameObjects.GameObject[]) {
    const readout = getCodexReadout();
    this.addTo(objects, this.add.text(13, 199, `FOUND ${readout.unlocked}/${readout.total}`, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }));
    const category = readout.categories[this.categoryIndex];
    this.addTo(objects, this.add.text(13, 209, `${category.category.toUpperCase()} ${category.unlocked}/${category.total}`, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }));
  }

  private currentCategory() {
    return CODEX_CATEGORIES[this.categoryIndex] ?? CODEX_CATEGORIES[0];
  }

  private currentEntries() {
    return getCodexEntries(this.currentCategory());
  }

  private clampOffset() {
    if (this.entryIndex < this.entryOffset) this.entryOffset = this.entryIndex;
    if (this.entryIndex >= this.entryOffset + 7) this.entryOffset = this.entryIndex - 6;
  }

  private close() {
    setLatestMessage("Codex closed.");
    swallowNextInputFrame();
    if (this.returnScene && this.returnScene !== this.scene.key && this.scene.isPaused(this.returnScene)) {
      this.scene.resume(this.returnScene);
    }
    gameState.currentScene = this.previousState.scene;
    gameState.mode = this.previousState.mode;
    gameState.objective = this.previousState.objective;
    this.scene.stop();
  }

  private addTo(objects: Phaser.GameObjects.GameObject[], object: Phaser.GameObjects.GameObject) {
    objects.push(object);
    return object;
  }
}
