import Phaser from "phaser";
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
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput, type InputState } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/items/Terminal";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { FeedbackToast } from "../systems/feedbackToast";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addNetworkCables, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal, addSnesWorldMap } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";
import { SNES_NETWORK_TILE_ASSET } from "../game/snesAtlas";
import {
  declassificationReviewComplete,
  DECLASSIFICATION_REVIEW_PROMPTS,
  evaluateDeclassificationReviewAnswer,
  getDeclassificationReviewPrompt
} from "../game/declassificationReview";
import {
  clearanceProcedureComplete,
  CLEARANCE_PROCEDURE_PROMPTS,
  evaluateClearanceProcedureAnswer,
  getClearanceProcedurePrompt
} from "../game/clearanceProcedure";
import {
  eo13526ReviewComplete,
  EO13526_REVIEW_PROMPTS,
  evaluateEo13526ReviewAnswer,
  getEo13526ReviewPrompt
} from "../game/eo13526Review";
import {
  getNetworkRoutePacket,
  NETWORK_ROUTE_ITEM_TOTAL,
  NETWORK_ROUTE_PACKETS,
  routeNetworkPacket,
  routedItemCount
} from "../game/networkRouting";
import type { NetworkRoutePacketId, RoutingNetwork } from "../game/networkRouting";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type NetworkRoomId = "N1" | "N2";
type NetworkTileFrame = (typeof SNES_NETWORK_TILE_ASSET.frames)[number];

interface NetworkRoom {
  id: NetworkRoomId;
  title: string;
  roomType: RoomType;
  exits: Partial<Record<Direction, NetworkRoomId | "ReferralVaultScene">>;
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
    exits: { east: "N2" },
    lockedExits: { east: "FIREWALL terminal door" }
  },
  N2: {
    id: "N2",
    title: "ClassNet Vault",
    roomType: "reward",
    exits: { west: "N1", east: "ReferralVaultScene" },
    lockedExits: { east: "Red vault exit" },
    requiredItems: { east: "clearance_token" }
  }
};

