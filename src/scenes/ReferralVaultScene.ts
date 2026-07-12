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
  clearDocumentUndisclosedDeletion,
  setAgencyEquityResponse,
  setDocumentWorkflowState,
  setHeldItem,
  setLatestMessage,
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
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { applyDanneLurkerDamage } from "../systems/dannePressure";
import { FeedbackToast } from "../systems/feedbackToast";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addTinySparkle, addVaultBlocks } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesMapTablet, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal, addSnesWorldMap } from "../systems/snesPixelArt";
import { SNES_REFERRAL_VAULT_TILE_ASSET } from "../game/snesAtlas";
import {
  deriveReferralPhysicalProgress,
  getReferralEquityPacket,
  getReferralTreatmentDocket,
  REFERRAL_EQUITY_PACKETS,
  REFERRAL_TREATMENT_DOCKETS,
  routeReferralEquityPacket,
  routeReferralTreatmentDocket
} from "../game/referralVaultReview";
import type {
  ReferralAgency,
  ReferralEquityPacketId,
  ReferralTreatmentDocketId,
  ReferralTreatmentStationId
} from "../game/referralVaultReview";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type ReferralRoomId = "R1" | "R2";
type ReferralVaultTileFrame = (typeof SNES_REFERRAL_VAULT_TILE_ASSET.frames)[number];

interface ReferralRoom {
  id: ReferralRoomId;
  title: string;
  roomType: RoomType;
  exits: Partial<Record<Direction, ReferralRoomId | "SilentReadScene">>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, "concurrence_slip">>;
}

const REFERRAL_PLAY_BOUNDS = { left: 14, right: 242, top: 42, bottom: 220 };
const DOOR_Y_MIN = 100;
const DOOR_Y_MAX = 150;
const EXIT_SPAWNS: Record<Direction, { x: number; y: number }> = {
  north: { x: 128, y: 58 },
  south: { x: 128, y: 204 },
  east: { x: 30, y: 124 },
  west: { x: 226, y: 124 }
};

const REFERRAL_ROOMS: Record<ReferralRoomId, ReferralRoom> = {
  R1: {
    id: "R1",
    title: "Equity Gate",
    roomType: "puzzle",
    exits: { east: "R2" },
    lockedExits: { east: "Visible excision gate" }
  },
  R2: {
    id: "R2",
    title: "Concurrence Chamber",
    roomType: "reward",
    exits: { west: "R1", east: "SilentReadScene" },
    lockedExits: { east: "Concurrence Slip handoff" },
    requiredItems: { east: "concurrence_slip" }
  }
};

export class ReferralVaultScene extends Phaser.Scene {
  private player!: Player;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private toast!: FeedbackToast;
  private equityStep = 0;
  private manifestReviewed = false;
  private treatmentStep = 0;
  private equityPacketWorldIcon?: Phaser.GameObjects.Container;
  private equityPacketHeldIcon?: Phaser.GameObjects.Container;
  private manifestWorldIcon?: Phaser.GameObjects.Container;
  private manifestHeldIcon?: Phaser.GameObjects.Container;
  private treatmentDocketWorldIcon?: Phaser.GameObjects.Container;
  private treatmentDocketHeldIcon?: Phaser.GameObjects.Container;
  private reviewRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private reviewRouteCueKey = "";
  private referralGateOpen = false;
  private concurrenceSlipCollected = false;
  private currentRoomId: ReferralRoomId = "R1";
  private visitedRoomIds = new Set<ReferralRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private mapCells = new Map<ReferralRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ReferralRoomId, Phaser.GameObjects.Text>();
  private roomTitleText!: Phaser.GameObjects.Text;
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private concurrenceSlipIcon?: Phaser.GameObjects.Image;
  private concurrenceSlipRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private concurrenceSlipRouteCueKey = "";
  private bureaucraticWalls: BureaucraticWall[] = [];
  private danneLurker!: DanneLurker;

  constructor() {
    super("ReferralVaultScene");
  }

  create() {
    setSceneState("ReferralVaultScene", "explore", "Referral Vault: earn the Concurrence Slip.");
    retroAudio.startMusic("ReferralVaultScene");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    drawTiledFloor(this, "vault-tiles");
    drawRoomFrame(this, "REFERRAL VAULT", PALETTE.goldStamp, { showLegacyHud: false });
    this.drawReferralMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902).setVisible(false);

