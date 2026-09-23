import { drawCrispInteriorWalls } from "../systems/dungeonWallArt";
import Phaser from "phaser";
import { readChapterArrival, requestsDoorExit } from "../game/chapterTravel";
import { GAMEPLAY_TILESETS } from "../assets/registry";
import { PALETTE } from "../game/constants";
import type { Direction, RoomType } from "../game/constants";
import {
  addDocumentPoints,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  getHeldProcessItemIds,
  hasProcessItem,
  setHeldItem,
  setLatestMessage,
  setDocumentWorkflowState,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  getVisitedRoomIds,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, getSecondaryActionBadge, tickInput, type InputState } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/items/Terminal";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { saveGameNow } from "../systems/save";
import { takeDanneLurkerHit } from "../systems/dannePressure";
import { tryEquippedToolSwing } from "../systems/toolSwing";
import { AttackBuffer } from "../systems/hitstop";
import { installAttackBufferLifecycle } from "../systems/sceneAttackBuffer";
import { WithholdingChronologyBoard } from "../systems/withholdingChronologyBoard";
import { FeedbackToast } from "../systems/feedbackToast";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesRewardBurst, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal } from "../systems/snesPixelArt";
import { SNES_NETWORK_TILE_ASSET } from "../game/snesAtlas";
import {
  getNetworkRoutePacket,
  networkBatchPacketAfterRoute,
  NETWORK_ROUTE_ITEM_TOTAL,
  NETWORK_ROUTE_PACKETS,
  networkRoutingObjective,
  networkRoutingComplete,
  networkRouteGuidance,
  routeNetworkPacket,
  routedItemCount
} from "../game/networkRouting";
import type { NetworkRoutePacket, NetworkRoutePacketId, RoutingNetwork } from "../game/networkRouting";
import {
  classNetBatchDocketAfterRoute,
  CLASSNET_VAULT_STATION_LABELS,
  CLASSNET_VAULT_CHECK_TOTAL,
  CLASSNET_VAULT_DOCKETS,
  classNetVaultObjective,
  carriedClassNetVaultDocket,
  completedClassNetVaultChecks,
  deriveClassNetVaultStep,
  getClassNetVaultDocket,
  routeClassNetVaultDocket
} from "../game/classNetVaultReview";
import type {
  ClassNetVaultDocket,
  ClassNetVaultDocketId,
  ClassNetVaultStationId
} from "../game/classNetVaultReview";
import {
  INTERIOR_TILES,
  NETWORK_N1_TILEMAP,
  buildNetworkN1TileLayers,
  networkN1CollisionRect
} from "../game/networkN1Tilemap";
import { packedTileGid } from "../game/packedTileIndex";
import {
  NETWORK_CROSSING, NETWORK_DIVIDERS, networkCrossingState, networkCrossingWaypoint,
  safeNetworkCrossingSpawn, tryOpenNetworkCrossing
} from "../game/networkCrossing";
import {
  NETWORK_N2_TILEMAP,
  buildNetworkN2TileLayers,
  networkN2CollisionRect
} from "../game/networkN2Tilemap";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type NetworkRoomId = "N1" | "N2";
type NetworkTileFrame = (typeof SNES_NETWORK_TILE_ASSET.frames)[number];

interface NetworkRoom {
  id: NetworkRoomId;
  title: string;
  roomType: RoomType;
  exits: Partial<Record<Direction, NetworkRoomId | "R1" | "A1">>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, "clearance_token">>;
}

const NETWORK_PLAY_BOUNDS = { left: 14, right: 242, top: 42, bottom: 220 };
const DOOR_Y_MIN = 100;
const DOOR_Y_MAX = 150;
const EXIT_SPAWNS: Record<Direction, { x: number; y: number }> = {
  north: { x: 128, y: 58 },
  south: { x: 128, y: 204 },
  east: { x: 30, y: 124 },
  west: { x: 226, y: 124 }
};

const NETWORK_ROOMS: Record<NetworkRoomId, NetworkRoom> = {
  N1: {
    id: "N1",
    title: "Network Split",
    roomType: "puzzle",
    exits: { west: "A1", east: "N2" },
    lockedExits: { east: "FIREWALL terminal door" }
  },
  N2: {
    id: "N2",
    title: "ClassNet Vault",
    roomType: "reward",
    exits: { west: "N1", east: "R1" },
    lockedExits: { east: "Red vault exit" },
    requiredItems: { east: "clearance_token" }
  }
};

export class NetworkScene extends Phaser.Scene {
  private roomGateObjects: Phaser.GameObjects.GameObject[] = [];
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private routeText!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private toast!: FeedbackToast;
  private ledgerChoice!: WithholdingChronologyBoard;
  private currentRoute = 0;
  private correctRoutes = 0;
  private routingComplete = false;
  private routingPacketWorldIcon?: Phaser.GameObjects.Container;
  private routingPacketHeldIcon?: Phaser.GameObjects.Container;
  private routingSorterSlots: Phaser.GameObjects.Rectangle[] = [];
  private routingRouteCue?: Phaser.GameObjects.Graphics;
  private routingRouteCueKey = "";
  private classNetReviewStep = 0;
  private classNetReviewComplete = false;
  private vaultDocketWorldIcon?: Phaser.GameObjects.Container;
  private vaultDocketHeldIcon?: Phaser.GameObjects.Container;
  private vaultStationFrames = new Map<ClassNetVaultStationId, Phaser.GameObjects.Rectangle>();
  private vaultStationLamps = new Map<ClassNetVaultStationId, Phaser.GameObjects.Rectangle[]>();
  private clearanceTokenCollected = false;
  private currentRoomId: NetworkRoomId = "N1";
  private visitedRoomIds = new Set<NetworkRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private roomSolids: Phaser.Geom.Rectangle[] = [];
  private roomTitleText!: Phaser.GameObjects.Text;
  private roomTransitionLocked = false;
  private readonly attackBuffer = new AttackBuffer();
  private exitCooldownUntil = 0;
  private clearanceTokenIcon?: Phaser.GameObjects.Image;
  private vaultInbox?: Phaser.GameObjects.Container;
  private vaultReward?: Phaser.GameObjects.Container;
  private clearanceTokenRouteCue?: Phaser.GameObjects.Graphics;
  private clearanceTokenRouteCueKey = "";
  private crossingGate?: Phaser.GameObjects.Container;
  private crossingLamp?: Phaser.GameObjects.Rectangle;
  private crossingSolid?: Phaser.Geom.Rectangle;
  private crossingSwing = -1;
  private danneLurker!: DanneLurker;

  constructor() {
    super("NetworkScene");
  }

  create(data?: unknown) {
    this.attackBuffer.clear();
    installAttackBufferLifecycle(this.events, this.attackBuffer);
    const arrival = readChapterArrival(data, "NetworkScene", gameState.currentScene);
    const restoringNetworkScene = gameState.currentScene === "NetworkScene";
    const restoredRoomId: NetworkRoomId = arrival?.to === "N2" || (!arrival && restoringNetworkScene
      && gameState.roomTraversal?.currentRoomId === "N2")
      ? "N2"
      : "N1";
    const restoredPosition = arrival ? { x: arrival.x, y: arrival.y }
      : restoringNetworkScene ? { ...gameState.player } : null;
    const restoredVisitedRoomIds = getVisitedRoomIds(["N1", "N2"] as const);
    setSceneState("NetworkScene", "explore", "Two Networks: earn the Clearance Token.");
    retroAudio.startMusic("NetworkScene");
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    drawTiledFloor(this, "network-tiles");
    drawRoomFrame(this, "TWO NETWORKS", PALETTE.goldStamp, { showLegacyHud: false });
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902).setVisible(false);

