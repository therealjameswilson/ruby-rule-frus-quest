import Phaser from "phaser";
import {
  ART_PACK_EXTRAS,
  ART_PACK_SHEETS,
  HUMANOID_SCALE,
  frameIndex,
  itemIconFrame,
  npcPackSheetKey
} from "../game/artPack";
import { PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import {
  localToCanvas,
  oppositeDirection,
  spawnFor,
  WORLD_HUD_HEIGHT
} from "../game/world";
import type {
  SpawnPointKey,
  WorldNpcDefinition,
  WorldObjectDefinition,
  WorldScreenDefinition,
  WorldScreensDefinition
} from "../game/world";
import { TileRegistry } from "./TileRegistry";
import type { TileDefinition } from "./TileRegistry";
import { drawPackScreenTilemap } from "./packTilemaps";

export interface LoadedScreen {
  screen: WorldScreenDefinition;
  solids: Phaser.Geom.Rectangle[];
  objects: Array<WorldObjectDefinition & { screenX: number; screenY: number }>;
  npcs: Array<WorldNpcDefinition & { screenX: number; screenY: number }>;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class ScreenManager {
  readonly visitedScreenIds = new Set<string>();
  private readonly scene: Phaser.Scene;
  private readonly world: WorldScreensDefinition;
  private readonly terrainLayer: Phaser.GameObjects.Container;
  private readonly objectLayer: Phaser.GameObjects.Container;
  private readonly collisionLayer: Phaser.GameObjects.Container;
  private readonly npcLayer: Phaser.GameObjects.Container;
  private readonly previewLayer: Phaser.GameObjects.Container;
  private readonly tileRegistry: TileRegistry;
  private current: LoadedScreen | null = null;

  constructor(scene: Phaser.Scene, world: WorldScreensDefinition) {
    this.scene = scene;
    this.world = world;
    this.tileRegistry = new TileRegistry(scene);
    this.terrainLayer = scene.add.container(0, 0).setDepth(-50);
    this.objectLayer = scene.add.container(0, 0).setDepth(20);
    this.collisionLayer = scene.add.container(0, 0).setDepth(-5);
    this.npcLayer = scene.add.container(0, 0).setDepth(30);
    this.previewLayer = scene.add.container(0, 0).setDepth(-40);
  }

  loadInitial() {
    return this.loadScreen(this.world.startScreenId);
  }

  loadScreenAt(gridX: number, gridY: number) {
    const screen = this.world.screens.find((candidate) => candidate.gridX === gridX && candidate.gridY === gridY);
    return screen ? this.loadScreen(screen.id) : null;
  }

  loadScreen(screenId: string) {
    const screen = this.world.screens.find((candidate) => candidate.id === screenId) ?? this.world.screens[0];
    this.clearLayers();
    this.clearPreview();
    const solids: Phaser.Geom.Rectangle[] = [];
    this.drawScreenLabel(screen, this.objectLayer);
    const usingPackTilemap = drawPackScreenTilemap(this.scene, this.world, screen, this.terrainLayer);
    screen.tileLayout.forEach((row, rowIndex) => {
      [...row].forEach((_tile, columnIndex) => {
        const tileDefinition = this.tileRegistry.resolveTile(screen.tileLayout, columnIndex, rowIndex);
        const x = columnIndex * this.world.tileSize + this.world.tileSize / 2;
        const y = WORLD_HUD_HEIGHT + rowIndex * this.world.tileSize + this.world.tileSize / 2;
        if (!usingPackTilemap) this.drawTile(tileDefinition, x, y, this.terrainLayer);
        if (!tileDefinition.walkable) {
          const rect = new Phaser.Geom.Rectangle(
            columnIndex * this.world.tileSize,
            WORLD_HUD_HEIGHT + rowIndex * this.world.tileSize,
            this.world.tileSize,
            this.world.tileSize
          );
          solids.push(rect);
          this.collisionLayer.add(this.scene.add.rectangle(rect.centerX, rect.centerY, rect.width, rect.height, color(PALETTE.black), 0));
        }
      });
    });
    const objects = screen.interactables.map((object) => {
      const position = localToCanvas(object);
      this.drawObject(object, position, this.objectLayer);
      if (object.kind !== "door" && object.solid !== false) this.addSolid(solids, position.x, position.y, 14, 14);
      return { ...object, screenX: position.x, screenY: position.y };
    });
    const npcs = screen.npcs.map((npc) => {
      const position = localToCanvas(npc);
      this.drawNpc(npc, position, this.npcLayer);
      this.addSolid(solids, position.x, position.y, 14, 14);
      return { ...npc, screenX: position.x, screenY: position.y };
    });
    this.visitedScreenIds.add(screen.id);
    this.current = { screen, solids, objects, npcs };
    return this.current;
  }

  get currentScreen() {
    return this.current?.screen ?? this.world.screens[0];
  }

  get currentLoadedScreen() {
    return this.current;
  }

  restoreVisited(screenIds: string[]) {
    for (const screenId of screenIds) {
      if (this.getScreen(screenId)) this.visitedScreenIds.add(screenId);
    }
  }

  getScreen(screenId: string) {
    return this.world.screens.find((screen) => screen.id === screenId) ?? null;
  }

  getScreenAt(gridX: number, gridY: number) {
    return this.world.screens.find((screen) => screen.gridX === gridX && screen.gridY === gridY) ?? null;
  }

  getNextScreen(direction: Direction) {
    const nextId = this.currentScreen.exits[direction];
    return nextId ? this.getScreen(nextId) : null;
  }

  renderPreview(screenId: string, direction: Direction) {
    const screen = this.getScreen(screenId);
    if (!screen) return;
    this.clearPreview();
    const offset = this.previewOffset(direction);
    this.drawScreenLabel(screen, this.previewLayer, offset);
    const usingPackTilemap = drawPackScreenTilemap(this.scene, this.world, screen, this.previewLayer, offset);
    screen.tileLayout.forEach((row, rowIndex) => {
      [...row].forEach((_tile, columnIndex) => {
        const tileDefinition = this.tileRegistry.resolveTile(screen.tileLayout, columnIndex, rowIndex);
        const x = offset.x + columnIndex * this.world.tileSize + this.world.tileSize / 2;
        const y = offset.y + WORLD_HUD_HEIGHT + rowIndex * this.world.tileSize + this.world.tileSize / 2;
        if (!usingPackTilemap) this.drawTile(tileDefinition, x, y, this.previewLayer);
      });
    });
    for (const object of screen.interactables) {
      const position = localToCanvas(object);
      this.drawObject(object, { x: position.x + offset.x, y: position.y + offset.y }, this.previewLayer);
    }
    for (const npc of screen.npcs) {
      const position = localToCanvas(npc);
      this.drawNpc(npc, { x: position.x + offset.x, y: position.y + offset.y }, this.previewLayer);
    }
  }

  clearPreview() {
    this.previewLayer.removeAll(true);
  }

  canEnter(screen: WorldScreenDefinition, questFlags: Record<string, boolean>) {
    const missingFlags = (screen.requiredFlags ?? []).filter((flag) => !questFlags[flag]);
    return {
      allowed: missingFlags.length === 0,
      missingFlags
    };
  }

  canExit(screen: WorldScreenDefinition, direction: Direction, questFlags: Record<string, boolean>) {
    const missingFlags = (screen.exitRequirements?.[direction] ?? []).filter((flag) => !questFlags[flag]);
    return {
      allowed: missingFlags.length === 0,
      missingFlags
    };
  }

  spawnForTransition(screen: WorldScreenDefinition, direction: Direction) {
    return spawnFor(screen, oppositeDirection(direction));
  }

  spawnFor(screen: WorldScreenDefinition, spawn: SpawnPointKey) {
    return spawnFor(screen, spawn);
  }

  screenGridReadout() {
    return this.world.screens.map((screen) => ({
      id: screen.id,
      regionName: screen.regionName,
      gridX: screen.gridX,
      gridY: screen.gridY,
      exits: { ...screen.exits },
      exitRequirements: { ...(screen.exitRequirements ?? {}) },
      requiredFlags: [...(screen.requiredFlags ?? [])],
      visited: this.visitedScreenIds.has(screen.id)
    }));
  }

  tileRegistryReadout() {
    return this.tileRegistry.readout();
  }

  private clearLayers() {
    this.terrainLayer.removeAll(true);
    this.objectLayer.removeAll(true);
    this.collisionLayer.removeAll(true);
    this.npcLayer.removeAll(true);
  }

  private previewOffset(direction: Direction) {
    if (direction === "east") return { x: this.world.tileSize * this.world.screenWidthTiles, y: 0 };
    if (direction === "west") return { x: -this.world.tileSize * this.world.screenWidthTiles, y: 0 };
    if (direction === "south") return { x: 0, y: this.world.tileSize * this.world.screenHeightTiles };
    return { x: 0, y: -this.world.tileSize * this.world.screenHeightTiles };
  }

  private drawScreenLabel(screen: WorldScreenDefinition, layer: Phaser.GameObjects.Container, offset = { x: 0, y: 0 }) {
    const plate = this.scene.add.rectangle(128 + offset.x, WORLD_HUD_HEIGHT + 11 + offset.y, 128, 11, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp));
    const text = this.scene.add.text(128 + offset.x, WORLD_HUD_HEIGHT + 7 + offset.y, screen.regionName.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    layer.add([plate, text]);
  }

  private drawTile(tile: TileDefinition, x: number, y: number, layer: Phaser.GameObjects.Container) {
    layer.add(this.scene.add.image(x, y, tile.textureKey).setOrigin(0.5));
  }

  private addSolid(solids: Phaser.Geom.Rectangle[], x: number, y: number, width: number, height: number) {
    const rect = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    solids.push(rect);
    this.collisionLayer.add(this.scene.add.rectangle(rect.centerX, rect.centerY, rect.width, rect.height, color(PALETTE.black), 0));
  }

  private drawObject(object: WorldObjectDefinition, position: { x: number; y: number }, layer: Phaser.GameObjects.Container) {
    const container = this.scene.add.container(position.x, position.y).setDepth(position.y);
    const shadow = this.scene.add.ellipse(0, 11, 18, 5, color(PALETTE.black));
    const packFrame = itemIconFrame(object.texture ?? object.id);
    const sprite = packFrame >= 0 && this.scene.textures.exists(ART_PACK_EXTRAS.items_collectibles.textureKey)
      ? this.scene.add.image(0, -2, ART_PACK_EXTRAS.items_collectibles.textureKey, packFrame).setScale(0.09)
      : object.texture && this.scene.textures.exists(object.texture)
        ? this.scene.add.image(0, 0, object.texture)
        : this.scene.add.rectangle(0, 0, 16, 16, color(PALETTE.goldStamp));
    const label = this.scene.add.text(0, 16, object.label.slice(0, 11).toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5, 0);
    container.add([shadow, sprite, label]);
    layer.add(container);
  }

  private drawNpc(npc: WorldNpcDefinition, position: { x: number; y: number }, layer: Phaser.GameObjects.Container) {
    const container = this.scene.add.container(position.x, position.y).setDepth(position.y);
    const shadow = this.scene.add.ellipse(0, 14, 18, 6, color(PALETTE.black));
    const packSheetKey = npcPackSheetKey(npc.role, npc.spriteKey ?? npc.texture ?? npc.id);
    const sprite = packSheetKey && this.scene.textures.exists(ART_PACK_SHEETS[packSheetKey].textureKey)
      ? this.scene.add
        .image(
          0,
          0,
          ART_PACK_SHEETS[packSheetKey].textureKey,
          frameIndex(packSheetKey, packSheetKey === "sprite_statechat_terminal" ? "idle-0" : "idle-down")
        )
        .setScale(HUMANOID_SCALE)
        .setOrigin(0.5, 0.84)
      : npc.texture && this.scene.textures.exists(npc.texture)
        ? this.scene.add.image(0, 0, npc.texture)
        : this.scene.add.image(0, 0, "sam");
    container.add([shadow, sprite]);
    layer.add(container);
  }
}
