import Phaser from "phaser";
import { GAMEPLAY_MAPS, gameplayTiledCacheKey, type GameplayMapKey, type OverworldRegionKey } from "../assets/registry";
import { getDistrictById } from "../data/regions";
import { Player } from "../entities/Player";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { browseFrusBookshelf } from "../game/frusBookshelf";
import { logNaraCatalog } from "../game/naraCatalog";
import { logFieldCableCollection } from "../game/recordCollection";
import { checkRedZoneGate } from "../game/redZoneGate";
import { checkWestWingNscGate } from "../game/westWingNsc";
import {
  addDocumentPoints,
  addInventoryItem,
  addVolumeFragment,
  clearDialogState,
  gameState,
  hasProcessItem,
  setDialogState,
  setDocumentWorkflowState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { InteractionAssist, nearestInteractable } from "../systems/interaction";
import { InteractionPrompt, promptVerbForKind } from "../systems/interactionPrompt";
import { snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type GameplayMapSceneData = {
  mapKey?: GameplayMapKey;
  sourceRegion?: OverworldRegionKey;
  districtId?: string;
  districtName?: string;
  spawnId?: string;
};

type TiledProperty = { name: string; type?: string; value: unknown };
type TiledObject = {
  id: number;
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  visible?: boolean;
  properties?: TiledProperty[];
};
type TiledObjectLayer = {
  id: number;
  name: string;
  type: "objectgroup";
  objects: TiledObject[];
};
type TiledMapData = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledObjectLayer[];
};

type FitRect = { x: number; y: number; width: number; height: number; scale: number; sourceWidth: number; sourceHeight: number };
type DoorTarget = { scene: string; mapKey?: GameplayMapKey; spawnId?: string; requiredFlag?: string; lockedMessage?: string };
type SceneDoor = Interactable & { target: DoorTarget; marker: Phaser.GameObjects.GameObject[] };
type TriggerZone = {
  id: string;
  label: string;
  action: string;
  text: string;
  rect: Phaser.Geom.Rectangle;
  fired: boolean;
};

const TOP_SAFE_BAND = 24;
const BOTTOM_SAFE_BAND = 36;

const MAP_LABELS: Record<GameplayMapKey, string> = {
  historian_office: "Office of the Historian",
  nara_stacks: "NARA II Stacks",
  foggy_bottom: "Foggy Bottom Street",
  west_wing: "White House West Wing",
  black_vault: "Black Vault Lair",
  frus_floor: "FRUS Production Floor",
  embassy: "Embassy Compound",
  capitol_hill: "Capitol Hill Hearing"
};

const MAP_OBJECTIVES: Record<GameplayMapKey, string> = {
  historian_office: "Visit the Historian-in-Chief or inspect the FRUS bookshelf.",
  nara_stacks: "Check the catalog desk and note the gated Red Zone.",
  foggy_bottom: "Stay on the sidewalks and enter the Truman Building.",
  west_wing: "Find the Situation Room gate and review room entrances.",
  black_vault: "Approach the obelisk core when the record is ready.",
  frus_floor: "Walk through each FRUS production phase room.",
  embassy: "Enter from the south gate and inspect the chancery door.",
  capitol_hill: "Use the witness table or inspect the closed-session vault."
};

function typedMapKey(value: string | undefined): GameplayMapKey | null {
  return value && value in GAMEPLAY_MAPS ? value as GameplayMapKey : null;
}

function prop(object: TiledObject, name: string) {
  return object.properties?.find((item) => item.name === name)?.value;
}

function propString(object: TiledObject, name: string, fallback = "") {
  const value = prop(object, name);
  return typeof value === "string" ? value : fallback;
}

function isCollisionDebugEnabled() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "collision";
}

