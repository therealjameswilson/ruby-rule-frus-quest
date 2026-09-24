import { RENDER_DENSITY } from "./renderDensity";
import Phaser from "phaser";
import { ACCESSIBILITY_OVERLAYS, FRUS_VOLUMES } from "../assets/registry";
import { FRUS_ROOM_GRAPH, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { ProcessItemId } from "../game/constants";
import { DANNE_ITEM_CATALOG } from "../game/danneItemCatalog";
import type { DanneItemCatalogEntry, DanneItemId } from "../game/danneItemCatalog";
import {
  SNES_DUNGEON_STATUS_RELIC_ASSET, SNES_EQUITY_CRYSTAL_RELIC_ASSET,
  SNES_RESEARCH_PENDANT_RELIC_ASSET, SNES_WORKFLOW_TOOL_RELIC_ASSET
} from "../game/snesAtlas";
import type { GameMode } from "../game/types";
import { hiddenFirstEditionBonusLabel } from "../game/secretReadingRoom";
import {
  equipDanneItem, equipProcessItem, gameState, getAdventureSubscreenReadout,
  getDanneItemReadout, getProcessItemReadout, getRoomGraphReadout,
  getVolumeAssemblyReadout, setGameMode, setLatestMessage
} from "../game/state";
import type { AdventureSubscreenReadout } from "../game/state";
import { bindPointerPress, getInput, getPrimaryActionBadge, swallowNextInputFrame, updateInputCallbacks } from "../input/InputState";
import { retroAudio } from "./audio";
import { InventoryArtLoader } from "./inventoryArt";
import { isColorblindModeEnabled, toggleColorblindMode } from "./accessibilitySettings";
import { openCodex } from "./codexOverlay";
import { cycleLanguage, getLanguage, getString } from "./i18n";
import {
  layoutPauseRooms, movePauseTool, PAUSE_HEADER, PAUSE_NEXT, PAUSE_PAGES, PAUSE_PREVIOUS,
  pauseHitAt, pauseMapObjective, pauseTextPages, pauseToolHit, setPauseMenuReadout
} from "./pauseMenu";
import type { PauseDirection, PauseHit, PausePage } from "./pauseMenu";

function color(hex: string) { return Phaser.Display.Color.HexStringToColor(hex).color; }

function ensureItemThumbnail(scene: Phaser.Scene, asset: DanneItemCatalogEntry) {
  const key = `${asset.key}-thumb16`;
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists(asset.key)) return null;
  const source = scene.textures.get(asset.key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const texture = scene.textures.createCanvas(key, 16, 16);
  if (!texture) return null;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, 16, 16);
  texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

type ToolId = ProcessItemId | DanneItemId;
type WorkflowToolFrame = (typeof SNES_WORKFLOW_TOOL_RELIC_ASSET.frames)[number];
const TOOL_FRAMES: Record<ProcessItemId, WorkflowToolFrame> = {
  stapler: "citation_stamp",
  citation_stamp: "citation_stamp", red_pencil: "red_pencil", review_folder: "cross_reference_thread",
  clearance_token: "terminal", concurrence_slip: "concurrence_slip", proof_lens: "proof_pages", buckram_key: "frus_volume"
};
const TOOL_LABELS: Record<ToolId, string> = {
  stapler: "STAPLE",
  citation_stamp: "STAMP", red_pencil: "PENCIL", review_folder: "FOLDER", clearance_token: "CLEAR",
  concurrence_slip: "SLIP", proof_lens: "LENS", buckram_key: "KEY",
  "ruby-pen": "RUBY", "master-declass-key": "MASTER", "treaty-fragments": "TREATY"
};
type MenuTool = { id: ToolId; displayName: string; acquired: boolean; equipped: boolean };
type RecordCard = { title: string; text?: string; art?: "progress" | "shelf" };
type Control = PauseHit & { action: () => void };

/** A single focus model drives keyboard, gamepad and pointer interactions. */
export class InventoryOverlay {
  private readonly artLoader: InventoryArtLoader;
  private readonly container: Phaser.GameObjects.Container;
  private readonly content: Phaser.GameObjects.Container;
  private previousMode: GameMode | null = null;
  private page: PausePage = "tools";
  private focus: "header" | "content" = "content";
  private headerIndex = 0;
  private toolIndex = 0;
  private detailOpen = false;
  private areaIndex = 0;
  private mapExitIndex = 0;
  private recordIndex = 0;
  private settingsIndex = 0;
  private controls: Control[] = [];
  private lastPointerFrame = -1;
  private message = "";

  constructor(private readonly scene: Phaser.Scene) {
    this.artLoader = new InventoryArtLoader(scene, () => { if (this.active) this.render(); });
    const dim = scene.add.rectangle(128, 120, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black), 0.75).setScrollFactor(0);
    const panel = scene.add.rectangle(128, 124, 240, 224, color(PALETTE.black)).setScrollFactor(0);
    panel.setStrokeStyle(1, color(PALETTE.goldStamp));
    this.content = scene.add.container(0, 0).setScrollFactor(0);
    // Pause chrome must cover transient toasts, boss feedback and cutscene bars.
    this.container = scene.add.container(0, 0, [dim, panel, this.content])
      .setName("pause-menu").setDepth(2000).setVisible(false).setScrollFactor(0);
    // One capture surface: hidden pages cannot keep invisible hit targets alive.
    bindPointerPress(dim, { down: (pointer) => this.handlePointer(pointer.x / RENDER_DENSITY, pointer.y / RENDER_DENSITY) });
    updateInputCallbacks({ handlePauseTouch: (point) => this.handlePointer(point.x, point.y) });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onScenePointer, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.artLoader.destroy();
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onScenePointer, this);
      if (this.active) this.hide();
    });
  }

  get active() { return this.container.visible; }

  toggle() {
    if (this.active) { this.hide(); return; }
    this.previousMode = gameState.mode;
    setGameMode("pause");
    const tools = this.tools();
    this.toolIndex = Math.max(0, tools.findIndex((item) => item.equipped));
    this.areaIndex = Math.max(0, getAdventureSubscreenReadout().dungeons.findIndex((dungeon) => dungeon.active));
    this.focus = "content"; this.detailOpen = false; this.message = "";
    this.container.setVisible(true);
    this.artLoader.load();
    this.render();
  }

  hide() {
    if (!this.active) return;
    this.container.setVisible(false);
    if (this.previousMode) setGameMode(this.previousMode);
    this.previousMode = null;
    setPauseMenuReadout(null);
    swallowNextInputFrame();
  }

  back() {
    if (!this.active) return;
    if (!this.detailOpen) { this.hide(); return; }
    this.detailOpen = false;
    retroAudio.blip();
    this.render();
    swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    const direction: PauseDirection | null = input.navUpJustPressed ? "up" : input.navDownJustPressed ? "down"
      : input.navLeftJustPressed ? "left" : input.navRightJustPressed ? "right" : null;
    if (direction) { this.navigate(direction); retroAudio.blip(); this.render(); }
    if (input.aJustPressed || input.confirmJustPressed) {
      if (this.focus === "header") {
        if (this.headerIndex === 4) this.hide();
        else { this.focus = "content"; this.render(); }
      } else if (this.page === "tools") {
        if (this.detailOpen) { this.detailOpen = false; this.render(); }
        else this.activateTool();
      } else if (this.page === "settings") this.settingAction(this.settingsIndex);
      else if (this.page === "map" && !this.detailOpen) {
        if (!this.openMapRoutes()) { this.cycleContent(1); this.render(); }
      }
      else { this.cycleContent(1); this.render(); }
    }
  }

  private tools(): MenuTool[] { return [...getProcessItemReadout(), ...getDanneItemReadout()]; }

  private navigate(direction: PauseDirection) {
    this.message = "";
    if (this.focus === "header") {
      if (direction === "down") { this.focus = "content"; return; }
      if (direction === "left" || direction === "right") {
        this.headerIndex = (this.headerIndex + (direction === "left" ? 4 : 1)) % 5;
        if (this.headerIndex < 4) { this.page = PAUSE_PAGES[this.headerIndex]; this.detailOpen = false; }
      }
      return;
    }
    if (this.page === "tools" && !this.detailOpen) {
      const next = movePauseTool(this.toolIndex, this.tools().length, direction);
      if (next === "header") this.focusHeader(); else this.toolIndex = next;
    } else if (this.page === "settings") {
      if (direction === "up" && this.settingsIndex === 0) this.focusHeader();
      else if (direction === "up") this.settingsIndex--;
      else if (direction === "down") this.settingsIndex = Math.min(3, this.settingsIndex + 1);
    } else if (direction === "up") this.focusHeader();
    else if (direction === "left" || direction === "right") this.cycleContent(direction === "left" ? -1 : 1);
  }

  private focusHeader() { this.focus = "header"; this.headerIndex = PAUSE_PAGES.indexOf(this.page); }

  private cycleContent(delta: number) {
    const subscreen = getAdventureSubscreenReadout();
    if (this.page === "map") {
      if (this.detailOpen) {
        const count = this.mapRoutes(subscreen).length;
        this.mapExitIndex = count ? (this.mapExitIndex + delta + count) % count : 0;
      } else this.areaIndex = (this.areaIndex + delta + subscreen.dungeons.length) % subscreen.dungeons.length;
    }
    if (this.page === "record") {
      const count = this.records(subscreen).length;
      this.recordIndex = (this.recordIndex + delta + count) % count;
    }
  }

  private handlePointer(x: number, y: number) {
    if (!this.active) return false;
    const frame = this.scene.game.loop.frame;
    if (frame === this.lastPointerFrame) return true;
    this.lastPointerFrame = frame;
    const hit = pauseHitAt(this.controls, x, y);
    if (hit) this.controls.find((control) => control.id === hit.id)?.action();
    else if (x < 8 || x > 248 || y < 12 || y > 236) this.hide();
    return true;
  }

  private onScenePointer(pointer: Phaser.Input.Pointer) { this.handlePointer(pointer.x / RENDER_DENSITY, pointer.y / RENDER_DENSITY); }

  private text(x: number, y: number, value: string, tint: string = PALETTE.white, center = false, fontSize = 8) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: "monospace", fontSize: `${fontSize}px`, color: tint, lineSpacing: 3, align: center ? "center" : "left"
    }).setName("pause-text").setScrollFactor(0);
    if (center) text.setOrigin(0.5, 0);
    this.content.add(text);
    return text;
  }

  private box(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
    const box = this.scene.add.rectangle(x, y, width, height, color(fill)).setScrollFactor(0);
    if (stroke) box.setStrokeStyle(1, color(stroke));
    this.content.add(box);
    return box;
  }

  private art(x: number, y: number, key: string, frame?: string, alpha = 1) {
    if (!this.scene.textures.exists(key)) return null;
    if (frame && !this.scene.textures.get(key).has(frame)) return null;
    const image = this.scene.add.image(x, y, key, frame).setAlpha(alpha).setScrollFactor(0);
    image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.content.add(image);
    return image;
  }

  private control(hit: PauseHit, action: () => void) { this.controls.push({ ...hit, action }); }

  private render() {
    this.content.removeAll(true);
    this.controls = [];
    const subscreen = getAdventureSubscreenReadout();
    PAUSE_HEADER.forEach((hit, index) => {
      const selected = index === PAUSE_PAGES.indexOf(this.page);
      const focused = this.focus === "header" && this.headerIndex === index;
      this.box(hit.x, hit.y, 42, 20, selected ? PALETTE.deepRuby : PALETTE.black,
        focused ? PALETTE.white : selected ? PALETTE.goldStamp : PALETTE.stoneGray);
      this.text(hit.x, hit.y - 4, index === 4 ? "X" : getString(`pause.tabs.${hit.id}`),
        selected || focused ? PALETTE.goldStamp : PALETTE.white, true);
      this.control(hit, () => {
        if (index === 4) { this.hide(); return; }
        this.page = PAUSE_PAGES[index]; this.headerIndex = index; this.focus = "content";
        this.detailOpen = false; this.message = ""; retroAudio.blip(); this.render();
      });
    });
    if (this.page === "tools") this.renderTools();
    if (this.page === "map") this.renderMap(subscreen);
    if (this.page === "record") this.renderRecord(subscreen);
    if (this.page === "settings") this.renderSettings();
    setPauseMenuReadout({
      page: this.page, focus: this.focus, selectedTool: this.tools()[this.toolIndex]?.id ?? null,
      detailOpen: this.detailOpen, mapArea: subscreen.dungeons[this.areaIndex]?.areaId ?? null,
      recordPage: this.recordIndex + 1, recordPages: this.records(subscreen).length,
      controls: this.controls.map(({ id, x, y, width, height }) => ({ id, x, y, width, height }))
    });
  }

  private renderTools() {
    const tools = this.tools();
    const selected = tools[this.toolIndex];
    if (this.detailOpen && selected) { this.renderToolDetail(selected); return; }
    tools.forEach((tool, index) => {
      const hit = pauseToolHit(index);
      const focused = index === this.toolIndex && this.focus === "content";
      this.box(hit.x, hit.y, 44, 44, tool.equipped ? PALETTE.deepRuby : PALETTE.black,
        focused ? PALETTE.white : tool.equipped ? PALETTE.goldStamp : PALETTE.stoneGray);
      const asset = DANNE_ITEM_CATALOG.find((item) => item.id === tool.id);
      if (asset) {
        const key = ensureItemThumbnail(this.scene, asset);
        if (key) this.art(hit.x, hit.y - 5, key, undefined, tool.acquired ? 1 : 0.25);
        else this.text(hit.x, hit.y - 9, this.artLoader.status === "error" ? "?" : "...", PALETTE.stoneGray, true);
      } else {
        this.art(hit.x, hit.y - 5, tool.id === "stapler" ? "pack-stapler" : SNES_WORKFLOW_TOOL_RELIC_ASSET.key,
          tool.id === "stapler" ? undefined : TOOL_FRAMES[tool.id as ProcessItemId], tool.acquired ? 1 : 0.25);
      }
      if (tool.equipped) this.text(hit.x + 13, hit.y - 19, "*", PALETTE.goldStamp);
      if (isColorblindModeEnabled()) {
        const key: keyof typeof ACCESSIBILITY_OVERLAYS = tool.equipped ? "slot_equipped" : tool.acquired ? "slot_acquired" : "slot_locked";
        this.art(hit.x + 15, hit.y - 15, key);
      }
      this.text(hit.x, hit.y + 12, TOOL_LABELS[tool.id], tool.acquired ? PALETTE.goldStamp : PALETTE.stoneGray, true);
      this.control(hit, () => {
        this.focus = "content";
        if (this.toolIndex === index) this.activateTool();
        else { this.toolIndex = index; this.message = ""; retroAudio.blip(); this.render(); }
      });
    });
    if (selected) {
      this.text(128, 207, selected.displayName.toUpperCase(), PALETTE.goldStamp, true);
      const readyKey = DANNE_ITEM_CATALOG.some(item => item.id === selected.id) && selected.id !== "ruby-pen" ? "pause.inspect" : "pause.ready";
      const status = this.message || getString(selected.equipped ? "pause.equipped" : selected.acquired ? readyKey : "pause.missing", { action: getPrimaryActionBadge() });
      this.text(128, 219, status, PALETTE.white, true);
    }
  }

  private activateTool() {
    const tool = this.tools()[this.toolIndex];
    if (!tool) return;
    if (!tool.acquired) { this.message = getString("pause.missing"); retroAudio.warning(); this.render(); return; }
    if (DANNE_ITEM_CATALOG.some((asset) => asset.id === tool.id)) {
      if (tool.id === "ruby-pen") equipDanneItem(tool.id);
      this.detailOpen = true;
    } else {
      equipProcessItem(tool.id as ProcessItemId);
      this.message = getString("pause.equipped");
      setLatestMessage(`${tool.displayName} equipped.`);
    }
    retroAudio.confirm(); this.render();
  }

  private renderToolDetail(tool: MenuTool) {
    const item = getDanneItemReadout().find((entry) => entry.id === tool.id);
    if (!item) return;
    this.text(128, 63, item.displayName.toUpperCase(), PALETTE.goldStamp, true);
    const image = this.art(128, 112, item.key);
    if (image) image.setScale(Math.min(64 / image.width, 64 / image.height));
    else {
      this.text(128, 108, this.artLoader.status === "error" ? "RETRY ART" : "LOADING ART", PALETTE.stoneGray, true);
      if (this.artLoader.status === "error") this.control({ id: "retry-art", x: 128, y: 112, width: 100, height: 44 }, () => {
        this.artLoader.load(); this.render();
      });
    }
    const status = item.id === "treaty-fragments" ? `${item.count} / ${item.total}` : item.equipped ? getString("pause.equipped") : item.tier.toUpperCase();
    this.text(128, 151, status, PALETTE.terminalCyan, true);
    this.text(20, 164, pauseTextPages(item.description, 36, 3)[0]);
    this.box(128, 211, 64, 18, PALETTE.deepRuby, PALETTE.goldStamp);
    this.text(128, 207, getString("pause.back"), PALETTE.goldStamp, true);
    this.control({ id: "back", x: 128, y: 206, width: 80, height: 44 }, () => this.back());
  }

  private pager(title: string, count: string) {
    this.text(128, 61, pauseTextPages(title.toUpperCase(), 24, 2)[0], PALETTE.goldStamp, true);
    this.text(128, 90, count, PALETTE.stoneGray, true);
    for (const [hit, delta, label] of [[PAUSE_PREVIOUS, -1, "<"], [PAUSE_NEXT, 1, ">"]] as const) {
      this.box(hit.x, hit.y, 24, 24, PALETTE.deepRuby, PALETTE.goldStamp);
      this.text(hit.x, hit.y - 4, label, PALETTE.goldStamp, true);
      this.control(hit, () => { this.focus = "content"; this.cycleContent(delta); retroAudio.blip(); this.render(); });
    }
  }

  private renderMap(subscreen: AdventureSubscreenReadout) {
    const dungeon = subscreen.dungeons[this.areaIndex];
    if (!dungeon) return;
    if (this.detailOpen) { this.renderMapRoute(subscreen); return; }
    const currentRoom = subscreen.roomMap.rooms.find((room) => room.id === subscreen.roomMap.currentRoomId);
    const where = dungeon.active && currentRoom ? ` ${currentRoom.title.toUpperCase()}` : "";
    const location = `${this.areaIndex + 1}/${subscreen.dungeons.length}${where}`;
    this.pager(dungeon.displayName, location.length > 22 ? `${location.slice(0, 19)}...` : location);
    if (dungeon.active && currentRoom) {
      this.text(192, 90, ">", PALETTE.goldStamp);
      this.control({ id: "routes", x: 128, y: 90, width: 140, height: 44 }, () => this.openMapRoutes());
    }
    const rooms = getRoomGraphReadout().filter((room) => room.area === dungeon.areaId && room.revealed);
    const grids = layoutPauseRooms(rooms.map((room) => ({ ...room, grid: FRUS_ROOM_GRAPH.find((definition) => definition.id === room.id)!.grid })));
    const graphics = this.scene.add.graphics().setScrollFactor(0);
    this.content.add(graphics);
    const edges = new Map<string, { from: (typeof grids)[number]; to: (typeof grids)[number]; locked: boolean }>();
    for (const room of grids) {
      for (const [direction, id] of Object.entries(room.exits)) {
        const target = grids.find((candidate) => candidate.id === id);
        if (!target) continue;
        const gate = room.lockedExitState[direction];
        const key = [room.id, target.id].sort().join(":");
        edges.set(key, { from: room, to: target, locked: Boolean(gate && !gate.canOpen) || Boolean(edges.get(key)?.locked) });
      }
    }
    for (const { from, to, locked } of edges.values()) {
      graphics.lineStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.stoneGray));
      graphics.lineBetween(from.x, from.y, to.x, to.y);
      if (locked) this.text(Math.round((from.x + to.x) / 2), Math.round((from.y + to.y) / 2) - 3, "X", PALETTE.classNetRed, true, 6);
    }
    for (const room of grids) {
      const current = room.id === subscreen.roomMap.currentRoomId;
      const fill = current ? PALETTE.goldStamp : room.visited ? PALETTE.terminalCyan : PALETTE.black;
      this.box(room.x, room.y, room.width, room.height, fill, current ? PALETTE.white : PALETTE.stoneGray);
      this.text(room.x, room.y - 3, current ? "@" : room.roomType === "boss" ? "!" : room.id,
        room.visited || current ? PALETTE.black : PALETTE.white, true, 6);
    }
    const states = [
      { frame: "small_key", label: `${getString("pause.keys")} ${dungeon.smallKeys}/${dungeon.smallKeysRequired}`, held: dungeon.smallKeys > 0 },
      { frame: "big_key", label: `${getString("pause.big")} ${dungeon.bigKeyHeld ? "+" : "-"}`, held: dungeon.bigKeyHeld },
      { frame: "map", label: `${getString("pause.map")} ${dungeon.mapRevealed ? "+" : "-"}`, held: dungeon.mapRevealed },
      { frame: "boss", label: `${getString("pause.review")} ${dungeon.bossDefeated ? "+" : "-"}`, held: dungeon.bossDefeated }
    ];
    states.forEach((state, index) => {
      const x = 22 + index % 2 * 116, y = 187 + Math.floor(index / 2) * 17;
      this.art(x, y, SNES_DUNGEON_STATUS_RELIC_ASSET.key, state.frame, state.held ? 1 : 0.4);
      this.text(x + 10, y - 4, state.label, state.held ? PALETTE.goldStamp : PALETTE.white);
    });
    const objective = dungeon.active ? pauseMapObjective(gameState.objective) : "";
    this.text(128, objective ? 214 : 220, objective || getString("pause.mapLegend"),
      objective ? PALETTE.terminalCyan : PALETTE.stoneGray, true);
  }

  private mapRoutes(subscreen: AdventureSubscreenReadout) {
    if (!subscreen.dungeons[this.areaIndex]?.active) return [];
    const rooms = getRoomGraphReadout();
    const current = rooms.find(room => room.id === subscreen.roomMap.currentRoomId);
    if (!current) return [];
    return Object.entries(current.exits).flatMap(([direction, id]) => {
      const target = rooms.find(room => room.id === id);
      // A route inspector must not expose undiscovered secret rooms.
      if (!target?.revealed) return [];
      return [{ direction, target, gate: current.lockedExitState[direction] }];
    });
  }

  private openMapRoutes() {
    if (!this.mapRoutes(getAdventureSubscreenReadout()).length) return false;
    this.mapExitIndex = 0;
    this.detailOpen = true;
    this.focus = "content";
    retroAudio.blip();
    this.render();
    return true;
  }

  private renderMapRoute(subscreen: AdventureSubscreenReadout) {
    const routes = this.mapRoutes(subscreen);
    this.mapExitIndex = Math.min(this.mapExitIndex, Math.max(0, routes.length - 1));
    const route = routes[this.mapExitIndex];
    const current = subscreen.roomMap.rooms.find(room => room.id === subscreen.roomMap.currentRoomId);
    this.pager(current?.title ?? "Routes", `${this.mapExitIndex + 1}/${routes.length}`);
    if (route) {
      this.text(128, 109, pauseTextPages(`${route.direction.toUpperCase()}: ${route.target.title.toUpperCase()}`, 32, 2)[0], PALETTE.goldStamp, true);
      const locked = route.gate && !route.gate.canOpen;
      this.text(128, 141, locked ? "LOCKED" : "OPEN", locked ? PALETTE.classNetRed : PALETTE.terminalCyan, true);
      this.text(20, 156, pauseTextPages(locked ? route.gate.blockedMessage ?? route.gate.label : "The route is open.", 36, 4)[0]);
    }
    this.box(128, 211, 64, 18, PALETTE.deepRuby, PALETTE.goldStamp);
    this.text(128, 207, getString("pause.back"), PALETTE.goldStamp, true);
    this.control({ id: "back", x: 128, y: 211, width: 80, height: 44 }, () => this.back());
  }

  private records(subscreen: AdventureSubscreenReadout): RecordCard[] {
    const records: RecordCard[] = [];
    const add = (title: string, text: string) => {
      for (const page of pauseTextPages(text)) records.push({ title, text: page });
    };
    add(getString("pause.next"), gameState.objective);
    records.push({ title: getString("pause.progress"), art: "progress" });
    const next = subscreen.productionBoard.nextStep;
    if (next) {
      add(getString("pause.task"), `${next.label}\n\n${next.gameplayTask}`);
      add(getString("pause.source"), `${next.sourceBasis}\n\n${next.sourceUrl}`);
    }
    for (const phase of subscreen.productionBoard.phases) {
      add(phase.label, `${phase.status.toUpperCase()}\n${phase.completed} / ${phase.total}\n\n${phase.nextStep?.label ?? getString("pause.done")}`);
    }
    for (const document of subscreen.crystals.byDocument) {
      add(getString("pause.crystals"), `${document.title}\n\n${document.earned} / ${document.total}`);
    }
    const assembly = getVolumeAssemblyReadout();
    add(getString("pause.binding"), assembly.pieces.map((piece) => `${piece.earned ? "[+]" : "[ ]"} ${piece.label}`).join("\n"));
    add(getString("pause.discoveries"), hiddenFirstEditionBonusLabel(gameState));
    records.push({ title: getString("pause.shelf"), art: "shelf" });
    return records;
  }

  private renderRecord(subscreen: AdventureSubscreenReadout) {
    const cards = this.records(subscreen);
    this.recordIndex = Math.min(this.recordIndex, cards.length - 1);
    const card = cards[this.recordIndex];
    this.pager(card.title, `${this.recordIndex + 1} / ${cards.length}`);
    if (card.text) this.text(20, 110, card.text);
    if (card.art === "progress") {
      this.text(20, 107, `${getString("pause.hearts")} ${subscreen.reliabilityHearts.current}/100`);
      for (let index = 0; index < 10; index++) {
        const full = index < subscreen.reliabilityHearts.filled;
        const key: keyof typeof ACCESSIBILITY_OVERLAYS = full ? "hp_cell_full" : "hp_cell_empty";
        if (isColorblindModeEnabled() && this.art(26 + index * 22, 127, key)) continue;
        const heart = this.scene.add.graphics().setScrollFactor(0);
        this.content.add(heart);
        heart.fillStyle(color(full ? PALETTE.classNetRed : PALETTE.stoneDark));
        const x = 22 + index * 22, y = 123;
        heart.fillRect(x + 1, y, 2, 1); heart.fillRect(x + 4, y, 2, 1);
        heart.fillRect(x, y + 1, 7, 3); heart.fillRect(x + 1, y + 4, 5, 1);
        heart.fillRect(x + 2, y + 5, 3, 1); heart.fillRect(x + 3, y + 6, 1, 1);
        if (full) { heart.fillStyle(color(PALETTE.goldStamp)); heart.fillRect(x + 1, y + 1, 1, 1); }
      }
      subscreen.pendants.forEach((pendant, index) => {
        const x = 50 + index * 78;
        this.art(x, 146, SNES_RESEARCH_PENDANT_RELIC_ASSET.key, pendant.id, pendant.acquired ? 1 : 0.3);
        this.text(x, 157, getString(`pause.pendants.${pendant.id}`), pendant.acquired ? PALETTE.goldStamp : PALETTE.stoneGray, true);
        this.text(x, 166, pendant.acquired ? "+" : "-", PALETTE.white, true);
      });
      this.art(27, 181, SNES_EQUITY_CRYSTAL_RELIC_ASSET.key, "defense");
      this.text(40, 177, `${getString("pause.crystals")} ${subscreen.crystals.earned}/${subscreen.crystals.total}`);
      const assembly = getVolumeAssemblyReadout();
      this.text(20, 195, `${getString("pause.binding")} ${assembly.earnedCount}/${assembly.total}`);
      this.text(20, 213, `${getString("pause.board")} ${subscreen.productionBoard.completed}/${subscreen.productionBoard.total}`);
    }
    if (card.art === "shelf") {
      if (this.artLoader.status !== "ready") {
        this.text(128, 143, this.artLoader.status === "error" ? "ART UNAVAILABLE" : "LOADING SHELF", PALETTE.goldStamp, true);
        return;
      }
      const key: keyof typeof FRUS_VOLUMES = "ui_row_six";
      const image = this.art(128, 143, key);
      if (image) image.setCrop(105, 470, 1500, 410).setScale(0.125);
      const published = gameState.inventory.includes("Published FRUS Cover");
      const count = Math.min(6, gameState.volumeFragments.length + (published ? 1 : 0));
      for (let index = 0; index < 6; index++) {
        this.box(38 + index * 36, 188, 22, 10, index < count ? PALETTE.goldStamp : PALETTE.black, PALETTE.stoneGray);
      }
      this.text(128, 207, getString("pause.frusShelf", { count, total: 6 }), PALETTE.goldStamp, true);
    }
  }

  private renderSettings() {
    const labels = [
      `${getString("pause.contrast")} [${isColorblindModeEnabled() ? "+" : " "}]`,
      getString("language.label", { language: getLanguage().toUpperCase() }),
      `${getString("pause.sound")} [${retroAudio.isEnabled ? "+" : " "}]`,
      getString("pause.codex")
    ];
    labels.forEach((label, index) => {
      const hit = { id: `setting-${index}`, x: 128, y: 78 + index * 44, width: 224, height: 44 };
      const selected = this.focus === "content" && this.settingsIndex === index;
      this.box(hit.x, hit.y, 216, 30, selected ? PALETTE.deepRuby : PALETTE.black, selected ? PALETTE.goldStamp : PALETTE.stoneGray);
      this.text(128, hit.y - 4, label, selected ? PALETTE.goldStamp : PALETTE.white, true);
      this.control(hit, () => { this.focus = "content"; this.settingsIndex = index; this.settingAction(index); });
    });
  }

  private settingAction(index: number) {
    if (index === 0) toggleColorblindMode();
    if (index === 1) cycleLanguage();
    if (index === 2) retroAudio.toggle();
    if (index === 3) { this.hide(); openCodex(this.scene); return; }
    retroAudio.confirm(); this.render();
  }
}
