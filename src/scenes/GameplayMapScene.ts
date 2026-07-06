import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import {
  ART_PACK_FOOT_OFFSET_Y,
  ART_PACK_LABEL_OFFSET_Y,
  ART_PACK_SPRITE_ORIGIN_Y,
  type CharacterKey
} from "../art/characters";
import {
  FRUS_VOLUMES,
  GAMEPLAY_MAPS,
  GAMEPLAY_TILED_MAPS,
  gameplayTiledCacheKey,
  publicAssetPath,
  type GameplayMapKey,
  type OverworldRegionKey
} from "../assets/registry";
import { getDistrictById } from "../data/regions";
import { DanneEnemy } from "../entities/DanneEnemy";
import { danneEnemyVariant, type DanneEnemyVariantId } from "../entities/danneVariants";
import { Player } from "../entities/Player";
import { fileCapitolHacPacket, inspectClosedSessionSample } from "../game/capitolHacPacket";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, type ProcessItemId } from "../game/constants";
import { fileEmbassyPermissionQueue } from "../game/embassyPermissionQueue";
import { FOREIGN_GOVERNMENT_PERMISSION_PROMPTS } from "../game/foreignGovernmentPermission";
import { browseFrusBookshelf } from "../game/frusBookshelf";
import { HAC_HEARING_PROMPTS } from "../game/hacHearing";
import { logNaraCatalog } from "../game/naraCatalog";
import { fileOvalOfficeBriefing } from "../game/ovalOfficeBriefing";
import {
  FRUS_PRODUCTION_FLOOR_STEPS,
  frusProductionFloorStageReadout,
  frusProductionFloorGateReadouts,
  frusProductionFloorGateCount,
  frusProductionFloorGateCountReadout,
  frusProductionFloorGateSummary,
  frusProductionFloorGateInstruction,
  frusProductionFloorGateToolCue,
  frusProductionFloorGateToolSummary,
  frusProductionFloorNextGate,
  frusProductionFloorNextGateInteractionReadout,
  frusProductionFloorNextGateReadout,
  frusProductionFloorNextGateRouteReadout,
  frusProductionFloorNextGateToolReadout,
  frusProductionFloorRailReadout,
  frusProductionFloorStepForRatio,
  frusProductionFloorTaskReadout,
  gameplayMapFlowReadout,
  gameplayMapRouteBadgeLabel,
  gameplayMapRouteReadout,
  type FrusProductionFloorGateContext,
  type FrusProductionFloorGateReadout
} from "../game/gameplayMapFlow";
import { logFieldCableCollection } from "../game/recordCollection";
import { checkRedZoneGate } from "../game/redZoneGate";
import { fileStackControlManifest } from "../game/stackControlManifest";
import { checkWestWingNscGate } from "../game/westWingNsc";
import {
  addDocumentPoints,
  addDanneItem,
  addInventoryItem,
  addProcessItem,
  addVolumeFragment,
  beginSnesTransition,
  clearDialogState,
  completeSnesTransition,
  equipProcessItem,
  gameState,
  hasProcessItem,
  setDialogState,
  setDocumentWorkflowState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  getStatutoryClockStateReadout,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import type { Position } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import {
  decideInteractionFeedback,
  InteractionAssist,
  nearestInteractable,
  nearestInteractableHint
} from "../systems/interaction";
import { InteractionPrompt, promptVerbForKind } from "../systems/interactionPrompt";
import { snapPixel } from "../systems/pixelPerfect";
import { applyStandardsViolation } from "../systems/reliability";
import {
  applyRoomClearGate,
  isRoomCleared,
  roomClearFlag,
  roomClearStatus
} from "../systems/roomClear";
import { playRubyMosaicTransition } from "../systems/sceneTransitions";
import { addSnesStatutoryClock } from "../systems/snesPixelArt";
import {
  drawSnesMapDressing,
  snesMapDressingReadout,
  type SnesMapDressingFeature
} from "../systems/snesMapDressing";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type FrusProductionFloorRouteTarget = Pick<FrusProductionFloorGateReadout, "code" | "requirement" | "xRatio" | "accent">;

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
  historian_office: "Visit the Archive Guide or inspect the FRUS bookshelf.",
  nara_stacks: "Check the catalog desk and note the gated Red Zone.",
  foggy_bottom: "Stay on the sidewalks and enter the Truman Building.",
  west_wing: "Find the Situation Room gate and review room entrances.",
  black_vault: "Approach the obelisk core when the record is ready.",
  frus_floor: "Walk through each FRUS production phase room.",
  embassy: "Enter from the south gate and inspect the chancery door.",
  capitol_hill: "Use the witness table or inspect the closed-session vault."
};
const FRUS_BOOKSHELF_REWARD_TEXTURE: keyof typeof FRUS_VOLUMES = "world_standing";
const FRUS_BOOKSHELF_REWARD_THUMB = "frus-bookshelf-reward-thumb";
const NARA_CATALOG_REWARD_TEXTURE: keyof typeof FRUS_VOLUMES = "pickup_microform";
const NARA_CATALOG_REWARD_THUMB = "nara-catalog-reward-thumb";

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
  private readonly doorRouteBadges = new Map<string, Phaser.GameObjects.GameObject[]>();
  private routeTransitionLocked = false;
  private entryBanner?: Phaser.GameObjects.Container;
  private objectiveOverrideMsRemaining = 0;
  private frusFloorCurrentStageCode = "";
  private readonly frusFloorCurrentStageObjects: Phaser.GameObjects.GameObject[] = [];
  private frusFloorGateStatusKey = "";
  private readonly frusFloorGateStatusObjects: Phaser.GameObjects.GameObject[] = [];
  private frusFloorNextGateRouteKey = "";
  private readonly frusFloorNextGateRouteObjects: Phaser.GameObjects.GameObject[] = [];
  private frusFloorNextGateInteractableKey = "";
  private readonly frusFloorNextGateInteractableId = "frus-floor-next-gate";
  private triggerZones: TriggerZone[] = [];
  private tileData!: TiledMapData;
  private readonly danneEnemies: DanneEnemy[] = [];
  private danneRoomId = "";
  private danneRoomUnlockedFlags: string[] = [];
  private activeMusicCue = "";

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

  preload() {
    if (!this.textures.exists(this.mapKey)) {
      this.load.image(this.mapKey, publicAssetPath(GAMEPLAY_MAPS[this.mapKey]));
    }
    if (!this.cache.json.exists(gameplayTiledCacheKey(this.mapKey))) {
      this.load.json(gameplayTiledCacheKey(this.mapKey), publicAssetPath(GAMEPLAY_TILED_MAPS[this.mapKey]));
    }
  }

  create() {
    this.tileData = this.readTileData();
    this.applyGameplayMapDebugGrants();
    setSceneState("GameplayMapScene", "explore", MAP_OBJECTIVES[this.mapKey]);
    setVisibleThreats([]);
    setLatestMessage(`${MAP_LABELS[this.mapKey]} loaded from object layers.`);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.fitRect = this.computeMapFit();
    this.drawMap();
    this.createObjectsFromTileData();
    this.drawSnesDressing();
    this.drawNpcActors();
    if (isCollisionDebugEnabled()) this.drawCollisionDebug();
    this.createHudChrome();
    this.prompt = new InteractionPrompt(this, 880);
    const rawSpawn = this.findSpawn(this.spawnId) ?? this.findSpawn("entry") ?? { x: this.fitRect.x + this.fitRect.width / 2, y: this.fitRect.y + this.fitRect.height - 20 };
    const spawn = this.adjustSpawnAwayFromWorldExit(rawSpawn);
    this.player = new Player(this, spawn.x, spawn.y);
    this.createDanneEncounter();
    this.updateGameplayMusic(true);
    this.suppressSpawnTrigger(spawn);
    this.showEntryBanner();
    this.updateFrusFloorCurrentStage(true);
    this.updateFrusFloorGateStatus(true);
    this.updateFrusFloorNextGateRoute(true);
    this.updateFrusFloorNextGateInteractable(true);
    this.updateVisibleMapState();
    this.syncGameplayThreats();
  }

  private updateVisibleMapState() {
    setVisibleEntities([
      MAP_LABELS[this.mapKey],
      snesMapDressingReadout(this.mapKey),
      gameplayMapFlowReadout(this.mapKey),
      ...(this.mapKey === "frus_floor" ? [
        frusProductionFloorRailReadout(),
        frusProductionFloorStageReadout(this.frusFloorPlayerRatio()),
        frusProductionFloorTaskReadout(this.frusFloorPlayerRatio()),
        frusProductionFloorGateCountReadout(this.frusFloorGateContext()),
        frusProductionFloorGateSummary(this.frusFloorGateContext()),
        frusProductionFloorNextGateReadout(this.frusFloorGateContext()),
        frusProductionFloorNextGateRouteReadout(this.frusFloorGateContext()),
        frusProductionFloorNextGateInteractionReadout(this.frusFloorGateContext()),
        frusProductionFloorNextGateToolReadout(this.frusFloorGateContext()),
        frusProductionFloorGateToolSummary(this.frusFloorGateContext())
      ] : []),
      ...this.routeReadouts(),
      `District: ${this.districtName}`,
      ...this.interactables.map((item) => item.label),
      ...this.danneEnemies.map((enemy) => {
        const readout = enemy.readout();
        return `${readout.label}: ${readout.hp}/${readout.maxHp} HP`;
      }),
      ...(this.danneRoomId
        ? [`DANN-E room clear: ${this.currentDanneRoomStatus().defeatedEnemyCount}/${this.currentDanneRoomStatus().requiredEnemyCount}`]
        : [])
    ]);
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (this.routeTransitionLocked) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
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
    if (input.bJustPressed || input.abilityJustPressed) {
      const toolLabel = gameState.equippedProcessItem?.replace(/_/g, " ").toUpperCase() ?? "FRUS TOOL";
      if (this.player.startAction(gameState.equippedProcessItem)) {
        setLatestMessage(`Tool action: ${toolLabel}.`);
      } else {
        setLatestMessage(`${toolLabel} is cooling down.`);
      }
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
    this.updateFrusFloorCurrentStage();
    this.updateFrusFloorGateStatus();
    this.updateFrusFloorNextGateRoute();
    this.updateFrusFloorNextGateInteractable();
    this.updateDanneEncounter(delta);
    const nearest = nearestInteractable(this.player.position, this.interactables);
    const hintTarget = this.frusFloorPromptHintTarget(nearest, nearestInteractableHint(this.player.position, this.interactables));
    const promptTarget = nearest ?? hintTarget;
    setNearestInteractable(nearest?.label ?? null);
    this.prompt.update(delta, promptTarget, {
      left: this.fitRect.x + 30,
      right: this.fitRect.x + this.fitRect.width - 30,
      top: TOP_SAFE_BAND + 14,
      bottom: this.mapKey === "frus_floor" ? this.frusFloorRailY() - 34 : undefined
    }, nearest ? undefined : hintTarget ? { badge: "!", text: "STEP CLOSER" } : undefined);
    this.hintText.setText(nearest
      ? `A ${promptVerbForKind(nearest.kind)} ${nearest.label.toUpperCase()}`
      : hintTarget
        ? `STEP CLOSER: ${hintTarget.label.toUpperCase()}`
        : "A INTERACT  ESC WORLD MAP");
    const feedback = decideInteractionFeedback(nearest, hintTarget);
    const showedStepCloserFeedback = input.aJustPressed && feedback.kind === "step-closer";
    if (showedStepCloserFeedback) {
      setLatestMessage(`Step closer to ${feedback.target.label}.`);
      setObjective(`Move closer to ${feedback.target.label}, then press A.`);
      this.objectiveOverrideMsRemaining = 850;
      retroAudio.blip();
    }
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) {
      bufferedInteraction.onInteract();
      if (this.dialogPages.length > 0) return;
    }
    if (!showedStepCloserFeedback && this.objectiveOverrideMsRemaining > 0) {
      this.objectiveOverrideMsRemaining = Math.max(0, this.objectiveOverrideMsRemaining - delta);
    } else if (!showedStepCloserFeedback) {
      setObjective(MAP_OBJECTIVES[this.mapKey]);
    }
    this.syncGameplayThreats();
  }

  private createDanneEncounter() {
    this.clearDanneEnemies();
    this.danneRoomId = "";
    this.danneRoomUnlockedFlags = [];
    if (this.mapKey === "black_vault") {
      this.danneRoomId = "black_vault";
      this.danneRoomUnlockedFlags = ["blackVaultBossCleared", "blackVaultWestOpen", "blackVaultNorthOpen"];
      if (isRoomCleared(this.danneRoomId)) {
        for (const flag of this.danneRoomUnlockedFlags) gameState.sceneProgress[flag] = 1;
        return;
      }
      this.spawnDanneEnemy("black-vault-colossus", "danne-colossus-final-form", 0.5, 0.37, [
        { x: 0.5, y: 0.37 }
      ]);
      this.spawnDanneEnemy("black-vault-cloud", "danne-cloud-form", 0.35, 0.55, [
        { x: 0.35, y: 0.55 },
        { x: 0.43, y: 0.48 },
        { x: 0.39, y: 0.68 }
      ]);
      this.spawnDanneEnemy("black-vault-ascendant", "danne-ascendant", 0.66, 0.56, [
        { x: 0.66, y: 0.56 },
        { x: 0.58, y: 0.62 },
        { x: 0.72, y: 0.66 }
      ]);
      this.spawnDanneEnemy("black-vault-defeated-decoy", "danne-defeated", 0.52, 0.69, [
        { x: 0.52, y: 0.69 }
      ]);
      setObjective("Black Vault: defeat DANN-E with the matching FRUS tools to open the blast doors.");
      setLatestMessage("DANN-E room gate active: Citation Stamp, Red Pencil, and Review Folder each matter.");
      return;
    }

    if (this.mapKey === "nara_stacks") {
      this.danneRoomId = "nara_stacks_patrol";
      this.danneRoomUnlockedFlags = [];
      if (isRoomCleared(this.danneRoomId)) return;
      this.spawnDanneEnemy("nara-mark-i", "danne-mark-i-prototype", 0.38, 0.47, [
        { x: 0.32, y: 0.47 },
        { x: 0.5, y: 0.47 },
        { x: 0.5, y: 0.58 },
        { x: 0.32, y: 0.58 }
      ]);
      this.spawnDanneEnemy("nara-swarm", "danne-swarm", 0.63, 0.42, [
        { x: 0.58, y: 0.42 },
        { x: 0.72, y: 0.42 },
        { x: 0.72, y: 0.54 },
        { x: 0.58, y: 0.54 }
      ]);
      return;
    }

    if (this.mapKey === "embassy") {
      this.danneRoomId = "embassy_prime_pressure";
      this.danneRoomUnlockedFlags = [];
      if (isRoomCleared(this.danneRoomId)) return;
      this.spawnDanneEnemy("embassy-prime", "danne-prime-humanoid", 0.55, 0.55, [
        { x: 0.47, y: 0.55 },
        { x: 0.62, y: 0.55 },
        { x: 0.62, y: 0.66 },
        { x: 0.47, y: 0.66 }
      ]);
      return;
    }

    if (this.mapKey === "capitol_hill") {
      this.danneRoomId = "capitol_executive_pressure";
      this.danneRoomUnlockedFlags = [];
      if (isRoomCleared(this.danneRoomId)) return;
      this.spawnDanneEnemy("capitol-executive", "danne-executive-suit", 0.52, 0.46, [
        { x: 0.45, y: 0.46 },
        { x: 0.6, y: 0.46 },
        { x: 0.6, y: 0.58 },
        { x: 0.45, y: 0.58 }
      ]);
    }
  }

  private clearDanneEnemies() {
    for (const enemy of this.danneEnemies) {
      if (enemy.scene) enemy.destroy();
    }
    this.danneEnemies.length = 0;
  }

  private spawnDanneEnemy(
    id: string,
    variantId: DanneEnemyVariantId,
    xRatio: number,
    yRatio: number,
    waypointRatios: Position[]
  ) {
    const position = this.pointFromRatio(xRatio, yRatio);
    const waypoints = waypointRatios.map((point) => this.pointFromRatio(point.x, point.y));
    this.danneEnemies.push(new DanneEnemy(this, position.x, position.y, {
      id,
      roomId: this.danneRoomId || this.mapKey,
      config: danneEnemyVariant(variantId),
      waypoints
    }));
  }

  private currentDanneRoomStatus() {
    return roomClearStatus(this.danneRoomId || this.mapKey, this.danneEnemies, this.danneRoomUnlockedFlags);
  }

  private updateDanneEncounter(delta: number) {
    if (!this.danneRoomId || !this.danneEnemies.length) return;
    const playerPosition = this.player.position;
    const playerFootBox = new Phaser.Geom.Rectangle(playerPosition.x - 8, playerPosition.y - 3, 16, 8);
    let hitFeedback = false;
    for (const enemy of this.danneEnemies) {
      const result = enemy.updateEnemy(this.time.now, delta, playerPosition, playerFootBox);
      if (result.projectileHit && this.player.takeHit(enemy.readout(), 9, 700)) {
        applyStandardsViolation("missed_30_year_deadline", "DANN-E ego bolt disrupted room-clear review.");
        setObjective("Dodge Ego bolts, then counter with the correct FRUS tool.");
        this.objectiveOverrideMsRemaining = 1100;
      }
      const hitResult = enemy.tryPlayerToolHit(this.player.activeActionHitbox, gameState.equippedProcessItem, playerPosition);
      if (hitResult === "wrong-tool") {
        setObjective(`Wrong counter. Equip ${enemy.readout().weakness.replace(/_/g, " ").toUpperCase()} for ${enemy.readout().label}.`);
        this.objectiveOverrideMsRemaining = 1250;
        hitFeedback = true;
      } else if (hitResult === "damaged") {
        setObjective(`${enemy.readout().label}: ${enemy.readout().hp}/${enemy.readout().maxHp} HP. Keep pressure with the matching tool.`);
        this.objectiveOverrideMsRemaining = 900;
        hitFeedback = true;
      } else if (hitResult === "defeated") {
        setObjective(`${enemy.readout().label} defeated. Clear remaining DANN-E variants to open the room.`);
        this.objectiveOverrideMsRemaining = 1150;
        hitFeedback = true;
      }
    }

    const wasCleared = isRoomCleared(this.danneRoomId);
    const status = applyRoomClearGate(
      this.danneRoomId,
      this.danneEnemies,
      this.danneRoomUnlockedFlags,
      this.mapKey === "black_vault"
        ? "Black Vault: all DANN-E nodes cleared; blast doors are open."
        : "Room cleared: DANN-E pressure resolved."
    );
    if (!wasCleared && status.cleared) {
      retroAudio.confirm();
      this.updateGameplayMusic();
      if (this.mapKey === "black_vault") this.openBlackVaultBlastDoors();
      else this.refreshDoorRouteBadges();
      this.updateVisibleMapState();
    } else if (!hitFeedback && status.requiredEnemyCount > 0 && !status.cleared) {
      setLatestMessage(`DANN-E room gate: ${status.defeatedEnemyCount}/${status.requiredEnemyCount} cleared.`);
    }
  }

  private updateGameplayMusic(force = false) {
    const cue = this.danneEnemies.some((enemy) => !enemy.defeated)
      ? this.danneCombatMusicCue()
      : this.ambientMusicCue();
    if (!force && cue === this.activeMusicCue) return;
    this.activeMusicCue = cue;
    if (force) retroAudio.startMusic(cue, { forceRestart: true });
    else retroAudio.crossfadeToMusic(cue, { forceRestart: true });
  }

  private ambientMusicCue() {
    return this.mapKey;
  }

  private danneCombatMusicCue() {
    return this.mapKey === "black_vault" ? "DanneCombat" : "DanneMiniboss";
  }

  private syncGameplayThreats() {
    const roomStatus = this.danneRoomId ? this.currentDanneRoomStatus() : null;
    setVisibleThreats(this.danneEnemies.map((enemy) => {
      const readout = enemy.readout();
      return {
        label: readout.label,
        x: readout.x,
        y: readout.y,
        spriteKey: readout.id,
        behavior: readout.behavior,
        defeatMethod: readout.defeatMethod,
        status: `${readout.state}; ${readout.hp}/${readout.maxHp} HP; weakness ${readout.weakness.replace(/_/g, " ")}`,
        hp: readout.hp,
        maxHp: readout.maxHp,
        enemyState: readout.state,
        weakness: readout.weakness,
        roomClear: roomStatus
          ? {
              roomId: roomStatus.roomId,
              defeated: roomStatus.defeatedEnemyCount,
              required: roomStatus.requiredEnemyCount,
              cleared: roomStatus.cleared
            }
          : undefined
      };
    }));
  }

  private readTileData(): TiledMapData {
    const cached = this.cache.json.get(gameplayTiledCacheKey(this.mapKey)) as TiledMapData | undefined;
    if (cached?.layers?.length) return cached;
    const texture = this.textures.get(this.mapKey).getSourceImage() as { width?: number; height?: number };
    return { width: texture.width ?? 1536, height: texture.height ?? 1024, tilewidth: 1, tileheight: 1, layers: [] };
  }

  private applyGameplayMapDebugGrants() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const give = params.get("give")?.split(",").map((value) => value.trim()) ?? [];
    if (give.includes("combat-tools")) {
      const tools: ProcessItemId[] = ["citation_stamp", "red_pencil", "review_folder"];
      for (const tool of tools) addProcessItem(tool);
      if (!gameState.equippedProcessItem) equipProcessItem("citation_stamp");
    }
    const equip = params.get("equip");
    if (equip === "citation_stamp" || equip === "red_pencil" || equip === "review_folder") {
      addProcessItem(equip);
      equipProcessItem(equip);
    }
    if (this.mapKey !== "black_vault") return;
    if (params.get("boss") !== "defeated" && params.get("bossCleared") !== "1") return;
    gameState.sceneProgress.blackVaultBossCleared = 1;
    gameState.sceneProgress.blackVaultWestOpen = 1;
    gameState.sceneProgress.blackVaultNorthOpen = 1;
    gameState.sceneProgress[roomClearFlag("black_vault")] = 1;
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
    this.clearAllDoorRouteBadges();
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

  private drawSnesDressing() {
    const interactionObjects = [
      ...(this.layer("interactions")?.objects ?? []),
      ...(this.layer("npcs")?.objects ?? [])
    ];
    const triggerObjects = this.layer("triggers")?.objects ?? [];
    const features: SnesMapDressingFeature[] = [
      ...this.doors.map((door) => ({
        x: door.x,
        y: door.y,
        kind: door.target.requiredFlag ? "gate" as const : "door" as const,
        label: door.label,
        action: "door"
      })),
      ...interactionObjects.map((object) => {
        const center = this.centerFromSourceObject(object);
        const action = propString(object, "action", "");
        return {
          x: center.x,
          y: center.y,
          kind: this.snesFeatureKindForObject(object),
          label: propString(object, "label", object.name ?? "Interaction"),
          action
        };
      }),
      ...triggerObjects.map((object) => {
        const center = this.centerFromSourceObject(object);
        const action = propString(object, "action", "room-dialog");
        return {
          x: center.x,
          y: center.y,
          kind: this.snesFeatureKindForObject(object),
          label: propString(object, "label", object.name ?? "Trigger"),
          action
        };
      })
    ];
    drawSnesMapDressing(this, this.mapKey, this.fitRect, {
      solids: this.solids,
      features
    });
  }

  private snesFeatureKindForObject(object: TiledObject): SnesMapDressingFeature["kind"] {
    if (object.type === "npc") return "npc";
    const action = propString(object, "action", "");
    const label = propString(object, "label", object.name ?? "").toLowerCase();
    if (action === "frus-bookshelf") return "frus_shelf";
    if (action === "nara-archivist" || action === "stack-control-manifest") return "source_index";
    if (action === "red-zone-gate" || action === "secret-service-gate" || action === "closed-session-vault") return "declass_gate";
    if (action === "oval-office-briefing" || action === "consular-permission-queue") return "review_desk";
    if (action === "vault-core") return "vault_core";
    if (action === "chancery-door") return "cable_machine";
    if (action === "witness-table") return "witness_table";
    if (action === "street-sign") return "street_sign";
    if (action === "coffee-station") return "coffee";
    if (action === "room-dialog" || label.includes("publication") || label.includes("declassification")) return "phase_marker";
    if (action.includes("gate") || action.includes("vault") || action.includes("door")) return "gate";
    if (
      action.includes("desk") ||
      action.includes("manifest") ||
      action.includes("briefing") ||
      action.includes("queue") ||
      action.includes("table") ||
      action.includes("station") ||
      action.includes("core")
    ) return "workstation";
    return "document";
  }

  private drawNpcActors() {
    const npcObjects = [
      ...(this.layer("interactions")?.objects ?? []),
      ...(this.layer("npcs")?.objects ?? [])
    ].filter((object) => object.visible !== false && object.type === "npc");
    for (const object of npcObjects) {
      const center = this.centerFromSourceObject(object);
      const characterKey = this.characterKeyForMapNpc(object);
      if (!this.textures.exists(characterKey)) continue;
      this.add.ellipse(
        snapPixel(center.x),
        snapPixel(center.y + ART_PACK_FOOT_OFFSET_Y),
        19,
        5,
        color(PALETTE.black),
        0.3
      ).setDepth(snapPixel(center.y - 2));
      const sprite = this.add.sprite(snapPixel(center.x), snapPixel(center.y), characterKey)
        .setOrigin(0.5, ART_PACK_SPRITE_ORIGIN_Y)
        .setDepth(snapPixel(center.y + 1));
      sprite.play(characterAnimKey(characterKey, "idle-down"));
      this.add.rectangle(
        snapPixel(center.x),
        snapPixel(center.y + ART_PACK_LABEL_OFFSET_Y),
        13,
        2,
        color(PALETTE.goldStamp),
        0.72
      ).setDepth(snapPixel(center.y + 2));
    }
  }

  private characterKeyForMapNpc(object: TiledObject): CharacterKey {
    const label = propString(object, "label", object.name ?? "").toLowerCase();
    const action = propString(object, "action", "").toLowerCase();
    if (label.includes("archivist") || action.includes("catalog")) return "archivist";
    if (label.includes("service") || label.includes("guard") || action.includes("gate")) return "security_officer";
    if (label.includes("review") || label.includes("historian")) return "general_editor";
    return "reviewer";
  }

  private createDoor(object: TiledObject): SceneDoor {
    const center = this.centerFromSourceObject(object);
    const id = object.name ?? `door-${object.id}`;
    const label = propString(object, "label", object.name ?? "Door");
    const targetScene = propString(object, "targetScene", "GameplayMapScene");
    const targetMap = typedMapKey(propString(object, "targetMap", ""));
    const target = {
      scene: targetScene,
      mapKey: targetMap ?? undefined,
      spawnId: propString(object, "spawn", "entry"),
      requiredFlag: propString(object, "requiredFlag", ""),
      lockedMessage: propString(object, "lockedMessage", "This route is not open yet.")
    };
    const marker = this.drawMarker(center.x, center.y, PALETTE.goldStamp, "door");
    this.setDoorRouteBadge(id, center.x, center.y, target);
    return {
      id,
      label,
      x: center.x,
      y: center.y,
      radius: Math.max(18, Math.round(Math.max(object.width ?? 1, object.height ?? 1) * this.fitRect.scale * 0.5) + 8),
      kind: "door",
      target,
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
    const target: DoorTarget = {
      scene: targetScene,
      mapKey: targetMap ?? undefined,
      spawnId
    };
    const label = propString(object, "label", "door");
    retroAudio.transition();
    setLatestMessage(`Door route: ${label} -> ${targetMap ?? targetScene}`);
    this.startDoorTransition(label, target);
  }

  private startDoorTransition(label: string, target: DoorTarget) {
    if (this.routeTransitionLocked) return;
    this.routeTransitionLocked = true;
    const routeLabel = gameplayMapRouteBadgeLabel({
      scene: target.scene,
      mapKey: target.mapKey
    });
    const routeReadout = gameplayMapRouteReadout({
      scene: target.scene,
      mapKey: target.mapKey
    });
    setObjective(`Route transition: ${routeReadout}.`);
    beginSnesTransition({
      fromScene: this.scene.key,
      toScene: target.scene,
      label: routeLabel
    });
    playRubyMosaicTransition(this, {
      label: `${routeLabel} ${label.toUpperCase()}`.slice(0, 24),
      onCovered: () => this.finishDoorTransition(target)
    });
  }

  private finishDoorTransition(target: DoorTarget) {
    completeSnesTransition();
    if (target.scene === "WorldMapScene") {
      this.scene.start("WorldMapScene", { region: this.sourceRegion });
      return;
    }
    if (target.scene === "GameplayMapScene" && target.mapKey) {
      this.scene.start("GameplayMapScene", {
        mapKey: target.mapKey,
        spawnId: target.spawnId ?? "entry",
        sourceRegion: this.sourceRegion,
        districtName: this.districtName
      });
      return;
    }
    this.scene.start(target.scene);
  }

  private showEntryBanner() {
    this.entryBanner?.destroy();
    const routeLabel = gameplayMapRouteBadgeLabel({
      scene: "GameplayMapScene",
      mapKey: this.mapKey
    });
    const title = MAP_LABELS[this.mapKey].toUpperCase();
    const width = 118;
    const banner = this.add.container(GAME_WIDTH - width / 2 - 7, TOP_SAFE_BAND + 17)
      .setName("gameplay-map-entry-banner")
      .setDepth(935)
      .setAlpha(0);
    banner.add(this.add.rectangle(1, 1, width, 21, color(PALETTE.black), 0.5)
      .setName("gameplay-map-entry-banner-shadow"));
    banner.add(this.add.rectangle(0, 0, width, 21, color(PALETTE.deepRuby), 0.94)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.95)
      .setName("gameplay-map-entry-banner-card"));
    banner.add(this.add.text(-width / 2 + 6, -8, routeLabel, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan
    }).setName("gameplay-map-entry-banner-code").setOrigin(0, 0));
    banner.add(this.add.text(-width / 2 + 6, 2, title.slice(0, 19), {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setName("gameplay-map-entry-banner-title").setOrigin(0, 0));
    banner.add(this.add.rectangle(width / 2 - 10, -5, 9, 5, color(PALETTE.black), 0.65)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.8)
      .setName("gameplay-map-entry-banner-mapchip"));
    banner.add(this.add.rectangle(width / 2 - 10, -5, 3, 2, color(PALETTE.goldStamp), 0.9)
      .setName("gameplay-map-entry-banner-mapchip-dot"));
    this.entryBanner = banner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 120,
      ease: "Stepped",
      onComplete: () => {
        this.time.delayedCall(930, () => {
          if (!banner.scene) return;
          this.tweens.add({
            targets: banner,
            alpha: 0,
            duration: 160,
            ease: "Stepped",
            onComplete: () => {
              if (this.entryBanner === banner) this.entryBanner = undefined;
              banner.destroy();
            }
          });
        });
      }
    });
  }

  private activateInteraction(object: TiledObject) {
    const action = propString(object, "action", "inspect");
    const label = propString(object, "label", object.name ?? "Record");
    if (action === "historian-chief") {
      retroAudio.confirm();
      setObjective("Office of the Historian: follow the evidence path, then inspect the FRUS bookshelf.");
      setLatestMessage("Archive Guide consulted: evidence path and recovered record shelf identified.");
      const target = this.archiveGuideInteractable();
      this.showArchiveGuideCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y
      );
      this.showMapDialog("ARCHIVE GUIDE", [
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
    if (action === "stack-control-manifest") {
      this.fileStackControlManifest();
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
    if (action === "oval-office-briefing") {
      this.fileOvalOfficeBriefing();
      return;
    }
    if (action === "vault-core") {
      if (!gameState.sceneProgress.blackVaultBossCleared) {
        this.startBlackVaultCoreEncounter();
        return;
      }
      this.openBlackVaultBlastDoors();
      this.showMapDialog("BLACK VAULT CORE", [
        "The obelisk core is quiet.",
        "Human review has broken the automated queue; the blast doors are now open."
      ]);
      return;
    }
    if (action === "coffee-station") {
      this.checkCoffeeStation();
      return;
    }
    if (action === "street-sign") {
      this.checkStreetSign();
      return;
    }
    if (action === "chancery-door") {
      this.logEmbassyCableCollection();
      return;
    }
    if (action === "consular-permission-queue") {
      this.fileEmbassyPermissionQueue();
      return;
    }
    if (action === "witness-table") {
      this.fileCapitolHacPacket();
      return;
    }
    if (action === "closed-session-vault") {
      this.inspectClosedSessionSample();
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
    const target = this.embassyCableInteractable();
    this.showEmbassyCableCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.alreadyLogged ? "logged" : "copied"
    );
    this.showMapDialog("CHANCERY CABLE", [
      result.message,
      result.sourceBasis,
      "The formal Collection board gate still needs the Office desk review before selection narrows the record."
    ]);
  }

  private fileEmbassyPermissionQueue() {
    const result = fileEmbassyPermissionQueue({
      embassyCableLogged: Boolean(gameState.sceneProgress.embassyCableLogged),
      alreadyFiled: Boolean(gameState.sceneProgress.foreignGovernmentPermissionComplete),
      inventory: gameState.inventory,
      currentStep: gameState.sceneProgress.foreignGovernmentPermissionStep ?? 0
    });

    if (!result.ok) {
      retroAudio.warning();
      setObjective(result.objective);
      setLatestMessage(result.message);
      const target = this.embassyPermissionInteractable();
      this.showEmbassyPermissionCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y,
        "locked"
      );
      this.showMapDialog("CONSULAR QUEUE", [...result.pages]);
      return;
    }

    gameState.sceneProgress.foreignGovernmentPermissionStep = result.nextStep;
    if (result.shouldFilePermission) gameState.sceneProgress.foreignGovernmentPermissionComplete = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "foreign-government permission note filed at embassy queue");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.embassyPermissionInteractable();
    this.showEmbassyPermissionCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.shouldFilePermission || result.itemsToAward.length > 0 ? "filed" : "reviewed"
    );
    this.showMapDialog("CONSULAR QUEUE", [
      ...result.pages,
      result.shouldFilePermission
        ? `Permission review ${FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length}/${FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length}: note complete.`
        : "The permission note is already attached to the publication packet."
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
    const shelf = this.interactables.find((item) => item.id === "frus_bookshelf");
    this.showFrusBookshelfRewardCue(shelf?.x ?? this.player.position.x, shelf?.y ?? this.player.position.y, result.shouldAwardFragment);
    this.showMapDialog("FRUS BOOKSHELF", [...result.pages]);
  }

  private showFrusBookshelfRewardCue(x: number, y: number, awarded: boolean) {
    const textureKey = this.ensureFrusBookshelfRewardTexture();
    const cue = this.add.container(snapPixel(x), snapPixel(y - 30))
      .setName("frus-bookshelf-reward-cue")
      .setDepth(940);
    cue.add(this.add.ellipse(0, 19, 36, 8, color(PALETTE.black), 0.58)
      .setName("frus-bookshelf-reward-shadow"));
    cue.add(this.add.rectangle(0, 0, 50, 35, color(PALETTE.black), 0.92)
      .setStrokeStyle(1, color(awarded ? PALETTE.goldStamp : PALETTE.stoneGray))
      .setName("frus-bookshelf-reward-frame"));
    cue.add(this.add.rectangle(0, -20, 38, 8, color(PALETTE.deepRuby), 0.96)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("frus-bookshelf-reward-title-band"));
    cue.add(this.add.text(0, -24, awarded ? "FRAG +1" : "INDEXED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: awarded ? PALETTE.goldStamp : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("frus-bookshelf-reward-title"));
    if (textureKey && this.textures.exists(textureKey)) {
      const image = this.add.image(0, 2, textureKey)
        .setName("frus-bookshelf-reward-volume-art");
      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      cue.add(image);
    } else {
      cue.add(this.add.rectangle(0, 2, 17, 24, color(PALETTE.deepRuby), 1)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setName("frus-bookshelf-reward-volume-fallback"));
      cue.add(this.add.rectangle(-6, 2, 3, 24, color(PALETTE.buckramRed), 1)
        .setName("frus-bookshelf-reward-volume-spine"));
      cue.add(this.add.rectangle(1, -4, 9, 1, color(PALETTE.goldStamp), 1)
        .setName("frus-bookshelf-reward-volume-band"));
    }
    cue.add(this.add.text(0, 17, "PUBLIC\nRECORD", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("frus-bookshelf-reward-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private ensureFrusBookshelfRewardTexture() {
    if (this.textures.exists(FRUS_BOOKSHELF_REWARD_THUMB)) return FRUS_BOOKSHELF_REWARD_THUMB;
    if (!this.textures.exists(FRUS_BOOKSHELF_REWARD_TEXTURE)) return "";
    const source = this.textures.get(FRUS_BOOKSHELF_REWARD_TEXTURE).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    const texture = this.textures.createCanvas(FRUS_BOOKSHELF_REWARD_THUMB, 18, 28);
    if (!texture) return FRUS_BOOKSHELF_REWARD_TEXTURE;
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 18, 28);
    context.drawImage(source, 0, 0, 18, 28);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return FRUS_BOOKSHELF_REWARD_THUMB;
  }

  private showNaraCatalogRewardCue(x: number, y: number, awarded: boolean) {
    const textureKey = this.ensureNaraCatalogRewardTexture();
    const cue = this.add.container(snapPixel(x), snapPixel(y - 33))
      .setName("nara-catalog-reward-cue")
      .setDepth(940);
    cue.add(this.add.ellipse(0, 21, 42, 8, color(PALETTE.black), 0.58)
      .setName("nara-catalog-reward-shadow"));
    cue.add(this.add.rectangle(0, 0, 54, 38, color(PALETTE.black), 0.93)
      .setStrokeStyle(1, color(awarded ? PALETTE.terminalCyan : PALETTE.stoneGray))
      .setName("nara-catalog-reward-frame"));
    cue.add(this.add.rectangle(0, -22, 44, 8, color(PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("nara-catalog-reward-title-band"));
    cue.add(this.add.text(0, -26, awarded ? "INDEX + REELS" : "CATALOGED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: awarded ? PALETTE.terminalCyan : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("nara-catalog-reward-title"));

    if (textureKey && this.textures.exists(textureKey)) {
      const image = this.add.image(0, 1, textureKey)
        .setName("nara-catalog-reward-microform-art");
      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      cue.add(image);
    } else {
      cue.add(this.add.rectangle(0, 2, 22, 17, color(PALETTE.stoneGray), 1)
        .setStrokeStyle(1, color(PALETTE.creamPaper))
        .setName("nara-catalog-reward-box-fallback"));
      cue.add(this.add.rectangle(-5, 4, 12, 7, color(PALETTE.creamPaper), 1)
        .setName("nara-catalog-reward-sleeve"));
      for (let index = 0; index < 3; index += 1) {
        cue.add(this.add.circle(6 + index * 4, 0, 2, color(PALETTE.stoneDark), 1)
          .setStrokeStyle(1, color(PALETTE.terminalCyan))
          .setName(`nara-catalog-reward-reel-${index}`));
      }
    }

    cue.add(this.add.text(0, 18, "SOURCE\nINDEX", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("nara-catalog-reward-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private ensureNaraCatalogRewardTexture() {
    if (this.textures.exists(NARA_CATALOG_REWARD_THUMB)) return NARA_CATALOG_REWARD_THUMB;
    if (!this.textures.exists(NARA_CATALOG_REWARD_TEXTURE)) return "";
    const source = this.textures.get(NARA_CATALOG_REWARD_TEXTURE).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    const texture = this.textures.createCanvas(NARA_CATALOG_REWARD_THUMB, 22, 22);
    if (!texture) return NARA_CATALOG_REWARD_TEXTURE;
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 22, 22);
    context.drawImage(source, 0, 0, 22, 22);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return NARA_CATALOG_REWARD_THUMB;
  }

  private showStackManifestRewardCue(x: number, y: number, state: "blocked" | "awarded" | "filed") {
    const awarded = state === "awarded";
    const blocked = state === "blocked";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 32, this.fitRect.x + this.fitRect.width - 32));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 18, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("stack-manifest-reward-cue")
      .setDepth(940);
    cue.add(this.add.ellipse(0, 22, 44, 8, color(PALETTE.black), 0.58)
      .setName("stack-manifest-reward-shadow"));
    cue.add(this.add.rectangle(0, 0, 60, 40, color(PALETTE.black), 0.93)
      .setStrokeStyle(1, color(blocked ? PALETTE.classNetRed : awarded ? PALETTE.goldStamp : PALETTE.stoneGray))
      .setName("stack-manifest-reward-frame"));
    cue.add(this.add.rectangle(0, -23, 48, 8, color(blocked ? PALETTE.deepRuby : PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(blocked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("stack-manifest-reward-title-band"));
    cue.add(this.add.text(0, -27, blocked ? "NEED INDEX" : awarded ? "MANIFEST+CART" : "MANIFEST", {
      fontFamily: "monospace",
      fontSize: awarded ? "4px" : "5px",
      color: blocked ? PALETTE.classNetRed : awarded ? PALETTE.goldStamp : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("stack-manifest-reward-title"));

    cue.add(this.add.rectangle(-10, 2, 16, 22, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("stack-manifest-reward-paper"));
    cue.add(this.add.rectangle(-16, 2, 2, 17, color(PALETTE.buckramHighlight), 1)
      .setName("stack-manifest-reward-margin"));
    for (let index = 0; index < 4; index += 1) {
      cue.add(this.add.rectangle(-9, -5 + index * 5, 9, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`stack-manifest-reward-line-${index}`));
    }

    cue.add(this.add.rectangle(13, 4, 19, 13, color(PALETTE.archiveAmber), 1)
      .setStrokeStyle(1, color(PALETTE.deepBrown))
      .setName("stack-manifest-reward-box"));
    cue.add(this.add.rectangle(13, -3, 21, 3, color(PALETTE.oldGold), 1)
      .setName("stack-manifest-reward-box-lid"));
    cue.add(this.add.rectangle(3, 12, 28, 2, color(PALETTE.stoneGray), 1)
      .setName("stack-manifest-reward-cart-rail"));
    for (let index = 0; index < 2; index += 1) {
      cue.add(this.add.circle(5 + index * 18, 16, 3, color(PALETTE.black), 1)
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
        .setName(`stack-manifest-reward-wheel-${index}`));
    }
    if (blocked) {
      cue.add(this.add.line(0, 2, -24, -12, 24, 16, color(PALETTE.classNetRed), 0.95)
        .setLineWidth(2)
        .setName("stack-manifest-reward-block-slash"));
    }

    cue.add(this.add.text(0, 20, blocked ? "SOURCE\nINDEX" : "BOXES\nVISIBLE", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: blocked ? PALETTE.creamPaper : PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("stack-manifest-reward-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private stackManifestInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("stack")
      || item.id.toLowerCase().includes("manifest")
      || item.label.toLowerCase().includes("stack")
      || item.label.toLowerCase().includes("manifest")
    ));
  }

  private showRedZoneGateCue(x: number, y: number, state: "locked" | "opened" | "open") {
    const locked = state === "locked";
    const newlyOpened = state === "opened";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 35, this.fitRect.x + this.fitRect.width - 35));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 18, TOP_SAFE_BAND + 86, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("red-zone-gate-cue")
      .setDepth(940);
    cue.add(this.add.ellipse(0, 23, 46, 8, color(PALETTE.black), 0.6)
      .setName("red-zone-gate-shadow"));
    cue.add(this.add.rectangle(0, 0, 62, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("red-zone-gate-frame"));
    cue.add(this.add.rectangle(0, -24, 47, 8, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("red-zone-gate-title-band"));
    cue.add(this.add.text(0, -28, locked ? "NEED CLEAR" : newlyOpened ? "RED ZONE OPEN" : "GATE OPEN", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: locked ? PALETTE.classNetRed : PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("red-zone-gate-title"));

    cue.add(this.add.rectangle(0, 3, 31, 24, color(locked ? PALETTE.deepRuby : PALETTE.stoneGray), 1)
      .setStrokeStyle(1, color(PALETTE.stoneLight))
      .setName("red-zone-gate-door"));
    cue.add(this.add.rectangle(0, -10, 35, 4, color(PALETTE.stoneDark), 1)
      .setName("red-zone-gate-header"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(-10 + index * 10, 3, 2, 22, color(PALETTE.black), 0.55)
        .setName(`red-zone-gate-bars-${index}`));
    }
    cue.add(this.add.rectangle(0, 4, 13, 13, color(PALETTE.black), 0.7)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("red-zone-gate-lock-box"));
    cue.add(this.add.circle(0, 4, 4, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setName("red-zone-gate-lock-core"));
    if (!locked) {
      cue.add(this.add.rectangle(18, 1, 4, 24, color(PALETTE.black), 0.88)
        .setName("red-zone-gate-open-gap"));
      cue.add(this.add.rectangle(22, 1, 3, 22, color(PALETTE.terminalCyan), 0.72)
        .setName("red-zone-gate-open-glow"));
    } else {
      cue.add(this.add.rectangle(-19, 3, 5, 19, color(PALETTE.classNetRed), 0.9)
        .setName("red-zone-gate-red-seal"));
    }

    cue.add(this.add.text(0, 21, locked ? "CLASSNET\nTOKEN" : "ACCOUNTED\nREVIEW", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: locked ? PALETTE.creamPaper : PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("red-zone-gate-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private redZoneGateInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("red")
      || item.id.toLowerCase().includes("zone")
      || item.label.toLowerCase().includes("red zone")
    ));
  }

  private clearCueContainers(...names: string[]) {
    for (const object of [...this.children.list]) {
      if (names.includes(object.name)) object.destroy();
    }
  }

  private showNscSourceGateCue(x: number, y: number, state: "blocked" | "cleared" | "open") {
    this.clearCueContainers("nsc-source-gate-cue", "oval-briefing-cue");
    const blocked = state === "blocked";
    const newlyCleared = state === "cleared";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 36, this.fitRect.x + this.fitRect.width - 36));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 20, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("nsc-source-gate-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 48, 8, color(PALETTE.black), 0.58)
      .setName("nsc-source-gate-shadow"));
    cue.add(this.add.rectangle(0, 0, 64, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(blocked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("nsc-source-gate-frame"));
    cue.add(this.add.rectangle(0, -24, 50, 8, color(blocked ? PALETTE.deepRuby : PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(blocked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("nsc-source-gate-title-band"));
    cue.add(this.add.text(0, -28, blocked ? "NEED SOURCES" : newlyCleared ? "NSC CLEAR" : "SOURCE CLEAR", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: blocked ? PALETTE.classNetRed : PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("nsc-source-gate-title"));

    cue.add(this.add.rectangle(-14, 2, 18, 24, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("nsc-source-gate-map"));
    cue.add(this.add.rectangle(-21, 2, 2, 18, color(PALETTE.buckramHighlight), 1)
      .setName("nsc-source-gate-map-margin"));
    for (let index = 0; index < 4; index += 1) {
      const lineColor = index === 0 ? PALETTE.goldStamp : index === 2 && !blocked ? PALETTE.terminalCyan : PALETTE.sepiaInk;
      cue.add(this.add.rectangle(-13, -6 + index * 5, 9, 1, color(lineColor), 1)
        .setName(`nsc-source-gate-map-line-${index}`));
    }
    cue.add(this.add.rectangle(-9, 8, 5, 5, color(blocked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("nsc-source-gate-map-node"));

    cue.add(this.add.rectangle(14, 4, 20, 22, color(PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(blocked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("nsc-source-gate-checkpoint"));
    cue.add(this.add.rectangle(14, -9, 24, 4, color(PALETTE.stoneGray), 1)
      .setName("nsc-source-gate-header"));
    cue.add(this.add.rectangle(14, 4, 9, 12, color(PALETTE.black), 0.78)
      .setStrokeStyle(1, color(blocked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("nsc-source-gate-badge"));
    cue.add(this.add.rectangle(14, 1, 4, 2, color(blocked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setName("nsc-source-gate-badge-glow"));
    cue.add(this.add.rectangle(14, 8, 13, 2, color(blocked ? PALETTE.classNetRed : PALETTE.goldStamp), 0.9)
      .setName("nsc-source-gate-rope"));

    if (blocked) {
      cue.add(this.add.line(0, 2, -25, -13, 25, 17, color(PALETTE.classNetRed), 0.95)
        .setLineWidth(2)
        .setName("nsc-source-gate-block-slash"));
    } else {
      cue.add(this.add.rectangle(25, 4, 4, 21, color(PALETTE.terminalCyan), 0.72)
        .setName("nsc-source-gate-open-glow"));
      cue.add(this.add.rectangle(25, 4, 2, 19, color(PALETTE.black), 0.65)
        .setName("nsc-source-gate-open-gap"));
    }

    cue.add(this.add.text(0, 21, blocked ? "REPO MAP\nOR INDEX" : "WH/NSC\nSOURCE MAP", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: blocked ? PALETTE.creamPaper : PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("nsc-source-gate-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private nscGateInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("secret")
      || item.id.toLowerCase().includes("nsc")
      || item.id.toLowerCase().includes("situation")
      || item.label.toLowerCase().includes("secret service")
      || item.label.toLowerCase().includes("situation")
    ));
  }

  private showOvalBriefingCue(x: number, y: number, state: "locked" | "filed" | "reviewed") {
    this.clearCueContainers("nsc-source-gate-cue", "oval-briefing-cue");
    const locked = state === "locked";
    const filed = state === "filed";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 37, this.fitRect.x + this.fitRect.width - 37));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 20, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("oval-briefing-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 50, 8, color(PALETTE.black), 0.58)
      .setName("oval-briefing-shadow"));
    cue.add(this.add.rectangle(0, 0, 66, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("oval-briefing-frame"));
    cue.add(this.add.rectangle(0, -24, 52, 8, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("oval-briefing-title-band"));
    cue.add(this.add.text(0, -28, locked ? "NEED NSC" : filed ? "FILED BRIEF" : "BRIEF FILED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: locked ? PALETTE.classNetRed : PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("oval-briefing-title"));

    cue.add(this.add.rectangle(-11, 1, 24, 25, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("oval-briefing-dossier"));
    cue.add(this.add.rectangle(-22, 1, 2, 20, color(PALETTE.buckramHighlight), 1)
      .setName("oval-briefing-red-margin"));
    cue.add(this.add.rectangle(-6, -13, 13, 5, color(PALETTE.archiveAmber), 1)
      .setStrokeStyle(1, color(PALETTE.deepBrown))
      .setName("oval-briefing-folder-tab"));
    for (let index = 0; index < 4; index += 1) {
      cue.add(this.add.rectangle(-9, -6 + index * 5, 13, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`oval-briefing-dossier-line-${index}`));
    }

    cue.add(this.add.rectangle(16, -2, 19, 21, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("oval-briefing-context-card"));
    cue.add(this.add.rectangle(16, -8, 23, 4, color(PALETTE.stoneGray), 1)
      .setName("oval-briefing-card-header"));
    cue.add(this.add.rectangle(12, -1, 7, 2, color(filed ? PALETTE.terminalCyan : PALETTE.classNetRed), 1)
      .setName("oval-briefing-timeline-a"));
    cue.add(this.add.rectangle(18, 5, 8, 2, color(filed ? PALETTE.goldStamp : PALETTE.classNetRed), 1)
      .setName("oval-briefing-timeline-b"));
    cue.add(this.add.rectangle(14, 11, 11, 2, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray), 1)
      .setName("oval-briefing-timeline-c"));

    if (locked) {
      cue.add(this.add.line(0, 2, -25, -13, 25, 17, color(PALETTE.classNetRed), 0.95)
        .setLineWidth(2)
        .setName("oval-briefing-block-slash"));
    } else {
      cue.add(this.add.rectangle(28, -3, 4, 19, color(PALETTE.terminalCyan), 0.72)
        .setName("oval-briefing-filed-glow"));
      cue.add(this.add.circle(28, -10, 4, color(PALETTE.goldStamp), 1)
        .setStrokeStyle(1, color(PALETTE.black), 0.8)
        .setName("oval-briefing-approval-seal"));
    }

    cue.add(this.add.text(0, 21, locked ? "SOURCE\nGATE" : "CHRONOLOGY\nCONTEXT", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: locked ? PALETTE.creamPaper : PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("oval-briefing-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private ovalBriefingInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("oval")
      || item.id.toLowerCase().includes("briefing")
      || item.label.toLowerCase().includes("oval")
      || item.label.toLowerCase().includes("briefing")
    ));
  }

  private showHacWitnessCue(x: number, y: number, state: "filed" | "reviewed") {
    this.clearCueContainers("hac-witness-cue", "closed-session-cue");
    const filed = state === "filed";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 38, this.fitRect.x + this.fitRect.width - 38));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 20, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("hac-witness-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 52, 8, color(PALETTE.black), 0.58)
      .setName("hac-witness-shadow"));
    cue.add(this.add.rectangle(0, 0, 68, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("hac-witness-frame"));
    cue.add(this.add.rectangle(0, -24, 54, 8, color(PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(PALETTE.terminalCyan))
      .setName("hac-witness-title-band"));
    cue.add(this.add.text(0, -28, filed ? "HAC DOCKET" : "DOCKET FILED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("hac-witness-title"));

    cue.add(this.add.rectangle(-16, 5, 23, 18, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.archiveAmber))
      .setName("hac-witness-table"));
    cue.add(this.add.rectangle(-16, -4, 27, 5, color(PALETTE.archiveAmber), 1)
      .setName("hac-witness-table-top"));
    cue.add(this.add.rectangle(-16, -8, 16, 6, color(PALETTE.black), 0.75)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("hac-witness-mic-box"));
    cue.add(this.add.rectangle(-16, -11, 2, 6, color(PALETTE.terminalCyan), 1)
      .setName("hac-witness-mic"));

    cue.add(this.add.rectangle(10, 2, 21, 25, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("hac-witness-docket"));
    cue.add(this.add.rectangle(1, 2, 2, 19, color(PALETTE.buckramHighlight), 1)
      .setName("hac-witness-red-margin"));
    for (let index = 0; index < 4; index += 1) {
      cue.add(this.add.rectangle(11, -6 + index * 5, 12, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`hac-witness-docket-line-${index}`));
    }
    cue.add(this.add.circle(24, -8, 5, color(PALETTE.goldStamp), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.8)
      .setName("hac-witness-finding-seal"));
    cue.add(this.add.rectangle(24, -8, 5, 2, color(PALETTE.deepRuby), 1)
      .setName("hac-witness-seal-mark"));
    if (filed) {
      cue.add(this.add.rectangle(27, 9, 6, 10, color(PALETTE.terminalCyan), 0.85)
        .setStrokeStyle(1, color(PALETTE.black), 0.7)
        .setName("hac-witness-treaty-fragment"));
    }

    cue.add(this.add.text(0, 21, filed ? "ANNUAL\nFINDINGS" : "PROCESS\nDOCKET", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("hac-witness-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private showClosedSessionCue(x: number, y: number, state: "locked" | "filed" | "reviewed") {
    this.clearCueContainers("hac-witness-cue", "closed-session-cue");
    const locked = state === "locked";
    const filed = state === "filed";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 37, this.fitRect.x + this.fitRect.width - 37));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 20, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("closed-session-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 50, 8, color(PALETTE.black), 0.58)
      .setName("closed-session-shadow"));
    cue.add(this.add.rectangle(0, 0, 66, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("closed-session-frame"));
    cue.add(this.add.rectangle(0, -24, 52, 8, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("closed-session-title-band"));
    cue.add(this.add.text(0, -28, locked ? "NEED HAC" : filed ? "30YR SAMPLE" : "SAMPLE FILED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: locked ? PALETTE.classNetRed : PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("closed-session-title"));

    cue.add(this.add.rectangle(-12, 4, 23, 24, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("closed-session-vault"));
    cue.add(this.add.rectangle(-12, -10, 27, 4, color(PALETTE.stoneGray), 1)
      .setName("closed-session-vault-header"));
    cue.add(this.add.circle(-12, 4, 8, color(PALETTE.black), 0.8)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("closed-session-vault-wheel"));
    cue.add(this.add.rectangle(-12, 4, 12, 2, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setName("closed-session-vault-spoke-a"));
    cue.add(this.add.rectangle(-12, 4, 2, 12, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setName("closed-session-vault-spoke-b"));

    cue.add(this.add.rectangle(15, 3, 19, 24, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("closed-session-sample"));
    cue.add(this.add.rectangle(7, 3, 2, 18, color(PALETTE.buckramHighlight), 1)
      .setName("closed-session-sample-margin"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(15, -5 + index * 6, 10, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`closed-session-sample-line-${index}`));
    }
    cue.add(this.add.rectangle(20, 9, 7, 5, color(filed ? PALETTE.terminalCyan : PALETTE.classNetRed), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("closed-session-thirty-year-tag"));

    if (locked) {
      cue.add(this.add.line(0, 2, -25, -13, 25, 17, color(PALETTE.classNetRed), 0.95)
        .setLineWidth(2)
        .setName("closed-session-block-slash"));
    } else {
      cue.add(this.add.rectangle(-1, 4, 4, 24, color(PALETTE.terminalCyan), 0.72)
        .setName("closed-session-open-glow"));
      cue.add(this.add.circle(27, -9, 4, color(PALETTE.goldStamp), 1)
        .setStrokeStyle(1, color(PALETTE.black), 0.8)
        .setName("closed-session-sample-seal"));
    }

    cue.add(this.add.text(0, 21, locked ? "WITNESS\nDOCKET" : "CLASSIFIED\nSAMPLE", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: locked ? PALETTE.creamPaper : PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("closed-session-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private hacWitnessInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("witness")
      || item.label.toLowerCase().includes("witness")
      || item.label.toLowerCase().includes("hearing")
    ));
  }

  private closedSessionInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("closed")
      || item.id.toLowerCase().includes("vault")
      || item.label.toLowerCase().includes("closed")
      || item.label.toLowerCase().includes("vault")
    ));
  }

  private showEmbassyCableCue(x: number, y: number, state: "copied" | "logged") {
    this.clearCueContainers("embassy-cable-cue", "embassy-permission-cue");
    const copied = state === "copied";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 37, this.fitRect.x + this.fitRect.width - 37));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 20, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("embassy-cable-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 50, 8, color(PALETTE.black), 0.58)
      .setName("embassy-cable-shadow"));
    cue.add(this.add.rectangle(0, 0, 66, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("embassy-cable-frame"));
    cue.add(this.add.rectangle(0, -24, 52, 8, color(PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(PALETTE.terminalCyan))
      .setName("embassy-cable-title-band"));
    cue.add(this.add.text(0, -28, copied ? "CABLE COPIED" : "CABLE LOG", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("embassy-cable-title"));

    cue.add(this.add.rectangle(-15, 5, 24, 19, color(PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(PALETTE.terminalCyan))
      .setName("embassy-cable-telex"));
    cue.add(this.add.rectangle(-15, -6, 20, 6, color(PALETTE.stoneGray), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("embassy-cable-telex-screen"));
    cue.add(this.add.rectangle(-15, -6, 10, 2, color(PALETTE.terminalCyan), 1)
      .setName("embassy-cable-screen-glow"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(-22 + index * 7, 7, 4, 3, color(PALETTE.black), 0.9)
        .setStrokeStyle(1, color(PALETTE.goldStamp), 0.75)
        .setName(`embassy-cable-key-${index}`));
    }

    cue.add(this.add.rectangle(13, 2, 20, 25, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("embassy-cable-sheet"));
    cue.add(this.add.rectangle(5, 2, 2, 19, color(PALETTE.buckramHighlight), 1)
      .setName("embassy-cable-red-margin"));
    for (let index = 0; index < 4; index += 1) {
      cue.add(this.add.rectangle(14, -6 + index * 5, 11, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`embassy-cable-line-${index}`));
    }
    cue.add(this.add.rectangle(20, 9, 6, 5, color(PALETTE.terminalCyan), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("embassy-cable-context-tag"));

    cue.add(this.add.text(0, 21, copied ? "COPY +\nCONTEXT" : "FIELD\nNOTES", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("embassy-cable-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private showEmbassyPermissionCue(x: number, y: number, state: "locked" | "filed" | "reviewed") {
    this.clearCueContainers("embassy-cable-cue", "embassy-permission-cue");
    const locked = state === "locked";
    const filed = state === "filed";
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 38, this.fitRect.x + this.fitRect.width - 38));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 20, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("embassy-permission-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 52, 8, color(PALETTE.black), 0.58)
      .setName("embassy-permission-shadow"));
    cue.add(this.add.rectangle(0, 0, 68, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("embassy-permission-frame"));
    cue.add(this.add.rectangle(0, -24, 54, 8, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 0.98)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("embassy-permission-title-band"));
    cue.add(this.add.text(0, -28, locked ? "NEED CABLE" : filed ? "PERMIT NOTE" : "NOTE FILED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: locked ? PALETTE.classNetRed : PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("embassy-permission-title"));

    cue.add(this.add.rectangle(-13, 2, 21, 24, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("embassy-permission-note"));
    cue.add(this.add.rectangle(-22, 2, 2, 18, color(PALETTE.buckramHighlight), 1)
      .setName("embassy-permission-note-margin"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(-12, -5 + index * 6, 11, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`embassy-permission-note-line-${index}`));
    }
    cue.add(this.add.rectangle(-6, 10, 8, 4, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("embassy-permission-outcome-tag"));

    cue.add(this.add.rectangle(16, 3, 20, 23, color(locked ? PALETTE.deepRuby : PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp))
      .setName("embassy-permission-channel"));
    cue.add(this.add.rectangle(16, -7, 24, 4, color(PALETTE.stoneGray), 1)
      .setName("embassy-permission-channel-header"));
    cue.add(this.add.circle(16, 3, 6, color(PALETTE.black), 0.82)
      .setStrokeStyle(1, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan))
      .setName("embassy-permission-channel-seal"));
    cue.add(this.add.rectangle(16, 3, 8, 2, color(locked ? PALETTE.classNetRed : PALETTE.terminalCyan), 1)
      .setName("embassy-permission-seal-line"));
    if (locked) {
      cue.add(this.add.line(0, 2, -25, -13, 25, 17, color(PALETTE.classNetRed), 0.95)
        .setLineWidth(2)
        .setName("embassy-permission-block-slash"));
    } else {
      cue.add(this.add.circle(28, -9, 4, color(PALETTE.goldStamp), 1)
        .setStrokeStyle(1, color(PALETTE.black), 0.8)
        .setName("embassy-permission-approval-seal"));
      cue.add(this.add.rectangle(27, 8, 5, 12, color(PALETTE.terminalCyan), 0.7)
        .setName("embassy-permission-open-glow"));
    }

    cue.add(this.add.text(0, 21, locked ? "COPY\nCABLE" : "VISIBLE\nOUTCOME", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: locked ? PALETTE.creamPaper : PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("embassy-permission-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 10,
      duration: 420,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private embassyCableInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("chancery")
      || item.id.toLowerCase().includes("cable")
      || item.label.toLowerCase().includes("chancery")
      || item.label.toLowerCase().includes("cable")
    ));
  }

  private embassyPermissionInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("permission")
      || item.id.toLowerCase().includes("consular")
      || item.label.toLowerCase().includes("permission")
      || item.label.toLowerCase().includes("consular")
      || item.label.toLowerCase().includes("queue")
    ));
  }

  private startBlackVaultCoreEncounter() {
    if (this.routeTransitionLocked) return;
    this.routeTransitionLocked = true;
    retroAudio.transition();
    gameState.sceneProgress.blackVaultAntechamberEntered = 1;
    setObjective("Black Vault Lair: challenge DANN-E at the live core.");
    setLatestMessage("Obelisk core route opened: statutory clock and DANN-E encounter engaged.");
    const target = this.blackVaultCoreInteractable();
    this.showBlackVaultCoreCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y
    );
    this.time.delayedCall(760, () => {
      this.scene.start("BlackVaultLairScene");
    });
  }

  private showBlackVaultCoreCue(x: number, y: number) {
    this.clearCueContainers("black-vault-core-cue", "snes-statutory-clock");
    const clock = getStatutoryClockStateReadout();
    const cueX = snapPixel(Phaser.Math.Clamp(x - 42, this.fitRect.x + 43, this.fitRect.x + this.fitRect.width - 114));
    const cueY = snapPixel(Phaser.Math.Clamp(y + 34, TOP_SAFE_BAND + 92, GAME_HEIGHT - BOTTOM_SAFE_BAND - 48));
    const cue = this.add.container(cueX, cueY)
      .setName("black-vault-core-cue")
      .setDepth(946);

    cue.add(this.add.ellipse(0, 25, 66, 9, color(PALETTE.black), 0.66)
      .setName("black-vault-core-shadow"));
    cue.add(this.add.rectangle(0, 0, 76, 45, color(PALETTE.black), 0.95)
      .setStrokeStyle(1, color(PALETTE.classNetRed))
      .setName("black-vault-core-frame"));
    cue.add(this.add.rectangle(0, -26, 58, 8, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("black-vault-core-title-band"));
    cue.add(this.add.text(0, -30, "LIVE CORE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5, 0).setName("black-vault-core-title"));

    cue.add(this.add.rectangle(-17, 4, 23, 28, color(PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(PALETTE.classNetRed))
      .setName("black-vault-core-obelisk"));
    cue.add(this.add.rectangle(-17, -9, 15, 5, color(PALETTE.classNetRed), 1)
      .setName("black-vault-core-eye"));
    cue.add(this.add.rectangle(-17, 5, 9, 7, color(PALETTE.goldStamp), 0.92)
      .setStrokeStyle(1, color(PALETTE.black), 0.8)
      .setName("black-vault-core-chest"));
    cue.add(this.add.rectangle(-17, 16, 17, 3, color(PALETTE.terminalCyan), 0.72)
      .setName("black-vault-core-queue-glow"));

    cue.add(this.add.rectangle(16, 1, 27, 26, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("black-vault-core-record-card"));
    cue.add(this.add.rectangle(8, -6, 2, 17, color(PALETTE.buckramHighlight), 1)
      .setName("black-vault-core-record-margin"));
    for (let index = 0; index < 4; index += 1) {
      cue.add(this.add.rectangle(18, -8 + index * 6, 12, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.creamPaper), 1)
        .setName(`black-vault-core-record-line-${index}`));
    }
    cue.add(this.add.rectangle(24, 12, 7, 5, color(PALETTE.classNetRed), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("black-vault-core-shortcut-tag"));

    cue.add(this.add.text(0, 22, "DANN-E\n30YR", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("black-vault-core-caption"));

    const clockX = snapPixel(Phaser.Math.Clamp(cueX + 84, this.fitRect.x + 36, this.fitRect.x + this.fitRect.width - 36));
    const clockY = snapPixel(Phaser.Math.Clamp(cueY, TOP_SAFE_BAND + 96, GAME_HEIGHT - BOTTOM_SAFE_BAND - 40));
    const clockCue = addSnesStatutoryClock(this, {
      x: clockX,
      y: clockY,
      elapsedYears: clock.elapsedYears,
      deadlineYears: clock.deadlineYears,
      yearsRemaining: clock.yearsRemaining,
      status: clock.status,
      depth: 947
    });
    clockCue.setData("blackVaultCoreCue", true);

    this.tweens.add({
      targets: [cue, clockCue],
      y: "-=4",
      duration: 200,
      ease: "Stepped",
      easeParams: [2],
      yoyo: true,
      hold: 240
    });
  }

  private blackVaultCoreInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("vault_core")
      || item.id.toLowerCase().includes("core")
      || item.label.toLowerCase().includes("obelisk")
      || item.label.toLowerCase().includes("core")
    ));
  }

  private showArchiveGuideCue(x: number, y: number) {
    this.clearCueContainers("archive-guide-cue");
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 39, this.fitRect.x + this.fitRect.width - 39));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 26, TOP_SAFE_BAND + 86, GAME_HEIGHT - BOTTOM_SAFE_BAND - 47));
    const cue = this.add.container(cueX, cueY)
      .setName("archive-guide-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 24, 56, 8, color(PALETTE.black), 0.58)
      .setName("archive-guide-shadow"));
    cue.add(this.add.rectangle(0, 0, 68, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(PALETTE.openNetGreen))
      .setName("archive-guide-frame"));
    cue.add(this.add.rectangle(0, -24, 54, 8, color(PALETTE.deepRuby), 0.98)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.95)
      .setName("archive-guide-title-band"));
    cue.add(this.add.text(0, -28, "ARCHIVE GUIDE", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.openNetGreen,
      align: "center"
    }).setOrigin(0.5, 0).setName("archive-guide-title"));

    cue.add(this.add.rectangle(-18, 4, 24, 24, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("archive-guide-map"));
    cue.add(this.add.rectangle(-27, 4, 2, 18, color(PALETTE.buckramHighlight), 1)
      .setName("archive-guide-map-margin"));
    cue.add(this.add.rectangle(-18, -5, 12, 1, color(PALETTE.goldStamp), 1)
      .setName("archive-guide-map-line-0"));
    cue.add(this.add.rectangle(-18, 2, 14, 1, color(PALETTE.sepiaInk), 1)
      .setName("archive-guide-map-line-1"));
    cue.add(this.add.rectangle(-18, 9, 10, 1, color(PALETTE.sepiaInk), 1)
      .setName("archive-guide-map-line-2"));
    cue.add(this.add.rectangle(-9, 12, 6, 5, color(PALETTE.terminalCyan), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("archive-guide-source-token"));

    cue.add(this.add.rectangle(17, 7, 25, 17, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("archive-guide-box"));
    cue.add(this.add.rectangle(17, -4, 19, 5, color(PALETTE.archiveAmber), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.55)
      .setName("archive-guide-folder-tab"));
    cue.add(this.add.rectangle(26, 9, 6, 5, color(PALETTE.openNetGreen), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("archive-guide-equal-rank-tag"));
    cue.add(this.add.rectangle(3, -5, 7, 2, color(PALETTE.terminalCyan), 1)
      .setName("archive-guide-route-link"));

    cue.add(this.add.text(0, 12, "EVIDENCE PATH", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("archive-guide-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 7,
      duration: 340,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private archiveGuideInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("archive_guide")
      || item.id.toLowerCase().includes("historian")
      || item.label.toLowerCase().includes("archive guide")
      || item.label.toLowerCase().includes("historian")
    ));
  }

  private checkCoffeeStation() {
    const firstCheck = !gameState.sceneProgress.coffeeStationChecked;
    gameState.sceneProgress.coffeeStationChecked = 1;
    if (firstCheck) addDocumentPoints(1, "coffee station focus restored for annotation pass");
    retroAudio.confirm();
    setObjective("Office of the Historian: refreshed; return to the FRUS bookshelf or production desks.");
    setLatestMessage(firstCheck
      ? "Coffee Station checked: focus restored for the next annotation pass."
      : "Coffee Station already checked.");
    const target = this.coffeeStationInteractable();
    this.showCoffeeStationCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      firstCheck
    );
    this.showMapDialog("COFFEE STATION", [
      "The coffee is strong enough to support a full annotation pass.",
      firstCheck ? "Focus restored: +1 document point." : "The pot is already logged in the office routine."
    ]);
  }

  private showCoffeeStationCue(x: number, y: number, awarded: boolean) {
    this.clearCueContainers("coffee-station-cue");
    const cueX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 36, this.fitRect.x + this.fitRect.width - 36));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 24, TOP_SAFE_BAND + 88, GAME_HEIGHT - BOTTOM_SAFE_BAND - 46));
    const cue = this.add.container(cueX, cueY)
      .setName("coffee-station-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 23, 50, 8, color(PALETTE.black), 0.58)
      .setName("coffee-station-shadow"));
    cue.add(this.add.rectangle(0, 0, 64, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(awarded ? PALETTE.goldStamp : PALETTE.stoneGray))
      .setName("coffee-station-frame"));
    cue.add(this.add.rectangle(0, -24, 48, 8, color(PALETTE.deepRuby), 0.98)
      .setStrokeStyle(1, color(awarded ? PALETTE.terminalCyan : PALETTE.stoneGray))
      .setName("coffee-station-title-band"));
    cue.add(this.add.text(0, -28, awarded ? "FOCUS +1" : "FOCUS LOG", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: awarded ? PALETTE.goldStamp : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("coffee-station-title"));

    cue.add(this.add.rectangle(-17, 5, 20, 18, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("coffee-station-mug"));
    cue.add(this.add.rectangle(-17, 0, 18, 5, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.creamPaper), 0.7)
      .setName("coffee-station-coffee"));
    cue.add(this.add.rectangle(-5, 5, 5, 9, color(PALETTE.black), 0.86)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("coffee-station-handle"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(-24 + index * 7, -11 - (index % 2), 2, 6, color(PALETTE.creamPaper), 0.72)
        .setName(`coffee-station-steam-${index}`));
    }

    cue.add(this.add.rectangle(14, 3, 20, 24, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("coffee-station-note"));
    cue.add(this.add.rectangle(6, 3, 2, 18, color(PALETTE.buckramHighlight), 1)
      .setName("coffee-station-note-margin"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(15, -5 + index * 6, 11, 1, color(index === 0 ? PALETTE.goldStamp : PALETTE.sepiaInk), 1)
        .setName(`coffee-station-note-line-${index}`));
    }
    cue.add(this.add.rectangle(23, 11, 6, 5, color(awarded ? PALETTE.terminalCyan : PALETTE.stoneGray), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("coffee-station-focus-tag"));

    cue.add(this.add.text(0, 21, awarded ? "ANNOTATION\nREADY" : "POT\nLOGGED", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: awarded ? PALETTE.terminalCyan : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("coffee-station-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 8,
      duration: 360,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 500,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private coffeeStationInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("coffee")
      || item.label.toLowerCase().includes("coffee")
    ));
  }

  private checkStreetSign() {
    const firstCheck = !gameState.sceneProgress.foggyBottomStreetSignChecked;
    gameState.sceneProgress.foggyBottomStreetSignChecked = 1;
    if (firstCheck) addDocumentPoints(1, "Foggy Bottom route sign checked");
    retroAudio.confirm();
    setObjective("Foggy Bottom: stay on the sidewalk and use the Truman Building entrance.");
    setLatestMessage(firstCheck
      ? "23rd Street Sign checked: route to the Truman Building confirmed."
      : "23rd Street Sign already checked.");
    const target = this.streetSignInteractable();
    this.showStreetSignCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      firstCheck
    );
    this.showMapDialog("23RD STREET SIGN", [
      "23rd Street is traffic, not a research route. Stay on the sidewalk.",
      firstCheck ? "Route confirmed: +1 document point." : "The pedestrian route is already confirmed."
    ]);
  }

  private showStreetSignCue(x: number, y: number, awarded: boolean) {
    this.clearCueContainers("street-sign-cue");
    const cueX = snapPixel(Phaser.Math.Clamp(x - 28, this.fitRect.x + 42, this.fitRect.x + this.fitRect.width - 44));
    const cueY = snapPixel(Phaser.Math.Clamp(y - 18, TOP_SAFE_BAND + 86, GAME_HEIGHT - BOTTOM_SAFE_BAND - 47));
    const cue = this.add.container(cueX, cueY)
      .setName("street-sign-cue")
      .setDepth(940);

    cue.add(this.add.ellipse(0, 24, 54, 8, color(PALETTE.black), 0.58)
      .setName("street-sign-shadow"));
    cue.add(this.add.rectangle(0, 0, 66, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(awarded ? PALETTE.terminalCyan : PALETTE.stoneGray))
      .setName("street-sign-frame"));
    cue.add(this.add.rectangle(0, -24, 52, 8, color(PALETTE.deepRuby), 0.98)
      .setStrokeStyle(1, color(awarded ? PALETTE.goldStamp : PALETTE.stoneGray))
      .setName("street-sign-title-band"));
    cue.add(this.add.text(0, -28, awarded ? "ROUTE +1" : "ROUTE LOG", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: awarded ? PALETTE.goldStamp : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("street-sign-title"));

    cue.add(this.add.rectangle(-18, 12, 4, 22, color(PALETTE.stoneGray), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.8)
      .setName("street-sign-post"));
    cue.add(this.add.rectangle(-18, -3, 30, 18, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("street-sign-board"));
    cue.add(this.add.rectangle(-26, -8, 10, 3, color(PALETTE.classNetRed), 1)
      .setName("street-sign-red-route"));
    cue.add(this.add.rectangle(-12, -2, 12, 3, color(PALETTE.stoneDark), 1)
      .setName("street-sign-blue-route"));
    cue.add(this.add.rectangle(-24, 5, 18, 2, color(PALETTE.sepiaInk), 1)
      .setName("street-sign-text-line"));

    cue.add(this.add.rectangle(17, 6, 28, 18, color(PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(PALETTE.stoneGray))
      .setName("street-sign-road"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(6 + index * 9, 6, 4, 1, color(PALETTE.paleGold), 1)
        .setName(`street-sign-road-stripe-${index}`));
    }
    cue.add(this.add.rectangle(18, -8, 28, 5, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.openNetGreen), 0.9)
      .setName("street-sign-sidewalk"));
    cue.add(this.add.triangle(29, -8, -3, -4, -3, 4, 4, 0, color(PALETTE.terminalCyan), 1)
      .setName("street-sign-sidewalk-arrow"));
    cue.add(this.add.rectangle(27, 14, 9, 6, color(awarded ? PALETTE.terminalCyan : PALETTE.stoneGray), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7)
      .setName("street-sign-route-tag"));

    cue.add(this.add.text(0, 15, awarded ? "SIDEWALK\nONLY" : "SIGN\nLOGGED", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: awarded ? PALETTE.terminalCyan : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("street-sign-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 8,
      duration: 360,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 500,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private streetSignInteractable() {
    return this.interactables.find((item) => (
      item.id.toLowerCase().includes("street")
      || item.id.toLowerCase().includes("sign")
      || item.label.toLowerCase().includes("street")
      || item.label.toLowerCase().includes("sign")
    ));
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
    const catalog = this.interactables.find((item) => (
      item.id.toLowerCase().includes("catalog") || item.label.toLowerCase().includes("catalog")
    ));
    this.showNaraCatalogRewardCue(
      catalog?.x ?? this.player.position.x,
      catalog?.y ?? this.player.position.y,
      result.itemsToAward.length > 0
    );
    this.showMapDialog("NARA ARCHIVIST", [...result.pages]);
  }

  private fileStackControlManifest() {
    const result = fileStackControlManifest({
      naraCatalogFiled: Boolean(gameState.sceneProgress.naraCatalogFiled),
      alreadyFiled: Boolean(gameState.sceneProgress.stackControlManifestFiled),
      inventory: gameState.inventory,
      currentRecordCollectionStep: gameState.sceneProgress.recordCollectionStep ?? 0
    });

    if (!result.ok) {
      retroAudio.warning();
      setObjective(result.objective);
      setLatestMessage(result.message);
      const target = this.stackManifestInteractable();
      this.showStackManifestRewardCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y,
        "blocked"
      );
      this.showMapDialog("STACK CONTROL", [...result.pages]);
      return;
    }

    gameState.sceneProgress.recordCollectionStep = result.nextRecordCollectionStep;
    if (result.shouldFileManifest) gameState.sceneProgress.stackControlManifestFiled = 1;
    if (result.nextRecordCollectionStep >= 3) gameState.sceneProgress.recordCollectionComplete = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "NARA stack transfer manifest filed");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.stackManifestInteractable();
    this.showStackManifestRewardCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.itemsToAward.length > 0 || result.shouldFileManifest ? "awarded" : "filed"
    );
    this.showMapDialog("STACK CONTROL", [...result.pages]);
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
      const target = this.redZoneGateInteractable();
      this.showRedZoneGateCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y,
        "locked"
      );
      this.showMapDialog("RED ZONE", [...result.pages]);
      return;
    }

    if (result.shouldOpenGate) gameState.sceneProgress.redZoneDeclassification = 1;
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "Red Zone declassification gate opened");
    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.redZoneGateInteractable();
    this.showRedZoneGateCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.shouldOpenGate ? "opened" : "open"
    );
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
      const target = this.nscGateInteractable();
      this.showNscSourceGateCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y,
        "blocked"
      );
      this.showMapDialog("SECRET SERVICE", [...result.pages]);
      return;
    }

    if (result.shouldClearGate) gameState.sceneProgress.nsc_clearance = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "White House and NSC source coverage certified");
    if (result.shouldClearGate) this.refreshDoorRouteBadges();

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.nscGateInteractable();
    this.showNscSourceGateCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.shouldClearGate ? "cleared" : "open"
    );
    this.showMapDialog("SECRET SERVICE", [...result.pages]);
  }

  private fileOvalOfficeBriefing() {
    const result = fileOvalOfficeBriefing({
      nscClearance: Boolean(gameState.sceneProgress.nsc_clearance),
      repositoryCoverageMapComplete: Boolean(gameState.sceneProgress.repositoryCoverageMapComplete),
      alreadyFiled: Boolean(gameState.sceneProgress.ovalOfficeBriefingFiled),
      inventory: gameState.inventory
    });

    if (!result.ok) {
      retroAudio.warning();
      setObjective(result.objective);
      setLatestMessage(result.message);
      const target = this.ovalBriefingInteractable();
      this.showOvalBriefingCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y,
        "locked"
      );
      this.showMapDialog("OVAL OFFICE DESK", [...result.pages]);
      return;
    }

    if (result.shouldFileBriefing) gameState.sceneProgress.ovalOfficeBriefingFiled = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "Oval Office chronology briefing filed");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.ovalBriefingInteractable();
    this.showOvalBriefingCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.shouldFileBriefing || result.itemsToAward.length > 0 ? "filed" : "reviewed"
    );
    this.showMapDialog("OVAL OFFICE DESK", [...result.pages]);
  }

  private fileCapitolHacPacket() {
    const result = fileCapitolHacPacket({
      alreadyFiled: Boolean(gameState.sceneProgress.senateHacReviewComplete),
      inventory: gameState.inventory,
      currentStep: gameState.sceneProgress.senateHacReviewStep ?? 0
    });

    gameState.sceneProgress.senateHacReviewStep = result.nextStep;
    if (result.shouldCompleteHearing) gameState.sceneProgress.senateHacReviewComplete = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    const treatyAdded = addDanneItem("treaty-fragments", result.treatyFragmentIndex);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "HAC process docket filed at witness table");

    if (treatyAdded) retroAudio.danneItemPickup("Treaty Fragment II");
    else retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.hacWitnessInteractable();
    this.showHacWitnessCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.shouldCompleteHearing || result.itemsToAward.length > 0 ? "filed" : "reviewed"
    );
    this.showMapDialog("WITNESS TABLE", [
      ...result.pages,
      result.shouldCompleteHearing
        ? `HAC review ${HAC_HEARING_PROMPTS.length}/${HAC_HEARING_PROMPTS.length}: process docket complete.`
        : "The hearing packet is already on the FRUS production board."
    ]);
  }

  private inspectClosedSessionSample() {
    const result = inspectClosedSessionSample({
      hacReviewComplete: Boolean(gameState.sceneProgress.senateHacReviewComplete),
      alreadyFiled: Boolean(gameState.sceneProgress.closedSessionAccess),
      inventory: gameState.inventory
    });

    if (!result.ok) {
      retroAudio.warning();
      setObjective(result.objective);
      setLatestMessage(result.message);
      const target = this.closedSessionInteractable();
      this.showClosedSessionCue(
        target?.x ?? this.player.position.x,
        target?.y ?? this.player.position.y,
        "locked"
      );
      this.showMapDialog("CLOSED SESSION", [...result.pages]);
      return;
    }

    if (result.shouldFileSample) gameState.sceneProgress.closedSessionAccess = 1;
    for (const item of result.itemsToAward) addInventoryItem(item);
    if (result.documentPoints > 0) addDocumentPoints(result.documentPoints, "closed-session 30-year HAC sample filed");

    retroAudio.confirm();
    setObjective(result.objective);
    setLatestMessage(result.message);
    const target = this.closedSessionInteractable();
    this.showClosedSessionCue(
      target?.x ?? this.player.position.x,
      target?.y ?? this.player.position.y,
      result.shouldFileSample || result.itemsToAward.length > 0 ? "filed" : "reviewed"
    );
    this.showMapDialog("CLOSED SESSION", [...result.pages]);
  }

  private handleTriggers() {
    const foot = new Phaser.Geom.Rectangle(this.player.position.x - 4, this.player.position.y - 4, 8, 8);
    for (const trigger of this.triggerZones) {
      if (trigger.fired || !Phaser.Geom.Intersects.RectangleToRectangle(foot, trigger.rect)) continue;
      trigger.fired = true;
      if (trigger.action === "room-dialog") {
        this.showFrusPhaseCue(trigger);
        this.showMapDialog(trigger.label.toUpperCase(), trigger.text);
      }
    }
  }

  private showFrusPhaseCue(trigger: TriggerZone) {
    this.clearCueContainers("frus-phase-cue");
    const phase = this.frusPhaseCueDetails(trigger.label);
    const sourceX = trigger.rect.centerX;
    const sourceY = trigger.rect.y + 36;
    const cueX = snapPixel(Phaser.Math.Clamp(sourceX, this.fitRect.x + 42, this.fitRect.x + this.fitRect.width - 42));
    const cueY = snapPixel(Phaser.Math.Clamp(sourceY, TOP_SAFE_BAND + 84, GAME_HEIGHT - BOTTOM_SAFE_BAND - 48));
    const cue = this.add.container(cueX, cueY)
      .setName("frus-phase-cue")
      .setDepth(939);

    cue.add(this.add.ellipse(0, 24, 58, 8, color(PALETTE.black), 0.58)
      .setName("frus-phase-shadow"));
    cue.add(this.add.rectangle(0, 0, 68, 42, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(phase.accent))
      .setName("frus-phase-frame"));
    cue.add(this.add.rectangle(0, -24, 52, 8, color(PALETTE.deepRuby), 0.98)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.95)
      .setName("frus-phase-title-band"));
    cue.add(this.add.text(0, -28, phase.title, {
      fontFamily: "monospace",
      fontSize: phase.title.length > 9 ? "4px" : "5px",
      color: phase.accent,
      align: "center"
    }).setOrigin(0.5, 0).setName("frus-phase-title"));

    this.drawFrusPhaseIcon(cue, phase.kind, phase.accent);

    cue.add(this.add.text(0, 12, phase.caption, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("frus-phase-caption"));

    this.tweens.add({
      targets: cue,
      y: cue.y - 7,
      duration: 340,
      ease: "Stepped",
      easeParams: [3],
      yoyo: true,
      hold: 520,
      onComplete: () => {
        this.tweens.add({
          targets: cue,
          alpha: 0,
          duration: 220,
          ease: "Stepped",
          onComplete: () => cue.destroy()
        });
      }
    });
  }

  private frusPhaseCueDetails(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes("compilation")) {
      return {
        title: "COMPILATION",
        caption: "SELECT RECORD",
        accent: PALETTE.goldStamp,
        kind: "volume" as const
      };
    }
    if (normalized.includes("declass")) {
      return {
        title: "DECLASS",
        caption: "ROUTE EQUITY",
        accent: PALETTE.classNetRed,
        kind: "redaction" as const
      };
    }
    if (normalized.includes("annotation")) {
      return {
        title: "ANNOTATION",
        caption: "EVIDENCE NOTE",
        accent: PALETTE.terminalCyan,
        kind: "note" as const
      };
    }
    if (normalized.includes("publication")) {
      return {
        title: "PUBLICATION",
        caption: "BIND VOLUME",
        accent: PALETTE.paleGold,
        kind: "press" as const
      };
    }
    return {
      title: "RESEARCH",
      caption: "SOURCE TRAIL",
      accent: PALETTE.openNetGreen,
      kind: "source" as const
    };
  }

  private drawFrusPhaseIcon(
    cue: Phaser.GameObjects.Container,
    kind: "source" | "volume" | "redaction" | "note" | "press",
    accent: string
  ) {
    cue.add(this.add.rectangle(-19, 3, 21, 25, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setName("frus-phase-document"));
    cue.add(this.add.rectangle(-28, 3, 2, 19, color(PALETTE.buckramHighlight), 1)
      .setName("frus-phase-margin"));
    for (let index = 0; index < 3; index += 1) {
      cue.add(this.add.rectangle(-18, -6 + index * 6, 12, 1, color(index === 0 ? accent : PALETTE.sepiaInk), 1)
        .setName(`frus-phase-line-${index}`));
    }

    if (kind === "source") {
      cue.add(this.add.rectangle(16, 3, 24, 19, color(PALETTE.deepBrown), 1)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setName("frus-phase-source-box"));
      cue.add(this.add.rectangle(16, -6, 18, 4, color(PALETTE.archiveAmber), 1)
        .setName("frus-phase-source-tab"));
      cue.add(this.add.rectangle(23, 9, 7, 5, color(PALETTE.terminalCyan), 1)
        .setStrokeStyle(1, color(PALETTE.black), 0.7)
        .setName("frus-phase-source-token"));
      return;
    }

    if (kind === "volume") {
      cue.add(this.add.rectangle(16, 3, 22, 26, color(PALETTE.buckramHighlight), 1)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setName("frus-phase-volume"));
      cue.add(this.add.rectangle(7, 3, 3, 24, color(PALETTE.deepRuby), 1)
        .setName("frus-phase-volume-spine"));
      cue.add(this.add.rectangle(17, -5, 14, 2, color(PALETTE.paleGold), 1)
        .setName("frus-phase-volume-band-top"));
      cue.add(this.add.rectangle(17, 10, 14, 2, color(PALETTE.paleGold), 1)
        .setName("frus-phase-volume-band-bottom"));
      return;
    }

    if (kind === "redaction") {
      cue.add(this.add.rectangle(17, -4, 28, 5, color(PALETTE.classNetRed), 1)
        .setName("frus-phase-redaction-bar-top"));
      cue.add(this.add.rectangle(17, 8, 24, 5, color(PALETTE.black), 1)
        .setStrokeStyle(1, color(PALETTE.classNetRed), 0.82)
        .setName("frus-phase-redaction-bar-bottom"));
      cue.add(this.add.rectangle(28, 1, 8, 18, color(PALETTE.stoneDark), 1)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setName("frus-phase-redaction-gate"));
      return;
    }

    if (kind === "note") {
      cue.add(this.add.rectangle(15, 3, 23, 22, color(PALETTE.creamPaper), 1)
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
        .setName("frus-phase-note-card"));
      cue.add(this.add.rectangle(7, 3, 2, 17, color(PALETTE.buckramHighlight), 1)
        .setName("frus-phase-note-margin"));
      cue.add(this.add.rectangle(16, -5, 11, 1, color(PALETTE.goldStamp), 1)
        .setName("frus-phase-note-citation"));
      cue.add(this.add.rectangle(18, 3, 15, 1, color(PALETTE.sepiaInk), 1)
        .setName("frus-phase-note-line"));
      cue.add(this.add.rectangle(24, 10, 7, 5, color(PALETTE.terminalCyan), 1)
        .setStrokeStyle(1, color(PALETTE.black), 0.75)
        .setName("frus-phase-note-seal"));
      return;
    }

    cue.add(this.add.rectangle(16, 4, 25, 19, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("frus-phase-press-frame"));
    cue.add(this.add.rectangle(16, -4, 19, 4, color(PALETTE.paleGold), 1)
      .setName("frus-phase-press-roller"));
    cue.add(this.add.rectangle(16, 8, 21, 4, color(PALETTE.creamPaper), 1)
      .setName("frus-phase-press-page"));
    cue.add(this.add.rectangle(26, 2, 4, 18, color(PALETTE.goldStamp), 1)
      .setName("frus-phase-press-lever"));
  }

  private suppressSpawnTrigger(spawn: Position) {
    const spawnFoot = new Phaser.Geom.Rectangle(spawn.x - 5, spawn.y - 5, 10, 10);
    for (const trigger of this.triggerZones) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(spawnFoot, trigger.rect)) {
        trigger.fired = true;
      }
    }
  }

  private findSpawn(spawnId: string) {
    const spawn = (this.layer("spawns")?.objects ?? []).find((object) => object.name === spawnId);
    if (!spawn) return null;
    return this.pointFromSource(spawn.x, spawn.y);
  }

  private adjustSpawnAwayFromWorldExit(spawn: Position): Position {
    const exit = this.doors.find((door) => {
      if (door.target.scene !== "WorldMapScene") return false;
      return Phaser.Math.Distance.Between(spawn.x, spawn.y, door.x, door.y) <= (door.radius ?? 18) + 4;
    });
    if (!exit) return spawn;

    const center = {
      x: this.fitRect.x + this.fitRect.width / 2,
      y: this.fitRect.y + this.fitRect.height / 2
    };
    const dx = center.x - exit.x;
    const dy = center.y - exit.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const distance = (exit.radius ?? 18) + 6;
    return {
      x: snapPixel(Phaser.Math.Clamp(exit.x + (dx / length) * distance, this.fitRect.x + 14, this.fitRect.x + this.fitRect.width - 14)),
      y: snapPixel(Phaser.Math.Clamp(exit.y + (dy / length) * distance, this.fitRect.y + 18, this.fitRect.y + this.fitRect.height - 14))
    };
  }

  private openBlackVaultBlastDoors() {
    gameState.sceneProgress.blackVaultWestOpen = 1;
    gameState.sceneProgress.blackVaultNorthOpen = 1;
    setObjective("Black Vault Lair: west and north blast doors are open after human review.");
    setLatestMessage("Black Vault blast doors opened after DANN-E was cleared.");
    this.refreshDoorRouteBadges();
  }

  private routeReadouts() {
    return this.doors.map((door) => gameplayMapRouteReadout({
      scene: door.target.scene,
      mapKey: door.target.mapKey,
      locked: Boolean(door.target.requiredFlag && !gameState.sceneProgress[door.target.requiredFlag])
    }));
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

  private pointFromRatio(xRatio: number, yRatio: number) {
    return {
      x: snapPixel(this.fitRect.x + this.fitRect.width * xRatio),
      y: snapPixel(this.fitRect.y + this.fitRect.height * yRatio)
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

  private drawDoorRouteBadge(x: number, y: number, target: DoorTarget) {
    const locked = Boolean(target.requiredFlag && !gameState.sceneProgress[target.requiredFlag]);
    const label = gameplayMapRouteBadgeLabel({
      scene: target.scene,
      mapKey: target.mapKey,
      locked
    });
    const direction = this.routeDirectionForPoint(x, y);
    const badgeWidth = Math.max(24, Math.min(42, label.length * 5 + 8));
    const badgeX = snapPixel(Phaser.Math.Clamp(
      x,
      this.fitRect.x + badgeWidth / 2 + 2,
      this.fitRect.x + this.fitRect.width - badgeWidth / 2 - 2
    ));
    const badgeY = snapPixel(Phaser.Math.Clamp(
      y + (direction === "N" ? 13 : direction === "S" ? -13 : 12),
      this.fitRect.y + 11,
      this.fitRect.y + this.fitRect.height - 11
    ));
    const accent = locked ? PALETTE.classNetRed : PALETTE.goldStamp;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(badgeX + 1, badgeY + 1, badgeWidth, 12, color(PALETTE.black), 0.42)
      .setName("gameplay-map-route-badge-shadow")
      .setDepth(badgeY + 8));
    objects.push(this.add.rectangle(badgeX, badgeY, badgeWidth, 12, color(PALETTE.black), 0.86)
      .setStrokeStyle(1, color(accent), 0.9)
      .setName("gameplay-map-route-badge")
      .setDepth(badgeY + 9));
    objects.push(this.add.text(badgeX - badgeWidth / 2 + 4, badgeY - 4, direction, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setName("gameplay-map-route-arrow").setOrigin(0, 0).setDepth(badgeY + 10));
    objects.push(this.add.text(badgeX - badgeWidth / 2 + 12, badgeY - 4, label, {
      fontFamily: "monospace",
      fontSize: label.length > 7 ? "5px" : "6px",
      color: locked ? PALETTE.classNetRed : PALETTE.goldStamp
    }).setName("gameplay-map-route-label").setOrigin(0, 0).setDepth(badgeY + 10));
    if (locked) {
      objects.push(this.add.rectangle(badgeX + badgeWidth / 2 - 5, badgeY, 4, 5, color(PALETTE.classNetRed), 0.9)
        .setName("gameplay-map-route-lock")
        .setDepth(badgeY + 11));
    }
    return objects;
  }

  private setDoorRouteBadge(id: string, x: number, y: number, target: DoorTarget) {
    this.clearDoorRouteBadge(id);
    const badgeObjects = this.drawDoorRouteBadge(x, y, target);
    this.doorRouteBadges.set(id, badgeObjects);
  }

  private clearDoorRouteBadge(id: string) {
    const existing = this.doorRouteBadges.get(id) ?? [];
    for (const object of existing) object.destroy();
    this.doorRouteBadges.delete(id);
  }

  private clearAllDoorRouteBadges() {
    for (const id of [...this.doorRouteBadges.keys()]) this.clearDoorRouteBadge(id);
  }

  private refreshDoorRouteBadges() {
    for (const door of this.doors) {
      this.setDoorRouteBadge(door.id, door.x, door.y, door.target);
    }
    this.updateVisibleMapState();
  }

  private routeDirectionForPoint(x: number, y: number) {
    const centerX = this.fitRect.x + this.fitRect.width / 2;
    const centerY = this.fitRect.y + this.fitRect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "W" : "E";
    return dy < 0 ? "N" : "S";
  }

  private updateFrusFloorCurrentStage(force = false) {
    if (this.mapKey !== "frus_floor" || !this.player) return;
    const ratio = this.frusFloorPlayerRatio();
    const step = frusProductionFloorStepForRatio(ratio);
    if (!force && this.frusFloorCurrentStageCode === step.code) return;
    this.frusFloorCurrentStageCode = step.code;
    this.clearFrusFloorCurrentStageCursor();
    this.drawFrusFloorCurrentStageCursor(step);
    this.updateVisibleMapState();
  }

  private frusFloorPlayerRatio() {
    if (!this.player) return 0;
    return Phaser.Math.Clamp((this.player.position.x - this.fitRect.x) / Math.max(1, this.fitRect.width), 0, 1);
  }

  private frusFloorRailY() {
    return snapPixel(Phaser.Math.Clamp(
      this.fitRect.y + this.fitRect.height - 76,
      this.fitRect.y + 64,
      this.fitRect.y + this.fitRect.height - 56
    ));
  }

  private frusFloorGateContext(): FrusProductionFloorGateContext {
    const selectedDocuments = gameState.documentCandidates.filter((document) => (
      document.selected
      || document.workflowState === "selected"
      || document.workflowState === "source_note_needed"
      || document.workflowState === "citation_verified"
      || document.workflowState === "annotation_needed"
      || document.workflowState === "ready_for_review"
      || document.workflowState === "submitted_for_review"
      || document.workflowState === "referred"
      || document.workflowState === "cleared"
      || document.workflowState === "ready_for_proof"
      || document.workflowState === "proofed"
      || document.workflowState === "published"
    )).length;
    return {
      citationStamp: hasProcessItem("citation_stamp")
        || gameState.processStamps.includes("archive")
        || Boolean(gameState.sceneProgress.sourceNoteProvenanceComplete),
      selectionReady: selectedDocuments > 0
        || Boolean(gameState.sceneProgress.selectionDocketComplete)
        || Boolean(gameState.sceneProgress.policyCoverageAuditComplete),
      clearanceReady: hasProcessItem("clearance_token")
        || hasProcessItem("concurrence_slip")
        || gameState.processStamps.includes("network")
        || gameState.processStamps.includes("referral")
        || Boolean(gameState.sceneProgress.declassificationReviewComplete),
      editorialReady: hasProcessItem("red_pencil")
        || hasProcessItem("proof_lens")
        || gameState.processStamps.includes("proof")
        || Boolean(gameState.sceneProgress.annotationDraftingComplete)
        || Boolean(gameState.sceneProgress.aiAnnotationReviewComplete)
        || Boolean(gameState.sceneProgress.typesetterProofComplete),
      buckramReady: hasProcessItem("buckram_key")
        || gameState.finalGateCertification?.status === "published"
        || Boolean(gameState.sceneProgress.kelloggFinalCertificationComplete)
    };
  }

  private updateFrusFloorGateStatus(force = false) {
    if (this.mapKey !== "frus_floor") return;
    const context = this.frusFloorGateContext();
    const key = frusProductionFloorGateSummary(context);
    if (!force && this.frusFloorGateStatusKey === key) return;
    this.frusFloorGateStatusKey = key;
    this.clearFrusFloorGateStatus();
    this.drawFrusFloorGateStatus(context);
    this.updateVisibleMapState();
  }

  private frusFloorPromptHintTarget(nearest: Interactable | null, hintTarget: Interactable | null) {
    if (nearest || this.mapKey !== "frus_floor") return hintTarget;
    return this.interactables.find((item) => item.id === this.frusFloorNextGateInteractableId) ?? hintTarget;
  }

  private updateFrusFloorNextGateRoute(force = false) {
    if (this.mapKey !== "frus_floor" || !this.player) {
      this.clearFrusFloorNextGateRoute();
      this.frusFloorNextGateRouteKey = "";
      return;
    }
    const context = this.frusFloorGateContext();
    const gate = frusProductionFloorNextGate(context);
    const routeTarget = gate ?? this.frusFloorReadyGateRouteTarget();
    const playerX = snapPixel(this.player.position.x);
    const playerY = snapPixel(this.player.position.y);
    const key = `${routeTarget.code}:${playerX}:${playerY}`;
    if (!force && this.frusFloorNextGateRouteKey === key) return;
    this.frusFloorNextGateRouteKey = key;
    this.clearFrusFloorNextGateRoute();
    this.drawFrusFloorNextGateRoute(routeTarget, playerX, playerY);
  }

  private frusFloorReadyGateRouteTarget(): FrusProductionFloorRouteTarget {
    const readyStep = FRUS_PRODUCTION_FLOOR_STEPS[FRUS_PRODUCTION_FLOOR_STEPS.length - 1];
    return {
      code: "ready",
      requirement: "READY",
      xRatio: readyStep.xRatio,
      accent: PALETTE.oldGold
    };
  }

  private updateFrusFloorNextGateInteractable(force = false) {
    if (this.mapKey !== "frus_floor") {
      this.removeFrusFloorNextGateInteractable();
      this.frusFloorNextGateInteractableKey = "";
      return;
    }
    const context = this.frusFloorGateContext();
    const gate = frusProductionFloorNextGate(context);
    const key = gate ? `${gate.code}:${gate.requirement}:${gate.status}` : "ready";
    if (!force && this.frusFloorNextGateInteractableKey === key) return;
    this.frusFloorNextGateInteractableKey = key;
    this.removeFrusFloorNextGateInteractable();
    const readyStep = FRUS_PRODUCTION_FLOOR_STEPS[FRUS_PRODUCTION_FLOOR_STEPS.length - 1];
    const xRatio = gate?.xRatio ?? readyStep.xRatio;
    const x = snapPixel(this.fitRect.x + this.fitRect.width * xRatio);
    const y = snapPixel(this.frusFloorRailY() + 12);
    this.interactables.push({
      id: this.frusFloorNextGateInteractableId,
      label: gate ? `Gate ${gate.requirement}` : "Gate READY",
      x,
      y,
      radius: 23,
      kind: "terminal",
      onInteract: () => this.inspectFrusFloorGate(gate?.code ?? null)
    });
    this.updateVisibleMapState();
  }

  private removeFrusFloorNextGateInteractable() {
    this.interactables = this.interactables.filter((item) => item.id !== this.frusFloorNextGateInteractableId);
  }

  private inspectFrusFloorGate(gateCode: string | null) {
    const context = this.frusFloorGateContext();
    const gate = gateCode
      ? frusProductionFloorGateReadouts(context).find((candidate) => candidate.code === gateCode) ?? null
      : null;
    const instruction = frusProductionFloorGateInstruction(gate);
    const summary = gate ? `${gate.code} ${gate.label} ${gate.requirement}` : "ALL GATES CLEAR";
    setLatestMessage(`FRUS floor gate: ${summary}.`);
    if (!gate) {
      this.startFrusFloorReadyTransition();
      return;
    }
    setObjective(gate?.status === "waiting"
      ? `Resolve Gate ${gate.code} ${gate.requirement}: ${instruction.pages[0]}`
      : "All FRUS Production Floor gates are clear.");
    retroAudio.confirm();
    this.showMapDialog(instruction.speaker, instruction.pages);
  }

  private startFrusFloorReadyTransition() {
    if (this.routeTransitionLocked) return;
    this.routeTransitionLocked = true;
    gameState.sceneProgress.frusProductionFloorReadyHandoff = 1;
    retroAudio.transition();
    setLatestMessage("Production Floor certified: Buckram Gate route open.");
    setObjective("Route transition: Buckram Gate final publication table.");
    beginSnesTransition({
      fromScene: this.scene.key,
      toScene: "EndingScene",
      label: "GATE READY"
    });
    playRubyMosaicTransition(this, {
      label: "GATE READY",
      onCovered: () => {
        completeSnesTransition();
        this.scene.start("EndingScene");
      }
    });
  }

  private drawFrusFloorNextGateRoute(
    gate: FrusProductionFloorRouteTarget,
    startX: number,
    startY: number
  ) {
    const targetX = snapPixel(this.fitRect.x + this.fitRect.width * gate.xRatio);
    const targetY = snapPixel(this.frusFloorRailY() + 12);
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const steps = Phaser.Math.Clamp(Math.floor(distance / 16), 2, 7);
    for (let index = 1; index <= steps; index++) {
      const t = index / (steps + 1);
      const x = snapPixel(startX + dx * t);
      const y = snapPixel(startY + dy * t);
      const tint = index % 2 === 0 ? PALETTE.terminalCyan : gate.accent;
      this.frusFloorNextGateRouteObjects.push(
        this.add.rectangle(x + 1, y + 1, 5, 5, color(PALETTE.black), 0.45)
          .setAngle(45)
          .setName("frus-production-next-gate-route-shadow")
          .setData("gateCode", gate.code)
          .setDepth(y + 5),
        this.add.rectangle(x, y, 4, 4, color(tint), 0.9)
          .setAngle(45)
          .setName("frus-production-next-gate-route-dot")
          .setData("gateCode", gate.code)
          .setDepth(y + 6)
      );
    }
  }

  private clearFrusFloorNextGateRoute() {
    for (const object of this.frusFloorNextGateRouteObjects.splice(0)) object.destroy();
  }

  private drawFrusFloorGateStatus(context: FrusProductionFloorGateContext) {
    const y = this.frusFloorRailY();
    this.drawFrusFloorGateCountPlaque(context, y);
    for (const gate of frusProductionFloorGateReadouts(context)) {
      const x = snapPixel(this.fitRect.x + this.fitRect.width * gate.xRatio);
      const complete = gate.status === "complete";
      const fill = color(complete ? PALETTE.openNetGreen : PALETTE.classNetRed);
      const stroke = color(complete ? PALETTE.terminalCyan : gate.accent);
      const label = complete ? "OK" : gate.requirement;
      this.frusFloorGateStatusObjects.push(
        this.add.rectangle(x + 6, y - 7, 4, 4, color(PALETTE.black), 0.7)
          .setName("frus-production-gate-status-shadow")
          .setDepth(y + 22),
        this.add.rectangle(x + 5, y - 8, 4, 4, fill, 0.92)
          .setStrokeStyle(1, stroke, 0.94)
          .setName("frus-production-gate-status-light")
          .setData("gateCode", gate.code)
          .setData("gateStatus", gate.status)
          .setDepth(y + 23),
        this.add.rectangle(x, y + 15, 18, 7, color(PALETTE.black), 0.78)
          .setStrokeStyle(1, stroke, 0.84)
          .setName("frus-production-gate-status-card")
          .setData("gateCode", gate.code)
          .setData("gateStatus", gate.status)
          .setDepth(y + 22),
        this.add.text(x, y + 12, label, {
          fontFamily: "monospace",
          fontSize: label.length > 2 ? "4px" : "5px",
          color: complete ? PALETTE.terminalCyan : gate.accent,
          align: "center"
        }).setName("frus-production-gate-status-label")
          .setData("gateCode", gate.code)
          .setData("gateStatus", gate.status)
          .setOrigin(0.5, 0)
          .setDepth(y + 23)
      );
      this.drawFrusFloorGateToolIcon(gate, x - 17, y + 15, {
        variant: "mini",
        alpha: complete ? 0.95 : 0.42
      });
    }
    const nextGate = frusProductionFloorNextGate(context);
    if (nextGate) {
      this.drawFrusFloorNextGateMarker(nextGate, y);
    } else {
      this.drawFrusFloorReadyGateMarker(y);
    }
  }

  private drawFrusFloorGateCountPlaque(context: FrusProductionFloorGateContext, railY: number) {
    const count = frusProductionFloorGateCount(context);
    const x = snapPixel(this.fitRect.x + this.fitRect.width - 42);
    const y = snapPixel(railY - 43);
    const fill = count.complete === count.total ? PALETTE.openNetGreen : PALETTE.deepRuby;
    this.frusFloorGateStatusObjects.push(
      this.add.rectangle(x + 1, y + 1, 47, 14, color(PALETTE.black), 0.56)
        .setName("frus-production-gate-count-shadow")
        .setDepth(railY + 23),
      this.add.rectangle(x, y, 47, 14, color(fill), count.complete === count.total ? 0.88 : 0.94)
        .setStrokeStyle(1, color(PALETTE.goldStamp), 0.96)
        .setName("frus-production-gate-count-card")
        .setData("complete", count.complete)
        .setData("total", count.total)
        .setDepth(railY + 24),
      this.add.text(x - 13, y - 5, `${count.complete}/${count.total}`, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.paleGold,
        align: "center"
      }).setOrigin(0.5, 0)
        .setName("frus-production-gate-count-label")
        .setData("complete", count.complete)
        .setData("total", count.total)
        .setDepth(railY + 25),
      this.add.text(x + 11, y - 4, "GATE", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.creamPaper,
        align: "center"
      }).setOrigin(0.5, 0)
        .setName("frus-production-gate-count-title")
        .setData("complete", count.complete)
        .setData("total", count.total)
        .setDepth(railY + 25)
    );
    for (let index = 0; index < count.total; index++) {
      const pipX = snapPixel(x - 13 + index * 6);
      const pipY = snapPixel(y + 5);
      const complete = index < count.complete;
      this.frusFloorGateStatusObjects.push(
        this.add.rectangle(pipX, pipY, 4, 2, color(complete ? PALETTE.terminalCyan : PALETTE.stoneGray), complete ? 0.95 : 0.45)
          .setName("frus-production-gate-count-pip")
          .setData("pipIndex", index)
          .setData("complete", complete)
          .setDepth(railY + 26)
      );
    }
  }

  private drawFrusFloorNextGateMarker(
    gate: NonNullable<ReturnType<typeof frusProductionFloorNextGate>>,
    railY: number
  ) {
    const nodeX = snapPixel(this.fitRect.x + this.fitRect.width * gate.xRatio);
    const centerX = this.fitRect.x + this.fitRect.width / 2;
    const labelX = Math.abs(nodeX - centerX) < 44
      ? nodeX + (nodeX < centerX ? -42 : 42)
      : nodeX;
    const x = snapPixel(Phaser.Math.Clamp(labelX, this.fitRect.x + 22, this.fitRect.x + this.fitRect.width - 22));
    const y = snapPixel(railY - 31);
    this.frusFloorGateStatusObjects.push(
      this.add.rectangle(x + 1, y + 1, 42, 11, color(PALETTE.black), 0.54)
        .setName("frus-production-next-gate-shadow")
        .setDepth(railY + 24),
      this.add.rectangle(x, y, 42, 11, color(PALETTE.deepRuby), 0.94)
        .setStrokeStyle(1, color(gate.accent), 0.94)
        .setName("frus-production-next-gate-card")
        .setData("gateCode", gate.code)
        .setDepth(railY + 25),
      this.add.text(x, y - 4, `NEXT ${gate.requirement}`, {
        fontFamily: "monospace",
        fontSize: gate.requirement.length > 3 ? "4px" : "5px",
        color: gate.accent,
        align: "center"
      }).setName("frus-production-next-gate-label")
        .setData("gateCode", gate.code)
        .setOrigin(0.5, 0)
        .setDepth(railY + 26),
      this.add.triangle(nodeX, railY - 20, -3, -3, 3, -3, 0, 4, color(gate.accent), 0.96)
        .setName("frus-production-next-gate-arrow")
        .setData("gateCode", gate.code)
        .setDepth(railY + 25)
    );
    this.drawFrusFloorGateToolIcon(gate, x + 27, y);
  }

  private drawFrusFloorReadyGateMarker(railY: number) {
    const readyGate = this.frusFloorReadyGateRouteTarget();
    const nodeX = snapPixel(this.fitRect.x + this.fitRect.width * readyGate.xRatio);
    const x = snapPixel(Phaser.Math.Clamp(nodeX - 27, this.fitRect.x + 26, this.fitRect.x + this.fitRect.width - 26));
    const y = snapPixel(railY - 31);
    this.frusFloorGateStatusObjects.push(
      this.add.rectangle(x + 1, y + 1, 52, 11, color(PALETTE.black), 0.54)
        .setName("frus-production-ready-gate-shadow")
        .setData("gateCode", readyGate.code)
        .setDepth(railY + 24),
      this.add.rectangle(x, y, 52, 11, color(PALETTE.openNetGreen), 0.88)
        .setStrokeStyle(1, color(PALETTE.goldStamp), 0.96)
        .setName("frus-production-ready-gate-card")
        .setData("gateCode", readyGate.code)
        .setDepth(railY + 25),
      this.add.rectangle(nodeX, railY - 20, 20, 3, color(PALETTE.goldStamp), 0.86)
        .setName("frus-production-ready-gate-glow")
        .setData("gateCode", readyGate.code)
        .setDepth(railY + 24),
      this.add.text(x, y - 4, "GATE READY", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.paleGold,
        align: "center"
      }).setName("frus-production-ready-gate-label")
        .setData("gateCode", readyGate.code)
        .setOrigin(0.5, 0)
        .setDepth(railY + 26),
      this.add.triangle(nodeX, railY - 20, -3, -3, 3, -3, 0, 4, color(PALETTE.goldStamp), 0.96)
        .setName("frus-production-ready-gate-arrow")
        .setData("gateCode", readyGate.code)
        .setDepth(railY + 25)
    );
  }

  private drawFrusFloorGateToolIcon(
    gate: FrusProductionFloorGateReadout,
    x: number,
    y: number,
    options: { variant?: "full" | "mini"; alpha?: number } = {}
  ) {
    const cue = frusProductionFloorGateToolCue(gate);
    if (!cue) return;
    const mini = options.variant === "mini";
    const alpha = options.alpha ?? 1;
    const depth = this.frusFloorRailY() + 27;
    const iconX = snapPixel(Phaser.Math.Clamp(x, this.fitRect.x + 8, this.fitRect.x + this.fitRect.width - 8));
    const iconY = snapPixel(y);
    const frameSize = mini ? 9 : 12;
    const frame = this.add.rectangle(iconX, iconY, frameSize, frameSize, color(PALETTE.black), mini ? 0.5 * alpha : 0.88 * alpha)
      .setStrokeStyle(1, color(gate.accent), 0.94)
      .setName("frus-production-gate-tool-icon-frame")
      .setData("gateCode", gate.code)
      .setData("gateVariant", mini ? "mini" : "full")
      .setData("itemId", cue.itemId)
      .setDepth(depth);
    this.frusFloorGateStatusObjects.push(frame);
    const addRect = (name: string, ox: number, oy: number, width: number, height: number, fill: string, alpha = 1, angle = 0) => {
      const rect = this.add.rectangle(iconX + ox, iconY + oy, width, height, color(fill), alpha * (options.alpha ?? 1))
        .setAngle(angle)
        .setName(name)
        .setData("gateCode", gate.code)
        .setData("gateVariant", mini ? "mini" : "full")
        .setData("itemId", cue.itemId)
        .setDepth(depth + 1);
      this.frusFloorGateStatusObjects.push(rect);
      return rect;
    };
    if (cue.itemId === "citation_stamp") {
      addRect("frus-production-gate-tool-icon-stamp-handle", 0, -3, 4, 3, PALETTE.goldStamp);
      addRect("frus-production-gate-tool-icon-stamp-base", 0, 1, 8, 4, PALETTE.buckramHighlight);
      addRect("frus-production-gate-tool-icon-stamp-pad", 0, 4, 9, 2, PALETTE.deepRuby);
    } else if (cue.itemId === "review_folder") {
      addRect("frus-production-gate-tool-icon-folder-back", 0, 1, 8, 7, PALETTE.goldStamp);
      addRect("frus-production-gate-tool-icon-folder-tab", -3, -3, 4, 2, PALETTE.paleGold);
      addRect("frus-production-gate-tool-icon-folder-page", 1, 0, 5, 5, PALETTE.creamPaper);
    } else if (cue.itemId === "clearance_token") {
      addRect("frus-production-gate-tool-icon-token-shadow", 0, 0, 7, 7, PALETTE.classNetRed, 0.95, 45);
      addRect("frus-production-gate-tool-icon-token-core", 0, 0, 4, 4, PALETTE.goldStamp, 1, 45);
      addRect("frus-production-gate-tool-icon-token-dot", 0, 0, 2, 2, PALETTE.creamPaper);
    } else if (cue.itemId === "red_pencil") {
      addRect("frus-production-gate-tool-icon-pencil-body", 0, 0, 10, 3, PALETTE.buckramHighlight, 1, -35);
      addRect("frus-production-gate-tool-icon-pencil-tip", 4, -3, 3, 2, PALETTE.paleGold, 1, -35);
      addRect("frus-production-gate-tool-icon-pencil-mark", -3, 4, 7, 2, PALETTE.deepRuby);
    } else if (cue.itemId === "buckram_key") {
      addRect("frus-production-gate-tool-icon-key-book", -2, 0, 6, 8, PALETTE.buckramHighlight);
      addRect("frus-production-gate-tool-icon-key-spine", -5, 0, 2, 8, PALETTE.goldStamp);
      addRect("frus-production-gate-tool-icon-key-band", -1, -2, 5, 1, PALETTE.paleGold);
      addRect("frus-production-gate-tool-icon-key-bit", 4, 3, 4, 2, PALETTE.goldStamp);
    }
    if (mini) return;
    const label = this.add.text(iconX, iconY + 7, cue.shortLabel.slice(0, 3), {
      fontFamily: "monospace",
      fontSize: "4px",
      color: gate.accent,
      align: "center"
    }).setOrigin(0.5, 0)
      .setName("frus-production-gate-tool-icon-label")
      .setData("gateCode", gate.code)
      .setData("gateVariant", "full")
      .setData("itemId", cue.itemId)
      .setDepth(depth + 2);
    this.frusFloorGateStatusObjects.push(label);
  }

  private clearFrusFloorGateStatus() {
    for (const object of this.frusFloorGateStatusObjects.splice(0)) object.destroy();
  }

  private drawFrusFloorCurrentStageCursor(step: ReturnType<typeof frusProductionFloorStepForRatio>) {
    const x = snapPixel(this.fitRect.x + this.fitRect.width * step.xRatio);
    const y = this.frusFloorRailY();
    const accent = color(step.accent);
    const label = `NOW ${step.shortLabel}`;
    const centerX = this.fitRect.x + this.fitRect.width / 2;
    const sideOffset = x <= centerX ? 43 : -43;
    const taskX = snapPixel(Phaser.Math.Clamp(x + sideOffset, this.fitRect.x + 33, this.fitRect.x + this.fitRect.width - 33));
    this.frusFloorCurrentStageObjects.push(
      this.add.ellipse(x, y + 2, 22, 13, color(PALETTE.black), 0.42)
        .setName("frus-production-current-stage-shadow")
        .setDepth(y + 17),
      this.add.rectangle(x, y, 19, 17, color(PALETTE.black), 0)
        .setStrokeStyle(1, accent, 0.96)
        .setName("frus-production-current-stage-cursor")
        .setDepth(y + 18),
      this.add.triangle(x, y - 15, -4, -4, 4, -4, 0, 4, accent, 0.96)
        .setName("frus-production-current-stage-arrow")
        .setDepth(y + 19),
      this.add.rectangle(x, y + 22, 27, 9, color(PALETTE.black), 0.84)
        .setStrokeStyle(1, accent, 0.92)
        .setName("frus-production-current-stage-card")
        .setDepth(y + 20),
      this.add.text(x, y + 18, label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: step.accent,
        align: "center"
      }).setName("frus-production-current-stage-label").setOrigin(0.5, 0).setDepth(y + 21),
      this.add.rectangle(taskX, y + 34, 64, 10, color(PALETTE.black), 0.88)
        .setStrokeStyle(1, accent, 0.9)
        .setName("frus-production-current-task-card")
        .setDepth(y + 20),
      this.add.text(taskX, y + 30, step.taskLabel, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: step.accent,
        align: "center"
      }).setName("frus-production-current-task-label").setOrigin(0.5, 0).setDepth(y + 21)
    );
  }

  private clearFrusFloorCurrentStageCursor() {
    for (const object of this.frusFloorCurrentStageObjects.splice(0)) object.destroy();
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