export class GameplayMapScene extends Phaser.Scene {
  private mapKey: GameplayMapKey = "historian_office";
  private sourceRegion: OverworldRegionKey = "europe";
  private districtName = "World Map";
  private spawnId = "entry";
  private player!: Player;
  private prompt!: InteractionPrompt;
  private hintText!: Phaser.GameObjects.Text;
  private dialogSpeakerText!: Phaser.GameObjects.Text;
  private dialogBodyText!: Phaser.GameObjects.Text;
  private dialogPages: string[] = [];
  private dialogSpeaker = "";
  private dialogIndex = 0;
  private fitRect!: FitRect;
  private solids: Phaser.Geom.Rectangle[] = [];
  private interactables: Interactable[] = [];
  private readonly interactionAssist = new InteractionAssist();
  private doors: SceneDoor[] = [];
  private triggerZones: TriggerZone[] = [];
  private tileData!: TiledMapData;

  constructor() {
    super("GameplayMapScene");
  }

  init(data: GameplayMapSceneData) {
    const params = new URLSearchParams(window.location.search);
    const queryMap = typedMapKey(params.get("map") ?? undefined);
    const requestedMap = data.mapKey ?? queryMap;
    this.mapKey = requestedMap ?? "historian_office";
    this.sourceRegion = data.sourceRegion ?? "europe";
    const district = data.districtId ? getDistrictById(data.districtId) : null;
    this.districtName = data.districtName ?? district?.displayName ?? MAP_LABELS[this.mapKey];
    this.spawnId = data.spawnId ?? params.get("spawn") ?? "entry";
  }

  create() {
    this.tileData = this.readTileData();
    setSceneState("GameplayMapScene", "explore", MAP_OBJECTIVES[this.mapKey]);
    setVisibleThreats([]);
    setLatestMessage(`${MAP_LABELS[this.mapKey]} loaded from object layers.`);
    retroAudio.startMusic(this.mapKey === "black_vault" ? "BlackVaultLairScene" : "TitleScene");
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.fitRect = this.computeMapFit();
    this.drawMap();
    this.createObjectsFromTileData();
    if (isCollisionDebugEnabled()) this.drawCollisionDebug();
    this.createHudChrome();
    this.prompt = new InteractionPrompt(this, 880);
    const spawn = this.findSpawn(this.spawnId) ?? this.findSpawn("entry") ?? { x: this.fitRect.x + this.fitRect.width / 2, y: this.fitRect.y + this.fitRect.height - 20 };
    this.player = new Player(this, spawn.x, spawn.y);
    setVisibleEntities([
      MAP_LABELS[this.mapKey],
      `District: ${this.districtName}`,
      ...this.interactables.map((item) => item.label)
    ]);
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (this.dialogPages.length > 0) {
      if (input.aJustPressed) this.advanceMapDialog();
      if (input.bJustPressed || input.pauseJustPressed) this.clearMapDialog();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
    if (input.pauseJustPressed) {
      this.returnToWorldMap();
      return;
    }

    this.player.update(delta, true, {
      bounds: {
        left: this.fitRect.x + 8,
        right: this.fitRect.x + this.fitRect.width - 8,
        top: this.fitRect.y + 12,
        bottom: this.fitRect.y + this.fitRect.height - 8
      },
      solids: this.solids
    });
    this.handleTriggers();
    const nearest = nearestInteractable(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.prompt.update(delta, nearest, {
      left: this.fitRect.x + 30,
      right: this.fitRect.x + this.fitRect.width - 30,
      top: TOP_SAFE_BAND + 14
    });
    this.hintText.setText(nearest ? `A ${promptVerbForKind(nearest.kind)} ${nearest.label.toUpperCase()}` : "A INTERACT  ESC WORLD MAP");
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) {
      bufferedInteraction.onInteract();
      if (this.dialogPages.length > 0) return;
    }
    setObjective(MAP_OBJECTIVES[this.mapKey]);
  }

  private readTileData(): TiledMapData {
    const cached = this.cache.json.get(gameplayTiledCacheKey(this.mapKey)) as TiledMapData | undefined;
    if (cached?.layers?.length) return cached;
    const texture = this.textures.get(this.mapKey).getSourceImage() as { width?: number; height?: number };
    return { width: texture.width ?? 1536, height: texture.height ?? 1024, tilewidth: 1, tileheight: 1, layers: [] };
  }

  private layer(name: string) {
    return this.tileData.layers.find((item) => item.name === name);
  }

  private computeMapFit(): FitRect {
    const texture = this.textures.get(this.mapKey).getSourceImage() as { width?: number; height?: number };
    const sourceWidth = texture.width ?? this.tileData.width * this.tileData.tilewidth;
    const sourceHeight = texture.height ?? this.tileData.height * this.tileData.tileheight;
    const maxHeight = GAME_HEIGHT - TOP_SAFE_BAND - BOTTOM_SAFE_BAND;
    const scale = Math.min(GAME_WIDTH / sourceWidth, maxHeight / sourceHeight);
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);
    return {
      x: Math.round((GAME_WIDTH - width) / 2),
      y: TOP_SAFE_BAND + Math.round((maxHeight - height) / 2),
      width,
      height,
      scale,
      sourceWidth,
      sourceHeight
    };
  }