    this.routeText = this.add.text(196, 45, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center",
      wordWrap: { width: 96, useAdvancedWrap: true },
      fixedWidth: 96
    }).setOrigin(0.5).setDepth(820).setVisible(false);
    this.player = new Player(this, 128, 196);
    this.dialog = new DialogBox(this, { aboveTouchControls: true });
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.toast = new FeedbackToast(this);
    this.ledgerChoice = new WithholdingChronologyBoard(this);
    this.danneLurker = new DanneLurker(this, 46, 66, {
      boltBlocked: (x, y) => this.roomSolids.some(rect => rect.contains(x, y)),
      speechBlocked: () => this.toast.visible || this.interactionPrompt.visible || this.dialog.active
        || this.ledgerChoice.active || this.inventory.active || this.reliability.active,
      waypoints: [
        { x: 46, y: 66 }, { x: 84, y: 66 }, { x: 84, y: 198 },
        { x: 212, y: 198 }, { x: 212, y: 66 }, { x: 168, y: 66 },
        { x: 168, y: 198 }, { x: 46, y: 198 }
      ]
    });
    this.restoreNetworkProgress();
    this.visitedRoomIds = new Set(restoredVisitedRoomIds);
    this.restoreHeldBatchState(restoredRoomId);
    this.enterRoom(restoredRoomId, restoredPosition ?? { x: 128, y: 196 }, false);
    if (restoredRoomId === "N1") this.beginRouting();
    if (restoredRoomId === "N1" && !this.routingComplete) {
      setLatestMessage("Take the routing batch once. OpenNet takes public material; ClassNet takes protected review packets.");
    }
  }

  private restoreNetworkProgress() {
    this.routingComplete = networkRoutingComplete(gameState.sceneProgress, gameState.processStamps.includes("network"));
    this.currentRoute = this.routingComplete
      ? NETWORK_ROUTE_PACKETS.length
      : Math.max(0, Math.min(
        NETWORK_ROUTE_PACKETS.length - 1,
        Math.floor(gameState.sceneProgress.networkRoutingStep ?? 0)
      ));
    this.correctRoutes = this.routingComplete
      ? NETWORK_ROUTE_ITEM_TOTAL
      : routedItemCount(this.currentRoute);
    if (this.routingComplete) gameState.sceneProgress.networkRoutingComplete = 1;
    this.clearanceTokenCollected = hasProcessItem("clearance_token");
    this.classNetReviewStep = this.clearanceTokenCollected
      ? CLASSNET_VAULT_DOCKETS.length
      : deriveClassNetVaultStep(gameState.sceneProgress);
    this.classNetReviewComplete = this.classNetReviewStep >= CLASSNET_VAULT_DOCKETS.length;
    gameState.sceneProgress.classNetVaultReviewStep = this.classNetReviewStep;
    if (this.classNetReviewComplete) {
      gameState.sceneProgress.classNetVaultReviewComplete = 1;
      gameState.sceneProgress.classNetVaultDocketCarried = 0;
      this.syncLegacyClassNetProgress(this.classNetReviewStep);
    } else if ((gameState.sceneProgress.classNetVaultDocketCarried ?? 0) !== getClassNetVaultDocket(this.classNetReviewStep).order) {
      gameState.sceneProgress.classNetVaultDocketCarried = 0;
    }
    if (this.routingComplete) gameState.sceneProgress.networkRoutingCarried = 0;
    else if ((gameState.sceneProgress.networkRoutingCarried ?? 0) !== getNetworkRoutePacket(this.currentRoute).order) {
      gameState.sceneProgress.networkRoutingCarried = 0;
    }
  }

  private restoreHeldBatchState(roomId: NetworkRoomId) {
    if (roomId === "N1") {
      const packet = this.routingCarriedPacket();
      if (packet) setHeldItem(`Routing Batch: ${packet.shortLabel}`);
      return;
    }
    const docket = this.vaultCarriedDocket();
    if (docket) setHeldItem(`Review Batch: ${docket.shortLabel}`);
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (gameState.mode !== "explore" || input.menuJustPressed || input.pauseJustPressed
      || this.roomTransitionLocked || this.ledgerChoice.active || this.dialog.active
      || this.inventory.active || this.reliability.active) this.attackBuffer.clear();
    this.toast.update(delta, this.player.position);
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (this.ledgerChoice.active) {
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      this.ledgerChoice.updateInput();
      return;
    }
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    if (this.roomTransitionLocked) {
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      return;
    }
    if (this.dialog.active) {
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.inventory.active || this.reliability.active) {
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      handleOpenOverlays(this.inventory, this.reliability);
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      this.updateDanneLurker(delta, false);
      return;
    }
    this.player.update(delta, true, { bounds: NETWORK_PLAY_BOUNDS, solids: this.roomSolids });
    if (input.bJustPressed) this.attackBuffer.press(this.time.now);
    if (this.attackBuffer.consume(this.time.now, this.player.combatReadout.weapon.canSwing && this.player.combatReadout.state !== "hurt")) {
      const swing = tryEquippedToolSwing(this.player);
      if (swing.reason) this.toast.show(swing.reason, this.player.position, "warn");
    }
    this.updateStampCrossing();
    this.updateDanneLurker(delta);
    this.syncThreatState();
    if (this.currentRoomId === "N1") {
      this.updateRoutingPacketIcon();
      this.updateRoutingPacketPrompt(delta);
      this.refreshRoutingRouteCue();
    } else {
      this.updateVaultDocketIcon();
      this.updateClassNetVaultPrompt(delta);
      this.refreshClearanceTokenRouteCue();
    }
    const handledRoomAction = this.currentRoomId === "N1"
      ? this.handleRoutingPacketAction(input)
      : this.handleClassNetVaultAction(input);
    if (handledRoomAction) {
      this.reliability.update();
      this.objectiveText.setText("");
      return;
    }
    if (this.checkRoomExit()) return;
    this.reliability.update();
    this.objectiveText.setText("");
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.roomObjects.push(object);
    return object;
  }

  private enterRoom(roomId: NetworkRoomId, spawn: { x: number; y: number }, wipe = true, direction: Direction = "east") {
    this.attackBuffer.clear();
    const applyRoom = () => {
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      const safeSpawn = roomId === "N1"
        ? safeNetworkCrossingSpawn(spawn, networkCrossingState(gameState.sceneProgress) === "open") : spawn;
      this.player.setPosition(safeSpawn.x, safeSpawn.y);
      this.danneLurker.enterRoom(this.time.now);
      this.syncRoomTraversalState();
      this.exitCooldownUntil = this.time.now + 280;
    };

    if (!wipe) {
      applyRoom();
      this.roomTransitionLocked = false;
      return;
    }

    this.roomTransitionLocked = true;
    transitionArchiveRoom(this, {
      fromRoomId: this.currentRoomId,
      toRoomId: roomId,
      direction,
      label: NETWORK_ROOMS[roomId].title.toUpperCase(),
      onCovered: applyRoom,
      onComplete: () => {
        this.roomTransitionLocked = false;
        saveGameNow("scene");
      }
    });
  }

  private clearRoom() {
    this.clearClearanceTokenRouteCue();
    this.clearRoutingRouteCue();
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    this.roomCleanups = [];
    this.roomObjects = [];
    this.routingRouteCue = undefined;
    this.clearanceTokenRouteCue = undefined;
    this.roomGateObjects = [];
    this.roomSolids = [];
    this.crossingGate = undefined;
    this.crossingLamp = undefined;
    this.crossingSolid = undefined;
    this.crossingSwing = -1;
    this.clearanceTokenIcon = undefined;
    this.vaultInbox = undefined;
    this.vaultReward = undefined;
    this.vaultDocketWorldIcon = undefined;
    if (this.vaultDocketHeldIcon?.active) this.vaultDocketHeldIcon.destroy();
    this.vaultDocketHeldIcon = undefined;
    this.vaultStationFrames.clear();
    this.vaultStationLamps.clear();
    this.routingPacketWorldIcon = undefined;
    this.routingSorterSlots = [];
    if (this.routingPacketHeldIcon?.active) this.routingPacketHeldIcon.destroy();
    this.routingPacketHeldIcon = undefined;
    setNearestInteractable(null);
  }

  private renderCurrentRoom() {
    const room = NETWORK_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    addSnesRoomIntroBanner(this, {
      title: `${room.id} ${room.title}`,
      subtitle: "TWO NETWORKS",
      accent: PALETTE.terminalCyan,
      track: (object) => this.track(object)
    });
    const packedTilemapRendered = room.id === "N1"
      ? this.renderNetworkN1Tilemap()
      : this.renderNetworkN2Tilemap();
    if (!packedTilemapRendered) {
      addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "network", track: (object) => this.track(object) });
      this.drawNetworkTileField(room.id);
    }
    this.drawRoomDoors();
    if (room.id === "N1") this.renderNetworkSplit(packedTilemapRendered);
    else this.renderClassNetVault(packedTilemapRendered);
    this.syncRoomTraversalState();
    this.syncThreatState();
  }

  private renderNetworkN1Tilemap() {
    const asset = GAMEPLAY_TILESETS.interiorsNative;
    if (!this.textures.exists(asset.key)) return false;
    const map = this.make.tilemap({
      width: NETWORK_N1_TILEMAP.columns,
      height: NETWORK_N1_TILEMAP.rows,
      tileWidth: asset.tileSize,
      tileHeight: asset.tileSize
    });
    const tileset = map.addTilesetImage(
      asset.manifestKey,
      asset.key,
      asset.tileSize,
      asset.tileSize,
      asset.margin,
      asset.spacing,
      asset.firstGid
    );
    if (!tileset) {
      map.destroy();
      return false;
    }

    const ground = map.createBlankLayer(
      "network-n1-ground",
      tileset,
      NETWORK_N1_TILEMAP.x,
      NETWORK_N1_TILEMAP.y,
      NETWORK_N1_TILEMAP.columns,
      NETWORK_N1_TILEMAP.rows,
      asset.tileSize,
      asset.tileSize
    );
    const walls = map.createBlankLayer(
      "network-n1-walls",
      tileset,
      NETWORK_N1_TILEMAP.x,
      NETWORK_N1_TILEMAP.y,
      NETWORK_N1_TILEMAP.columns,
      NETWORK_N1_TILEMAP.rows,
      asset.tileSize,
      asset.tileSize
    );
    const decoration = map.createBlankLayer(
      "network-n1-decoration",
      tileset,
      NETWORK_N1_TILEMAP.x,
      NETWORK_N1_TILEMAP.y,
      NETWORK_N1_TILEMAP.columns,
      NETWORK_N1_TILEMAP.rows,
      asset.tileSize,
      asset.tileSize
    );
    if (!ground || !walls || !decoration) {
      ground?.destroy();
      walls?.destroy();
      decoration?.destroy();
      map.destroy();
      return false;
    }

    const layers = buildNetworkN1TileLayers();
    ground.putTilesAt(layers.ground, 0, 0, false).setDepth(-16);
    walls.putTilesAt(layers.walls, 0, 0, true)
      .setCollision([
        packedTileGid(INTERIOR_TILES.wallPanel),
        packedTileGid(INTERIOR_TILES.wallMetal),
        packedTileGid(INTERIOR_TILES.wallBlue)
      ])
      .setDepth(44);
    decoration.putTilesAt(layers.decoration, 0, 0, false).setDepth(45);
    drawCrispInteriorWalls(this, layers.walls, walls.x, walls.y, PALETTE.terminalCyan, object => this.track(object));
    for (const cell of layers.collisionCells) {
      const rect = networkN1CollisionRect(cell);
      this.roomSolids.push(new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height));
    }
    this.roomCleanups.push(() => {
      ground.destroy();
      walls.destroy();
      decoration.destroy();
      map.destroy();
    });
    return true;
  }

  private renderNetworkN2Tilemap() {
    const asset = GAMEPLAY_TILESETS.interiorsNative;
    if (!this.textures.exists(asset.key)) return false;
    const map = this.make.tilemap({
      width: NETWORK_N2_TILEMAP.columns,
      height: NETWORK_N2_TILEMAP.rows,
      tileWidth: asset.tileSize,
      tileHeight: asset.tileSize
    });
    const tileset = map.addTilesetImage(
      asset.manifestKey,
      asset.key,
      asset.tileSize,
      asset.tileSize,
      asset.margin,
      asset.spacing,
      asset.firstGid
    );
    if (!tileset) {
      map.destroy();
      return false;
    }

    const ground = map.createBlankLayer(
      "network-n2-ground",
      tileset,
      NETWORK_N2_TILEMAP.x,
      NETWORK_N2_TILEMAP.y,
      NETWORK_N2_TILEMAP.columns,
      NETWORK_N2_TILEMAP.rows,
      asset.tileSize,
      asset.tileSize
    );
    const walls = map.createBlankLayer(
      "network-n2-walls",
      tileset,
      NETWORK_N2_TILEMAP.x,
      NETWORK_N2_TILEMAP.y,
      NETWORK_N2_TILEMAP.columns,
      NETWORK_N2_TILEMAP.rows,
      asset.tileSize,
      asset.tileSize
    );
    const decoration = map.createBlankLayer(
      "network-n2-decoration",
      tileset,
      NETWORK_N2_TILEMAP.x,
      NETWORK_N2_TILEMAP.y,
      NETWORK_N2_TILEMAP.columns,
      NETWORK_N2_TILEMAP.rows,
      asset.tileSize,
      asset.tileSize
    );
    if (!ground || !walls || !decoration) {
      ground?.destroy();
      walls?.destroy();
      decoration?.destroy();
      map.destroy();
      return false;
    }

    const layers = buildNetworkN2TileLayers();
    ground.putTilesAt(layers.ground, 0, 0, false).setDepth(-16);
    walls.putTilesAt(layers.walls, 0, 0, true)
      .setCollision([
        packedTileGid(INTERIOR_TILES.wallPanel),
        packedTileGid(INTERIOR_TILES.wallMetal),
        packedTileGid(INTERIOR_TILES.wallBrick),
        packedTileGid(INTERIOR_TILES.wallBlue)
      ])
      .setDepth(44);
    decoration.putTilesAt(layers.decoration, 0, 0, false).setDepth(45);
    drawCrispInteriorWalls(this, layers.walls, walls.x, walls.y, PALETTE.terminalCyan, object => this.track(object));
    for (const cell of layers.collisionCells) {
      const rect = networkN2CollisionRect(cell);
      this.roomSolids.push(new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height));
    }
    this.roomCleanups.push(() => {
      ground.destroy();
      walls.destroy();
      decoration.destroy();
      map.destroy();
    });
    return true;
  }

  private drawNetworkTileField(roomId: NetworkRoomId) {
    if (!this.networkTileFramesReady([
      "open_floor",
      "class_floor",
      "cable_cross",
      "terminal_pad",
      "class_terminal",
      "firewall_gate",
      "vault_wall",
      "token_plinth"
    ])) {
      return;
    }

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        const x = 40 + col * 16;
        const y = 62 + row * 16;
        const frame = roomId === "N1"
          ? this.networkSplitFloorFrame(col, row)
          : this.classNetVaultFloorFrame(col, row);
        this.drawNetworkTileFrame(frame, x, y, -13, `${roomId}-floor-${row}-${col}`);
      }
    }

    if (roomId === "N1") {
      this.drawNetworkTileFrame("terminal_pad", 56, 124, 92, "opennet-terminal-pad");
      this.drawNetworkTileFrame("class_terminal", 200, 124, 92, "classnet-terminal-pad");
      return;
    }

    for (let col = 0; col < 7; col += 1) {
      this.drawNetworkTileFrame("vault_wall", 56 + col * 24, 94, 82, `vault-wall-${col}`);
    }
    this.drawNetworkTileFrame("token_plinth", 120, 132, 137, "token-plinth-left");
    this.drawNetworkTileFrame("token_plinth", 136, 132, 137, "token-plinth-right");
  }

  private networkSplitFloorFrame(col: number, row: number): NetworkTileFrame {
    if (col === 5 || col === 6 || row === 3) return "cable_cross";
    if (col < 5) return (row + col) % 5 === 0 ? "terminal_pad" : "open_floor";
    return (row + col) % 5 === 0 ? "class_terminal" : "class_floor";
  }

  private classNetVaultFloorFrame(col: number, row: number): NetworkTileFrame {
    if (row === 0 || col === 0 || col === 11) return "vault_wall";
    if (row === 4 && (col === 5 || col === 6)) return "token_plinth";
    if ((row + col) % 6 === 0) return "class_terminal";
    return "class_floor";
  }

  private drawNetworkTileFrame(
    frame: NetworkTileFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ) {
    if (!this.textures.exists(SNES_NETWORK_TILE_ASSET.key)) return null;
    const texture = this.textures.get(SNES_NETWORK_TILE_ASSET.key);
    if (!texture.has(frame)) return null;
    return this.track(this.add.image(Math.round(x), Math.round(y), SNES_NETWORK_TILE_ASSET.key, frame)
      .setName(`network-tile-${name}`)
      .setDepth(depth));
  }

  private networkTileFramesReady(frames: readonly NetworkTileFrame[]) {
    if (!this.textures.exists(SNES_NETWORK_TILE_ASSET.key)) return false;
    const texture = this.textures.get(SNES_NETWORK_TILE_ASSET.key);
    return frames.every((frame) => texture.has(frame));
  }

  private drawRoomDoors() {
    for (const object of this.roomGateObjects) {
      if (object.active) object.destroy();
    }
    this.roomGateObjects = [];
    const trackGate = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.roomGateObjects.push(object);
      return this.track(object);
    };
    const room = NETWORK_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      const mustFile = this.currentRoomId === "N2" && Boolean(this.vaultCarriedDocket());
      addSnesGate(this, {
        direction: "west",
        hasExit: true,
        unlocked: !mustFile,
        lockLabel: "FILE",
        accent: PALETTE.terminalCyan,
        exitLabel: this.currentRoomId === "N1" ? "ARCHIVE" : "SPLIT",
        track: trackGate,
        depth: 65
      });
    }
    if (room.exits.east) {
      const open = this.currentRoomId === "N1" ? this.routingComplete : this.clearanceTokenCollected;
      const accent = open ? PALETTE.openNetGreen : PALETTE.classNetRed;
      addSnesGate(this, {
        direction: "east",
        hasExit: true,
        unlocked: open,
        accent,
        lockLabel: this.currentRoomId === "N1" ? "ROUT" : "TOKN",
        exitLabel: this.currentRoomId === "N1" ? "VAULT" : "REF",
        track: trackGate,
        depth: 65
      });
    }
  }

  private renderNetworkSplit(packedTilemapRendered: boolean) {
    this.drawStampCrossing(packedTilemapRendered);
    this.syncNetworkSplitEntities();
    this.track(addTinySparkle(this, 60, 108, PALETTE.openNetGreen));
    this.track(addTinySparkle(this, 196, 108, PALETTE.classNetRed));
    const marcus = new HistorianNPC(this, "marcus", 38, 88);
    marcus.label.setVisible(false);
    this.roomCleanups.push(() => marcus.destroy());
    this.track(new Terminal(this, 60, 124, "OpenNet").container);
    this.track(new Terminal(this, 196, 124, "ClassNet").container);
    for (const [x, text] of [[60, "PUBLIC COPIES"], [196, "PROTECTED REVIEW"]] as const) {
      this.track(this.add.text(x, 150, text, { fontFamily: "monospace", fontSize: "4px",
        color: PALETTE.creamPaper, backgroundColor: PALETTE.black }).setOrigin(0.5, 0).setDepth(124));
    }
    this.drawRoutingSorter();
    if (!this.routingComplete) {
      this.updateRoutingRouteText();
    } else {
      this.routeText.setVisible(false);
      setObjective(networkRoutingObjective(NETWORK_ROUTE_PACKETS.length, false));
    }
  }

  private syncNetworkSplitEntities() {
    const packet = this.routingComplete ? null : getNetworkRoutePacket(this.currentRoute);
    const carried = this.routingCarriedPacket();
    setVisibleEntities([
      "Marcus: ask about the current packet",
      "OpenNet terminal",
      "ClassNet terminal",
      "Routing sorter",
      `Service crossing: ${networkCrossingState(gameState.sceneProgress)}`,
      ...(packet ? [`Routing packet ${packet.order}/4: ${packet.label} (${carried ? "carried" : "at sorter"}); marking: ${packet.marking}`] : [])
    ]);
  }

  private drawStampCrossing(packedTilemapRendered: boolean) {
    if (!packedTilemapRendered) {
      for (const rect of NETWORK_DIVIDERS) {
        this.roomSolids.push(new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height));
        this.track(this.add.rectangle(rect.x, rect.y, rect.width, rect.height, color(PALETTE.stoneDark))
          .setOrigin(0).setStrokeStyle(2, color(PALETTE.stoneGray)).setDepth(44));
      }
    }
    if (networkCrossingState(gameState.sceneProgress) === "open") return;
    const rect = NETWORK_CROSSING;
    this.crossingSolid = new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height);
    this.roomSolids.push(this.crossingSolid);
    const gate = this.track(this.add.container(128, 120).setDepth(144).setName("network-stamp-crossing"));
    this.crossingGate = gate;
    gate.add(this.add.rectangle(0, 0, 30, 48, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.stoneLight)));
    for (const y of [-18, -12, 12, 18]) {
      gate.add(this.add.rectangle(0, y, 24, 2, color(PALETTE.stoneGray)));
    }
    gate.add(this.add.rectangle(0, 0, 20, 20, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)));
    if (this.textures.exists("citation-stamp")) {
      gate.add(this.add.image(0, 0, "citation-stamp").setDisplaySize(16, 16));
    } else {
      gate.add(this.add.rectangle(0, -3, 4, 8, color(PALETTE.goldStamp)));
      gate.add(this.add.rectangle(0, 3, 12, 4, color(PALETTE.goldStamp)));
    }
    this.crossingLamp = this.add.rectangle(0, -22, 10, 3, color(PALETTE.stoneGray));
    gate.add(this.crossingLamp);
  }

  private atStampCrossing() {
    const { x, y } = this.player.position;
    // Filing a carried packet takes primary-action priority in overlapping
    // terminal/seal ranges. The tool swing still checks the seal independently.
    const target = this.routingCarriedPacket() ? this.routingActionHint() : null;
    if (target && Phaser.Math.Distance.Between(x, y, target.x, target.y) <= (target.radius ?? 34)) return false;
    return this.currentRoomId === "N1" && networkCrossingState(gameState.sceneProgress) !== "open"
      && x >= 92 && x <= 164 && y >= 104 && y <= 140;
  }

  private updateStampCrossing() {
    if (this.currentRoomId !== "N1" || !this.crossingSolid) return;
    const ready = networkCrossingState(gameState.sceneProgress) === "ready";
    this.crossingLamp?.setFillStyle(color(ready ? PALETTE.goldStamp : PALETTE.stoneGray));
    const combat = this.player.combatReadout;
    if (!combat.actionActive || !combat.weapon.active || combat.weapon.phase !== "active"
      || !combat.hitbox || combat.weapon.swingId === this.crossingSwing) return;
    const hitbox = new Phaser.Geom.Rectangle(combat.hitbox.x, combat.hitbox.y, combat.hitbox.width, combat.hitbox.height);
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, this.crossingSolid)) return;
    this.crossingSwing = combat.weapon.swingId;
    const result = tryOpenNetworkCrossing(gameState.sceneProgress, combat.weapon.tool, hasProcessItem(combat.weapon.tool));
    setLatestMessage(result.message);
    if (!result.opened) {
      this.toast.show(ready ? "USE THE CITATION STAMP" : "FILE PUBLIC PACKET FIRST", this.player.position, "info");
      retroAudio.blip();
      return;
    }
    gameState.sceneProgress.networkStampCrossingOpen = 1;
    this.removeCrossingSeal();
    this.toast.show("SERVICE CROSSING OPEN", this.player.position, "info");
    this.track(addTinySparkle(this, 128, 120, PALETTE.goldStamp));
    retroAudio.stamp();
    this.clearRoutingRouteCue();
    this.syncNetworkSplitEntities();
    saveGameNow();
  }

  private removeCrossingSeal() {
    if (this.crossingSolid) this.roomSolids = this.roomSolids.filter(rect => rect !== this.crossingSolid);
    this.crossingSolid = undefined;
    this.crossingGate?.destroy();
    this.crossingGate = undefined;
    this.crossingLamp = undefined;
  }

  private drawRoutingSorter() {
    const sorter = this.track(this.add.container(128, 178).setDepth(170).setName("network-routing-sorter"));
    sorter.add(this.add.ellipse(0, 8, 48, 12, color(PALETTE.black), 0.42));
    sorter.add(this.add.rectangle(0, 0, 48, 22, color(PALETTE.black), 0.92)
      .setStrokeStyle(2, color(this.routingComplete ? PALETTE.openNetGreen : PALETTE.goldStamp)));
    sorter.add(this.add.text(0, 6, this.routingComplete ? "ROUTED" : "SORTER", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: this.routingComplete ? PALETTE.openNetGreen : PALETTE.goldStamp
    }).setOrigin(0.5, 0).setPosition(0, 2));
    for (let index = 0; index < NETWORK_ROUTE_PACKETS.length; index += 1) {
      const filed = index < this.currentRoute || this.routingComplete;
      const slot = this.add.rectangle(-15 + index * 10, 9, 7, 4, color(filed ? PALETTE.openNetGreen : PALETTE.stoneDark))
        .setStrokeStyle(1, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray));
      this.routingSorterSlots.push(slot);
      sorter.add(slot);
    }
    if (this.routingComplete) return;
    const carried = this.routingCarriedPacket();
    if (carried) {
      this.createRoutingPacketHeldIcon(carried.id);
      return;
    }
    this.drawRoutingPacketAtSorter();
  }

  private syncRoutingSorterSlots() {
    this.routingSorterSlots.forEach((slot, index) => {
      const filed = index < this.currentRoute || this.routingComplete;
      slot.setFillStyle(color(filed ? PALETTE.openNetGreen : PALETTE.stoneDark));
      slot.setStrokeStyle(1, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray));
    });
  }

  private drawRoutingPacketAtSorter() {
    if (this.routingPacketWorldIcon?.active) this.routingPacketWorldIcon.destroy();
    if (this.routingComplete) {
      this.routingPacketWorldIcon = undefined;
      return;
    }
    const packet = getNetworkRoutePacket(this.currentRoute);
    this.routingPacketWorldIcon = this.track(this.createRoutingPacketIcon(128, 164, packet.id, false)
      .setName(`network-route-packet-${packet.id}`)
      .setDepth(179));
  }

  private createRoutingPacketHeldIcon(packetId: NetworkRoutePacketId) {
    if (this.routingPacketHeldIcon?.active) this.routingPacketHeldIcon.destroy();
    const packet = NETWORK_ROUTE_PACKETS.find((candidate) => candidate.id === packetId);
    if (!packet) return;
    this.routingPacketHeldIcon = this.createRoutingPacketIcon(
      Math.round(this.player.position.x),
      Math.round(this.player.position.y - 16),
      packet.id,
      true
    ).setName(`network-carried-packet-${packet.id}`).setDepth(280);
  }

  private createRoutingPacketIcon(
    x: number,
    y: number,
    packetId: NetworkRoutePacketId,
    compact: boolean
  ) {
    const packet = NETWORK_ROUTE_PACKETS.find((candidate) => candidate.id === packetId)
      ?? NETWORK_ROUTE_PACKETS[0];
    const accent = packet.network === "OpenNet" ? PALETTE.openNetGreen : PALETTE.classNetRed;
    const width = compact ? 21 : 30;
    const height = compact ? 13 : 19;
    return this.add.container(x, y, [
      this.add.ellipse(1, Math.round(height / 2), width + 4, 7, color(PALETTE.black), 0.4),
      this.add.rectangle(0, 0, width, height, color(PALETTE.creamPaper))
        .setStrokeStyle(1, color(accent)),
      this.add.rectangle(-Math.round(width / 2) + 3, 0, 3, height - 3, color(accent)),
      this.add.rectangle(0, -Math.round(height / 2) + 3, compact ? 9 : 13, 4, color(PALETTE.archiveAmber))
        .setStrokeStyle(1, color(PALETTE.sepiaInk))
    ]);
  }

  private routingCarriedPacket() {
    const order = Math.floor(gameState.sceneProgress.networkRoutingCarried ?? 0);
    return NETWORK_ROUTE_PACKETS.find((packet) => packet.order === order) ?? null;
  }

  private updateRoutingPacketIcon() {
    if (!this.routingPacketHeldIcon?.active) return;
    this.routingPacketHeldIcon
      .setPosition(Math.round(this.player.position.x), Math.round(this.player.position.y - 16))
      .setDepth(Math.round(this.player.position.y) + 5);
  }

  private routingActionHint() {
    if (this.currentRoomId !== "N1" || this.routingComplete) return null;
    const carried = this.routingCarriedPacket();
    const candidates: Interactable[] = carried
      ? [this.routingTerminalTarget("OpenNet"), this.routingTerminalTarget("ClassNet")]
      : [this.routingSorterTarget()];
    const nearest = candidates.reduce((best, candidate) => {
      const bestDistance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, best.x, best.y);
      const candidateDistance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, candidate.x, candidate.y);
      return candidateDistance < bestDistance ? candidate : best;
    });
    const distance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, nearest.x, nearest.y);
    return distance <= 78 ? nearest : null;
  }

  private routingSorterTarget(): Interactable {
    return {
      id: "network-routing-sorter",
      label: "Routing Sorter",
      x: 128,
      y: 178,
      radius: 40,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private routingTerminalTarget(network: RoutingNetwork): Interactable {
    return {
      id: network === "OpenNet" ? "network-opennet" : "network-classnet",
      label: `${network} terminal`,
      x: network === "OpenNet" ? 60 : 196,
      y: 124,
      radius: 44,
      kind: "terminal",
      onInteract: () => undefined
    };
  }

  private updateRoutingPacketPrompt(delta: number) {
    if (this.atRoutingGuide()) {
      this.interactionPrompt.update(delta, this.toast.visible ? null : {
        id: "network-marcus-guide", label: "Marcus", x: 38, y: 88, kind: "npc", onInteract: () => undefined
      }, undefined, { badge: "A", text: "ASK ABOUT PACKET" });
      setNearestInteractable("Marcus: routing help");
      return;
    }
    if (this.atStampCrossing()) {
      const ready = networkCrossingState(gameState.sceneProgress) === "ready";
      this.interactionPrompt.update(delta, this.toast.visible ? null : {
        id: "network-stamp-crossing", label: "Service crossing", x: 128, y: 124,
        kind: "door", onInteract: () => undefined
      }, undefined, {
        badge: ready ? getSecondaryActionBadge() : "!",
        text: ready ? "STAMP SEAL" : "FILE PUBLIC FIRST"
      });
      setNearestInteractable("Service crossing");
      return;
    }
    const target = this.routingActionHint();
    const strictTarget = target && Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) <= (target.radius ?? 34) ? target : null;
    const carried = this.routingCarriedPacket();
    const packet = this.routingComplete ? null : getNetworkRoutePacket(this.currentRoute);
    this.interactionPrompt.update(delta, this.toast.visible ? null : strictTarget, undefined, strictTarget ? {
      badge: "A",
      text: carried
        ? `SEND ${target?.id === "network-opennet" ? "OPEN" : "CLASS"}`
        : `TAKE ${this.currentRoute === 0 ? "ROUTING BATCH" : packet?.shortLabel ?? "PACKET"}`
    } : undefined);
    setNearestInteractable(strictTarget?.label ?? null);
  }

  private handleRoutingPacketAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "N1" || this.routingComplete || !input.aJustPressed) return false;
    if (this.atRoutingGuide()) {
      const packet = getNetworkRoutePacket(this.currentRoute);
      gameState.sceneProgress.networkRoutingHintOrder = packet.order;
      this.toast.show(`${packet.shortLabel} > ${packet.network}`, this.player.position, "info");
      setLatestMessage(packet.routingClue);
      this.restoreObjectiveAfterDannePressure();
      this.clearRoutingRouteCue();
      saveGameNow();
      return true;
    }
    if (this.atStampCrossing()) {
      const result = tryOpenNetworkCrossing(gameState.sceneProgress, null, false);
      setLatestMessage(result.message);
      this.toast.show(networkCrossingState(gameState.sceneProgress) === "sealed" ? "FILE PUBLIC PACKET FIRST" : `${getSecondaryActionBadge()}: STAMP THE SEAL`, this.player.position, "info");
      return true;
    }
    const target = this.routingActionHint();
    if (!target || Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) > (target.radius ?? 34)) {
      retroAudio.blip();
      setLatestMessage("Read the packet marking and terminal signs. Marcus can help.");
      return true;
    }
    const carried = this.routingCarriedPacket();
    if (!carried) {
      this.pickUpRoutingPacket();
      return true;
    }
    const destination: RoutingNetwork = target.id === "network-opennet" ? "OpenNet" : "ClassNet";
    this.routeCarriedPacket(destination);
    return true;
  }

  private pickUpRoutingPacket() {
    const packet = getNetworkRoutePacket(this.currentRoute);
    this.carryRoutingPacket(packet);
    retroAudio.confirm();
    this.toast.show("ROUTING BATCH", this.player.position, "info");
    setLatestMessage(packet.routingClue);
    setObjective(networkRoutingObjective(this.currentRoute, true, gameState.sceneProgress.networkRoutingHintOrder));
    this.updateRoutingRouteText();
    this.syncNetworkSplitEntities();
    this.refreshRoutingRouteCue();
    saveGameNow();
  }

  private carryRoutingPacket(packet: NetworkRoutePacket) {
    gameState.sceneProgress.networkRoutingCarried = packet.order;
    setHeldItem(`Routing Batch: ${packet.shortLabel}`);
    if (this.routingPacketWorldIcon?.active) this.routingPacketWorldIcon.destroy();
    this.routingPacketWorldIcon = undefined;
    this.createRoutingPacketHeldIcon(packet.id);
  }

  private routeCarriedPacket(destination: RoutingNetwork) {
    const packet = this.routingCarriedPacket();
    if (!packet) return;
    const result = routeNetworkPacket(this.currentRoute, packet.id, destination);

    if (!result.ok) {
      gameState.sceneProgress.networkRoutingHintOrder = result.packet.order;
      adjustReliability(-2, `${result.packet.label} caught at the wrong-network firewall before transmission`);
      retroAudio.warning();
      this.routeText.setVisible(false);
      this.toast.show(`ROUTE TO ${result.packet.network.toUpperCase()}`, this.player.position, "warn");
      setLatestMessage(`${result.message} ${result.packet.routingClue}`);
      setObjective(networkRoutingObjective(this.currentRoute, true, gameState.sceneProgress.networkRoutingHintOrder));
      this.syncNetworkSplitEntities();
      this.refreshRoutingRouteCue();
      this.reliability.update();
      saveGameNow();
      return;
    }

    gameState.sceneProgress.networkRoutingCarried = 0;
    setHeldItem(null);
    if (this.routingPacketHeldIcon?.active) this.routingPacketHeldIcon.destroy();
    this.routingPacketHeldIcon = undefined;
    this.currentRoute = result.nextStep;
    this.correctRoutes = routedItemCount(result.nextStep);
    gameState.sceneProgress.networkRoutingStep = result.nextStep;
    this.syncRoutingSorterSlots();
    adjustReliability(result.packet.itemLabels.length * 3, `${result.packet.label} routed to ${destination}`);
    retroAudio.stamp();
    if (result.complete) {
      this.toast.show(`${result.packet.shortLabel} > ${destination.toUpperCase()}`, this.player.position, "info");
      setLatestMessage(result.message);
      this.finishRouting();
      return;
    }

    const nextPacket = networkBatchPacketAfterRoute(result);
    if (!nextPacket) return;
    this.carryRoutingPacket(nextPacket);
    this.toast.show(this.currentRoute === 1 ? "STAMP OPENS CROSSING"
      : `NEXT: ${nextPacket.marking}`, this.player.position, "info");
    setLatestMessage(`${result.message} Next marking: ${nextPacket.marking}. Match it to a terminal; ask Marcus for help.`
      + (this.currentRoute === 1 ? " Your Citation Stamp can now open the service crossing." : ""));
    setObjective(networkRoutingObjective(this.currentRoute, true, gameState.sceneProgress.networkRoutingHintOrder));
    this.updateRoutingRouteText();
    this.syncNetworkSplitEntities();
    this.refreshRoutingRouteCue();
    this.reliability.update();
    saveGameNow();
  }

  private updateRoutingRouteText() {
    this.routeText.setVisible(false);
  }

  private atRoutingGuide() {
    return this.currentRoomId === "N1" && !this.routingComplete && this.player.position.y < 100
      && Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 38, 88) <= 20;
  }

  private refreshRoutingRouteCue() {
    if (this.currentRoomId !== "N1" || this.routingComplete) {
      this.clearRoutingRouteCue();
      return;
    }
    const packet = getNetworkRoutePacket(this.currentRoute);
    const carried = this.routingCarriedPacket();
    const guidance = networkRouteGuidance(this.currentRoute, gameState.sceneProgress.networkRoutingHintOrder);
    if (carried && !guidance) {
      this.clearRoutingRouteCue();
      return;
    }
    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y) };
    const destination = carried
      ? { x: packet.network === "OpenNet" ? 60 : 196, y: 124 }
      : { x: 128, y: 196 };
    const end = networkCrossingWaypoint(start, destination, networkCrossingState(gameState.sceneProgress) === "open");
    const targetDistance = Phaser.Math.Distance.Between(start.x, start.y, destination.x, destination.y);
    if (targetDistance <= (carried ? 38 : 36)) {
      this.clearRoutingRouteCue();
      return;
    }
    const cueKey = `N1:${packet.id}:${carried ? "carried" : "sorter"}:${start.x},${start.y}->${end.x},${end.y}`;
    if (cueKey === this.routingRouteCueKey) return;
    this.clearRoutingRouteCue();
    this.routingRouteCueKey = cueKey;
    this.drawRoutingRouteCue(start, end, carried ? packet.network : null);
  }

  private clearRoutingRouteCue() {
    this.routingRouteCue?.clear();
    this.routingRouteCueKey = "";
  }

  private drawRoutingRouteCue(
    start: { x: number; y: number },
    end: { x: number; y: number },
    network: RoutingNetwork | null
  ) {
    const accent = network === "OpenNet"
      ? PALETTE.openNetGreen
      : network === "ClassNet"
        ? PALETTE.classNetRed
        : PALETTE.goldStamp;
    const cue = this.routingRouteCue ??= this.track(this.add.graphics()
      .setName("network-routing-guide").setDepth(46));
    cue.fillStyle(color(accent), 0.8).fillRect(end.x - 3, end.y - 3, 6, 6);
    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(4, Math.floor(distance / 22)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      cue.fillStyle(color(index % 2 === 0 ? PALETTE.creamPaper : accent), 0.9).fillRect(
        Math.round(Phaser.Math.Linear(start.x, end.x, t)) - 1,
        Math.round(Phaser.Math.Linear(start.y, end.y, t)) - 1, 3, 3);
    }
  }

  private renderClassNetVault(packedTilemapRendered = false) {
    if (!packedTilemapRendered) {
      for (let x = 54; x <= 202; x += 24) {
        this.track(this.add.rectangle(x, 96, 14, 18, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.classNetRed)).setDepth(84));
        this.track(this.add.rectangle(x, 94, 8, 2, color(PALETTE.goldStamp)).setDepth(85));
      }
    }
    this.drawClassNetStations();
    this.vaultInbox = this.track(this.add.container(128, 132, [
      this.add.ellipse(0, 7, 40, 8, color(PALETTE.black), 0.35),
      this.add.rectangle(0, 0, 36, 14, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.stoneGray)),
      this.add.rectangle(0, -4, 30, 2, color(PALETTE.creamPaper)),
      this.add.rectangle(0, 5, 34, 3, color(PALETTE.sepiaInk))
    ]).setName("network-review-inbox").setDepth(134));
    const reward = this.vaultReward = this.track(this.add.container(0, 0)
      .setName("network-clearance-reward").setDepth(138));
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 132,
      textureKey: "clearance-token",
      label: "Clearance Token",
      collected: this.clearanceTokenCollected,
      accent: PALETTE.classNetRed,
      track: (object) => {
        reward.add(object);
        if (object.name === "snes-treasure-icon" && object instanceof Phaser.GameObjects.Image) {
          this.clearanceTokenIcon = object;
        }
        return object;
      },
      depth: 138
    });
    reward.sort("depth");
    this.syncClassNetVaultEntities();
    if (this.clearanceTokenCollected) {
      this.routeText.setVisible(false);
      setObjective(this.classNetVaultObjective());
      return;
    }
    if (this.classNetReviewComplete) {
      this.clearanceTokenIcon?.setAlpha(1);
      this.routeText.setVisible(false);
      setObjective(this.classNetVaultObjective());
      return;
    }
    const carried = this.vaultCarriedDocket();
    if (carried) this.createVaultDocketHeldIcon(carried.id);
    else this.drawVaultDocketAtPedestal();
    this.updateClassNetVaultRouteText();
    setObjective(this.classNetVaultObjective());
  }

  private drawClassNetStations() {
    for (const [index, docket] of CLASSNET_VAULT_DOCKETS.entries()) {
      const position = this.classNetStationPosition(docket.station);
      const filed = index < this.classNetReviewStep || this.classNetReviewComplete;
      const accent = filed
        ? PALETTE.openNetGreen
        : docket.station === "human_desk"
          ? PALETTE.terminalCyan
          : docket.station === "release_board"
            ? PALETTE.goldStamp
            : PALETTE.classNetRed;
      const container = this.track(this.add.container(position.x, position.y)
        .setName(`classnet-station-${docket.station}`)
        .setDepth(154));
      container.add(this.add.ellipse(0, 10, 54, 10, color(PALETTE.black), 0.48));
      const frame = this.add.rectangle(0, 0, 56, 25, color(PALETTE.black), 0.92)
        .setStrokeStyle(2, color(accent));
      this.vaultStationFrames.set(docket.station, frame);
      container.add(frame);
      container.add(this.add.text(0, -9, this.classNetStationShortLabel(docket.station), {
        fontFamily: "monospace",
        fontSize: "8px",
        color: accent,
        align: "center"
      }).setOrigin(0.5, 0));
      const lamps: Phaser.GameObjects.Rectangle[] = [];
      for (let lamp = 0; lamp < docket.checkIds.length; lamp += 1) {
        const indicator = this.add.rectangle(-10 + lamp * 10, 5, 6, 5, color(filed ? PALETTE.openNetGreen : PALETTE.stoneDark))
          .setStrokeStyle(1, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray));
        lamps.push(indicator);
        container.add(indicator);
      }
      this.vaultStationLamps.set(docket.station, lamps);
    }
  }

  private classNetStationPosition(station: ClassNetVaultStationId) {
    if (station === "human_desk") return { x: 61, y: 174 };
    if (station === "release_board") return { x: 128, y: 83 };
    return { x: 195, y: 174 };
  }

  private classNetStationShortLabel(station: ClassNetVaultStationId) {
    return CLASSNET_VAULT_STATION_LABELS[station];
  }

  private syncClassNetVaultEntities() {
    const rewardReady = this.classNetReviewComplete && !this.clearanceTokenCollected;
    this.vaultReward?.setVisible(rewardReady);
    this.vaultInbox?.setVisible(!rewardReady);
    const docket = this.classNetReviewComplete ? null : getClassNetVaultDocket(this.classNetReviewStep);
    const carried = this.vaultCarriedDocket();
    setVisibleEntities([
      "ClassNet vault door",
      "Human Review Desk",
      "E.O. 13526 Release Standard Board",
      "Equity Decision Ledger",
      rewardReady ? "Clearance Token ready to collect" : this.clearanceTokenCollected
        ? "Empty review inbox; Clearance Token collected" : "Review batch inbox",
      "Referral handoff gate",
      ...(docket ? [
        `ClassNet docket ${docket.order}/3: ${docket.label} (${carried ? "carried" : "at inbox"}; ${docket.checkIds.length} checks)`
      ] : [])
    ]);
  }

  private syncRoomTraversalState() {
    const room = NETWORK_ROOMS[this.currentRoomId];
    setRoomTraversalState({
      currentRoomId: room.id,
      roomTitle: room.title,
      roomType: room.roomType,
      visitedRoomIds: [...this.visitedRoomIds],
      revealedRoomIds: [
        ...(this.routingComplete || this.clearanceTokenCollected ? ["N1", "N2"] : ["N1"]),
        ...getRevealedShortcutRoomIds(getHeldProcessItemIds()).filter((roomId): roomId is NetworkRoomId => roomId in NETWORK_ROOMS)
      ],
      exits: room.exits,
      lockedExits: room.lockedExits,
      requiredItems: room.requiredItems
    });
  }

  private handleClassNetVaultAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "N2") {
      setNearestInteractable(null);
      return false;
    }
    if (this.clearanceTokenCollected) {
      setNearestInteractable(null);
      this.routeText.setVisible(false);
      return false;
    }
    if (!input.aJustPressed) return false;
    const target = this.classNetVaultActionHint();
    if (!target || Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) > (target.radius ?? 44)) {
      retroAudio.blip();
      setLatestMessage("Follow the gold route to the highlighted ClassNet station.");
      return true;
    }
    if (this.classNetReviewComplete) {
      this.collectClearanceToken();
      return true;
    }
    const carried = this.vaultCarriedDocket();
    if (!carried) {
      this.pickUpVaultDocket();
      return true;
    }
    const station = target.id.replace("classnet-station-", "") as ClassNetVaultStationId;
    this.routeVaultDocket(station);
    return true;
  }

  private updateClassNetVaultPrompt(delta: number) {
    const target = this.classNetVaultActionHint();
    const strictTarget = target && Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) <= (target.radius ?? 44) ? target : null;
    const carried = this.vaultCarriedDocket();
    const docket = this.classNetReviewComplete ? null : getClassNetVaultDocket(this.classNetReviewStep);
    this.interactionPrompt.update(delta, this.toast.visible ? null : strictTarget, undefined, strictTarget ? {
      badge: "A",
      text: this.classNetReviewComplete
        ? "TAKE CLEARANCE TOKEN"
        : carried
          ? `FILE ${this.classNetStationShortLabel(target!.id.replace("classnet-station-", "") as ClassNetVaultStationId)}`
          : `TAKE ${this.classNetReviewStep === 0 ? "REVIEW BATCH" : docket?.shortLabel ?? "DOCKET"}`
    } : undefined);
    setNearestInteractable(strictTarget?.label ?? null);
  }

  private classNetVaultActionHint() {
    if (this.currentRoomId !== "N2" || this.clearanceTokenCollected) return null;
    if (this.classNetReviewComplete) return this.classNetVaultPedestalTarget("Clearance Token");
    const carried = this.vaultCarriedDocket();
    if (!carried) return this.classNetVaultPedestalTarget("ClassNet Docket");
    const candidates = CLASSNET_VAULT_DOCKETS.map((docket) => this.classNetVaultStationTarget(docket.station));
    const nearest = candidates.reduce((best, candidate) => {
      const bestDistance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, best.x, best.y);
      const candidateDistance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, candidate.x, candidate.y);
      return candidateDistance < bestDistance ? candidate : best;
    });
    return Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, nearest.x, nearest.y) <= 82
      ? nearest
      : null;
  }

  private classNetVaultPedestalTarget(label: string): Interactable {
    return {
      id: "classnet-vault-pedestal",
      label,
      x: 128,
      y: 132,
      radius: 46,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private classNetVaultStationTarget(station: ClassNetVaultStationId): Interactable {
    const position = this.classNetStationPosition(station);
    return {
      id: `classnet-station-${station}`,
      label: CLASSNET_VAULT_DOCKETS.find((docket) => docket.station === station)?.stationLabel ?? "ClassNet station",
      x: position.x,
      y: position.y,
      radius: 46,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private vaultCarriedDocket() {
    return carriedClassNetVaultDocket(gameState.sceneProgress);
  }

  private pickUpVaultDocket() {
    const docket = getClassNetVaultDocket(this.classNetReviewStep);
    this.carryVaultDocket(docket);
    retroAudio.confirm();
    this.toast.show("REVIEW BATCH", this.player.position, "info");
    setLatestMessage(`${docket.contentsLabel}. File at ${docket.stationLabel}; the next docket will stay with you.`);
    setObjective(this.classNetVaultObjective());
    this.updateClassNetVaultRouteText();
    this.syncClassNetVaultEntities();
    this.refreshClearanceTokenRouteCue();
    saveGameNow();
  }

  private carryVaultDocket(docket: ClassNetVaultDocket) {
    gameState.sceneProgress.classNetVaultDocketCarried = docket.order;
    this.drawRoomDoors();
    this.syncRoomTraversalState();
    setHeldItem(`Review Batch: ${docket.shortLabel}`);
    if (this.vaultDocketWorldIcon?.active) this.vaultDocketWorldIcon.destroy();
    this.vaultDocketWorldIcon = undefined;
    this.createVaultDocketHeldIcon(docket.id);
  }

  private routeVaultDocket(station: ClassNetVaultStationId, decision?: number) {
    const docket = this.vaultCarriedDocket();
    if (!docket) return;
    const result = routeClassNetVaultDocket(this.classNetReviewStep, docket.id, station, decision);

    if (result.status === "review-required") {
      this.interactionPrompt.update(0, null);
      saveGameNow();
      this.ledgerChoice.show(gameState.sceneProgress.classNetWithholdingSlot, (slot) => {
        gameState.sceneProgress.classNetWithholdingSlot = slot;
        saveGameNow();
      }, (slot) => this.routeVaultDocket(station, slot));
      return;
    }
    if (result.status === "revision-required") {
      this.toast.show("KEEP A WITHHOLDING ENTRY", this.player.position, "warn");
      setLatestMessage(result.message);
      saveGameNow();
      return;
    }

    if (!result.ok) {
      adjustReliability(-2, `${result.docket.label} returned from the wrong ClassNet station`);
      retroAudio.warning();
      this.routeText.setVisible(false);
      this.toast.show(`USE ${result.docket.stationLabel.toUpperCase()}`, this.player.position, "warn");
      setLatestMessage(result.message);
      setObjective(this.classNetVaultObjective());
      this.syncClassNetVaultEntities();
      this.refreshClearanceTokenRouteCue();
      this.reliability.update();
      saveGameNow();
      return;
    }

    gameState.sceneProgress.classNetVaultDocketCarried = 0;
    setHeldItem(null);
    if (this.vaultDocketHeldIcon?.active) this.vaultDocketHeldIcon.destroy();
    this.vaultDocketHeldIcon = undefined;
    this.classNetReviewStep = result.nextStep;
    this.classNetReviewComplete = result.complete;
    gameState.sceneProgress.classNetVaultReviewStep = result.nextStep;
    this.syncLegacyClassNetProgress(result.nextStep);
    this.awardClassNetDocketPoints(result.docket.id);
    this.syncClassNetStationFrames();
    retroAudio.stamp();
    setLatestMessage(result.message);
    if (result.complete) {
      gameState.sceneProgress.classNetVaultReviewComplete = 1;
      this.drawRoomDoors();
      this.syncRoomTraversalState();
      this.clearanceTokenIcon?.setAlpha(1);
      this.routeText.setVisible(false);
      setObjective(this.classNetVaultObjective());
      this.clearClearanceTokenRouteCue();
      this.syncClassNetVaultEntities();
      this.track(addTinySparkle(this, 116, 120, PALETTE.goldStamp));
      this.track(addTinySparkle(this, 140, 120, PALETTE.terminalCyan));
      saveGameNow();
      return;
    }

    const nextDocket = classNetBatchDocketAfterRoute(result);
    if (!nextDocket) return;
    this.carryVaultDocket(nextDocket);
    this.toast.show(`NEXT: ${nextDocket.shortLabel} > ${this.classNetStationShortLabel(nextDocket.station)}`, this.player.position, "info");
    setLatestMessage(`${result.message} Next: ${nextDocket.label} goes to ${nextDocket.stationLabel}.`);
    this.updateClassNetVaultRouteText();
    setObjective(this.classNetVaultObjective());
    this.syncClassNetVaultEntities();
    this.refreshClearanceTokenRouteCue();
    saveGameNow();
  }

  private awardClassNetDocketPoints(docketId: ClassNetVaultDocketId) {
    if (docketId === "clearance_lane") addDocumentPoints(5, "declassification procedure lane filed");
    else if (docketId === "release_standard") addDocumentPoints(7, "E.O. 13526 release review filed");
  }

  private syncLegacyClassNetProgress(completedDockets: number) {
    if (completedDockets >= 1) {
      gameState.sceneProgress.clearanceProcedureComplete = 1;
      gameState.sceneProgress.clearanceProcedureStep = CLASSNET_VAULT_DOCKETS[0].checkIds.length;
    }
    if (completedDockets >= 2) {
      gameState.sceneProgress.eo13526ReviewComplete = 1;
      gameState.sceneProgress.eo13526ReviewStep = CLASSNET_VAULT_DOCKETS[1].checkIds.length;
    }
    if (completedDockets >= 3) {
      gameState.sceneProgress.declassificationReviewComplete = 1;
      gameState.sceneProgress.declassificationReviewStep = CLASSNET_VAULT_DOCKETS[2].checkIds.length;
    }
  }

  private syncClassNetStationFrames() {
    CLASSNET_VAULT_DOCKETS.forEach((docket, index) => {
      const frame = this.vaultStationFrames.get(docket.station);
      if (!frame) return;
      const filed = index < this.classNetReviewStep || this.classNetReviewComplete;
      const accent = filed
        ? PALETTE.openNetGreen
        : docket.station === "human_desk"
          ? PALETTE.terminalCyan
          : docket.station === "release_board"
            ? PALETTE.goldStamp
            : PALETTE.classNetRed;
      frame.setStrokeStyle(2, color(accent));
      for (const lamp of this.vaultStationLamps.get(docket.station) ?? []) {
        lamp.setFillStyle(color(filed ? PALETTE.openNetGreen : PALETTE.stoneDark));
        lamp.setStrokeStyle(1, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray));
      }
    });
  }

  private classNetVaultObjective() {
    return classNetVaultObjective(
      this.classNetReviewComplete ? CLASSNET_VAULT_DOCKETS.length : this.classNetReviewStep,
      Boolean(this.vaultCarriedDocket()),
      this.clearanceTokenCollected
    );
  }

  private updateClassNetVaultRouteText() {
    this.routeText.setVisible(false);
  }

  private drawVaultDocketAtPedestal() {
    if (this.vaultDocketWorldIcon?.active) this.vaultDocketWorldIcon.destroy();
    if (this.classNetReviewComplete || this.clearanceTokenCollected) {
      this.vaultDocketWorldIcon = undefined;
      return;
    }
    const docket = getClassNetVaultDocket(this.classNetReviewStep);
    this.vaultDocketWorldIcon = this.track(this.createVaultDocketIcon(128, 119, docket.id, false)
      .setName(`classnet-docket-${docket.id}`)
      .setDepth(177));
  }

  private createVaultDocketHeldIcon(docketId: ClassNetVaultDocketId) {
    if (this.vaultDocketHeldIcon?.active) this.vaultDocketHeldIcon.destroy();
    this.vaultDocketHeldIcon = this.createVaultDocketIcon(
      Math.round(this.player.position.x),
      Math.round(this.player.position.y - 17),
      docketId,
      true
    ).setName(`classnet-carried-docket-${docketId}`).setDepth(280);
  }

  private createVaultDocketIcon(
    x: number,
    y: number,
    docketId: ClassNetVaultDocketId,
    compact: boolean
  ) {
    const docket = CLASSNET_VAULT_DOCKETS.find((candidate) => candidate.id === docketId)
      ?? CLASSNET_VAULT_DOCKETS[0];
    const accent = docket.station === "human_desk"
      ? PALETTE.terminalCyan
      : docket.station === "release_board"
        ? PALETTE.goldStamp
        : PALETTE.classNetRed;
    const width = compact ? 22 : 32;
    const height = compact ? 14 : 20;
    return this.add.container(x, y, [
      this.add.ellipse(1, Math.round(height / 2), width + 4, 7, color(PALETTE.black), 0.42),
      this.add.rectangle(0, 0, width, height, color(PALETTE.creamPaper))
        .setStrokeStyle(1, color(accent)),
      this.add.rectangle(-Math.round(width / 2) + 4, 0, 4, height - 3, color(PALETTE.deepRuby)),
      this.add.rectangle(-5, -Math.round(height / 2), compact ? 9 : 13, 4, color(accent))
        .setStrokeStyle(1, color(PALETTE.black)),
      ...docket.checkIds.map((_, index) => this.add.rectangle(-7 + index * 7, compact ? 3 : 4, 4, 2, color(accent)))
    ]);
  }

  private updateVaultDocketIcon() {
    if (!this.vaultDocketHeldIcon?.active) return;
    this.vaultDocketHeldIcon
      .setPosition(Math.round(this.player.position.x), Math.round(this.player.position.y - 17))
      .setDepth(Math.round(this.player.position.y) + 5);
  }

  private collectClearanceToken() {
    if (this.clearanceTokenCollected || !this.classNetReviewComplete) return;
    this.syncLegacyClassNetProgress(CLASSNET_VAULT_DOCKETS.length);
    gameState.sceneProgress.classNetVaultReviewComplete = 1;
    gameState.sceneProgress.classNetVaultReviewStep = CLASSNET_VAULT_DOCKETS.length;
    gameState.sceneProgress.classNetVaultDocketCarried = 0;
    this.clearanceTokenCollected = true;
    setHeldItem(null);
    addProcessItem("clearance_token");
    this.drawRoomDoors();
    setLatestMessage("Clearance Token earned: review records filed and withholding visibly accounted for.");
    setObjective(this.classNetVaultObjective());
    this.routeText.setVisible(false);
    this.clearanceTokenIcon?.setTint(color(PALETTE.goldStamp)).setAlpha(0.4);
    this.clearClearanceTokenRouteCue();
    addSnesRewardBurst(this, 128, 114, "clearance-token", "Clearance Token", (object) => this.track(object));
    this.toast.show("CLEARANCE TOKEN", this.player.position, "info");
    retroAudio.stamp();
    this.syncClassNetVaultEntities();
    this.syncRoomTraversalState();
    saveGameNow();
  }

  private refreshClearanceTokenRouteCue() {
    if (this.currentRoomId !== "N2" || this.clearanceTokenCollected) {
      this.clearClearanceTokenRouteCue();
      return;
    }

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 12) };
    const docket = this.classNetReviewComplete ? null : getClassNetVaultDocket(this.classNetReviewStep);
    const carried = this.vaultCarriedDocket();
    const end = this.classNetReviewComplete || !carried || !docket
      ? { x: 128, y: 132 }
      : this.classNetStationPosition(docket.station);
    const label = this.classNetReviewComplete
      ? "TAKE TOKEN"
      : carried && docket
        ? this.classNetStationShortLabel(docket.station)
        : `TAKE ${docket?.shortLabel ?? "DOCKET"}`;
    const accent = this.classNetReviewComplete
      ? PALETTE.goldStamp
      : docket?.station === "human_desk"
        ? PALETTE.terminalCyan
        : docket?.station === "release_board"
          ? PALETTE.goldStamp
          : PALETTE.classNetRed;
    if (Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y) <= 42) {
      this.clearClearanceTokenRouteCue();
      return;
    }
    const cueKey = `N2:${label}:${start.x},${start.y}->${end.x},${end.y}`;
    if (cueKey === this.clearanceTokenRouteCueKey) return;

    this.clearClearanceTokenRouteCue();
    this.clearanceTokenRouteCueKey = cueKey;
    this.drawClearanceTokenRouteCue(start, end, accent);
  }

  private clearClearanceTokenRouteCue() {
    this.clearanceTokenRouteCue?.clear();
    this.clearanceTokenRouteCueKey = "";
  }

  private drawClearanceTokenRouteCue(
    start: { x: number; y: number },
    end: { x: number; y: number },
    accent: string
  ) {
    const cue = this.clearanceTokenRouteCue ??= this.track(this.add.graphics()
      .setName("network-clearance-guide").setDepth(46));
    cue.lineStyle(2, color(accent)).strokeRect(end.x - 29, end.y - 14, 58, 28);

    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(7, Math.floor(distance / 13)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      const x = Math.round(Phaser.Math.Linear(start.x, end.x, t));
      const y = Math.round(Phaser.Math.Linear(start.y, end.y, t));
      cue.fillStyle(color(index % 2 === 0 ? PALETTE.goldStamp : accent), 0.92)
        .fillRect(x - 2, y - 2, 5, 5);
    }

  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x >= NETWORK_PLAY_BOUNDS.right - 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    else if (position.x <= NETWORK_PLAY_BOUNDS.left + 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    if (!direction) return false;

    // A Continue spawn may lie on the doorway threshold. Require an outward
    // movement request so reading the room cannot immediately send you back.
    if (!requestsDoorExit(direction, getInput().dir)) return false;

    if (this.currentRoomId === "N1" && direction === "west") {
      this.roomTransitionLocked = true;
      saveGameNow();
      transitionTo(this, "ArchiveScene", { chapterFrom: "N1", chapterTo: "A1" });
      return true;
    }

    if (this.currentRoomId === "N1" && direction === "east") {
      if (!this.routingComplete) {
        setLatestMessage("FIREWALL blocks the ClassNet vault until routing is clean.");
        setObjective("Route every item before entering the ClassNet Vault.");
        this.player.setPosition(NETWORK_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.enterRoom("N2", EXIT_SPAWNS.east, true, "east");
      return true;
    }

    if (this.currentRoomId === "N2" && direction === "west") {
      const carried = this.vaultCarriedDocket();
      if (carried) {
        setLatestMessage(`${carried.label} must be filed before leaving the ClassNet Vault.`);
        setObjective(this.classNetVaultObjective());
        this.player.setPosition(NETWORK_PLAY_BOUNDS.left + 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.enterRoom("N1", EXIT_SPAWNS.west, true, "west");
      return true;
    }

    if (this.currentRoomId === "N2" && direction === "east") {
      const heldItems = getHeldProcessItemIds();
      if (!canTraverseExit(this.currentRoomId, direction, heldItems)) {
        const prompt = blockedExitPrompt(this.currentRoomId, direction, heldItems);
        setLatestMessage(prompt.message);
        setObjective(prompt.objective);
        this.player.setPosition(NETWORK_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.roomTransitionLocked = true;
      transitionTo(this, "ReferralVaultScene", { chapterFrom: "N2", chapterTo: "R1" });
      return true;
    }

    this.exitCooldownUntil = this.time.now + 360;
    return false;
  }

  private beginRouting() {
    if (this.routingComplete) {
      setObjective(networkRoutingObjective(NETWORK_ROUTE_PACKETS.length, false));
      this.updateRoutingRouteText();
      return;
    }
    setObjective(networkRoutingObjective(this.currentRoute, Boolean(this.routingCarriedPacket()), gameState.sceneProgress.networkRoutingHintOrder));
    this.updateRoutingRouteText();
    this.syncNetworkSplitEntities();
    this.refreshRoutingRouteCue();
  }

  private syncThreatState() {
    setVisibleThreats(
      [
        this.danneLurker.readout(this.time.now)
      ]
    );
  }

  private updateDanneLurker(delta: number, canPressure = true) {
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, canPressure, this.player.combatReadout);
    if (result.triggered && takeDanneLurkerHit(this.player, this.danneLurker.position, "contact", "DANN-E deadline pressure disrupted network routing.")) {
      this.restoreObjectiveAfterDannePressure();
      this.reliability.update();
    } else if (result.egoBoltHit && takeDanneLurkerHit(this.player, this.danneLurker.position, "ego_bolt", "DANN-E ego bolt disrupted network routing.")) {
      this.restoreObjectiveAfterDannePressure();
      this.reliability.update();
    }
  }

  private restoreObjectiveAfterDannePressure() {
    if (this.currentRoomId === "N1") {
      this.beginRouting();
      return;
    }
    setObjective(this.classNetVaultObjective());
  }

  private finishRouting() {
    if (this.correctRoutes !== NETWORK_ROUTE_ITEM_TOTAL) return;
    this.routingComplete = true;
    gameState.sceneProgress.networkRoutingComplete = 1;
    gameState.sceneProgress.networkRoutingStep = NETWORK_ROUTE_PACKETS.length;
    gameState.sceneProgress.networkRoutingCarried = 0;
    setHeldItem(null);
    if (this.routingPacketWorldIcon?.active) this.routingPacketWorldIcon.destroy();
    if (this.routingPacketHeldIcon?.active) this.routingPacketHeldIcon.destroy();
    this.routingPacketWorldIcon = undefined;
    this.routingPacketHeldIcon = undefined;
    this.clearRoutingRouteCue();
    this.syncRoutingSorterSlots();
    awardProcessStamp("network");
    setDocumentWorkflowState("source_note_047", "submitted_for_review");
    setDocumentWorkflowState("cross_reference_001", "submitted_for_review");
    setDocumentWorkflowState("sbu_annotation_001", "referred");
    addVolumeFragment("Routing Fragment");
    addDocumentPoints(14, "OpenNet/ClassNet routes cleared");
    setLatestMessage("FIREWALL cleared: ClassNet Vault door open.");
    setObjective(networkRoutingObjective(NETWORK_ROUTE_PACKETS.length, false));
    this.removeCrossingSeal();
    this.drawRoomDoors();
    this.syncThreatState();
    this.syncRoomTraversalState();
    this.routeText.setVisible(false);
    this.syncNetworkSplitEntities();
    this.track(addTinySparkle(this, 96, 152, PALETTE.terminalCyan));
    this.track(addTinySparkle(this, 160, 152, PALETTE.openNetGreen));
    this.track(addTinySparkle(this, 222, 126, PALETTE.goldStamp));
    retroAudio.stamp();
    saveGameNow();
  }
}
