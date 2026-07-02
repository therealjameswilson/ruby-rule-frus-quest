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
  markDocumentUndisclosedDeletion,
  setAgencyEquityResponse,
  setDocumentWorkflowState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { ChoiceOption, Interactable } from "../game/types";
import {
  evaluateForeignGovernmentPermissionAnswer,
  foreignGovernmentPermissionComplete,
  FOREIGN_GOVERNMENT_PERMISSION_PROMPTS,
  getForeignGovernmentPermissionPrompt
} from "../game/foreignGovernmentPermission";
import {
  evaluateWithholdingAppealAnswer,
  getWithholdingAppealPrompt,
  withholdingAppealComplete,
  WITHHOLDING_APPEAL_PROMPTS
} from "../game/withholdingAppeal";
import { getInput, tickInput, type InputState } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/items/Terminal";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addDocumentStack, addTinySparkle, addVaultBlocks } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesMapTablet, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal, addSnesWorldMap } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";
import { SNES_REFERRAL_VAULT_TILE_ASSET } from "../game/snesAtlas";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface EquityMatch {
  label: string;
  agency: "CIA" | "DOD" | "NSC";
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
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private vaultText!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private matchIndex = 0;
  private correctMatches = 0;
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

  private readonly matches: EquityMatch[] = [
    { label: "Intelligence annex", agency: "CIA" },
    { label: "Base access memo", agency: "DOD" },
    { label: "White House minutes", agency: "NSC" }
  ];

  constructor() {
    super("ReferralVaultScene");
  }

  create() {
    setSceneState("ReferralVaultScene", "explore", "Referral Vault: earn the Concurrence Slip.");
    retroAudio.startMusic("ReferralVaultScene");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    drawTiledFloor(this, "vault-tiles");
    drawRoomFrame(this, "REFERRAL VAULT");
    this.drawReferralMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902);

    this.vaultText = this.add.text(128, 88, "BATCH MANIFEST\nPENDING HUMAN CHECK", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center"
    }).setOrigin(0.5).setDepth(820);

    this.player = new Player(this, 128, 192);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.referralGateOpen = gameState.processStamps.includes("referral");
    this.concurrenceSlipCollected = hasProcessItem("concurrence_slip");
    this.enterRoom("R1", { x: 128, y: 192 }, false);
    this.dialog.show("MARCUS", [
      "Referral means agency equity.",
      "Your clearance token opens this red vault door.",
      "StateChat can draft a manifest. You confirm it, then take the slip by hand."
    ], () => {
      if (!this.referralGateOpen) this.startMatching();
    });
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
      this.dialog.show("PAUSED", "The vault waits.");
      return;
    }
    this.player.update(delta, true, { bounds: REFERRAL_PLAY_BOUNDS });
    this.updateConcurrenceSlipPrompt(delta);
    this.refreshConcurrenceSlipRouteCue();
    if (this.handleConcurrenceSlipAction(input)) {
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
    setNearestInteractable(null);
  }

  private renderCurrentRoom() {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    addSnesRoomIntroBanner(this, {
      title: `${room.id} ${room.title}`,
      subtitle: "REFERRAL VAULT",
      accent: PALETTE.goldStamp,
      track: (object) => this.track(object)
    });
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
    setVisibleEntities([
      "Marcus",
      "StateChat terminal",
      "CIA equity seal",
      "DOD equity seal",
      "NSC equity seal",
      "Referral Manifest",
      "Excision Bracket Marker",
      "Stone Wall: Referral delay"
    ]);
    addVaultBlocks(this, (object) => this.track(object));
    addSnesWorldMap(this, 128, 62, "EQUITY MAP", "referral-vault-map", (object) => this.track(object));
    addSnesMapTablet(this, {
      x: 128,
      y: 91,
      label: "EQUITY",
      nodes: ["MAN", "CIA", "DOD", "NSC", "SLIP"],
      activeIndex: this.referralGateOpen ? 4 : 1,
      accent: this.referralGateOpen ? PALETTE.goldStamp : PALETTE.classNetRed,
      track: (object) => this.track(object),
      depth: 118
    });
    addDocumentStack(this, 214, 116, true, (object) => this.track(object));
    this.track(addTinySparkle(this, 128, 120, PALETTE.goldStamp));
    const marcus = new HistorianNPC(this, "marcus", 42, 58);
    this.roomCleanups.push(() => marcus.destroy());
    this.track(new Terminal(this, 214, 58, "StateChat").container);
    this.track(this.add.image(114, 112, "referral-manifest").setDepth(120));
    this.track(this.add.image(158, 112, "excision-bracket-marker").setDepth(120));
    this.addSeal(70, 132, "CIA");
    this.addSeal(128, 132, "DOD");
    this.addSeal(186, 132, "NSC");
    if (!this.referralGateOpen) {
      this.bureaucraticWalls = [
        new BureaucraticWall(this, "cia-delay-wall", "WAIT", 44, 160, { behavior: "freeze", accent: PALETTE.goldStamp }),
        new BureaucraticWall(this, "nsc-delay-wall", "HOLD", 212, 160, { behavior: "block", accent: PALETTE.classNetRed })
      ];
      this.vaultText.setText("BATCH MANIFEST\nPENDING HUMAN CHECK");
      setObjective("Referral Vault: match each document to its agency equity.");
    } else {
      this.vaultText.setText("REFERRAL GATE OPEN\nEAST: CONCURRENCE");
      setObjective("Referral Vault: enter R2 and collect the Concurrence Slip.");
    }
  }

  private renderConcurrenceChamber() {
    setVisibleEntities(["Concurrence Slip pedestal", "Agency concurrence chamber", "Silent Read handoff gate"]);
    addVaultBlocks(this, (object) => this.track(object));
    this.track(this.add.rectangle(128, 76, 172, 28, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(76));
    this.track(this.add.text(128, 67, "CONCURRENCE CHAMBER", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(78));
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
      this.vaultText.setText("CONCURRENCE SLIP\nPRESS SPACE");
      setObjective("Referral Vault: collect the Concurrence Slip in R2.");
    } else {
      this.track(this.add.image(128, 132, "concurrence-slip").setTint(color(PALETTE.goldStamp)).setDepth(165).setVisible(false));
      this.vaultText.setText("SLIP EARNED\nEAST: SILENT READ");
      setObjective("Referral Vault: exit east to Silent Read Tower.");
    }
  }

  private addSeal(x: number, y: number, label: string) {
    const container = this.track(this.add.container(x, y).setDepth(120));
    const plate = this.add.rectangle(0, 0, 38, 30, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp));
    const seal = this.add.image(0, -1, "agency-equity-seal");
    const text = this.add.text(0, -5, label, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.black,
      backgroundColor: PALETTE.goldStamp
    }).setOrigin(0.5);
    container.add([plate, seal, text]);
  }

  private syncThreatState() {
    setVisibleThreats(
      this.bureaucraticWalls.filter((wall) => !wall.isCleared).map((wall) => ({
        label: `Stone Wall: ${wall.label}`,
        x: wall.position.x,
        y: wall.position.y,
        spriteKey: wall.spriteKey,
        behavior: wall.label === "WAIT" ? "freezes exits temporarily" : "blocks referral gate",
        defeatMethod: "Resolve agency response timer and visible referral review",
        status: this.referralGateOpen ? "cleared" : "active"
      }))
    );
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
      this.vaultText.setText("SLIP EARNED\nEAST: SILENT READ");
      return false;
    }
    const nearSlip = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) <= 32;
    if (!nearSlip) {
      setNearestInteractable(null);
      this.vaultText.setText("CONCURRENCE SLIP\nPRESS SPACE");
      if (input.aJustPressed && this.concurrenceSlipHintTarget()) {
        retroAudio.blip();
        setLatestMessage("Step closer to Concurrence Slip.");
        return true;
      }
      return false;
    }
    setNearestInteractable("Concurrence Slip");
    this.vaultText.setText("CONCURRENCE SLIP\nPRESS SPACE");
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
    setLatestMessage("Concurrence Slip opens referral gates.");
    setObjective("Referral Vault: exit east to Silent Read Tower.");
    this.vaultText.setText("SLIP EARNED\nEAST: SILENT READ");
    this.concurrenceSlipIcon?.setTint(color(PALETTE.goldStamp));
    this.clearConcurrenceSlipRouteCue();
    addSnesRewardBurst(this, 128, 114, "concurrence-slip", "Concurrence Slip", (object) => this.track(object));
    retroAudio.stamp();
    this.syncRoomTraversalState();
    this.updateReferralMinimap();
    this.dialog.show("MARCUS", [
      "Concurrence logged after human review.",
      "The slip is process evidence, not a machine decision.",
      "Carry it east to the proof tower."
    ]);
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

  private startMatching() {
    this.matchIndex = 0;
    this.correctMatches = 0;
    setObjective("Referral Vault: match each document to its agency equity.");
    this.showMatchChoice();
  }

  private showMatchChoice() {
    const item = this.matches[this.matchIndex];
    this.vaultText.setText(`MATCH ${this.matchIndex + 1}/3\n${item.label.toUpperCase()}`);
    const options: ChoiceOption[] = [
      { key: "A", label: "CIA equity", value: "CIA" },
      { key: "B", label: "DOD equity", value: "DOD" },
      { key: "C", label: "NSC equity", value: "NSC" }
    ];
    this.choice.show(`REFERRAL MATCH:\n${item.label}\n\nWHICH EQUITY SEAL?`, options, (option) => {
      if (option.value === item.agency) {
        this.correctMatches += 1;
        adjustReliability(3, `${item.label} matched to ${item.agency}`);
      } else {
        applyStandardsViolation("omitted_material_fact", `${item.label} was sent to the wrong equity.`);
        this.vaultText.setText("STANDARD HIT\nMATERIAL FACT RISK");
      }
      this.reliability.update();
      this.matchIndex += 1;
      if (this.matchIndex >= this.matches.length) {
        this.showManifestChoice();
      } else {
        this.showMatchChoice();
      }
    });
  }

  private showManifestChoice() {
    setObjective("Confirm the manifest with human judgment.");
    this.vaultText.setText("STATECHAT MANIFEST\n3 REFERRALS QUEUED\nHUMAN CONFIRM?");
    const options: ChoiceOption[] = [
      { key: "A", label: "Accept without review", value: "blind" },
      { key: "B", label: "Confirm after checking equities", value: "checked" },
      { key: "C", label: "Let StateChat decide", value: "machine" }
    ];
    this.choice.show("STATECHAT GENERATED A BATCH MANIFEST.\n\nWHO DECIDES?", options, (option) => {
      if (option.value === "checked" && this.correctMatches === this.matches.length) {
        setDocumentWorkflowState("source_note_047", "referred");
        setDocumentWorkflowState("sbu_annotation_001", "referred");
        addDocumentPoints(8, "agency concurrence checked");
        setLatestMessage("EVIDENCE-BOUND: HUMAN CHECK REQUIRED");
        adjustReliability(7, "manifest confirmed by human review");
        this.reliability.update();
        this.showForeignGovernmentPermissionChoice();
        return;
      }
      const violation = applyStandardsViolation("concealed_policy_defect", "A final referral decision was ceded or unchecked.");
      this.reliability.update();
      this.dialog.show("STANDARD VIOLATION", [
        violation.label,
        "No silent handoff. Review the equities again."
      ], () => this.startMatching());
    });
  }

  private showForeignGovernmentPermissionChoice() {
    if (gameState.sceneProgress.foreignGovernmentPermissionComplete) {
      this.showExcisionChoice();
      return;
    }

    const step = gameState.sceneProgress.foreignGovernmentPermissionStep ?? 0;
    const prompt = getForeignGovernmentPermissionPrompt(step);
    setObjective(`Foreign-government permission: review note ${step + 1}/${FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length}.`);
    this.vaultText.setText(`FOREIGN INFO\nPERMISSION ${step + 1}/3`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateForeignGovernmentPermissionAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Foreign-government permission shortcut: ${option.value}`);
        this.reliability.update();
        this.dialog.show("PERMISSION NOTE", [
          result.message,
          "Foreign-government information needs a visible review trail."
        ], () => this.showForeignGovernmentPermissionChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.foreignGovernmentPermissionStep = nextStep;
      if (!foreignGovernmentPermissionComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Foreign-government permission check ${nextStep}/${FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length}.`);
        this.dialog.show("PERMISSION NOTE", [
          result.message,
          "Continue the permission note before concurrence."
        ], () => this.showForeignGovernmentPermissionChoice());
        return;
      }

      gameState.sceneProgress.foreignGovernmentPermissionComplete = 1;
      gameState.sceneProgress.foreignGovernmentPermissionStep = FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length;
      addDocumentPoints(6, "foreign-government permission note documented");
      setLatestMessage("Foreign-government permission note documented.");
      adjustReliability(4, "foreign-government permission trail preserved");
      this.reliability.update();
      this.dialog.show("PERMISSION NOTE", [
        result.message,
        "The packet now shows permission or withholding treatment before concurrence."
      ], () => this.showWithholdingAppealChoice());
    });
  }

  private showWithholdingAppealChoice() {
    if (gameState.sceneProgress.withholdingAppealComplete) {
      this.showExcisionChoice();
      return;
    }

    const step = gameState.sceneProgress.withholdingAppealStep ?? 0;
    const prompt = getWithholdingAppealPrompt(step);
    setObjective(`Withholding appeal: review contested document ${step + 1}/${WITHHOLDING_APPEAL_PROMPTS.length}.`);
    this.vaultText.setText(`WITHHOLDING\nAPPEAL ${step + 1}/3`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateWithholdingAppealAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Withholding appeal shortcut: ${option.value}`);
        this.reliability.update();
        this.dialog.show("WITHHOLDING REVIEW", [
          result.message,
          "Whole-document withholding needs a visible human review trail."
        ], () => this.showWithholdingAppealChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.withholdingAppealStep = nextStep;
      if (!withholdingAppealComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Withholding appeal check ${nextStep}/${WITHHOLDING_APPEAL_PROMPTS.length}.`);
        this.dialog.show("WITHHOLDING REVIEW", [
          result.message,
          "Continue the appeal before marking partial excision."
        ], () => this.showWithholdingAppealChoice());
        return;
      }

      gameState.sceneProgress.withholdingAppealComplete = 1;
      gameState.sceneProgress.withholdingAppealStep = WITHHOLDING_APPEAL_PROMPTS.length;
      setDocumentWorkflowState("sbu_annotation_001", "appeal_needed");
      addDocumentPoints(7, "whole-document withholding appeal recorded");
      setLatestMessage("Whole-document withholding appeal recorded.");
      adjustReliability(5, "withholding appeal kept visible");
      this.reliability.update();
      this.dialog.show("WITHHOLDING REVIEW", [
        result.message,
        "Now mark the remaining partial excision with visible language."
      ], () => this.showExcisionChoice());
    });
  }

  private showExcisionChoice() {
    setObjective("Mark excised text visibly.");
    const options: ChoiceOption[] = [
      { key: "A", label: "Delete the missing passage", value: "erase" },
      { key: "B", label: "[Text not declassified]", value: "visible" },
      { key: "C", label: "Leave a blank gap", value: "blank" }
    ];
    this.choice.show("EXCISION REQUIRED.\nFRUS DOES NOT SILENTLY ERASE WITHHELD MATERIAL.\n\nWHAT PRINTS?", options, (option) => {
      if (option.value === "visible") {
        awardProcessStamp("referral");
        setDocumentWorkflowState("source_note_047", "cleared");
        setDocumentWorkflowState("cross_reference_001", "cleared");
        clearDocumentUndisclosedDeletion("sbu_annotation_001", "bracketed insertion added");
        setDocumentWorkflowState("sbu_annotation_001", "excised");
        setAgencyEquityResponse("sbu_annotation_001", "agency-cyan", "cleared");
        setAgencyEquityResponse("sbu_annotation_001", "agency-red", "excised");
        addVolumeFragment("Referral Fragment");
        addDocumentPoints(12, "visible withholding language printed");
        retroAudio.stamp();
        adjustReliability(8, "visible withholding language used");
        this.reliability.update();
        this.referralGateOpen = true;
        this.bureaucraticWalls.forEach((wall) => wall.clear());
        this.clearRoom();
        this.renderCurrentRoom();
        this.player.setPosition(128, 178);
        this.syncRoomTraversalState();
        this.updateReferralMinimap();
        this.dialog.show("MARCUS", [
          "Correct.",
          "The reader sees the withholding. The record does not pretend.",
          "The Concurrence Chamber is open. Take the slip by hand."
        ]);
        return;
      }
      markDocumentUndisclosedDeletion("sbu_annotation_001", "unbracketed excision");
      const violation = applyStandardsViolation(
        "undisclosed_deletion",
        "Excision skipped the bracketed insertion.",
        "sbu_annotation_001"
      );
      this.reliability.update();
      this.dialog.show("STANDARD VIOLATION", [
        violation.label,
        "Visible language. Never a silent gap."
      ], () => this.showExcisionChoice());
    });
  }
}