    this.player = new Player(this, 128, 192);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.toast = new FeedbackToast(this);
    this.danneLurker = new DanneLurker(this, 214, 70, {
      waypoints: [
        { x: 214, y: 70 },
        { x: 154, y: 60 },
        { x: 68, y: 104 },
        { x: 68, y: 190 },
        { x: 188, y: 188 }
      ]
    });
    this.restoreReferralProgress();
    this.enterRoom("R1", { x: 128, y: 192 }, false);
    if (!this.referralGateOpen) {
      setLatestMessage("Route each file to its agency equity. StateChat drafts; a human confirms.");
    }
  }

  private restoreReferralProgress() {
    this.referralGateOpen = gameState.processStamps.includes("referral");
    this.concurrenceSlipCollected = hasProcessItem("concurrence_slip");
    const restored = deriveReferralPhysicalProgress({
      ...gameState.sceneProgress,
      referralGateOpen: this.referralGateOpen ? 1 : 0
    });
    this.equityStep = restored.equityStep;
    this.manifestReviewed = restored.manifestReviewed;
    this.treatmentStep = restored.treatmentStep;
    gameState.sceneProgress.referralEquityRouteStep = this.equityStep;
    gameState.sceneProgress.referralTreatmentStep = this.treatmentStep;

    if (this.equityStep >= REFERRAL_EQUITY_PACKETS.length) {
      gameState.sceneProgress.referralEquityRouteComplete = 1;
      gameState.sceneProgress.referralEquityPacketCarried = 0;
    } else if ((gameState.sceneProgress.referralEquityPacketCarried ?? 0) !== getReferralEquityPacket(this.equityStep).order) {
      gameState.sceneProgress.referralEquityPacketCarried = 0;
    }
    if (this.manifestReviewed) {
      gameState.sceneProgress.referralManifestReviewComplete = 1;
      gameState.sceneProgress.referralManifestCarried = 0;
    }
    if (this.treatmentStep >= REFERRAL_TREATMENT_DOCKETS.length) {
      gameState.sceneProgress.referralPhysicalReviewComplete = 1;
      gameState.sceneProgress.referralTreatmentDocketCarried = 0;
    } else if ((gameState.sceneProgress.referralTreatmentDocketCarried ?? 0) !== getReferralTreatmentDocket(this.treatmentStep).order) {
      gameState.sceneProgress.referralTreatmentDocketCarried = 0;
    }
    if (this.referralGateOpen) this.syncLegacyReferralProgress(REFERRAL_TREATMENT_DOCKETS.length);
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
    if (this.inventory.active || this.reliability.active) {
      this.interactionPrompt.update(delta, null);
      handleOpenOverlays(this.inventory, this.reliability);
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }
    this.player.update(delta, true, { bounds: REFERRAL_PLAY_BOUNDS });
    this.updateCarriedReviewIcon();
    this.updateReferralInteractionPrompt(delta);
    this.refreshReviewRouteCue();
    const handledRoomAction = this.currentRoomId === "R1"
      ? this.handleReferralReviewAction(input)
      : this.handleConcurrenceSlipAction(input);
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

  private enterRoom(roomId: ReferralRoomId, spawn: { x: number; y: number }, wipe = true, direction: Direction = "east") {
    const applyRoom = () => {
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      this.player.setPosition(spawn.x, spawn.y);
      this.syncRoomTraversalState();
      this.updateReferralMinimap();
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
      label: REFERRAL_ROOMS[roomId].title.toUpperCase(),
      onCovered: applyRoom,
      onComplete: () => {
        this.roomTransitionLocked = false;
      }
    });
  }

  private clearRoom() {
    this.clearReviewRouteCue();
    this.clearConcurrenceSlipRouteCue();
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    for (const wall of this.bureaucraticWalls) wall.destroy();
    this.roomCleanups = [];
    this.roomObjects = [];
    this.bureaucraticWalls = [];
    this.concurrenceSlipIcon = undefined;
    this.equityPacketWorldIcon = undefined;
    if (this.equityPacketHeldIcon?.active) this.equityPacketHeldIcon.destroy();
    this.equityPacketHeldIcon = undefined;
    this.manifestWorldIcon = undefined;
    if (this.manifestHeldIcon?.active) this.manifestHeldIcon.destroy();
    this.manifestHeldIcon = undefined;
    this.treatmentDocketWorldIcon = undefined;
    if (this.treatmentDocketHeldIcon?.active) this.treatmentDocketHeldIcon.destroy();
    this.treatmentDocketHeldIcon = undefined;
    setNearestInteractable(null);
  }

  private renderCurrentRoom(showIntro = true) {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    if (showIntro) {
      addSnesRoomIntroBanner(this, {
        title: `${room.id} ${room.title}`,
        subtitle: "REFERRAL VAULT",
        accent: PALETTE.goldStamp,
        track: (object) => this.track(object)
      });
    }
    addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "vault", track: (object) => this.track(object) });
    this.drawReferralVaultTileField(room.id);
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
    if (room.id === "R1") this.renderEquityGate();
    else this.renderConcurrenceChamber();
    this.syncRoomTraversalState();
    this.syncThreatState();
  }

  private drawReferralVaultTileField(roomId: ReferralRoomId) {
    if (!this.referralVaultTileFramesReady([
      "equity_floor",
      "referral_channel",
      "agency_seal_tile",
      "manifest_desk",
      "excision_gate",
      "concurrence_wall",
      "slip_plinth",
      "archive_floor"
    ])) {
      return;
    }

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        const frame = roomId === "R1"
          ? this.equityGateFloorFrame(col, row)
          : this.concurrenceChamberFloorFrame(col, row);
        this.drawReferralVaultTileFrame(frame, 40 + col * 16, 62 + row * 16, -13, `${roomId}-floor-${row}-${col}`);
      }
    }

    if (roomId === "R1") {
      this.drawReferralVaultTileFrame("manifest_desk", 112, 116, 112, "manifest-desk");
      this.drawReferralVaultTileFrame("agency_seal_tile", 72, 132, 112, "cia-seal-floor");
      this.drawReferralVaultTileFrame("agency_seal_tile", 128, 132, 112, "dod-seal-floor");
      this.drawReferralVaultTileFrame("agency_seal_tile", 184, 132, 112, "nsc-seal-floor");
      this.drawReferralVaultTileFrame("excision_gate", 216, 132, 66, "visible-excision-gate");
      return;
    }

    for (let col = 2; col <= 9; col += 1) {
      this.drawReferralVaultTileFrame("concurrence_wall", 40 + col * 16, 94, 82, `concurrence-wall-${col}`);
    }
    this.drawReferralVaultTileFrame("slip_plinth", 120, 132, 137, "slip-plinth-left");
    this.drawReferralVaultTileFrame("slip_plinth", 136, 132, 137, "slip-plinth-right");
  }

  private equityGateFloorFrame(col: number, row: number): ReferralVaultTileFrame {
    if (col === 5 || col === 6 || row === 3) return "referral_channel";
    if (row === 4 && (col === 2 || col === 5 || col === 8)) return "agency_seal_tile";
    if (row === 3 && (col === 4 || col === 7)) return "manifest_desk";
    if (col === 11 && row >= 3 && row <= 5) return "excision_gate";
    if ((row + col) % 7 === 0) return "archive_floor";
    return "equity_floor";
  }

  private concurrenceChamberFloorFrame(col: number, row: number): ReferralVaultTileFrame {
    if (row === 0 || col === 0 || col === 11) return "concurrence_wall";
    if (row === 4 && (col === 5 || col === 6)) return "slip_plinth";
    if (row === 2 && (col === 2 || col === 4 || col === 7 || col === 9)) return "agency_seal_tile";
    if (row === 5 && col >= 4 && col <= 7) return "referral_channel";
    if ((row + col) % 6 === 0) return "archive_floor";
    return "equity_floor";
  }

  private drawReferralVaultTileFrame(
    frame: ReferralVaultTileFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ) {
    if (!this.textures.exists(SNES_REFERRAL_VAULT_TILE_ASSET.key)) return null;
    const texture = this.textures.get(SNES_REFERRAL_VAULT_TILE_ASSET.key);
    if (!texture.has(frame)) return null;
    return this.track(this.add.image(Math.round(x), Math.round(y), SNES_REFERRAL_VAULT_TILE_ASSET.key, frame)
      .setName(`referral-vault-tile-${name}`)
      .setDepth(depth));
  }

  private referralVaultTileFramesReady(frames: readonly ReferralVaultTileFrame[]) {
    if (!this.textures.exists(SNES_REFERRAL_VAULT_TILE_ASSET.key)) return false;
    const texture = this.textures.get(SNES_REFERRAL_VAULT_TILE_ASSET.key);
    return frames.every((frame) => texture.has(frame));
  }

  private drawRoomDoors() {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      addSnesGate(this, {
        direction: "west",
        hasExit: true,
        unlocked: true,
        accent: PALETTE.goldStamp,
        exitLabel: "EQUITY",
        track: (object) => this.track(object),
        depth: 65
      });
    }
    if (room.exits.east) {
      const open = this.currentRoomId === "R1" ? this.referralGateOpen : this.concurrenceSlipCollected;
      const accent = open ? PALETTE.goldStamp : PALETTE.classNetRed;
      addSnesGate(this, {
        direction: "east",
        hasExit: true,
        unlocked: open,
        accent,
        lockLabel: this.currentRoomId === "R1" ? "EQTY" : "SLIP",
        exitLabel: this.currentRoomId === "R1" ? "SLIP" : "READ",
        track: (object) => this.track(object),
        depth: 65
      });
    }
  }

  private compassLockedExits(room: ReferralRoom) {
    const locked: Partial<Record<Direction, string>> = {};
    if (room.id === "R1" && room.exits.east && !this.referralGateOpen) {
      locked.east = room.lockedExits?.east ?? "EQTY";
    }
    if (room.id === "R2" && room.exits.east && !this.concurrenceSlipCollected) {
      locked.east = room.lockedExits?.east ?? room.requiredItems?.east ?? "SLIP";
    }
    return locked;
  }

  private renderEquityGate() {
    addVaultBlocks(this, (object) => this.track(object));
    addSnesWorldMap(this, 128, 62, "EQUITY MAP", "referral-vault-map", (object) => this.track(object));
    const marcus = new HistorianNPC(this, "marcus", 42, 58);
    this.roomCleanups.push(() => marcus.destroy());
    this.track(new Terminal(this, 214, 58, "StateChat").container);
    if (!this.referralGateOpen) {
      this.bureaucraticWalls = [
        new BureaucraticWall(this, "cia-delay-wall", "WAIT", 44, 198, { behavior: "freeze", accent: PALETTE.goldStamp }),
        new BureaucraticWall(this, "nsc-delay-wall", "HOLD", 212, 198, { behavior: "block", accent: PALETTE.classNetRed })
      ];
    }
    const stage = this.referralReviewStage();
    if (stage === "equity") this.drawEquityRoutingStage();
    else if (stage === "manifest") this.drawManifestReviewStage();
    else if (stage === "treatment") this.drawVisibleTreatmentStage();
    else this.drawReferralCompleteStage();
    setObjective(this.referralObjective());
    this.syncReferralVisibleEntities();
  }

  private referralReviewStage() {
    if (this.referralGateOpen) return "complete" as const;
    if (this.equityStep < REFERRAL_EQUITY_PACKETS.length) return "equity" as const;
    if (!this.manifestReviewed) return "manifest" as const;
    return "treatment" as const;
  }

  private drawEquityRoutingStage() {
    addSnesMapTablet(this, {
      x: 128,
      y: 88,
      label: "ROUTE",
      nodes: ["FILE", "CIA", "DOD", "NSC"],
      activeIndex: Math.min(3, this.equityStep),
      accent: PALETTE.terminalCyan,
      track: (object) => this.track(object),
      depth: 118
    });
    this.drawAgencyStation("CIA", 60, 130, 0);
    this.drawAgencyStation("DOD", 128, 126, 1);
    this.drawAgencyStation("NSC", 196, 130, 2);
    const carried = this.carriedEquityPacket();
    if (carried) this.createEquityPacketHeldIcon(carried.id);
    else this.drawEquityPacketAtTray();
  }

  private drawManifestReviewStage() {
    addSnesMapTablet(this, {
      x: 128,
      y: 88,
      label: "MANIFEST",
      nodes: ["AI", "DRAFT", "HUMAN", "FILE"],
      activeIndex: this.manifestCarried() ? 2 : 1,
      accent: PALETTE.terminalCyan,
      track: (object) => this.track(object),
      depth: 118
    });
    this.drawReviewStation(72, 156, "HUMAN CHECK", PALETTE.goldStamp, false, 3);
    this.track(this.add.line(0, 0, 178, 116, 92, 146, color(PALETTE.terminalCyan), 0.8)
      .setLineWidth(2)
      .setOrigin(0)
      .setDepth(119));
    if (this.manifestCarried()) this.createManifestHeldIcon();
    else this.drawManifestAtTerminalTray();
  }

  private drawVisibleTreatmentStage() {
    addSnesMapTablet(this, {
      x: 128,
      y: 88,
      label: "VISIBLE",
      nodes: ["PERM", "APPL", "BRKT", "GATE"],
      activeIndex: Math.min(3, this.treatmentStep),
      accent: PALETTE.goldStamp,
      track: (object) => this.track(object),
      depth: 118
    });
    REFERRAL_TREATMENT_DOCKETS.forEach((docket, index) => {
      const position = this.treatmentStationPosition(docket.station);
      const filed = index < this.treatmentStep;
      const accent = filed
        ? PALETTE.openNetGreen
        : docket.station === "permission_desk"
          ? PALETTE.terminalCyan
          : docket.station === "appeal_ledger"
            ? PALETTE.classNetRed
            : PALETTE.goldStamp;
      this.drawReviewStation(
        position.x,
        position.y,
        this.treatmentStationShortLabel(docket.station),
        accent,
        filed,
        docket.checkIds.length
      );
    });
    const carried = this.carriedTreatmentDocket();
    if (carried) this.createTreatmentDocketHeldIcon(carried.id);
    else this.drawTreatmentDocketAtTray();
  }

  private drawReferralCompleteStage() {
    addSnesMapTablet(this, {
      x: 128,
      y: 88,
      label: "CONCUR",
      nodes: ["CIA", "DOD", "NSC", "OPEN"],
      activeIndex: 3,
      accent: PALETTE.openNetGreen,
      track: (object) => this.track(object),
      depth: 118
    });
    this.drawAgencyStation("CIA", 60, 130, 0, true);
    this.drawAgencyStation("DOD", 128, 126, 1, true);
    this.drawAgencyStation("NSC", 196, 130, 2, true);
    this.track(addTinySparkle(this, 218, 124, PALETTE.goldStamp));
  }

  private drawAgencyStation(
    agency: ReferralAgency,
    x: number,
    y: number,
    index: number,
    forceFiled = false
  ) {
    const filed = forceFiled || index < this.equityStep;
    const accent = filed ? PALETTE.openNetGreen : PALETTE.goldStamp;
    const container = this.track(this.add.container(x, y).setDepth(150).setName(`referral-agency-${agency}`));
    container.add(this.add.ellipse(0, 12, 48, 9, color(PALETTE.black), 0.42));
    container.add(this.add.rectangle(0, 0, 44, 31, color(PALETTE.black), 0.94)
      .setStrokeStyle(2, color(accent)));
    container.add(this.add.image(0, -2, "agency-equity-seal"));
    container.add(this.add.text(0, -8, agency, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.black,
      backgroundColor: accent
    }).setOrigin(0.5, 0));
    container.add(this.add.rectangle(0, 10, 22, 4, color(filed ? PALETTE.openNetGreen : PALETTE.stoneDark))
      .setStrokeStyle(1, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray)));
  }

  private drawReviewStation(
    x: number,
    y: number,
    label: string,
    accent: string,
    filed: boolean,
    checks: number
  ) {
    const width = label.length > 9 ? 58 : 52;
    const container = this.track(this.add.container(x, y).setDepth(150).setName(`referral-station-${label}`));
    container.add(this.add.ellipse(0, 11, width, 9, color(PALETTE.black), 0.42));
    container.add(this.add.rectangle(0, 0, width, 27, color(PALETTE.black), 0.94)
      .setStrokeStyle(2, color(accent)));
    container.add(this.add.text(0, -10, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setOrigin(0.5, 0));
    for (let index = 0; index < checks; index += 1) {
      container.add(this.add.rectangle(
        (index - (checks - 1) / 2) * 9,
        6,
        6,
        4,
        color(filed ? PALETTE.openNetGreen : PALETTE.stoneDark)
      ).setStrokeStyle(1, color(filed ? PALETTE.creamPaper : PALETTE.stoneGray)));
    }
  }

  private renderConcurrenceChamber() {
    setVisibleEntities(["Concurrence Slip pedestal", "Agency concurrence chamber", "Silent Read handoff gate"]);
    addVaultBlocks(this, (object) => this.track(object));
    for (let x = 62; x <= 194; x += 33) {
      this.track(this.add.rectangle(x, 104, 24, 20, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(95));
      this.track(this.add.image(x, 101, "agency-equity-seal").setScale(1).setDepth(96));
    }
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 132,
      textureKey: "concurrence-slip",
      label: "Concurrence Slip",
      collected: this.concurrenceSlipCollected,
      track: (object) => this.track(object),
      depth: 138
    });
    if (!this.concurrenceSlipCollected) {
      this.concurrenceSlipIcon = this.track(this.add.image(128, 132, "concurrence-slip").setDepth(165).setVisible(false));
      setObjective("Referral Vault: collect the Concurrence Slip in R2.");
    } else {
      this.track(this.add.image(128, 132, "concurrence-slip").setTint(color(PALETTE.goldStamp)).setDepth(165).setVisible(false));
      setObjective("Referral Vault: exit east to Silent Read Tower.");
    }
  }

  private syncReferralVisibleEntities() {
    const base = ["Marcus", "StateChat terminal", "Stone Wall: Referral delay"];
    const stage = this.referralReviewStage();
    if (stage === "equity") {
      const packet = getReferralEquityPacket(this.equityStep);
      setVisibleEntities([
        ...base,
        "CIA equity desk",
        "DOD equity desk",
        "NSC equity desk",
        `Referral file ${packet.order}/3: ${packet.label} (${this.carriedEquityPacket() ? "carried" : "at tray"})`
      ]);
      return;
    }
    if (stage === "manifest") {
      setVisibleEntities([
        ...base,
        "Human Concurrence Desk",
        `StateChat draft manifest (${this.manifestCarried() ? "carried" : "at terminal tray"})`
      ]);
      return;
    }
    if (stage === "treatment") {
      const docket = getReferralTreatmentDocket(this.treatmentStep);
      setVisibleEntities([
        ...base,
        "Foreign-Government Permission Desk",
        "Withholding Appeal Ledger",
        "Visible Excision Bracket Press",
        `Treatment docket ${docket.order}/3: ${docket.label} (${this.carriedTreatmentDocket() ? "carried" : "at tray"}; ${docket.checkIds.length} checks)`
      ]);
      return;
    }
    setVisibleEntities([
      ...base,
      "Cleared CIA equity desk",
      "Cleared DOD equity desk",
      "Cleared NSC equity desk",
      "Open visible-excision gate"
    ]);
  }

  private syncThreatState() {
    setVisibleThreats(
      [
        ...this.bureaucraticWalls.filter((wall) => !wall.isCleared).map((wall) => ({
        label: `Stone Wall: ${wall.label}`,
        x: wall.position.x,
        y: wall.position.y,
        spriteKey: wall.spriteKey,
        behavior: wall.label === "WAIT" ? "freezes exits temporarily" : "blocks referral gate",
        defeatMethod: "Resolve agency response timer and visible referral review",
        status: this.referralGateOpen ? "cleared" : "active"
      })),
        this.danneLurker.readout(this.time.now)
      ]
    );
  }

  private updateDanneLurker(delta: number) {
    const canPressure = !this.roomTransitionLocked
      && !this.inventory.active
      && !this.reliability.active;
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, canPressure);
    if (result.triggered) {
      this.player.takeHit(this.danneLurker.position, 11, 700);
      applyDanneLurkerDamage("contact", "DANN-E deadline pressure disrupted referral review.");
      this.restoreObjectiveAfterDannePressure();
      this.reliability.update();
    } else if (result.egoBoltHit) {
      this.player.takeHit(this.danneLurker.position, 9, 700);
      applyDanneLurkerDamage("ego_bolt", "DANN-E ego bolt disrupted referral review.");
      this.restoreObjectiveAfterDannePressure();
      this.reliability.update();
    }
  }

  private restoreObjectiveAfterDannePressure() {
    setObjective(this.currentRoomId === "R1"
      ? this.referralObjective()
      : this.concurrenceSlipCollected
        ? "Referral Vault: exit east to Silent Read Tower."
        : "Referral Vault: collect the Concurrence Slip in R2.");
  }

  private drawReferralMinimap() {
    (["R1", "R2"] as ReferralRoomId[]).forEach((roomId, index) => {
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

  private updateReferralMinimap() {
    for (const [roomId, cell] of this.mapCells) {
      const active = roomId === this.currentRoomId;
      const visited = this.visitedRoomIds.has(roomId);
      cell.setFillStyle(color(active ? PALETTE.goldStamp : visited ? PALETTE.terminalCyan : PALETTE.stoneDark));
      this.mapLabels.get(roomId)?.setColor(active ? PALETTE.black : PALETTE.creamPaper);
    }
  }

  private syncRoomTraversalState() {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    const lockedExits: Partial<Record<Direction, string>> = {};
    if (room.id === "R1" && !this.referralGateOpen) lockedExits.east = room.lockedExits?.east;
    if (room.id === "R2" && !canTraverseExit(room.id, "east", getHeldProcessItemIds())) {
      lockedExits.east = room.lockedExits?.east;
    }
    setRoomTraversalState({
      currentRoomId: room.id,
      roomTitle: room.title,
      roomType: room.roomType,
      visitedRoomIds: [...this.visitedRoomIds],
      revealedRoomIds: [
        ...(this.referralGateOpen || this.concurrenceSlipCollected ? ["R1", "R2"] : ["R1"]),
        ...getRevealedShortcutRoomIds(getHeldProcessItemIds()).filter((roomId): roomId is ReferralRoomId => roomId in REFERRAL_ROOMS)
      ],
      exits: room.exits,
      lockedExits,
      requiredItems: room.requiredItems
    });
  }

  private handleConcurrenceSlipAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "R2") {
      setNearestInteractable(null);
      return false;
    }
    if (this.concurrenceSlipCollected) {
      setNearestInteractable(null);
      return false;
    }
    const nearSlip = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) <= 32;
    if (!nearSlip) {
      setNearestInteractable(null);
      if (input.aJustPressed && this.concurrenceSlipHintTarget()) {
        retroAudio.blip();
        setLatestMessage("Step closer to Concurrence Slip.");
        return true;
      }
      return false;
    }
    setNearestInteractable("Concurrence Slip");
    if (!input.aJustPressed) return false;
    this.collectConcurrenceSlip();
    return true;
  }

  private updateConcurrenceSlipPrompt(delta: number) {
    const hintTarget = this.concurrenceSlipHintTarget();
    const strictTarget = this.concurrenceSlipStrictTarget();
    this.interactionPrompt.update(
      delta,
      strictTarget ?? hintTarget,
      undefined,
      strictTarget ? { badge: "A", text: "CONCURRENCE SLIP" } : hintTarget ? { badge: "!", text: "STEP CLOSER" } : undefined
    );
  }

  private concurrenceSlipStrictTarget(): Interactable | null {
    if (this.currentRoomId !== "R2" || this.concurrenceSlipCollected) return null;
    if (Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) > 32) return null;
    return this.concurrenceSlipTarget(32);
  }

  private concurrenceSlipHintTarget(): Interactable | null {
    if (this.currentRoomId !== "R2" || this.concurrenceSlipCollected) return null;
    if (Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) > 46) return null;
    return this.concurrenceSlipTarget(32);
  }

  private concurrenceSlipTarget(radius: number): Interactable {
    return {
      id: "concurrence-slip-pedestal",
      label: "Concurrence Slip",
      x: 128,
      y: 132,
      radius,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private collectConcurrenceSlip() {
    if (this.concurrenceSlipCollected) return;
    this.concurrenceSlipCollected = true;
    addProcessItem("concurrence_slip");
    setLatestMessage("Concurrence logged after human review. Carry the slip east to proofing.");
    setObjective("Referral Vault: exit east to Silent Read Tower.");
    this.concurrenceSlipIcon?.setTint(color(PALETTE.goldStamp));
    this.clearConcurrenceSlipRouteCue();
    addSnesRewardBurst(this, 128, 114, "concurrence-slip", "Concurrence Slip", (object) => this.track(object));
    retroAudio.stamp();
    this.syncRoomTraversalState();
    this.updateReferralMinimap();
    this.toast.show("CONCURRENCE SLIP", this.player.position, "info");
  }

  private refreshConcurrenceSlipRouteCue() {
    if (this.currentRoomId !== "R2" || this.concurrenceSlipCollected) {
      this.clearConcurrenceSlipRouteCue();
      return;
    }

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 12) };
    const end = { x: 128, y: 132 };
    const label = this.concurrenceSlipRouteCueLabel();
    const cueKey = `R2:${label}:${start.x},${start.y}->${end.x},${end.y}`;
    if (cueKey === this.concurrenceSlipRouteCueKey) return;

    this.clearConcurrenceSlipRouteCue();
    this.concurrenceSlipRouteCueKey = cueKey;
    this.drawConcurrenceSlipRouteCue(start, end, label);
  }

  private clearConcurrenceSlipRouteCue() {
    for (const object of this.concurrenceSlipRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.concurrenceSlipRouteCueObjects = [];
    this.concurrenceSlipRouteCueKey = "";
  }

  private trackConcurrenceSlipRouteCue<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.concurrenceSlipRouteCueObjects.push(object);
    return this.track(object);
  }

  private concurrenceSlipRouteCueLabel() {
    if (!gameState.sceneProgress.foreignGovernmentPermissionComplete) return "PERMISSION";
    if (!gameState.sceneProgress.withholdingAppealComplete) return "APPEAL";
    if (!this.referralGateOpen) return "VISIBLE EXCISION";
    return "TAKE SLIP";
  }

  private drawConcurrenceSlipRouteCue(start: { x: number; y: number }, end: { x: number; y: number }, label: string) {
    const accent = label === "TAKE SLIP"
      ? PALETTE.goldStamp
      : label === "APPEAL"
        ? PALETTE.classNetRed
        : PALETTE.terminalCyan;

    this.trackConcurrenceSlipRouteCue(this.add.ellipse(end.x, end.y + 16, 78, 16, color(PALETTE.black), 0.34)
      .setName("referral-concurrence-slip-route-shadow")
      .setDepth(136));
    this.trackConcurrenceSlipRouteCue(this.add.rectangle(end.x, end.y, 44, 32, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(accent))
      .setName("referral-concurrence-slip-route-target-glow")
      .setDepth(236));

    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(7, Math.floor(distance / 13)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      const x = Math.round(Phaser.Math.Linear(start.x, end.x, t));
      const y = Math.round(Phaser.Math.Linear(start.y, end.y, t));
      this.trackConcurrenceSlipRouteCue(this.add.rectangle(x, y, 5, 5, color(index % 2 === 0 ? PALETTE.goldStamp : accent), 0.92)
        .setName("referral-concurrence-slip-route-dot")
        .setDepth(237));
    }

    const width = Math.max(56, label.length * 5 + 10);
    this.trackConcurrenceSlipRouteCue(this.add.rectangle(end.x, end.y + 34, width, 10, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(accent))
      .setName("referral-concurrence-slip-route-label-frame")
      .setDepth(238));
    this.trackConcurrenceSlipRouteCue(this.add.text(end.x, end.y + 31, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setName("referral-concurrence-slip-route-label")
      .setOrigin(0.5, 0)
      .setDepth(239));
  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x >= REFERRAL_PLAY_BOUNDS.right - 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    else if (position.x <= REFERRAL_PLAY_BOUNDS.left + 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    if (!direction) return false;

    if (this.currentRoomId === "R1" && direction === "east") {
      if (!this.referralGateOpen) {
        setLatestMessage("Referral gate waits for visible excision review.");
        setObjective("Resolve agency equity and visible withholding language before entering R2.");
        this.player.setPosition(REFERRAL_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.enterRoom("R2", EXIT_SPAWNS.east, true, "east");
      return true;
    }

    if (this.currentRoomId === "R2" && direction === "west") {
      this.enterRoom("R1", EXIT_SPAWNS.west, true, "west");
      return true;
    }

    if (this.currentRoomId === "R2" && direction === "east") {
      const heldItems = getHeldProcessItemIds();
      if (!canTraverseExit(this.currentRoomId, direction, heldItems)) {
        const prompt = blockedExitPrompt(this.currentRoomId, direction, heldItems);
        setLatestMessage(prompt.message);
        setObjective(prompt.objective);
        this.player.setPosition(REFERRAL_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.roomTransitionLocked = true;
      transitionTo(this, "SilentReadScene");
      return true;
    }

    this.exitCooldownUntil = this.time.now + 360;
    return false;
  }

  private handleReferralReviewAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "R1" || this.referralGateOpen) return false;
    if (!input.aJustPressed) return false;
    const target = this.referralActionTarget();
    if (!target || Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) > (target.radius ?? 44)) {
      retroAudio.blip();
      setLatestMessage("Follow the gold route to the highlighted referral station.");
      return true;
    }

    const stage = this.referralReviewStage();
    if (stage === "equity") {
      const carried = this.carriedEquityPacket();
      if (!carried) this.pickUpEquityPacket();
      else this.routeEquityPacket(target.id.replace("referral-agency-", "") as ReferralAgency);
      return true;
    }
    if (stage === "manifest") {
      if (!this.manifestCarried()) this.pickUpManifest();
      else this.fileManifestAtHumanDesk();
      return true;
    }
    if (stage === "treatment") {
      const carried = this.carriedTreatmentDocket();
      if (!carried) this.pickUpTreatmentDocket();
      else this.routeTreatmentDocket(target.id.replace("referral-treatment-", "") as ReferralTreatmentStationId);
      return true;
    }
    return false;
  }

  private updateReferralInteractionPrompt(delta: number) {
    if (this.currentRoomId === "R2") {
      this.updateConcurrenceSlipPrompt(delta);
      return;
    }
    const target = this.referralActionTarget();
    const strictTarget = target && Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    ) <= (target.radius ?? 44) ? target : null;
    this.interactionPrompt.update(delta, strictTarget, undefined, strictTarget ? {
      badge: "A",
      text: this.referralPromptText(strictTarget)
    } : undefined);
    setNearestInteractable(strictTarget?.label ?? null);
  }

  private referralPromptText(target: Interactable) {
    const stage = this.referralReviewStage();
    if (stage === "equity") {
      const packet = getReferralEquityPacket(this.equityStep);
      return this.carriedEquityPacket()
        ? `FILE ${target.id.replace("referral-agency-", "")}`
        : `TAKE ${packet.shortLabel}`;
    }
    if (stage === "manifest") return this.manifestCarried() ? "HUMAN REVIEW" : "TAKE MANIFEST";
    if (stage === "treatment") {
      const docket = getReferralTreatmentDocket(this.treatmentStep);
      return this.carriedTreatmentDocket()
        ? `FILE ${this.treatmentStationShortLabel(target.id.replace("referral-treatment-", "") as ReferralTreatmentStationId)}`
        : `TAKE ${docket.shortLabel}`;
    }
    return "";
  }

  private referralActionTarget(): Interactable | null {
    const stage = this.referralReviewStage();
    if (stage === "equity") {
      if (!this.carriedEquityPacket()) return this.referralTrayTarget("referral-equity-tray", "Referral file", 128, 174);
      return this.nearestReferralTarget(
        REFERRAL_EQUITY_PACKETS.map((packet) => this.agencyTarget(packet.agency)),
        82
      );
    }
    if (stage === "manifest") {
      return this.manifestCarried()
        ? this.referralTrayTarget("referral-human-desk", "Human Concurrence Desk", 72, 156)
        : this.referralTrayTarget("referral-manifest-tray", "StateChat draft manifest", 178, 116);
    }
    if (stage === "treatment") {
      if (!this.carriedTreatmentDocket()) return this.referralTrayTarget("referral-treatment-tray", "Visible-treatment docket", 128, 174);
      return this.nearestReferralTarget(
        REFERRAL_TREATMENT_DOCKETS.map((docket) => this.treatmentTarget(docket.station)),
        82
      );
    }
    return null;
  }

  private expectedReferralTarget(): Interactable | null {
    const stage = this.referralReviewStage();
    if (stage === "equity") {
      const carried = this.carriedEquityPacket();
      return carried
        ? this.agencyTarget(carried.agency)
        : this.referralTrayTarget("referral-equity-tray", "Referral file", 128, 174);
    }
    if (stage === "manifest") {
      return this.manifestCarried()
        ? this.referralTrayTarget("referral-human-desk", "Human Concurrence Desk", 72, 156)
        : this.referralTrayTarget("referral-manifest-tray", "StateChat draft manifest", 178, 116);
    }
    if (stage === "treatment") {
      const carried = this.carriedTreatmentDocket();
      return carried
        ? this.treatmentTarget(carried.station)
        : this.referralTrayTarget("referral-treatment-tray", "Visible-treatment docket", 128, 174);
    }
    return null;
  }

  private nearestReferralTarget(candidates: Interactable[], maxDistance: number) {
    const nearest = candidates.reduce((best, candidate) => {
      const bestDistance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, best.x, best.y);
      const candidateDistance = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, candidate.x, candidate.y);
      return candidateDistance < bestDistance ? candidate : best;
    });
    return Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, nearest.x, nearest.y) <= maxDistance
      ? nearest
      : null;
  }

  private referralTrayTarget(id: string, label: string, x: number, y: number): Interactable {
    return { id, label, x, y, radius: 46, kind: "document", onInteract: () => undefined };
  }

  private agencyTarget(agency: ReferralAgency): Interactable {
    const position = this.agencyStationPosition(agency);
    return this.referralTrayTarget(`referral-agency-${agency}`, `${agency} equity desk`, position.x, position.y);
  }

  private treatmentTarget(station: ReferralTreatmentStationId): Interactable {
    const position = this.treatmentStationPosition(station);
    const docket = REFERRAL_TREATMENT_DOCKETS.find((candidate) => candidate.station === station);
    return this.referralTrayTarget(
      `referral-treatment-${station}`,
      docket?.stationLabel ?? "Treatment station",
      position.x,
      position.y
    );
  }

  private agencyStationPosition(agency: ReferralAgency) {
    if (agency === "CIA") return { x: 60, y: 130 };
    if (agency === "DOD") return { x: 128, y: 126 };
    return { x: 196, y: 130 };
  }

  private treatmentStationPosition(station: ReferralTreatmentStationId) {
    if (station === "permission_desk") return { x: 60, y: 156 };
    if (station === "appeal_ledger") return { x: 128, y: 126 };
    return { x: 196, y: 156 };
  }

  private treatmentStationShortLabel(station: ReferralTreatmentStationId) {
    if (station === "permission_desk") return "PERMIT";
    if (station === "appeal_ledger") return "APPEAL";
    return "BRACKET";
  }

  private carriedEquityPacket() {
    const order = Math.floor(gameState.sceneProgress.referralEquityPacketCarried ?? 0);
    return REFERRAL_EQUITY_PACKETS.find((packet) => packet.order === order) ?? null;
  }

  private manifestCarried() {
    return Boolean(gameState.sceneProgress.referralManifestCarried);
  }

  private carriedTreatmentDocket() {
    const order = Math.floor(gameState.sceneProgress.referralTreatmentDocketCarried ?? 0);
    return REFERRAL_TREATMENT_DOCKETS.find((docket) => docket.order === order) ?? null;
  }

  private pickUpEquityPacket() {
    const packet = getReferralEquityPacket(this.equityStep);
    gameState.sceneProgress.referralEquityPacketCarried = packet.order;
    setHeldItem(`${packet.label} Referral File`);
    if (this.equityPacketWorldIcon?.active) this.equityPacketWorldIcon.destroy();
    this.equityPacketWorldIcon = undefined;
    this.createEquityPacketHeldIcon(packet.id);
    retroAudio.confirm();
    setLatestMessage(`${packet.label}: route to the ${packet.agency} equity desk.`);
    setObjective(this.referralObjective());
    this.syncReferralVisibleEntities();
  }

  private routeEquityPacket(agency: ReferralAgency) {
    const packet = this.carriedEquityPacket();
    if (!packet) return;
    const result = routeReferralEquityPacket(this.equityStep, packet.id, agency);
    gameState.sceneProgress.referralEquityPacketCarried = 0;
    setHeldItem(null);
    if (this.equityPacketHeldIcon?.active) this.equityPacketHeldIcon.destroy();
    this.equityPacketHeldIcon = undefined;
    if (!result.ok) {
      adjustReliability(-2, `${result.packet.label} returned from the wrong equity desk`);
      retroAudio.warning();
      this.toast.show("WRONG EQUITY", this.player.position, "warn");
      setLatestMessage(result.message);
      setObjective(`RETRY ${packet.order}/3: collect ${packet.label} from the referral tray.`);
      this.drawEquityPacketAtTray();
      this.syncReferralVisibleEntities();
      this.reliability.update();
      return;
    }

    this.equityStep = result.nextStep;
    gameState.sceneProgress.referralEquityRouteStep = result.nextStep;
    adjustReliability(3, `${result.packet.label} matched to ${result.packet.agency}`);
    retroAudio.stamp();
    setLatestMessage(result.message);
    if (result.complete) gameState.sceneProgress.referralEquityRouteComplete = 1;
    this.redrawReferralRoom();
  }

  private pickUpManifest() {
    gameState.sceneProgress.referralManifestCarried = 1;
    setHeldItem("StateChat Draft Manifest");
    if (this.manifestWorldIcon?.active) this.manifestWorldIcon.destroy();
    this.manifestWorldIcon = undefined;
    this.createManifestHeldIcon();
    retroAudio.confirm();
    setLatestMessage("StateChat drafted the batch. Carry it to the Human Concurrence Desk.");
    setObjective(this.referralObjective());
    this.syncReferralVisibleEntities();
  }

  private fileManifestAtHumanDesk() {
    gameState.sceneProgress.referralManifestCarried = 0;
    gameState.sceneProgress.referralManifestReviewComplete = 1;
    this.manifestReviewed = true;
    setHeldItem(null);
    if (this.manifestHeldIcon?.active) this.manifestHeldIcon.destroy();
    this.manifestHeldIcon = undefined;
    setDocumentWorkflowState("source_note_047", "referred");
    setDocumentWorkflowState("sbu_annotation_001", "referred");
    addDocumentPoints(8, "agency concurrence checked");
    adjustReliability(7, "manifest confirmed by human review");
    retroAudio.stamp();
    setLatestMessage("Human review confirmed the manifest. Visible treatment comes next.");
    this.redrawReferralRoom();
  }

  private pickUpTreatmentDocket() {
    const docket = getReferralTreatmentDocket(this.treatmentStep);
    gameState.sceneProgress.referralTreatmentDocketCarried = docket.order;
    setHeldItem(docket.label);
    if (this.treatmentDocketWorldIcon?.active) this.treatmentDocketWorldIcon.destroy();
    this.treatmentDocketWorldIcon = undefined;
    this.createTreatmentDocketHeldIcon(docket.id);
    retroAudio.confirm();
    setLatestMessage(`${docket.label}: file at the ${docket.stationLabel}.`);
    setObjective(this.referralObjective());
    this.syncReferralVisibleEntities();
  }

  private routeTreatmentDocket(station: ReferralTreatmentStationId) {
    const docket = this.carriedTreatmentDocket();
    if (!docket) return;
    const result = routeReferralTreatmentDocket(this.treatmentStep, docket.id, station);
    gameState.sceneProgress.referralTreatmentDocketCarried = 0;
    setHeldItem(null);
    if (this.treatmentDocketHeldIcon?.active) this.treatmentDocketHeldIcon.destroy();
    this.treatmentDocketHeldIcon = undefined;
    if (!result.ok) {
      adjustReliability(-2, `${result.docket.label} returned from the wrong review station`);
      retroAudio.warning();
      this.toast.show("WRONG STATION", this.player.position, "warn");
      setLatestMessage(result.message);
      setObjective(`RETRY ${docket.order}/3: collect ${docket.label} from the treatment tray.`);
      this.drawTreatmentDocketAtTray();
      this.syncReferralVisibleEntities();
      this.reliability.update();
      return;
    }

    this.treatmentStep = result.nextStep;
    gameState.sceneProgress.referralTreatmentStep = result.nextStep;
    this.syncLegacyReferralProgress(result.nextStep);
    this.awardTreatmentDocket(result.docket.id);
    setLatestMessage(result.message);
    retroAudio.stamp();
    if (result.complete) {
      this.finishReferralReview();
      return;
    }
    this.redrawReferralRoom();
  }

  private awardTreatmentDocket(docketId: ReferralTreatmentDocketId) {
    if (docketId === "permission_note") {
      addDocumentPoints(6, "foreign-government permission note documented");
      adjustReliability(4, "foreign-government permission trail preserved");
      return;
    }
    if (docketId === "appeal_record") {
      setDocumentWorkflowState("sbu_annotation_001", "appeal_needed");
      addDocumentPoints(7, "whole-document withholding appeal recorded");
      adjustReliability(5, "withholding appeal kept visible");
    }
  }

  private syncLegacyReferralProgress(completedTreatment: number) {
    if (completedTreatment >= 1) {
      gameState.sceneProgress.foreignGovernmentPermissionComplete = 1;
      gameState.sceneProgress.foreignGovernmentPermissionStep = REFERRAL_TREATMENT_DOCKETS[0].checkIds.length;
    }
    if (completedTreatment >= 2) {
      gameState.sceneProgress.withholdingAppealComplete = 1;
      gameState.sceneProgress.withholdingAppealStep = REFERRAL_TREATMENT_DOCKETS[1].checkIds.length;
    }
    if (completedTreatment >= 3) {
      gameState.sceneProgress.referralPhysicalReviewComplete = 1;
      gameState.sceneProgress.referralTreatmentDocketCarried = 0;
    }
  }

  private finishReferralReview() {
    awardProcessStamp("referral");
    setDocumentWorkflowState("source_note_047", "cleared");
    setDocumentWorkflowState("cross_reference_001", "cleared");
    clearDocumentUndisclosedDeletion("sbu_annotation_001", "bracketed insertion added");
    setDocumentWorkflowState("sbu_annotation_001", "excised");
    setAgencyEquityResponse("sbu_annotation_001", "agency-cyan", "cleared");
    setAgencyEquityResponse("sbu_annotation_001", "agency-red", "excised");
    addVolumeFragment("Referral Fragment");
    addDocumentPoints(12, "visible withholding language printed");
    adjustReliability(8, "visible withholding language used");
    this.referralGateOpen = true;
    gameState.sceneProgress.referralPhysicalReviewComplete = 1;
    gameState.sceneProgress.referralTreatmentStep = REFERRAL_TREATMENT_DOCKETS.length;
    gameState.sceneProgress.referralTreatmentDocketCarried = 0;
    setHeldItem(null);
    this.bureaucraticWalls.forEach((wall) => wall.clear());
    this.toast.show("REFERRAL GATE OPEN", this.player.position, "info");
    retroAudio.stamp();
    setLatestMessage("Visible treatment complete. The reader sees every withholding decision.");
    this.redrawReferralRoom({ x: 128, y: 178 });
  }

  private referralObjective() {
    if (this.referralGateOpen) return "Referral Vault: enter R2 and collect the Concurrence Slip.";
    const stage = this.referralReviewStage();
    if (stage === "equity") {
      const packet = getReferralEquityPacket(this.equityStep);
      return this.carriedEquityPacket()
        ? `ROUTE ${packet.order}/3: carry ${packet.label} to the ${packet.agency} equity desk.`
        : `ROUTE ${packet.order}/3: collect ${packet.label} from the referral tray.`;
    }
    if (stage === "manifest") {
      return this.manifestCarried()
        ? "VERIFY: carry StateChat's draft to the Human Concurrence Desk."
        : "VERIFY: collect StateChat's draft manifest from the terminal tray.";
    }
    const docket = getReferralTreatmentDocket(this.treatmentStep);
    return this.carriedTreatmentDocket()
      ? `FILE ${docket.order}/3: carry ${docket.label} to the ${docket.stationLabel}.`
      : `FILE ${docket.order}/3: collect ${docket.label} from the treatment tray.`;
  }

  private redrawReferralRoom(position = this.player.position) {
    const nextPosition = { x: Math.round(position.x), y: Math.round(position.y) };
    this.clearRoom();
    this.renderCurrentRoom(false);
    this.player.setPosition(nextPosition.x, nextPosition.y);
    this.syncRoomTraversalState();
    this.updateReferralMinimap();
    this.reliability.update();
  }

  private drawEquityPacketAtTray() {
    if (this.equityPacketWorldIcon?.active) this.equityPacketWorldIcon.destroy();
    if (this.equityStep >= REFERRAL_EQUITY_PACKETS.length) return;
    const packet = getReferralEquityPacket(this.equityStep);
    this.equityPacketWorldIcon = this.track(this.createEquityPacketIcon(128, 166, packet.id, false)
      .setName(`referral-file-${packet.id}`)
      .setDepth(176));
  }

  private createEquityPacketHeldIcon(packetId: ReferralEquityPacketId) {
    if (this.equityPacketHeldIcon?.active) this.equityPacketHeldIcon.destroy();
    this.equityPacketHeldIcon = this.createEquityPacketIcon(
      Math.round(this.player.position.x),
      Math.round(this.player.position.y - 17),
      packetId,
      true
    ).setDepth(280);
  }

  private createEquityPacketIcon(x: number, y: number, packetId: ReferralEquityPacketId, compact: boolean) {
    const packet = REFERRAL_EQUITY_PACKETS.find((candidate) => candidate.id === packetId) ?? REFERRAL_EQUITY_PACKETS[0];
    const width = compact ? 23 : 34;
    const height = compact ? 14 : 21;
    return this.add.container(x, y, [
      this.add.ellipse(1, Math.round(height / 2), width + 4, 7, color(PALETTE.black), 0.42),
      this.add.rectangle(0, 0, width, height, color(PALETTE.sepiaInk)).setStrokeStyle(1, color(PALETTE.black)),
      this.add.rectangle(-Math.round(width / 2) + 6, -Math.round(height / 2), compact ? 8 : 12, 4, color(PALETTE.goldStamp)),
      this.add.text(2, compact ? -5 : -7, packet.shortLabel, {
        fontFamily: "monospace",
        fontSize: compact ? "4px" : "5px",
        color: PALETTE.black
      }).setOrigin(0.5, 0),
      this.add.text(2, compact ? 1 : 3, packet.agency, {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.deepRuby
      }).setOrigin(0.5, 0)
    ]);
  }

  private drawManifestAtTerminalTray() {
    if (this.manifestWorldIcon?.active) this.manifestWorldIcon.destroy();
    this.manifestWorldIcon = this.track(this.createManifestIcon(178, 116, false)
      .setName("referral-statechat-manifest")
      .setDepth(176));
  }

  private createManifestHeldIcon() {
    if (this.manifestHeldIcon?.active) this.manifestHeldIcon.destroy();
    this.manifestHeldIcon = this.createManifestIcon(
      Math.round(this.player.position.x),
      Math.round(this.player.position.y - 17),
      true
    ).setDepth(280);
  }

  private createManifestIcon(x: number, y: number, compact: boolean) {
    const scale = compact ? 0.72 : 1;
    return this.add.container(x, y, [
      this.add.ellipse(1, compact ? 8 : 12, compact ? 24 : 32, 7, color(PALETTE.black), 0.42),
      this.add.image(0, 0, "referral-manifest").setScale(scale),
      this.add.rectangle(7, compact ? -5 : -8, compact ? 7 : 9, 4, color(PALETTE.terminalCyan)).setStrokeStyle(1, color(PALETTE.black))
    ]);
  }

  private drawTreatmentDocketAtTray() {
    if (this.treatmentDocketWorldIcon?.active) this.treatmentDocketWorldIcon.destroy();
    if (this.treatmentStep >= REFERRAL_TREATMENT_DOCKETS.length) return;
    const docket = getReferralTreatmentDocket(this.treatmentStep);
    this.treatmentDocketWorldIcon = this.track(this.createTreatmentDocketIcon(128, 168, docket.id, false)
      .setName(`referral-treatment-docket-${docket.id}`)
      .setDepth(176));
  }

  private createTreatmentDocketHeldIcon(docketId: ReferralTreatmentDocketId) {
    if (this.treatmentDocketHeldIcon?.active) this.treatmentDocketHeldIcon.destroy();
    this.treatmentDocketHeldIcon = this.createTreatmentDocketIcon(
      Math.round(this.player.position.x),
      Math.round(this.player.position.y - 17),
      docketId,
      true
    ).setDepth(280);
  }

  private createTreatmentDocketIcon(
    x: number,
    y: number,
    docketId: ReferralTreatmentDocketId,
    compact: boolean
  ) {
    const docket = REFERRAL_TREATMENT_DOCKETS.find((candidate) => candidate.id === docketId) ?? REFERRAL_TREATMENT_DOCKETS[0];
    const accent = docket.station === "permission_desk"
      ? PALETTE.terminalCyan
      : docket.station === "appeal_ledger"
        ? PALETTE.classNetRed
        : PALETTE.goldStamp;
    const width = compact ? 24 : 36;
    const height = compact ? 15 : 22;
    const objects: Phaser.GameObjects.GameObject[] = [
      this.add.ellipse(1, Math.round(height / 2), width + 4, 7, color(PALETTE.black), 0.42),
      this.add.rectangle(0, 0, width, height, color(PALETTE.creamPaper)).setStrokeStyle(1, color(accent)),
      this.add.rectangle(-Math.round(width / 2) + 4, 0, 4, height - 3, color(PALETTE.deepRuby)),
      this.add.text(3, compact ? -5 : -7, docket.shortLabel, {
        fontFamily: "monospace",
        fontSize: compact ? "4px" : "5px",
        color: PALETTE.black
      }).setOrigin(0.5, 0)
    ];
    for (let index = 0; index < docket.checkIds.length; index += 1) {
      objects.push(this.add.rectangle(
        -7 + index * 7,
        compact ? 3 : 5,
        4,
        2,
        color(accent)
      ));
    }
    return this.add.container(x, y, objects);
  }

  private updateCarriedReviewIcon() {
    const x = Math.round(this.player.position.x);
    const y = Math.round(this.player.position.y - 17);
    const depth = Math.round(this.player.position.y) + 5;
    this.equityPacketHeldIcon?.setPosition(x, y).setDepth(depth);
    this.manifestHeldIcon?.setPosition(x, y).setDepth(depth);
    this.treatmentDocketHeldIcon?.setPosition(x, y).setDepth(depth);
  }

  private refreshReviewRouteCue() {
    if (this.currentRoomId !== "R1" || this.referralGateOpen) {
      this.clearReviewRouteCue();
      return;
    }
    const target = this.expectedReferralTarget();
    if (!target) {
      this.clearReviewRouteCue();
      return;
    }
    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 12) };
    if (Phaser.Math.Distance.Between(start.x, start.y, target.x, target.y) <= 40) {
      this.clearReviewRouteCue();
      return;
    }
    const key = `${target.id}:${start.x},${start.y}`;
    if (key === this.reviewRouteCueKey) return;
    this.clearReviewRouteCue();
    this.reviewRouteCueKey = key;
    this.drawReviewRouteCue(start, target, this.reviewTargetAccent(target));
  }

  private clearReviewRouteCue() {
    for (const object of this.reviewRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.reviewRouteCueObjects = [];
    this.reviewRouteCueKey = "";
  }

  private trackReviewRouteCue<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.reviewRouteCueObjects.push(object);
    return this.track(object);
  }

  private reviewTargetAccent(target: Interactable) {
    if (target.id.includes("manifest")) return PALETTE.terminalCyan;
    if (target.id.includes("appeal")) return PALETTE.classNetRed;
    if (target.id.includes("permission")) return PALETTE.terminalCyan;
    return PALETTE.goldStamp;
  }

  private drawReviewRouteCue(start: { x: number; y: number }, target: Interactable, accent: string) {
    this.trackReviewRouteCue(this.add.rectangle(target.x, target.y, 52, 34, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(accent))
      .setName("referral-review-route-target")
      .setDepth(236));
    const distance = Phaser.Math.Distance.Between(start.x, start.y, target.x, target.y);
    const steps = Math.max(1, Math.min(7, Math.floor(distance / 13)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      this.trackReviewRouteCue(this.add.rectangle(
        Math.round(Phaser.Math.Linear(start.x, target.x, t)),
        Math.round(Phaser.Math.Linear(start.y, target.y, t)),
        5,
        5,
        color(index % 2 === 0 ? PALETTE.creamPaper : accent),
        0.92
      ).setAngle(45).setName("referral-review-route-dot").setDepth(237));
    }
  }
}