export class NetworkScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private routeText!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private toast!: FeedbackToast;
  private currentRoute = 0;
  private correctRoutes = 0;
  private routingComplete = false;
  private routingPacketWorldIcon?: Phaser.GameObjects.Container;
  private routingPacketHeldIcon?: Phaser.GameObjects.Container;
  private routingSorterSlots: Phaser.GameObjects.Rectangle[] = [];
  private routingRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private routingRouteCueKey = "";
  private clearanceTokenCollected = false;
  private currentRoomId: NetworkRoomId = "N1";
  private visitedRoomIds = new Set<NetworkRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private mapCells = new Map<NetworkRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<NetworkRoomId, Phaser.GameObjects.Text>();
  private roomTitleText!: Phaser.GameObjects.Text;
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private clearanceTokenIcon?: Phaser.GameObjects.Image;
  private clearanceTokenRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private clearanceTokenRouteCueKey = "";
  private bureaucraticWalls: BureaucraticWall[] = [];
  private danneLurker!: DanneLurker;

  constructor() {
    super("NetworkScene");
  }

  create() {
    setSceneState("NetworkScene", "explore", "Two Networks: earn the Clearance Token.");
    retroAudio.startMusic("NetworkScene");
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    drawTiledFloor(this, "network-tiles");
    drawRoomFrame(this, "TWO NETWORKS", PALETTE.goldStamp, { showLegacyHud: false });
    this.drawNetworkMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902).setVisible(false);

    this.routeText = this.add.text(196, 45, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center",
      wordWrap: { width: 96, useAdvancedWrap: true },
      fixedWidth: 96
    }).setOrigin(0.5).setDepth(820).setVisible(false);
    this.player = new Player(this, 128, 196);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.toast = new FeedbackToast(this);
    this.danneLurker = new DanneLurker(this, 46, 66, {
      waypoints: [
        { x: 46, y: 66 },
        { x: 204, y: 66 },
        { x: 214, y: 184 },
        { x: 128, y: 206 },
        { x: 48, y: 178 }
      ]
    });
    this.restoreNetworkProgress();
    this.enterRoom("N1", { x: 128, y: 196 }, false);
    this.beginRouting();
    if (!this.routingComplete) {
      setLatestMessage("OpenNet takes public material. ClassNet takes protected review packets.");
    }
  }

  private restoreNetworkProgress() {
    this.routingComplete = Boolean(gameState.sceneProgress.networkRoutingComplete)
      || gameState.processStamps.includes("network");
    this.currentRoute = this.routingComplete
      ? NETWORK_ROUTE_PACKETS.length
      : Math.max(0, Math.min(
        NETWORK_ROUTE_PACKETS.length - 1,
        Math.floor(gameState.sceneProgress.networkRoutingStep ?? 0)
      ));
    this.correctRoutes = this.routingComplete
      ? NETWORK_ROUTE_ITEM_TOTAL
      : routedItemCount(this.currentRoute);
    this.clearanceTokenCollected = hasProcessItem("clearance_token");
    if (this.routingComplete) gameState.sceneProgress.networkRoutingCarried = 0;
    else if ((gameState.sceneProgress.networkRoutingCarried ?? 0) !== getNetworkRoutePacket(this.currentRoute).order) {
      gameState.sceneProgress.networkRoutingCarried = 0;
    }
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    this.bureaucraticWalls.forEach((wall) => wall.update(this.time.now, delta, this.player?.position));
    this.updateDanneLurker(delta);
    this.syncThreatState();
    this.toast.update(delta, this.player.position);
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    if (this.roomTransitionLocked) {
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      return;
    }
    if (this.dialog.active) {
      this.interactionPrompt.update(delta, null);
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.choice.active || this.inventory.active || this.reliability.active) {
      this.interactionPrompt.update(delta, null);
      handleOpenOverlays(this.inventory, this.reliability);
      this.choice.updateInput();
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }
    this.player.update(delta, true, { bounds: NETWORK_PLAY_BOUNDS });
    if (this.currentRoomId === "N1") {
      this.updateRoutingPacketIcon();
      this.updateRoutingPacketPrompt(delta);
      this.refreshRoutingRouteCue();
    } else {
      this.updateClearanceTokenPrompt(delta);
      this.refreshClearanceTokenRouteCue();
    }
    const handledRoomAction = this.currentRoomId === "N1"
      ? this.handleRoutingPacketAction(input)
      : this.handleClearanceTokenAction(input);
    if (handledRoomAction) {
      this.reliability.update();
      this.objectiveText.setText(this.currentRoomId === "N1" ? "" : gameState.objective);
      return;
    }
    if (this.checkRoomExit()) return;
    this.reliability.update();
    this.objectiveText.setText(this.currentRoomId === "N1" ? "" : gameState.objective);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.roomObjects.push(object);
    return object;
  }

  private enterRoom(roomId: NetworkRoomId, spawn: { x: number; y: number }, wipe = true, direction: Direction = "east") {
    const applyRoom = () => {
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      this.player.setPosition(spawn.x, spawn.y);
      this.syncRoomTraversalState();
      this.updateNetworkMinimap();
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
    for (const wall of this.bureaucraticWalls) wall.destroy();
    this.roomCleanups = [];
    this.roomObjects = [];
    this.bureaucraticWalls = [];
    this.clearanceTokenIcon = undefined;
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
    addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "network", track: (object) => this.track(object) });
    this.drawNetworkTileField(room.id);
    this.drawRoomDoors();
    addSnesRoomCompass(this, {
      x: 216,
      y: 62,
      roomId: room.id,
      roomTitle: room.title,
      exits: room.exits,
      lockedExits: this.compassLockedExits(room),
      requiredItems: room.requiredItems,
      track: (object) => this.track(object),
      depth: 143
    });
    if (room.id === "N1") this.renderNetworkSplit();
    else this.renderClassNetVault();
    this.syncRoomTraversalState();
    this.syncThreatState();
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
      this.drawNetworkTileFrame("firewall_gate", 104, 152, 66, "firewall-left");
      this.drawNetworkTileFrame("firewall_gate", 152, 152, 66, "firewall-right");
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
    const room = NETWORK_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      addSnesGate(this, {
        direction: "west",
        hasExit: true,
        unlocked: true,
        accent: PALETTE.terminalCyan,
        exitLabel: "SPLIT",
        track: (object) => this.track(object),
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
        track: (object) => this.track(object),
        depth: 65
      });
    }
  }

  private compassLockedExits(room: NetworkRoom) {
    const locked: Partial<Record<Direction, string>> = {};
    if (room.id === "N1" && room.exits.east && !this.routingComplete) {
      locked.east = room.lockedExits?.east ?? "ROUT";
    }
    if (room.id === "N2" && room.exits.east && !this.clearanceTokenCollected) {
      locked.east = room.lockedExits?.east ?? room.requiredItems?.east ?? "TOKN";
    }
    return locked;
  }

  private renderNetworkSplit() {
    this.syncNetworkSplitEntities();
    addNetworkCables(this, (object) => this.track(object));
    addSnesWorldMap(this, 128, 66, "NET MAP", "two-networks-map", (object) => this.track(object));
    this.track(addTinySparkle(this, 60, 108, PALETTE.openNetGreen));
    this.track(addTinySparkle(this, 196, 108, PALETTE.classNetRed));
    const marcus = new HistorianNPC(this, "marcus", 128, 54);
    this.roomCleanups.push(() => marcus.destroy());
    this.track(new Terminal(this, 60, 124, "OpenNet").container);
    this.track(new Terminal(this, 196, 124, "ClassNet").container);
    this.track(this.add.rectangle(60, 178, 42, 12, color(PALETTE.black), 0.92).setStrokeStyle(1, color(PALETTE.openNetGreen)).setDepth(166));
    this.track(this.add.text(60, 174, "OPENNET", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.openNetGreen,
      align: "center"
    }).setOrigin(0.5).setDepth(167));
    this.track(this.add.rectangle(196, 178, 42, 12, color(PALETTE.black), 0.92).setStrokeStyle(1, color(PALETTE.classNetRed)).setDepth(166));
    this.track(this.add.text(196, 174, "CLASSNET", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5).setDepth(167));
    this.drawRoutingSorter();
    if (!this.routingComplete) {
      this.bureaucraticWalls = [
        new BureaucraticWall(this, "firewall-open", "FIREWALL", 96, 152, { behavior: "block", accent: PALETTE.classNetRed }),
        new BureaucraticWall(this, "firewall-class", "FORM 32", 160, 152, { behavior: "block", accent: PALETTE.classNetRed })
      ];
      this.updateRoutingRouteText();
    } else {
      this.routeText.setText("FIREWALL CLEARED\nEAST DOOR").setVisible(true);
      setObjective("Two Networks: enter the ClassNet Vault through the east gate.");
    }
  }

  private syncNetworkSplitEntities() {
    const packet = this.routingComplete ? null : getNetworkRoutePacket(this.currentRoute);
    const carried = this.routingCarriedPacket();
    setVisibleEntities([
      "Marcus",
      "OpenNet terminal",
      "ClassNet terminal",
      "Routing sorter",
      ...(!this.routingComplete ? ["Stone Wall: FIREWALL"] : []),
      ...(packet ? [`Routing packet ${packet.order}/4: ${packet.label} (${carried ? "carried" : "at sorter"})`] : [])
    ]);
  }

  private drawRoutingSorter() {
    const sorter = this.track(this.add.container(128, 178).setDepth(170).setName("network-routing-sorter"));
    sorter.add(this.add.ellipse(0, 8, 48, 12, color(PALETTE.black), 0.42));
    sorter.add(this.add.rectangle(0, 0, 48, 22, color(PALETTE.black), 0.92)
      .setStrokeStyle(2, color(this.routingComplete ? PALETTE.openNetGreen : PALETTE.goldStamp)));
    sorter.add(this.add.text(0, 6, this.routingComplete ? "ROUTED" : "SORTER", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: this.routingComplete ? PALETTE.openNetGreen : PALETTE.goldStamp
    }).setOrigin(0.5, 0));
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
    const classification = packet.classification === "unclassified"
      ? "U"
      : packet.classification === "sbu"
        ? "SBU"
        : "C";
    return this.add.container(x, y, [
      this.add.ellipse(1, Math.round(height / 2), width + 4, 7, color(PALETTE.black), 0.4),
      this.add.rectangle(0, 0, width, height, color(PALETTE.creamPaper))
        .setStrokeStyle(1, color(accent)),
      this.add.rectangle(-Math.round(width / 2) + 3, 0, 3, height - 3, color(accent)),
      this.add.rectangle(-4, -Math.round(height / 2), compact ? 8 : 11, 4, color(PALETTE.archiveAmber))
        .setStrokeStyle(1, color(PALETTE.sepiaInk)),
      this.add.text(compact ? 3 : 4, compact ? -5 : -7, classification, {
        fontFamily: "monospace",
        fontSize: compact ? "4px" : "5px",
        color: PALETTE.black
      }).setOrigin(0.5, 0),
      this.add.text(0, compact ? 2 : 3, packet.shortLabel.slice(0, compact ? 4 : 6), {
        fontFamily: "monospace",
        fontSize: "3px",
        color: PALETTE.sepiaInk
      }).setOrigin(0.5, 0)
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
    const target = this.routingActionHint();
    const strictTarget = target && Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) <= (target.radius ?? 34) ? target : null;
    const carried = this.routingCarriedPacket();
    const packet = this.routingComplete ? null : getNetworkRoutePacket(this.currentRoute);
    this.interactionPrompt.update(delta, strictTarget, undefined, strictTarget ? {
      badge: "A",
      text: carried
        ? `SEND ${target?.id === "network-opennet" ? "OPENNET" : "CLASSNET"}`
        : `TAKE ${packet?.shortLabel ?? "PACKET"}`
    } : undefined);
    setNearestInteractable(strictTarget?.label ?? null);
  }

  private handleRoutingPacketAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "N1" || this.routingComplete || !input.aJustPressed) return false;
    const target = this.routingActionHint();
    if (!target || Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) > (target.radius ?? 34)) {
      retroAudio.blip();
      setLatestMessage("Follow the lit cable to the highlighted target.");
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
    gameState.sceneProgress.networkRoutingCarried = packet.order;
    setHeldItem(`${packet.label} Packet`);
    if (this.routingPacketWorldIcon?.active) this.routingPacketWorldIcon.destroy();
    this.routingPacketWorldIcon = undefined;
    this.createRoutingPacketHeldIcon(packet.id);
    retroAudio.confirm();
    this.toast.show(`${packet.shortLabel} ACQUIRED`, this.player.position, "info");
    setLatestMessage(`${packet.label}: ${packet.classification.toUpperCase()}. Route it to ${packet.network}.`);
    setObjective(`ROUTE ${packet.order}/4: carry ${packet.label} to ${packet.network}.`);
    this.updateRoutingRouteText();
    this.syncNetworkSplitEntities();
    this.refreshRoutingRouteCue();
  }

  private routeCarriedPacket(destination: RoutingNetwork) {
    const packet = this.routingCarriedPacket();
    if (!packet) return;
    const result = routeNetworkPacket(this.currentRoute, packet.id, destination);
    gameState.sceneProgress.networkRoutingCarried = 0;
    setHeldItem(null);
    if (this.routingPacketHeldIcon?.active) this.routingPacketHeldIcon.destroy();
    this.routingPacketHeldIcon = undefined;

    if (!result.ok) {
      adjustReliability(-2, `${result.packet.label} caught at the wrong-network firewall before transmission`);
      retroAudio.warning();
      this.routeText.setText(result.leakRisk ? "FIREWALL STOP\nCLOSED PACKET" : "FIREWALL STOP\nWRONG NETWORK").setVisible(true);
      this.toast.show("WRONG NETWORK", this.player.position, "warn");
      setLatestMessage(result.message);
      setObjective(`RETRY ${packet.order}/4: collect ${packet.label} from the sorter.`);
      this.drawRoutingPacketAtSorter();
      this.syncNetworkSplitEntities();
      this.refreshRoutingRouteCue();
      this.reliability.update();
      return;
    }

    this.currentRoute = result.nextStep;
    this.correctRoutes = routedItemCount(result.nextStep);
    gameState.sceneProgress.networkRoutingStep = result.nextStep;
    this.syncRoutingSorterSlots();
    adjustReliability(result.packet.itemLabels.length * 3, `${result.packet.label} routed to ${destination}`);
    retroAudio.stamp();
    this.toast.show(`${result.packet.shortLabel} > ${destination.toUpperCase()}`, this.player.position, "info");
    setLatestMessage(result.message);
    if (result.complete) {
      this.finishRouting();
      return;
    }

    const nextPacket = getNetworkRoutePacket(result.nextStep);
    setObjective(`ROUTE ${nextPacket.order}/4: collect ${nextPacket.label} from the sorter.`);
    this.drawRoutingPacketAtSorter();
    this.updateRoutingRouteText();
    this.syncNetworkSplitEntities();
    this.refreshRoutingRouteCue();
    this.reliability.update();
  }

  private updateRoutingRouteText() {
    if (this.routingComplete) {
      this.routeText.setText("FIREWALL CLEARED\nEAST DOOR").setVisible(true);
      return;
    }
    this.routeText.setVisible(false);
  }

  private refreshRoutingRouteCue() {
    if (this.currentRoomId !== "N1" || this.routingComplete) {
      this.clearRoutingRouteCue();
      return;
    }
    const packet = getNetworkRoutePacket(this.currentRoute);
    const carried = this.routingCarriedPacket();
    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 14) };
    const end = carried
      ? { x: packet.network === "OpenNet" ? 60 : 196, y: 124 }
      : { x: 128, y: 178 };
    const targetDistance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    if (targetDistance <= (carried ? 38 : 36)) {
      this.clearRoutingRouteCue();
      return;
    }
    const label = carried ? packet.network.toUpperCase() : "GET PACKET";
    const cueKey = `N1:${packet.id}:${carried ? "carried" : "sorter"}:${start.x},${start.y}->${end.x},${end.y}`;
    if (cueKey === this.routingRouteCueKey) return;
    this.clearRoutingRouteCue();
    this.routingRouteCueKey = cueKey;
    this.drawRoutingRouteCue(start, end, label, carried ? packet.network : null);
  }

  private clearRoutingRouteCue() {
    for (const object of this.routingRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.routingRouteCueObjects = [];
    this.routingRouteCueKey = "";
  }

  private trackRoutingRouteCue<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.routingRouteCueObjects.push(object);
    return this.track(object);
  }

  private drawRoutingRouteCue(
    start: { x: number; y: number },
    end: { x: number; y: number },
    label: string,
    network: RoutingNetwork | null
  ) {
    const accent = network === "OpenNet"
      ? PALETTE.openNetGreen
      : network === "ClassNet"
        ? PALETTE.classNetRed
        : PALETTE.goldStamp;
    this.trackRoutingRouteCue(this.add.rectangle(end.x, end.y, network ? 46 : 52, network ? 34 : 30, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(accent), 0.96)
      .setName("network-routing-target")
      .setDepth(236));
    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(7, Math.floor(distance / 14)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      this.trackRoutingRouteCue(this.add.rectangle(
        Math.round(Phaser.Math.Linear(start.x, end.x, t)),
        Math.round(Phaser.Math.Linear(start.y, end.y, t)),
        4,
        4,
        color(index % 2 === 0 ? PALETTE.creamPaper : accent),
        0.9
      ).setAngle(45).setName("network-routing-dot").setDepth(237));
    }
    const width = Math.max(52, label.length * 4 + 10);
    this.trackRoutingRouteCue(this.add.rectangle(end.x, end.y + (network ? 27 : 24), width, 10, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(accent))
      .setName("network-routing-label-frame")
      .setDepth(238));
    this.trackRoutingRouteCue(this.add.text(end.x, end.y + (network ? 24 : 21), label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setOrigin(0.5, 0).setName("network-routing-label").setDepth(239));
  }

  private renderClassNetVault() {
    setVisibleEntities(["ClassNet vault door", "Clearance Token pedestal", "Referral handoff gate"]);
    this.track(this.add.rectangle(128, 78, 164, 28, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.classNetRed)).setDepth(76));
    this.track(this.add.text(128, 69, "CLASSNET VAULT", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.classNetRed
    }).setOrigin(0.5).setDepth(78));
    for (let x = 54; x <= 202; x += 24) {
      this.track(this.add.rectangle(x, 96, 14, 18, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.classNetRed)).setDepth(84));
      this.track(this.add.rectangle(x, 94, 8, 2, color(PALETTE.goldStamp)).setDepth(85));
    }
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 132,
      textureKey: "clearance-token",
      label: "Clearance Token",
      collected: this.clearanceTokenCollected,
      accent: PALETTE.classNetRed,
      track: (object) => this.track(object),
      depth: 138
    });
    if (!this.clearanceTokenCollected) {
      this.clearanceTokenIcon = this.track(this.add.image(128, 132, "clearance-token").setDepth(165).setVisible(false));
      this.routeText.setText(this.clearanceTokenRouteLabel(false)).setVisible(true);
      setObjective(this.clearanceTokenObjective());
    } else {
      this.track(this.add.image(128, 132, "clearance-token").setTint(color(PALETTE.goldStamp)).setDepth(165).setVisible(false));
      this.routeText.setText("TOKEN EARNED\nEAST DOOR").setVisible(true);
      setObjective("Two Networks: exit east to the Referral Vault.");
    }
  }

  private drawNetworkMinimap() {
    (["N1", "N2"] as NetworkRoomId[]).forEach((roomId, index) => {
      const x = 16 + index * 11;
      const cell = this.add.rectangle(x, 16, 8, 7, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.creamPaper)).setDepth(805);
      const label = this.add.text(x, 12, roomId, {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.creamPaper
      }).setOrigin(0.5, 0).setDepth(806);
      this.mapCells.set(roomId, cell);
      this.mapLabels.set(roomId, label);
    });
  }

  private updateNetworkMinimap() {
    for (const [roomId, cell] of this.mapCells) {
      const active = roomId === this.currentRoomId;
      const visited = this.visitedRoomIds.has(roomId);
      cell.setFillStyle(color(active ? PALETTE.goldStamp : visited ? PALETTE.terminalCyan : PALETTE.stoneDark));
      this.mapLabels.get(roomId)?.setColor(active ? PALETTE.black : PALETTE.creamPaper);
    }
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

  private handleClearanceTokenAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "N2") {
      setNearestInteractable(null);
      return false;
    }
    if (this.clearanceTokenCollected) {
      setNearestInteractable(null);
      this.routeText.setText("TOKEN EARNED\nEAST DOOR").setVisible(true);
      return false;
    }
    const nearToken = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) <= 40;
    if (!nearToken) {
      setNearestInteractable(null);
      this.routeText.setText(this.clearanceTokenRouteLabel(false)).setVisible(true);
      if (input.aJustPressed && this.clearanceTokenHintTarget()) {
        retroAudio.blip();
        setLatestMessage("Step closer to Clearance Token.");
        return true;
      }
      return false;
    }
    setNearestInteractable("Clearance Token");
    this.routeText.setText(this.clearanceTokenRouteLabel(true)).setVisible(true);
    if (!input.aJustPressed) return false;
    if (!gameState.sceneProgress.clearanceProcedureComplete) this.showClearanceProcedureChoice();
    else if (!gameState.sceneProgress.eo13526ReviewComplete) this.showEo13526ReviewChoice();
    else if (gameState.sceneProgress.declassificationReviewComplete) this.collectClearanceToken();
    else this.showDeclassificationReviewChoice();
    return true;
  }

  private updateClearanceTokenPrompt(delta: number) {
    const hintTarget = this.clearanceTokenHintTarget();
    const strictTarget = this.clearanceTokenStrictTarget();
    this.interactionPrompt.update(
      delta,
      strictTarget ?? hintTarget,
      undefined,
      strictTarget ? { badge: "A", text: "CLEARANCE TOKEN" } : hintTarget ? { badge: "!", text: "STEP CLOSER" } : undefined
    );
  }

  private clearanceTokenStrictTarget(): Interactable | null {
    if (this.currentRoomId !== "N2" || this.clearanceTokenCollected) return null;
    if (Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) > 40) return null;
    return this.clearanceTokenTarget(40);
  }

  private clearanceTokenHintTarget(): Interactable | null {
    if (this.currentRoomId !== "N2" || this.clearanceTokenCollected) return null;
    if (Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) > 56) return null;
    return this.clearanceTokenTarget(40);
  }

  private clearanceTokenTarget(radius: number): Interactable {
    return {
      id: "clearance-token-pedestal",
      label: "Clearance Token",
      x: 128,
      y: 132,
      radius,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private clearanceTokenRouteLabel(nearToken: boolean) {
    if (!gameState.sceneProgress.clearanceProcedureComplete) {
      return nearToken ? "CLEARANCE LANE\nPRESS SPACE" : "CLEARANCE LANE\nVERIFY PROCEDURE";
    }
    if (!gameState.sceneProgress.eo13526ReviewComplete) {
      return nearToken ? "E.O. 13526\nPRESS SPACE" : "E.O. 13526\nRELEASE REVIEW";
    }
    if (!gameState.sceneProgress.declassificationReviewComplete) {
      return nearToken ? "CLASSNET REVIEW\nPRESS SPACE" : "CLASSNET REVIEW\nVERIFY AND TAKE";
    }
    return nearToken ? "CLEARANCE TOKEN\nPRESS SPACE" : "CLEARANCE TOKEN\nVERIFY AND TAKE";
  }

  private clearanceTokenObjective() {
    if (!gameState.sceneProgress.clearanceProcedureComplete) {
      return "Two Networks: document the ClassNet clearance procedure before token review.";
    }
    if (!gameState.sceneProgress.eo13526ReviewComplete) {
      return "Two Networks: apply the E.O. 13526 release standard before token review.";
    }
    if (!gameState.sceneProgress.declassificationReviewComplete) {
      return "Two Networks: complete the ClassNet review before taking the token.";
    }
    return "Two Networks: collect the Clearance Token in N2.";
  }

  private showClearanceProcedureChoice() {
    if (gameState.sceneProgress.clearanceProcedureComplete) {
      this.showEo13526ReviewChoice();
      return;
    }

    const step = gameState.sceneProgress.clearanceProcedureStep ?? 0;
    const prompt = getClearanceProcedurePrompt(step);
    setObjective(`Clearance procedure: answer ${step + 1}/${CLEARANCE_PROCEDURE_PROMPTS.length}.`);
    this.routeText.setText(`CLEARANCE\n${step + 1}/${CLEARANCE_PROCEDURE_PROMPTS.length}`).setVisible(true);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateClearanceProcedureAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Clearance procedure shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("CLEARANCE LANE FAILED - HUMAN REVIEW ROUTE REQUIRED");
        this.dialog.show("CLEARANCE PROCEDURE", [
          result.message,
          "The declassification lane must stay separate and accountable."
        ], () => this.showClearanceProcedureChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.clearanceProcedureStep = nextStep;
      if (!clearanceProcedureComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Clearance procedure check ${nextStep}/${CLEARANCE_PROCEDURE_PROMPTS.length}.`);
        this.dialog.show("CLEARANCE PROCEDURE", [
          result.message,
          "Continue routing the clearance procedure before the token review."
        ], () => this.showClearanceProcedureChoice());
        return;
      }

      gameState.sceneProgress.clearanceProcedureComplete = 1;
      gameState.sceneProgress.clearanceProcedureStep = CLEARANCE_PROCEDURE_PROMPTS.length;
      addDocumentPoints(5, "declassification procedure lane documented");
      retroAudio.confirm();
      setLatestMessage("Clearance procedure lane logged: proceed to ClassNet review.");
      this.dialog.show("CLEARANCE PROCEDURE", [
        result.message,
        "Procedure lane filed.",
        "Now apply the E.O. 13526 release review."
      ], () => this.showEo13526ReviewChoice());
    });
  }

  private showEo13526ReviewChoice() {
    if (!gameState.sceneProgress.clearanceProcedureComplete) {
      this.showClearanceProcedureChoice();
      return;
    }
    if (gameState.sceneProgress.eo13526ReviewComplete) {
      this.showDeclassificationReviewChoice();
      return;
    }

    const step = gameState.sceneProgress.eo13526ReviewStep ?? 0;
    const prompt = getEo13526ReviewPrompt(step);
    setObjective(`E.O. 13526 review: answer ${step + 1}/${EO13526_REVIEW_PROMPTS.length}.`);
    this.routeText.setText(`E.O. 13526\n${step + 1}/${EO13526_REVIEW_PROMPTS.length}`).setVisible(true);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateEo13526ReviewAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `E.O. 13526 review shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("E.O. 13526 REVIEW FAILED - RELEASE STANDARD REQUIRED");
        this.dialog.show("E.O. 13526 REVIEW", [
          result.message,
          "Release review must keep concurrence and withholding accounting visible."
        ], () => this.showEo13526ReviewChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.eo13526ReviewStep = nextStep;
      if (!eo13526ReviewComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`E.O. 13526 review check ${nextStep}/${EO13526_REVIEW_PROMPTS.length}.`);
        this.dialog.show("E.O. 13526 REVIEW", [
          result.message,
          "Continue the release-standard review before the token moves."
        ], () => this.showEo13526ReviewChoice());
        return;
      }

      gameState.sceneProgress.eo13526ReviewComplete = 1;
      gameState.sceneProgress.eo13526ReviewStep = EO13526_REVIEW_PROMPTS.length;
      addDocumentPoints(7, "E.O. 13526 release review filed");
      retroAudio.confirm();
      setLatestMessage("E.O. 13526 review logged: release, concurrence, and accounting filed.");
      this.dialog.show("E.O. 13526 REVIEW", [
        result.message,
        "Release standard filed.",
        "Now resolve the classified equity review."
      ], () => this.showDeclassificationReviewChoice());
    });
  }

  private showDeclassificationReviewChoice() {
    if (gameState.sceneProgress.declassificationReviewComplete) {
      this.collectClearanceToken();
      return;
    }

    const step = gameState.sceneProgress.declassificationReviewStep ?? 0;
    const prompt = getDeclassificationReviewPrompt(step);
    setObjective(`ClassNet review: answer ${step + 1}/${DECLASSIFICATION_REVIEW_PROMPTS.length}.`);
    this.routeText.setText(`CLASSNET\n${step + 1}/${DECLASSIFICATION_REVIEW_PROMPTS.length}`).setVisible(true);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateDeclassificationReviewAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        adjustReliability(-3, "declassification review correction");
        setLatestMessage("EVIDENCE-BOUND: HUMAN CHECK REQUIRED");
        this.reliability.update();
        this.dialog.show("CLASSNET REVIEW", [
          result.message,
          "Classified equities need a documented human review before the token moves."
        ], () => this.showDeclassificationReviewChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.declassificationReviewStep = nextStep;
      if (!declassificationReviewComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`ClassNet review check ${nextStep}/${DECLASSIFICATION_REVIEW_PROMPTS.length}.`);
        this.dialog.show("CLASSNET REVIEW", [
          result.message,
          "Continue the clearance review before taking the token."
        ], () => this.showDeclassificationReviewChoice());
        return;
      }

      gameState.sceneProgress.declassificationReviewComplete = 1;
      retroAudio.confirm();
      setLatestMessage("ClassNet declassification review documented.");
      this.dialog.show("CLASSNET REVIEW", [
        result.message,
        "The human decision trail is logged.",
        "Take the Clearance Token from the pedestal."
      ], () => this.collectClearanceToken());
    });
  }

  private collectClearanceToken() {
    if (this.clearanceTokenCollected) return;
    gameState.sceneProgress.clearanceProcedureComplete = 1;
    gameState.sceneProgress.clearanceProcedureStep = CLEARANCE_PROCEDURE_PROMPTS.length;
    gameState.sceneProgress.eo13526ReviewComplete = 1;
    gameState.sceneProgress.eo13526ReviewStep = EO13526_REVIEW_PROMPTS.length;
    gameState.sceneProgress.declassificationReviewComplete = 1;
    this.clearanceTokenCollected = true;
    addProcessItem("clearance_token");
    setLatestMessage("Clearance Token opens red vault doors.");
    setObjective("Two Networks: exit east to the Referral Vault.");
    this.routeText.setText("TOKEN EARNED\nEAST DOOR").setVisible(true);
    this.clearanceTokenIcon?.setTint(color(PALETTE.goldStamp));
    this.clearClearanceTokenRouteCue();
    addSnesRewardBurst(this, 128, 114, "clearance-token", "Clearance Token", (object) => this.track(object));
    retroAudio.stamp();
    this.syncRoomTraversalState();
    this.updateNetworkMinimap();
    this.dialog.show("CLASSNET", [
      "Token logged after correct routing.",
      "Human review owns the handoff. StateChat stays on terminal support."
    ]);
  }

  private refreshClearanceTokenRouteCue() {
    if (this.currentRoomId !== "N2" || this.clearanceTokenCollected) {
      this.clearClearanceTokenRouteCue();
      return;
    }

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 12) };
    const end = { x: 128, y: 132 };
    const label = this.clearanceTokenRouteCueLabel();
    const cueKey = `N2:${label}:${start.x},${start.y}->${end.x},${end.y}`;
    if (cueKey === this.clearanceTokenRouteCueKey) return;

    this.clearClearanceTokenRouteCue();
    this.clearanceTokenRouteCueKey = cueKey;
    this.drawClearanceTokenRouteCue(start, end, label);
  }

  private clearClearanceTokenRouteCue() {
    for (const object of this.clearanceTokenRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.clearanceTokenRouteCueObjects = [];
    this.clearanceTokenRouteCueKey = "";
  }

  private trackClearanceTokenRouteCue<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.clearanceTokenRouteCueObjects.push(object);
    return this.track(object);
  }

  private clearanceTokenRouteCueLabel() {
    if (!gameState.sceneProgress.clearanceProcedureComplete) return "VERIFY LANE";
    if (!gameState.sceneProgress.eo13526ReviewComplete) return "E.O. REVIEW";
    if (!gameState.sceneProgress.declassificationReviewComplete) return "CLASS REVIEW";
    return "TAKE TOKEN";
  }

  private drawClearanceTokenRouteCue(start: { x: number; y: number }, end: { x: number; y: number }, label: string) {
    const accent = label === "TAKE TOKEN"
      ? PALETTE.goldStamp
      : label === "CLASS REVIEW"
        ? PALETTE.classNetRed
        : PALETTE.terminalCyan;

    this.trackClearanceTokenRouteCue(this.add.ellipse(end.x, end.y + 16, 78, 16, color(PALETTE.black), 0.34)
      .setName("network-clearance-token-route-shadow")
      .setDepth(136));
    this.trackClearanceTokenRouteCue(this.add.rectangle(end.x, end.y, 44, 32, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(accent))
      .setName("network-clearance-token-route-target-glow")
      .setDepth(236));

    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(7, Math.floor(distance / 13)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      const x = Math.round(Phaser.Math.Linear(start.x, end.x, t));
      const y = Math.round(Phaser.Math.Linear(start.y, end.y, t));
      this.trackClearanceTokenRouteCue(this.add.rectangle(x, y, 5, 5, color(index % 2 === 0 ? PALETTE.goldStamp : accent), 0.92)
        .setName("network-clearance-token-route-dot")
        .setDepth(237));
    }

    const width = Math.max(56, label.length * 5 + 10);
    this.trackClearanceTokenRouteCue(this.add.rectangle(end.x, end.y + 34, width, 10, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(accent))
      .setName("network-clearance-token-route-label-frame")
      .setDepth(238));
    this.trackClearanceTokenRouteCue(this.add.text(end.x, end.y + 31, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setName("network-clearance-token-route-label")
      .setOrigin(0.5, 0)
      .setDepth(239));
  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x >= NETWORK_PLAY_BOUNDS.right - 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    else if (position.x <= NETWORK_PLAY_BOUNDS.left + 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    if (!direction) return false;

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
      transitionTo(this, "ReferralVaultScene");
      return true;
    }

    this.exitCooldownUntil = this.time.now + 360;
    return false;
  }

  private beginRouting() {
    if (this.routingComplete) {
      setObjective("Two Networks: enter the ClassNet Vault through the east gate.");
      this.updateRoutingRouteText();
      return;
    }
    const packet = getNetworkRoutePacket(this.currentRoute);
    setObjective(this.routingCarriedPacket()
      ? `ROUTE ${packet.order}/4: carry ${packet.label} to ${packet.network}.`
      : `ROUTE ${packet.order}/4: collect ${packet.label} from the sorter.`);
    this.updateRoutingRouteText();
    this.syncNetworkSplitEntities();
    this.refreshRoutingRouteCue();
  }

  private syncThreatState() {
    setVisibleThreats(
      [
        ...this.bureaucraticWalls
        .filter((wall) => !wall.isCleared)
        .map((wall) => ({
          label: `Stone Wall: ${wall.label}`,
          x: wall.position.x,
          y: wall.position.y,
          spriteKey: wall.spriteKey,
          behavior: "blocks terminal door",
          defeatMethod: "Use correct OpenNet/ClassNet routing",
          status: this.routingComplete ? "cleared" : "active"
        })),
        this.danneLurker.readout(this.time.now)
      ]
    );
  }

  private updateDanneLurker(delta: number) {
    const canPressure = !this.roomTransitionLocked
      && !this.dialog.active
      && !this.choice.active
      && !this.inventory.active
      && !this.reliability.active;
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, canPressure);
    if (result.triggered) {
      this.player.takeHit(this.danneLurker.position, 11, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E deadline pressure disrupted network routing.");
      this.restoreObjectiveAfterDannePressure();
      this.reliability.update();
    } else if (result.egoBoltHit) {
      this.player.takeHit(this.danneLurker.position, 9, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E ego bolt disrupted network routing.");
      this.restoreObjectiveAfterDannePressure();
      this.reliability.update();
    }
  }

  private restoreObjectiveAfterDannePressure() {
    if (this.currentRoomId === "N1") {
      this.beginRouting();
      return;
    }
    setObjective(this.clearanceTokenCollected
      ? "Two Networks: exit east to the Referral Vault."
      : this.clearanceTokenObjective());
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
    setObjective("Two Networks: enter the ClassNet Vault through the east gate.");
    this.bureaucraticWalls.forEach((wall) => wall.clear());
    this.syncThreatState();
    this.syncRoomTraversalState();
    this.updateNetworkMinimap();
    this.routeText.setText("FIREWALL CLEARED\nEAST DOOR").setVisible(true);
    this.syncNetworkSplitEntities();
    this.track(addTinySparkle(this, 96, 152, PALETTE.terminalCyan));
    this.track(addTinySparkle(this, 160, 152, PALETTE.openNetGreen));
    this.track(addTinySparkle(this, 222, 126, PALETTE.goldStamp));
    retroAudio.stamp();
  }
}
