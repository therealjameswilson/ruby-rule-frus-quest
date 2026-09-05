import Phaser from "phaser";
import { ABOUT_SERIES_SOURCE } from "../game/aboutSeries";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { CODEX_CATEGORIES, getCodexEntries, type CodexCategory, type CodexEntryReadout } from "../game/codex";
import { gameState, setLatestMessage, setSceneState, setVisibleEntities, setVisibleThreats, syncCompletionStatsPlayTime } from "../game/state";
import { bindPointerPress, getInput, swallowNextInputFrame, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { captureCodexReturnState } from "../systems/codexOverlay";
import {
  CODEX_BACK, CODEX_CLOSE, CODEX_LIST_SIZE, CODEX_NEXT, CODEX_PREVIOUS, CODEX_SOURCE, CODEX_TABS,
  codexArtScale, codexDetailPages, codexEntryHit, codexListWindow, setCodexViewReadout, turnCodexList
} from "../systems/codexLayout";
import { pauseTextPages, type PauseHit } from "../systems/pauseMenu";
import { saveGameNow } from "../systems/save";

interface CodexSceneData { returnScene?: string; category?: CodexCategory }
const TAB_LABELS = ["FOES", "NPCS", "FORMS", "ITEMS", "X"] as const;
function color(hex: string) { return Phaser.Display.Color.HexStringToColor(hex).color; }

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
  private pageIndex = 0;
  private detailOpen = false;
  private content!: Phaser.GameObjects.Container;
  private controls: PauseHit[] = [];
  private readyAt = 0;
  private lastPointerFrame = -1;
  private previousState?: ReturnType<typeof captureCodexReturnState>;

  constructor() { super("CodexScene"); }

  create(data: CodexSceneData = {}) {
    this.returnScene = data.returnScene ?? "TitleScene";
    this.previousState = captureCodexReturnState(gameState);
    const preferred = data.category ?? preferredCategoryFromQuery();
    this.categoryIndex = preferred ? Math.max(0, CODEX_CATEGORIES.indexOf(preferred)) : 0;
    this.entryIndex = 0;
    this.pageIndex = 0;
    this.detailOpen = false;
    this.lastPointerFrame = -1;
    this.readyAt = this.time.now + 160;
    if (this.returnScene !== this.scene.key && this.scene.isActive(this.returnScene)) {
      saveGameNow();
      this.scene.pause(this.returnScene);
    }
    setSceneState("CodexScene", "pause", "FRUS field guide");
    setLatestMessage("Field guide opened.");
    setVisibleThreats([]);
    this.cameras.main.setBackgroundColor(PALETTE.black).setRoundPixels(true);
    this.add.rectangle(128, 120, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black));
    this.content = this.add.container(0, 0).setDepth(20);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setCodexViewReadout(null));
    this.render();
  }

  update() {
    tickInput();
    if (this.time.now < this.readyAt) return;
    const input = getInput();
    if (input.pauseJustPressed || input.selectJustPressed) { this.close(); return; }
    if (input.bJustPressed) {
      if (this.detailOpen) { this.detailOpen = false; this.render(); }
      else this.close();
      return;
    }
    if (input.aJustPressed || input.confirmJustPressed) {
      if (!this.detailOpen) this.openDetail();
      else if (this.isHandbookSelected()) this.openSelectedSource();
      else this.turnPage(1);
      return;
    }
    if (input.navLeftJustPressed || input.navRightJustPressed) {
      const direction = input.navLeftJustPressed ? -1 : 1;
      if (this.detailOpen) this.turnPage(direction);
      else this.selectCategory((this.categoryIndex + direction + CODEX_CATEGORIES.length) % CODEX_CATEGORIES.length);
      return;
    }
    if (!this.detailOpen && (input.navUpJustPressed || input.navDownJustPressed)) {
      this.entryIndex = codexListWindow(this.entryIndex + (input.navUpJustPressed ? -1 : 1), this.currentEntries().length).selected;
      this.render();
    }
  }

  private text(x: number, y: number, value: string, tint: string = PALETTE.creamPaper, center = false) {
    const text = this.add.text(x, y, value, {
      fontFamily: "monospace", fontSize: "8px", color: tint, lineSpacing: 2, align: center ? "center" : "left"
    }).setName("codex-text");
    if (center) text.setOrigin(0.5, 0);
    this.content.add(text);
    return text;
  }

  private control(hit: PauseHit, action: () => void) {
    this.controls.push({ ...hit });
    const target = this.add.rectangle(hit.x, hit.y, hit.width, hit.height, color(PALETTE.black), 0.01)
      .setName(`codex-control-${hit.id}`);
    bindPointerPress(target, { down: () => {
      const frame = this.game.loop.frame;
      if (this.time.now < this.readyAt || frame === this.lastPointerFrame) return;
      this.lastPointerFrame = frame;
      swallowNextInputFrame();
      action();
    } });
    this.content.add(target);
  }

  private button(hit: PauseHit, label: string, action: () => void, active = false) {
    const box = this.add.rectangle(hit.x, hit.y, hit.width - 2, 28, color(active ? PALETTE.deepRuby : PALETTE.shadowNavy))
      .setStrokeStyle(1, color(active ? PALETTE.goldStamp : PALETTE.stoneGray));
    this.content.add(box);
    this.text(hit.x, hit.y - 4, label, active ? PALETTE.goldStamp : PALETTE.creamPaper, true);
    this.control(hit, action);
  }

  private render() {
    this.content.removeAll(true);
    this.controls = [];
    const entries = this.currentEntries();
    const window = codexListWindow(this.entryIndex, entries.length);
    this.entryIndex = window.selected;
    const selected = entries[this.entryIndex];
    const pages = selected ? codexDetailPages(selected) : [{ title: "NO ENTRIES", text: "" }];
    this.pageIndex = Math.min(this.pageIndex, pages.length - 1);
    const page = pages[this.pageIndex];
    const visibleEntries = entries.slice(window.start, window.start + CODEX_LIST_SIZE);
    if (this.detailOpen && selected) this.drawDetail(selected, page, pages.length);
    else this.drawList(visibleEntries, window.start, window.page, window.pages, entries.filter((entry) => entry.unlocked).length, entries.length);
    setVisibleEntities(this.detailOpen
      ? [selected?.unlocked ? selected.displayName : "Undiscovered entry", page.title, page.text]
      : visibleEntries.map((entry) => entry.unlocked ? entry.displayName : "???"));
    setCodexViewReadout({
      category: CODEX_CATEGORIES[this.categoryIndex], view: this.detailOpen ? "detail" : "list",
      selectedId: selected?.id ?? null, selectedName: selected?.unlocked ? selected.displayName : "???",
      selectedIndex: this.entryIndex, page: this.detailOpen ? this.pageIndex + 1 : window.page + 1,
      pages: this.detailOpen ? pages.length : window.pages,
      title: this.detailOpen ? page.title : CODEX_CATEGORIES[this.categoryIndex], text: this.detailOpen ? page.text : null,
      sourceUrl: this.detailOpen && selected?.unlocked ? selected.sourceUrl ?? null : null,
      visibleEntries: this.detailOpen ? [] : visibleEntries.map((entry) => ({ id: entry.id, name: entry.unlocked ? entry.displayName : "???", unlocked: entry.unlocked })),
      controls: this.controls.map((control) => ({ ...control }))
    });
  }

  private drawList(entries: CodexEntryReadout[], offset: number, page: number, pages: number, found: number, total: number) {
    CODEX_TABS.forEach((hit, index) => this.button(hit, TAB_LABELS[index], () => {
      if (index === 4) this.close(); else this.selectCategory(index);
    }, index === this.categoryIndex));
    entries.forEach((entry, row) => {
      const hit = codexEntryHit(row), index = offset + row, selected = index === this.entryIndex;
      this.content.add(this.add.rectangle(128, hit.y + 22, 236, 1, color(PALETTE.stoneGray)));
      this.drawArt(entry, 32, hit.y, 32);
      this.text(56, hit.y - 13, pauseTextPages(entry.unlocked ? entry.displayName.toUpperCase() : "???", 30, 2)[0],
        selected ? PALETTE.goldStamp : PALETTE.creamPaper);
      this.text(56, hit.y + 9, entry.unlocked ? "FIELD NOTES" : "UNDISCOVERED", entry.unlocked ? PALETTE.terminalCyan : PALETTE.stoneGray);
      if (selected) this.text(12, hit.y - 4, ">", PALETTE.goldStamp);
      this.control(hit, () => { this.entryIndex = index; this.openDetail(); });
    });
    this.button(CODEX_PREVIOUS, "<", () => this.turnPage(-1));
    this.button(CODEX_NEXT, ">", () => this.turnPage(1));
    this.text(128, 203, `${page + 1} / ${pages}`, PALETTE.goldStamp, true);
    this.text(128, 218, `FOUND ${found}/${total}`, PALETTE.terminalCyan, true);
  }

  private drawDetail(entry: CodexEntryReadout, page: { title: string; text: string }, pages: number) {
    this.button(CODEX_BACK, "<", () => { this.detailOpen = false; this.render(); });
    this.button(CODEX_CLOSE, "X", () => this.close());
    const handbook = this.isHandbookSelected();
    this.text(128, 13, handbook ? "SERIES HANDBOOK" : "FIELD NOTES", PALETTE.goldStamp, true);
    this.text(128, 28, `${this.pageIndex + 1} / ${pages}`, PALETTE.terminalCyan, true);
    if (handbook) {
      this.text(20, 56, page.title, PALETTE.goldStamp);
      this.text(20, 88, page.text);
      this.button(CODEX_SOURCE, "OPEN SOURCE", () => this.openSelectedSource(), true);
    } else {
      this.drawArt(entry, 46, 84, 56);
      this.text(88, 56, pauseTextPages(entry.unlocked ? entry.displayName.toUpperCase() : "UNDISCOVERED", 24, 2)[0], PALETTE.goldStamp);
      this.text(88, 96, TAB_LABELS[this.categoryIndex], PALETTE.terminalCyan);
      this.text(20, 120, page.text, entry.unlocked ? PALETTE.creamPaper : PALETTE.stoneGray);
    }
    this.button(CODEX_PREVIOUS, "<", () => this.turnPage(-1));
    this.button(CODEX_NEXT, ">", () => this.turnPage(1));
  }

  private drawArt(entry: CodexEntryReadout, x: number, y: number, size: number) {
    if (!entry.unlocked || !entry.artKey || !this.textures.exists(entry.artKey)) {
      this.text(x, y - 4, entry.unlocked ? "NOTE" : "?", entry.unlocked ? PALETTE.goldStamp : PALETTE.stoneGray, true);
      return;
    }
    const art = entry.spriteSheet ? this.add.sprite(x, y, entry.artKey, 0) : this.add.image(x, y, entry.artKey);
    art.setOrigin(0.5).setScale(codexArtScale(art.width, art.height, size));
    art.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.content.add(art);
  }

  private currentEntries() { return getCodexEntries(CODEX_CATEGORIES[this.categoryIndex], gameState.documentCandidates); }
  private isHandbookSelected() { return this.currentEntries()[this.entryIndex]?.sourceUrl === ABOUT_SERIES_SOURCE.url; }

  private selectCategory(index: number) {
    this.categoryIndex = index;
    this.entryIndex = 0;
    this.pageIndex = 0;
    this.detailOpen = false;
    retroAudio.blip();
    this.render();
  }

  private openDetail() {
    this.detailOpen = true;
    this.pageIndex = 0;
    retroAudio.blip();
    this.render();
  }

  private turnPage(direction: -1 | 1) {
    const entries = this.currentEntries();
    if (this.detailOpen && entries[this.entryIndex]) {
      const count = codexDetailPages(entries[this.entryIndex]).length;
      this.pageIndex = (this.pageIndex + direction + count) % count;
    } else this.entryIndex = turnCodexList(this.entryIndex, entries.length, direction);
    retroAudio.blip();
    this.render();
  }

  private openSelectedSource() {
    const entry = this.currentEntries()[this.entryIndex];
    if (!entry?.unlocked || entry.sourceUrl !== ABOUT_SERIES_SOURCE.url) return;
    swallowNextInputFrame();
    window.open(entry.sourceUrl, "_blank", "noopener,noreferrer");
  }

  private close() {
    setLatestMessage("Field guide closed.");
    swallowNextInputFrame();
    syncCompletionStatsPlayTime();
    setCodexViewReadout(null);
    if (this.previousState) Object.assign(gameState, this.previousState);
    if (this.returnScene !== this.scene.key && this.scene.isPaused(this.returnScene)) this.scene.resume(this.returnScene);
    else if (this.returnScene !== this.scene.key && !this.scene.isActive(this.returnScene)) {
      this.scene.start(this.returnScene);
      return;
    }
    this.scene.stop();
  }
}