  private drawMap() {
    this.add.image(this.fitRect.x, this.fitRect.y, this.mapKey)
      .setOrigin(0, 0)
      .setScale(this.fitRect.scale)
      .setDepth(-20);
  }

  private createHudChrome() {
    this.add.rectangle(GAME_WIDTH / 2, TOP_SAFE_BAND / 2, GAME_WIDTH, TOP_SAFE_BAND, color(PALETTE.black), 0.96).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, TOP_SAFE_BAND, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    this.add.text(GAME_WIDTH / 2, 7, MAP_LABELS[this.mapKey].toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0).setDepth(902);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOTTOM_SAFE_BAND / 2, GAME_WIDTH, BOTTOM_SAFE_BAND, color(PALETTE.black), 0.96).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOTTOM_SAFE_BAND, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 29, "A INTERACT  ESC WORLD MAP", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(902);
    this.dialogSpeakerText = this.add.text(8, GAME_HEIGHT - 34, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setDepth(903);
    this.dialogBodyText = this.add.text(8, GAME_HEIGHT - 22, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      wordWrap: { width: GAME_WIDTH - 16, useAdvancedWrap: true }
    }).setDepth(903);
  }

  private createObjectsFromTileData() {
    const collisionObjects = this.layer("collisions")?.objects ?? [];
    this.solids = collisionObjects
      .filter((object) => object.visible !== false)
      .map((object) => this.rectFromSourceObject(object));

    const doorObjects = this.layer("doors")?.objects ?? [];
    this.doors = doorObjects.map((object) => this.createDoor(object));
    const interactionObjects = [
      ...(this.layer("interactions")?.objects ?? []),
      ...(this.layer("npcs")?.objects ?? [])
    ];
    this.interactables = [
      ...this.doors,
      ...interactionObjects.map((object) => this.createInteraction(object))
    ];
    this.triggerZones = (this.layer("triggers")?.objects ?? []).map((object) => ({
      id: object.name ?? `trigger-${object.id}`,
      label: propString(object, "label", object.name ?? "Trigger"),
      action: propString(object, "action", "room-dialog"),
      text: propString(object, "text", "This part of the record is noted."),
      rect: this.rectFromSourceObject(object),
      fired: false
    }));
  }

  private createDoor(object: TiledObject): SceneDoor {
    const center = this.centerFromSourceObject(object);
    const label = propString(object, "label", object.name ?? "Door");
    const targetScene = propString(object, "targetScene", "GameplayMapScene");
    const targetMap = typedMapKey(propString(object, "targetMap", ""));
    const marker = this.drawMarker(center.x, center.y, PALETTE.goldStamp, "door");
    return {
      id: object.name ?? `door-${object.id}`,
      label,
      x: center.x,
      y: center.y,
      radius: Math.max(18, Math.round(Math.max(object.width ?? 1, object.height ?? 1) * this.fitRect.scale * 0.5) + 8),
      kind: "door",
      target: {
        scene: targetScene,
        mapKey: targetMap ?? undefined,
        spawnId: propString(object, "spawn", "entry"),
        requiredFlag: propString(object, "requiredFlag", ""),
        lockedMessage: propString(object, "lockedMessage", "This route is not open yet.")
      },
      marker,
      onInteract: () => this.activateDoor(object)
    };
  }

  private createInteraction(object: TiledObject): Interactable {
    const center = this.centerFromSourceObject(object);
    const label = propString(object, "label", object.name ?? "Interaction");
    this.drawMarker(center.x, center.y, object.type === "npc" ? PALETTE.openNetGreen : PALETTE.terminalCyan, object.type === "npc" ? "npc" : "interaction");
    return {
      id: object.name ?? `interaction-${object.id}`,
      label,
      x: center.x,
      y: center.y,
      radius: Math.max(18, Math.round(Math.max(object.width ?? 1, object.height ?? 1) * this.fitRect.scale * 0.5) + 10),
      kind: object.type === "npc" ? "npc" : "document",
      onInteract: () => this.activateInteraction(object)
    };
  }

  private activateDoor(object: TiledObject) {
    const requiredFlag = propString(object, "requiredFlag", "");
    if (requiredFlag && !gameState.sceneProgress[requiredFlag]) {
      retroAudio.warning();
      this.showMapDialog(propString(object, "label", "LOCKED ROUTE"), propString(object, "lockedMessage", "A process flag is still missing."));
      return;
    }
    const targetScene = propString(object, "targetScene", "GameplayMapScene");
    const targetMap = typedMapKey(propString(object, "targetMap", ""));
    const spawnId = propString(object, "spawn", "entry");
    retroAudio.transition();
    setLatestMessage(`Door route: ${propString(object, "label", "door")} -> ${targetMap ?? targetScene}`);
    if (targetScene === "WorldMapScene") {
      this.scene.start("WorldMapScene", { region: this.sourceRegion });
      return;
    }
    if (targetScene === "GameplayMapScene" && targetMap) {
      this.scene.start("GameplayMapScene", {
        mapKey: targetMap,
        spawnId,
        sourceRegion: this.sourceRegion,
        districtName: this.districtName
      });
      return;
    }
    this.scene.start(targetScene);
  }

  private activateInteraction(object: TiledObject) {
    const action = propString(object, "action", "inspect");
    const label = propString(object, "label", object.name ?? "Record");
    if (action === "historian-chief") {
      this.showMapDialog("HISTORIAN-IN-CHIEF", [
        "Begin with evidence, then ask what the volume needs.",
        "The bookshelf tracks the FRUS record you have recovered."
      ]);
      return;
    }
    if (action === "frus-bookshelf") {
      this.browseFrusBookshelf();
      return;
    }
    if (action === "nara-archivist") {
      this.logNaraCatalog();
      return;
    }
    if (action === "red-zone-gate") {
      this.checkRedZoneGate();
      return;
    }
    if (action === "secret-service-gate") {
      this.checkWestWingNscGate();
      return;
    }
    if (action === "vault-core") {
      this.showMapDialog("BLACK VAULT CORE", "The obelisk hums. Final boss wiring arrives in the DANN-E path.");
      return;
    }
    if (action === "chancery-door") {
      this.logEmbassyCableCollection();
      return;
    }
    if (action === "witness-table") {
      this.showMapDialog("WITNESS TABLE", [
        "The hearing record separates question, answer, source, and date.",
        "A concise entry is more useful than a speech."
      ]);
      return;
    }
    if (action === "closed-session-vault") {
      if (!gameState.sceneProgress.closedSessionAccess) {
        this.showMapDialog("CLOSED SESSION", "Closed-session access requires later quest progression.");
        retroAudio.warning();
        return;
      }
      this.showMapDialog("CLOSED SESSION", "Access memo accepted.");
      return;
    }
    this.showMapDialog(label.toUpperCase(), propString(object, "text", "The record is noted."));
  }

  private logEmbassyCableCollection() {
    const alreadyLogged = Boolean(gameState.sceneProgress.embassyCableLogged);
    const result = logFieldCableCollection(gameState.sceneProgress.recordCollectionStep ?? 0, alreadyLogged);
    gameState.sceneProgress.embassyCableLogged = 1;
    gameState.sceneProgress.recordCollectionStep = result.nextRecordCollectionStep;

    const telegram = gameState.documentCandidates.find((document) => document.id === result.documentId);
    if (telegram?.workflowState === "found") {
      setDocumentWorkflowState(result.documentId, "candidate", "embassy cable copied into collection notes");
    }
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "embassy cable field collection logged");

    retroAudio.confirm();
    setObjective("Embassy cable copied into the collection notes. Finish formal collection at the Office desk.");
    setLatestMessage(result.message);
    this.showMapDialog("CHANCERY CABLE", [
      result.message,
      result.sourceBasis,
      "The formal Collection board gate still needs the Office desk review before selection narrows the record."
    ]);
  }

  private browseFrusBookshelf() {
    const result = browseFrusBookshelf({
      alreadyBrowsed: Boolean(gameState.sceneProgress.frusBookshelfBrowsed),
      currentFragments: gameState.volumeFragments
    });
    gameState.sceneProgress.frusBookshelfBrowsed = 1;
    if (result.shouldAwardFragment) addVolumeFragment(result.fragmentLabel);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "public FRUS reference shelf indexed");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    this.showMapDialog("FRUS BOOKSHELF", [...result.pages]);
  }

  private logNaraCatalog() {
    const result = logNaraCatalog({
      alreadyFiled: Boolean(gameState.sceneProgress.naraCatalogFiled),
      inventory: gameState.inventory,
      currentRecordCollectionStep: gameState.sceneProgress.recordCollectionStep ?? 0
    });
    gameState.sceneProgress.naraCatalogFiled = 1;
    gameState.sceneProgress.recordCollectionStep = result.nextRecordCollectionStep;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "NARA source index and microform trail filed");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    this.showMapDialog("NARA ARCHIVIST", [...result.pages]);
  }

  private checkRedZoneGate() {
    const result = checkRedZoneGate({
      alreadyOpen: Boolean(gameState.sceneProgress.redZoneDeclassification),
      hasClearanceToken: hasProcessItem("clearance_token"),
      eo13526ReviewComplete: Boolean(gameState.sceneProgress.eo13526ReviewComplete),
      declassificationReviewComplete: Boolean(gameState.sceneProgress.declassificationReviewComplete)
    });

    if (!result.ok) {
      retroAudio.warning();
      setObjective(result.objective);
      setLatestMessage(result.message);
      this.showMapDialog("RED ZONE", [...result.pages]);
      return;
    }

    if (result.shouldOpenGate) gameState.sceneProgress.redZoneDeclassification = 1;
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "Red Zone declassification gate opened");
    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    this.showMapDialog("RED ZONE", [...result.pages]);
  }

  private checkWestWingNscGate() {
    const result = checkWestWingNscGate({
      alreadyCleared: Boolean(gameState.sceneProgress.nsc_clearance),
      inventory: gameState.inventory,
      repositoryCoverageMapComplete: Boolean(gameState.sceneProgress.repositoryCoverageMapComplete)
    });

    if (!result.ok) {
      retroAudio.warning();
      setObjective(result.objective);
      setLatestMessage(result.message);
      this.showMapDialog("SECRET SERVICE", [...result.pages]);
      return;
    }

    if (result.shouldClearGate) gameState.sceneProgress.nsc_clearance = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "White House and NSC source coverage certified");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    this.showMapDialog("SECRET SERVICE", [...result.pages]);
  }

  private handleTriggers() {
    const foot = new Phaser.Geom.Rectangle(this.player.position.x - 4, this.player.position.y - 4, 8, 8);
    for (const trigger of this.triggerZones) {
      if (trigger.fired || !Phaser.Geom.Intersects.RectangleToRectangle(foot, trigger.rect)) continue;
      trigger.fired = true;
      if (trigger.action === "room-dialog") this.showMapDialog(trigger.label.toUpperCase(), trigger.text);
    }
  }

  private findSpawn(spawnId: string) {
    const spawn = (this.layer("spawns")?.objects ?? []).find((object) => object.name === spawnId);
    if (!spawn) return null;
    return this.pointFromSource(spawn.x, spawn.y);
  }

  private centerFromSourceObject(object: TiledObject) {
    return this.pointFromSource(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2);
  }

  private pointFromSource(x: number, y: number) {
    return {
      x: snapPixel(this.fitRect.x + x * this.fitRect.scale),
      y: snapPixel(this.fitRect.y + y * this.fitRect.scale)
    };
  }

  private rectFromSourceObject(object: TiledObject) {
    const x = this.fitRect.x + object.x * this.fitRect.scale;
    const y = this.fitRect.y + object.y * this.fitRect.scale;
    return new Phaser.Geom.Rectangle(
      snapPixel(x),
      snapPixel(y),
      Math.max(1, Math.round((object.width ?? 1) * this.fitRect.scale)),
      Math.max(1, Math.round((object.height ?? 1) * this.fitRect.scale))
    );
  }

  private drawMarker(x: number, y: number, accent: string, kind: "door" | "npc" | "interaction") {
    const objects: Phaser.GameObjects.GameObject[] = [];
    if (kind === "door") {
      objects.push(this.add.rectangle(x, y, 10, 8, color(PALETTE.black), 0.72).setStrokeStyle(1, color(accent)).setDepth(y + 1));
      objects.push(this.add.rectangle(x, y - 2, 5, 3, color(accent), 0.9).setDepth(y + 2));
      return objects;
    }
    objects.push(this.add.ellipse(x, y + 5, 14, 6, color(PALETTE.black), 0.45).setDepth(y - 2));
    objects.push(this.add.rectangle(x, y, 8, 8, color(PALETTE.black), 0.72).setStrokeStyle(1, color(accent)).setDepth(y + 1));
    return objects;
  }

  private drawCollisionDebug() {
    const graphics = this.add.graphics().setDepth(1200);
    graphics.lineStyle(1, color(PALETTE.classNetRed), 0.9);
    for (const solid of this.solids) graphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
    graphics.lineStyle(1, color(PALETTE.goldStamp), 0.9);
    for (const door of this.doors) graphics.strokeCircle(door.x, door.y, door.radius ?? 18);
    graphics.lineStyle(1, color(PALETTE.openNetGreen), 0.85);
    for (const trigger of this.triggerZones) graphics.strokeRect(trigger.rect.x, trigger.rect.y, trigger.rect.width, trigger.rect.height);
  }

  private showMapDialog(speaker: string, pages: string[] | string) {
    this.dialogSpeaker = speaker;
    this.dialogPages = Array.isArray(pages) ? pages : [pages];
    this.dialogIndex = 0;
    this.renderMapDialog();
  }

  private renderMapDialog() {
    const text = this.dialogPages[this.dialogIndex] ?? "";
    this.hintText.setText("A NEXT  B CLOSE");
    this.dialogSpeakerText.setText(`${this.dialogSpeaker}:`);
    this.dialogBodyText.setText(text);
    setDialogState(this.dialogSpeaker, text);
    setLatestMessage(text);
    retroAudio.blip();
  }

  private advanceMapDialog() {
    this.dialogIndex += 1;
    if (this.dialogIndex >= this.dialogPages.length) {
      this.clearMapDialog();
      return;
    }
    this.renderMapDialog();
  }

  private clearMapDialog() {
    this.dialogPages = [];
    this.dialogIndex = 0;
    this.dialogSpeakerText.setText("");
    this.dialogBodyText.setText("");
    this.hintText.setText("A INTERACT  ESC WORLD MAP");
    clearDialogState();
  }

  private returnToWorldMap() {
    retroAudio.transition();
    this.scene.start("WorldMapScene", { region: this.sourceRegion });
  }
}
