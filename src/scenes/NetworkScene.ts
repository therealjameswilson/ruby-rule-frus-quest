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
  setLatestMessage,
  setDocumentWorkflowState,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { ChoiceOption, RouteItem } from "../game/types";
import { getInput, tickInput, type InputState } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/items/Terminal";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addNetworkCables, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesRoomLayer, addSnesWorldMap } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type NetworkRoomId = "N1" | "N2";

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
  private currentRoute = 0;
  private correctRoutes = 0;
  private routingActive = false;
  private routingComplete = false;
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
  private bureaucraticWalls: BureaucraticWall[] = [];

  private readonly routeItems: RouteItem[] = [
    { label: "Published FRUS cross-reference research", network: "OpenNet", classification: "unclassified" },
    { label: "Publication status verification", network: "OpenNet", classification: "unclassified" },
    { label: "Typeset unclassified proof", network: "OpenNet", classification: "unclassified" },
    { label: "SBU annotation sheet", network: "ClassNet", classification: "sbu" },
    { label: "Classified source note", network: "ClassNet", classification: "classified" },
    { label: "Codeword document review", network: "ClassNet", classification: "codeword" },
    { label: "Excision language review", network: "ClassNet", classification: "classified" }
  ];

  constructor() {
    super("NetworkScene");
  }

  create() {
    setSceneState("NetworkScene", "explore", "Two Networks: earn the Clearance Token.");
    retroAudio.startMusic("NetworkScene");
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    drawTiledFloor(this, "network-tiles");
    drawRoomFrame(this, "TWO NETWORKS");
    this.drawNetworkMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902);

    this.routeText = this.add.text(128, 88, "ROUTING LOG EMPTY", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center",
      wordWrap: { width: 176, useAdvancedWrap: true }
    }).setOrigin(0.5).setDepth(820);
    this.player = new Player(this, 128, 196);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.enterRoom("N1", { x: 128, y: 196 }, false);
    this.dialog.show("MARCUS", [
      "OpenNet is the open world.",
      "ClassNet is where the sharp edges live.",
      "Route each item. Then cross the firewall door into the vault."
    ], () => this.beginRouting());
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    this.bureaucraticWalls.forEach((wall) => wall.update(this.time.now, delta, this.player?.position));
    this.syncThreatState();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    if (this.roomTransitionLocked) {
      this.player.update(delta, false);
      return;
    }
    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.choice.active || this.inventory.active || this.reliability.active || this.routingActive) {
      handleOpenOverlays(this.inventory, this.reliability);
      this.choice.updateInput();
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show("PAUSED", "The networks wait.");
      return;
    }
    this.player.update(delta, true, { bounds: NETWORK_PLAY_BOUNDS });
    if (this.handleClearanceTokenAction(input)) {
      this.reliability.update();
      this.objectiveText.setText(gameState.objective);
      return;
    }
    if (this.checkRoomExit()) return;
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
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
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    for (const wall of this.bureaucraticWalls) wall.destroy();
    this.roomCleanups = [];
    this.roomObjects = [];
    this.bureaucraticWalls = [];
    this.clearanceTokenIcon = undefined;
    setNearestInteractable(null);
  }

  private renderCurrentRoom() {
    const room = NETWORK_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "network", track: (object) => this.track(object) });
    this.drawRoomDoors();
    if (room.id === "N1") this.renderNetworkSplit();
    else this.renderClassNetVault();
    this.syncRoomTraversalState();
    this.syncThreatState();
  }

  private drawRoomDoors() {
    const room = NETWORK_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      this.track(this.add.rectangle(11, 124, 9, 36, color(PALETTE.black)).setDepth(65));
      this.track(this.add.rectangle(16, 124, 3, 26, color(PALETTE.terminalCyan)).setDepth(66));
    }
    if (room.exits.east) {
      const open = this.currentRoomId === "N1" ? this.routingComplete : this.clearanceTokenCollected;
      const accent = open ? PALETTE.openNetGreen : PALETTE.classNetRed;
      this.track(this.add.rectangle(245, 124, 9, 36, color(PALETTE.black)).setDepth(65));
      this.track(this.add.rectangle(240, 124, 3, 26, color(accent)).setDepth(66));
      if (!open) this.track(this.add.rectangle(242, 124, 2, 30, color(PALETTE.classNetRed)).setDepth(67));
    }
  }

  private renderNetworkSplit() {
    setVisibleEntities(["Marcus", "OpenNet terminal", "ClassNet terminal", "Routing sorter", "Stone Wall: FIREWALL"]);
    addNetworkCables(this, (object) => this.track(object));
    addSnesWorldMap(this, 128, 66, "NET MAP", "two-networks-map", (object) => this.track(object));
    this.track(addTinySparkle(this, 60, 108, PALETTE.openNetGreen));
    this.track(addTinySparkle(this, 196, 108, PALETTE.classNetRed));
    const marcus = new HistorianNPC(this, "marcus", 128, 54);
    this.roomCleanups.push(() => marcus.destroy());
    this.track(new Terminal(this, 60, 124, "OpenNet").container);
    this.track(new Terminal(this, 196, 124, "ClassNet").container);
    this.track(this.add.rectangle(60, 166, 52, 34, color(PALETTE.black)).setStrokeStyle(3, color(PALETTE.openNetGreen)).setDepth(166));
    this.track(this.add.text(60, 159, "OPEN\nNET", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.openNetGreen,
      align: "center"
    }).setOrigin(0.5).setDepth(167));
    this.track(this.add.rectangle(196, 166, 52, 34, color(PALETTE.black)).setStrokeStyle(3, color(PALETTE.classNetRed)).setDepth(166));
    this.track(this.add.text(196, 159, "CLASS\nNET", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5).setDepth(167));
    if (!this.routingComplete) {
      this.bureaucraticWalls = [
        new BureaucraticWall(this, "firewall-open", "FIREWALL", 96, 152, { behavior: "block", accent: PALETTE.classNetRed }),
        new BureaucraticWall(this, "firewall-class", "FORM 32", 160, 152, { behavior: "block", accent: PALETTE.classNetRed })
      ];
      this.routeText.setText("ROUTING LOG EMPTY");
    } else {
      this.routeText.setText("FIREWALL CLEARED\nEAST: CLASSNET VAULT");
      setObjective("Two Networks: enter the ClassNet Vault through the east gate.");
    }
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
    this.track(this.add.rectangle(128, 142, 74, 30, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(138));
    this.track(this.add.rectangle(128, 151, 92, 8, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(139));
    if (!this.clearanceTokenCollected) {
      this.clearanceTokenIcon = this.track(this.add.image(128, 132, "clearance-token").setDepth(155));
      this.routeText.setText("CLEARANCE TOKEN\nVERIFY AND TAKE");
      setObjective("Two Networks: collect the Clearance Token in N2.");
    } else {
      this.track(this.add.image(128, 132, "clearance-token").setTint(color(PALETTE.goldStamp)).setDepth(155));
      this.routeText.setText("TOKEN EARNED\nEAST: REFERRAL VAULT");
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
      this.routeText.setText("TOKEN EARNED\nEAST: REFERRAL VAULT");
      return false;
    }
    const nearToken = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) <= 32;
    if (!nearToken) {
      setNearestInteractable(null);
      this.routeText.setText("CLEARANCE TOKEN\nVERIFY AND TAKE");
      return false;
    }
    setNearestInteractable("Clearance Token");
    this.routeText.setText("CLEARANCE TOKEN\nPRESS SPACE");
    if (!input.aJustPressed) return false;
    this.collectClearanceToken();
    return true;
  }

  private collectClearanceToken() {
    if (this.clearanceTokenCollected) return;
    this.clearanceTokenCollected = true;
    addProcessItem("clearance_token");
    setLatestMessage("Clearance Token opens red vault doors.");
    setObjective("Two Networks: exit east to the Referral Vault.");
    this.routeText.setText("TOKEN EARNED\nEAST: REFERRAL VAULT");
    this.clearanceTokenIcon?.setTint(color(PALETTE.goldStamp));
    retroAudio.stamp();
    this.syncRoomTraversalState();
    this.updateNetworkMinimap();
    this.dialog.show("CLASSNET", [
      "Token logged after correct routing.",
      "Human review owns the handoff. StateChat stays on terminal support."
    ]);
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
    this.currentRoute = 0;
    this.correctRoutes = 0;
    this.routingActive = true;
    setObjective("Two Networks: route each item to OpenNet or ClassNet.");
    this.showRouteChoice();
  }

  private syncThreatState() {
    setVisibleThreats(
      this.bureaucraticWalls
        .filter((wall) => !wall.isCleared)
        .map((wall) => ({
          label: `Stone Wall: ${wall.label}`,
          x: wall.position.x,
          y: wall.position.y,
          spriteKey: wall.spriteKey,
          behavior: "blocks terminal door",
          defeatMethod: "Use correct OpenNet/ClassNet routing",
          status: this.routingComplete ? "cleared" : "active"
        }))
    );
  }

  private showRouteChoice() {
    const item = this.routeItems[this.currentRoute];
    this.routeText.setText(`ITEM ${this.currentRoute + 1}/7\n${item.label.toUpperCase()}`);
    const options: ChoiceOption[] = [
      { key: "A", label: "Send to OpenNet", value: "OpenNet" },
      { key: "B", label: "Send to ClassNet", value: "ClassNet" }
    ];
    this.choice.show(`ROUTE:\n${item.label}\n\nCLASSIFICATION: ${item.classification.toUpperCase()}`, options, (option) => {
      this.resolveRoute(item, option.value as RouteItem["network"]);
    });
  }

  private resolveRoute(item: RouteItem, destination: RouteItem["network"]) {
    const correct = destination === item.network;
    if (correct) {
      this.correctRoutes += 1;
      adjustReliability(3, `${item.label} routed to ${destination}`);
      this.routeText.setText(`CORRECT\n${destination}`);
    } else {
      const leakWarning = destination === "OpenNet" && item.network === "ClassNet";
      const violation = applyStandardsViolation(
        leakWarning ? "concealed_policy_defect" : "omitted_material_fact",
        leakWarning ? "Closed material was sent to OpenNet." : `${item.label} was routed through the wrong network.`
      );
      setLatestMessage(`WRONG NETWORK - ${violation.label}`);
      this.routeText.setText(leakWarning ? "WARNING\nOPENNET LEAK RISK" : "WARNING\nWRONG ROOM");
      this.reliability.update();
      this.currentRoute += 1;
      if (this.currentRoute >= this.routeItems.length) {
        this.finishRouting();
        return;
      }
      this.dialog.show("STANDARD VIOLATION", [
        violation.label,
        "Route the next item through the correct network."
      ], () => this.showRouteChoice());
      return;
    }
    this.reliability.update();
    this.currentRoute += 1;
    if (this.currentRoute >= this.routeItems.length) {
      this.finishRouting();
      return;
    }
    this.time.delayedCall(450, () => this.showRouteChoice());
  }

  private finishRouting() {
    this.routingActive = false;
    if (this.correctRoutes === this.routeItems.length) {
      this.routingComplete = true;
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
      this.routeText.setText("FIREWALL CLEARED\nEAST: CLASSNET VAULT");
      retroAudio.stamp();
      this.dialog.show("MARCUS", [
        "Good routing.",
        "The open world stays open. The closed world stays closed.",
        "Now enter the ClassNet Vault and take the clearance token by hand."
      ]);
      return;
    }
    this.dialog.show("MARCUS", [
      "Routing log has warnings.",
      "Review the split before referrals move."
    ], () => this.beginRouting());
  }
}
