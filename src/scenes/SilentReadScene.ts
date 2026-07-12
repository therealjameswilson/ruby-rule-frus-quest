import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Direction, RoomType } from "../game/constants";
import {
  addDocumentPoints,
  addInventoryItem,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  equipProcessItem,
  gameState,
  getHeldProcessItemIds,
  hasProcessItem,
  clearDocumentUndisclosedDeletion,
  setHeldItem,
  setDocumentWorkflowState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setPhysicalVerificationState,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import { Player } from "../entities/Player";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { FeedbackToast } from "../systems/feedbackToast";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, canAutoApplyProposal, ReliabilityHud } from "../systems/reliability";
import { applyDanneLurkerDamage } from "../systems/dannePressure";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal } from "../systems/snesPixelArt";
import {
  AI_ANNOTATION_REVIEW_PROMPTS,
} from "../game/aiAnnotationReview";
import {
  TYPESETTER_PROOF_PROMPTS
} from "../game/typesetterProof";
import {
  TYPESETTING_PREPARATION_PROMPTS
} from "../game/typesettingPreparation";
import {
  EDITORIAL_METHODOLOGY_PROMPTS,
} from "../game/editorialMethodology";
import {
  EDITORIAL_TREATMENT_PROMPTS,
} from "../game/editorialTreatment";
import {
  TYPEFLOW_ORDER_PROMPTS
} from "../game/typeflowOrder";
import {
  deriveSilentReadReviewStep,
  routeSilentReadReviewItem,
  SILENT_READ_REVIEW_ITEMS,
  SILENT_READ_REVIEW_TOTAL,
  silentReadReviewStatusCode,
  silentReadReviewStatusFromCode,
  type SilentReadReviewPhase,
  type SilentReadReviewStatus,
  type SilentReadStationId
} from "../game/silentReadReview";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type WorkstationId = SilentReadStationId;
type PhysicalFlagStatus = SilentReadReviewStatus;
type ProofRoomId = "E1" | "S1";

interface Workstation {
  id: WorkstationId;
  label: string;
  x: number;
  y: number;
  accent: string;
  texture: string;
  phases: readonly SilentReadReviewPhase[];
}

interface PhysicalFlag {
  id: string;
  label: string;
  shortLabel: string;
  kind: string;
  phase: SilentReadReviewPhase;
  checkCount: number;
  destination: WorkstationId;
  texture: string;
  status: PhysicalFlagStatus;
  x: number;
  y: number;
  icon?: Phaser.GameObjects.Image;
  labelText?: Phaser.GameObjects.Text;
  routedStation?: WorkstationId;
}

interface ProofRoom {
  id: ProofRoomId;
  title: string;
  roomType: RoomType;
  exits: Partial<Record<Direction, ProofRoomId | "BlackVaultLairScene">>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, "red_pencil" | "buckram_key">>;
}

const PROOF_PLAY_BOUNDS = { left: 14, right: 242, top: 42, bottom: 220 };
const DOOR_Y_MIN = 100;
const DOOR_Y_MAX = 150;
const EXIT_SPAWNS: Record<Direction, { x: number; y: number }> = {
  north: { x: 128, y: 58 },
  south: { x: 128, y: 204 },
  east: { x: 30, y: 124 },
  west: { x: 226, y: 124 }
};

const PROOF_ROOMS: Record<ProofRoomId, ProofRoom> = {
  E1: {
    id: "E1",
    title: "Editor's Labyrinth",
    roomType: "puzzle",
    exits: { east: "S1" },
    lockedExits: { east: "Red Pencil query gate" },
    requiredItems: { east: "red_pencil" }
  },
  S1: {
    id: "S1",
    title: "Silent Read Tower",
    roomType: "reward",
    exits: { west: "E1", east: "BlackVaultLairScene" },
    lockedExits: { east: "Black Vault final-review gate" },
    requiredItems: { east: "buckram_key" }
  }
};

const WORKSTATIONS: Workstation[] = [
  { id: "opennet", label: "OpenNet", x: 42, y: 180, accent: PALETTE.openNetGreen, texture: "opennet-terminal", phases: ["evidence"] },
  { id: "classnet", label: "ClassNet", x: 214, y: 180, accent: PALETTE.classNetRed, texture: "classnet-terminal", phases: ["evidence"] },
  { id: "editor-desk", label: "Editor Desk", x: 128, y: 166, accent: PALETTE.buckramHighlight, texture: "red-pencil", phases: ["editor"] },
  { id: "referral-tray", label: "Referral Tray", x: 78, y: 158, accent: PALETTE.goldStamp, texture: "concurrence-slip", phases: ["evidence"] },
  { id: "proof-table", label: "Proof Table", x: 194, y: 164, accent: PALETTE.terminalCyan, texture: "proof-page", phases: ["evidence", "production"] },
  { id: "consultation-desk", label: "Consult Desk", x: 62, y: 164, accent: PALETTE.goldStamp, texture: "review-folder", phases: ["production"] },
  { id: "typeflow-rail", label: "Typeflow Rail", x: 128, y: 164, accent: PALETTE.buckramHighlight, texture: "proof-page", phases: ["production"] }
];

const PHYSICAL_FLAGS: Array<Omit<PhysicalFlag, "status" | "x" | "y" | "icon" | "labelText" | "routedStation">> =
  SILENT_READ_REVIEW_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    shortLabel: item.shortLabel,
    kind: item.kind,
    phase: item.phase,
    checkCount: item.checkIds.length,
    destination: item.destination,
    texture: item.texture
  }));

function stationRoom(id: WorkstationId): ProofRoomId {
  return id === "editor-desk" ? "E1" : "S1";
}

function flagRoom(flag: PhysicalFlag): ProofRoomId {
  return flag.phase === "editor" ? "E1" : "S1";
}

export class SilentReadScene extends Phaser.Scene {
  private player!: Player;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private toast!: FeedbackToast;
  private objectiveText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private roomTitleText!: Phaser.GameObjects.Text;
  private currentRoomId: ProofRoomId = "E1";
  private visitedRoomIds = new Set<ProofRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private danneLurker!: DanneLurker;
  private mapCells = new Map<ProofRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ProofRoomId, Phaser.GameObjects.Text>();
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private physicalFlags: PhysicalFlag[] = [];
  private physicalRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private physicalRouteCueKey = "";
  private readonly outbox = { x: 128, y: 202 };

  constructor() {
    super("SilentReadScene");
  }

  create() {
    this.resetTransientState();
    setSceneState("SilentReadScene", "explore", "Editor's Labyrinth: earn the Red Pencil.");
    retroAudio.startMusic("SilentReadScene");
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    this.add.rectangle(128, 120, 256, 240, color(PALETTE.sepiaInk));
    this.add.rectangle(128, 120, 248, 232, color(PALETTE.creamPaper));
    drawRoomFrame(this, "EDITOR / READ", PALETTE.deepRuby, { showLegacyHud: false });
    this.drawProofMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902).setVisible(false);

    this.player = new Player(this, 128, 202);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.toast = new FeedbackToast(this);
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.danneLurker = new DanneLurker(this, 212, 72, {
      waypoints: [
        { x: 212, y: 72 },
        { x: 152, y: 58 },
        { x: 62, y: 94 },
        { x: 70, y: 190 },
        { x: 190, y: 186 }
      ]
    });
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811).setVisible(false);
    const restoredStep = deriveSilentReadReviewStep(gameState.sceneProgress, new Set(getHeldProcessItemIds()));
    const restoredRoom: ProofRoomId = gameState.sceneProgress.silentReadRoom === 1 || restoredStep > 0 ? "S1" : "E1";
    this.currentRoomId = restoredRoom;
    this.startPhysicalVerificationLoop();
    this.enterRoom(restoredRoom, { x: 128, y: 202 }, false);
    this.syncThreatState();
    this.toast.show(
      restoredRoom === "E1" ? "DRAFT READY" : "REVIEW FILE READY",
      this.player.position,
      "info",
      PROOF_PLAY_BOUNDS
    );
  }

  private resetTransientState() {
    this.currentRoomId = "E1";
    this.visitedRoomIds = new Set<ProofRoomId>();
    this.roomObjects = [];
    this.roomCleanups = [];
    this.roomTransitionLocked = false;
    this.exitCooldownUntil = 0;
    this.physicalFlags = [];
    this.physicalRouteCueObjects = [];
    this.physicalRouteCueKey = "";
    this.mapCells = new Map<ProofRoomId, Phaser.GameObjects.Rectangle>();
    this.mapLabels = new Map<ProofRoomId, Phaser.GameObjects.Text>();
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    this.toast.update(delta, this.player.position, PROOF_PLAY_BOUNDS);
    if (this.roomTransitionLocked) {
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }
    this.player.update(delta, true, { bounds: PROOF_PLAY_BOUNDS });
    this.updateDanneLurker(delta);
    this.updatePhysicalVerification();
    this.updatePhysicalInteractionPrompt(delta);
    if (input.aJustPressed) {
      this.handlePhysicalAction();
    }
    if (this.checkRoomExit()) return;
    this.reliability.update();
    this.objectiveText.setText("");
  }

  private updateDanneLurker(delta: number) {
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, true);
    if (result.triggered) {
      this.player.takeHit(this.danneLurker.position, 11, 700);
      applyDanneLurkerDamage("contact", "DANN-E deadline pressure disrupted proof review.");
      this.toast.show("DANN-E DEADLINE PRESSURE", this.player.position, "warn", PROOF_PLAY_BOUNDS);
      this.reliability.update();
    } else if (result.egoBoltHit) {
      this.player.takeHit(this.danneLurker.position, 9, 700);
      applyDanneLurkerDamage("ego_bolt", "DANN-E ego bolt disrupted proof review.");
      this.toast.show("EGO BOLT - KEEP PROOFING", this.player.position, "warn", PROOF_PLAY_BOUNDS);
      this.reliability.update();
    }
    this.syncThreatState();
  }

  private syncThreatState() {
    setVisibleThreats([this.danneLurker.readout(this.time.now)]);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.roomObjects.push(object);
    return object;
  }

  private enterRoom(roomId: ProofRoomId, spawn: { x: number; y: number }, wipe = true, direction: Direction = "east") {
    const applyRoom = () => {
      this.currentRoomId = roomId;
      gameState.sceneProgress.silentReadRoom = roomId === "S1" ? 1 : 0;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      this.player.setPosition(spawn.x, spawn.y);
      this.positionActiveWaitingFlagForRoom();
      this.syncRoomTraversalState();
      this.updateProofMinimap();
      this.updatePhysicalVerification();
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
      label: PROOF_ROOMS[roomId].title.toUpperCase(),
      onCovered: applyRoom,
      onComplete: () => {
        this.roomTransitionLocked = false;
      }
    });
  }

  private clearRoom() {
    this.clearPhysicalRouteCue();
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    this.roomCleanups = [];
    this.roomObjects = [];
    setNearestInteractable(null);
  }

  private redrawCurrentRoom() {
    this.clearRoom();
    this.renderCurrentRoom(false);
    this.positionActiveWaitingFlagForRoom();
    this.syncVisibleEntities();
  }

  private renderCurrentRoom(showIntro = true) {
    const room = PROOF_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    if (showIntro) {
      addSnesRoomIntroBanner(this, {
        title: `${room.id} ${room.title}`,
        subtitle: room.id.startsWith("E") ? "EDITOR'S LABYRINTH" : "SILENT READ TOWER",
        accent: PALETTE.buckramRed,
        track: (object) => this.track(object)
      });
    }
    addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "proof", track: (object) => this.track(object) });
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
    if (room.id === "E1") this.renderEditorsLabyrinth();
    else this.renderSilentReadTower();
    this.syncVisibleEntities();
  }

  private drawRoomDoors() {
    const room = PROOF_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      addSnesGate(this, {
        direction: "west",
        hasExit: true,
        unlocked: true,
        accent: PALETTE.buckramHighlight,
        exitLabel: "EDIT",
        track: (object) => this.track(object),
        depth: 65
      });
    }
    if (room.exits.east) {
      const open = this.currentRoomId === "E1" ? hasProcessItem("red_pencil") : hasProcessItem("buckram_key");
      const accent = open ? PALETTE.goldStamp : PALETTE.classNetRed;
      addSnesGate(this, {
        direction: "east",
        hasExit: true,
        unlocked: open,
        accent,
        lockLabel: this.currentRoomId === "E1" ? "PENC" : "BUCK",
        exitLabel: this.currentRoomId === "E1" ? "READ" : "GATE",
        track: (object) => this.track(object),
        depth: 65
      });
    }
  }

  private compassLockedExits(room: ProofRoom) {
    const locked: Partial<Record<Direction, string>> = {};
    if (room.id === "E1" && room.exits.east && !hasProcessItem("red_pencil")) {
      locked.east = room.lockedExits?.east ?? room.requiredItems?.east ?? "PENC";
    }
    if (room.id === "S1" && room.exits.east && !hasProcessItem("buckram_key")) {
      locked.east = room.lockedExits?.east ?? room.requiredItems?.east ?? "BUCK";
    }
    return locked;
  }

  private renderEditorsLabyrinth() {
    this.drawStagePanel("STATECHAT DRAFT", [
      `PLAN ${canAutoApplyProposal("mechanical") ? "READY" : "HOLD"}`,
      "HUMAN DECIDES",
      "BRACKETS PRINT"
    ], PALETTE.terminalCyan);
    const priya = new HistorianNPC(this, "priya", 28, 52);
    this.roomCleanups.push(() => priya.destroy());
    this.drawPage(72, 114, "DRAFT QUERY", [
      "Claim marked",
      "for editor",
      "judgment"
    ]);
    this.drawPage(184, 114, "VISIBLE EDIT", [
      "[Text not",
      "declassified]",
      "prints"
    ]);
    this.drawWorkstations();
    this.drawOutbox("STATECHAT OUTBOX");
    if (hasProcessItem("red_pencil")) {
      addSnesTreasurePedestal(this, {
        x: 128,
        y: 118,
        textureKey: "red-pencil",
        label: "Red Pencil",
        collected: true,
        accent: PALETTE.buckramHighlight,
        track: (object) => this.track(object),
        depth: 160
      });
      this.track(this.add.text(128, 136, "RED PENCIL READY - EAST", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp
      }).setOrigin(0.5).setDepth(171));
      setObjective("Editor's Labyrinth: enter east to the Silent Read Tower.");
    } else {
      setObjective("Editor's Labyrinth: carry StateChat's draft to the Editor Desk.");
    }
  }

  private renderSilentReadTower() {
    const phase = this.activeReviewPhase();
    if (phase === "evidence") {
      this.drawPage(74, 102, "MANUSCRIPT", ["Office opened", "in 1947", "original"]);
      this.drawPage(182, 102, "TYPESET PROOF", ["Office opened", "in 1974", "compare"]);
      this.track(addTinySparkle(this, 182, 88, PALETTE.classNetRed));
      this.drawStagePanel("SILENT READ", [
        "ROUTE EVIDENCE",
        "COMPARE DATES",
        "HUMAN STAMPS"
      ], PALETTE.goldStamp);
    } else {
      this.drawStagePanel("PUBLICATION LINE", [
        "METHOD LEDGER",
        "PRINTER COPY",
        "PROOF PULL"
      ], PALETTE.goldStamp);
      this.drawProductionLanes();
    }
    this.drawWorkstations();
    this.drawOutbox(phase === "production" ? "PUBLICATION OUTBOX" : "REVIEW OUTBOX");
    if (hasProcessItem("buckram_key")) {
      addSnesTreasurePedestal(this, {
        x: 128,
        y: 118,
        textureKey: "buckram-key",
        label: "Buckram Key",
        collected: true,
        track: (object) => this.track(object),
        depth: 230
      });
      setObjective("Silent Read Tower: exit east with Buckram Key.");
    } else {
      const active = this.getActiveFlag();
      setObjective(active
        ? `Silent Read Tower: carry ${active.shortLabel} to ${this.stationFor(active.destination).label}.`
        : "Silent Read Tower: Buckram Key ready for final publication.");
    }
  }

  private drawPage(x: number, y: number, title: string, lines: string[]) {
    this.track(this.add.rectangle(x, y, 72, 70, color(PALETTE.white)).setStrokeStyle(2, color(PALETTE.sepiaInk)));
    this.track(this.add.rectangle(x - 31, y, 3, 62, color(PALETTE.classNetRed)));
    this.track(this.add.text(x, y - 29, title, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5));
    lines.forEach((line, index) => {
      const isDate = line.includes("1974") || line.includes("1947") || line.includes("compare");
      this.track(this.add.text(x - 27, y - 17 + index * 12, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: isDate ? PALETTE.classNetRed : PALETTE.sepiaInk
      }));
    });
  }

  private drawStagePanel(title: string, lines: readonly string[], accent: string) {
    this.track(this.add.rectangle(128, 58, 112, 38, color(PALETTE.black), 0.96)
      .setStrokeStyle(1, color(accent)).setDepth(144));
    this.track(this.add.text(128, 43, title, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: accent
    }).setOrigin(0.5).setDepth(145));
    this.track(this.add.text(128, 51, lines.join("\n"), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      align: "center",
      lineSpacing: 0
    }).setOrigin(0.5, 0).setDepth(145));
  }

  private drawProductionLanes() {
    const lanes = [
      { x: 62, label: "METHOD", itemId: "editorial-ledger", accent: PALETTE.goldStamp },
      { x: 128, label: "TYPEFLOW", itemId: "printer-copy", accent: PALETTE.buckramHighlight },
      { x: 194, label: "PROOF", itemId: "typesetter-proof", accent: PALETTE.terminalCyan }
    ];
    for (const lane of lanes) {
      const item = SILENT_READ_REVIEW_ITEMS.find((candidate) => candidate.id === lane.itemId);
      this.track(this.add.rectangle(lane.x, 111, 42, 48, color(PALETTE.black), 0.92)
        .setStrokeStyle(1, color(lane.accent)).setDepth(140));
      this.track(this.add.image(lane.x, 104, item?.texture ?? "review-folder").setDepth(141));
      this.track(this.add.text(lane.x, 116, lane.label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: lane.accent
      }).setOrigin(0.5).setDepth(142));
      this.track(this.add.text(lane.x, 124, `${item?.checkIds.length ?? 0} CHECKS`, {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.creamPaper
      }).setOrigin(0.5).setDepth(142));
      this.track(this.add.rectangle(lane.x, 142, 2, 16, color(lane.accent), 0.9).setDepth(139));
    }
  }

  private drawWorkstations() {
    const phase = this.activeReviewPhase();
    for (const station of WORKSTATIONS.filter((candidate) =>
      stationRoom(candidate.id) === this.currentRoomId && candidate.phases.includes(phase)
    )) {
      this.track(this.add.rectangle(station.x, station.y + 1, 40, 18, color(PALETTE.black)).setDepth(150));
      this.track(this.add.rectangle(station.x, station.y, 38, 16, color(PALETTE.deepRuby)).setStrokeStyle(2, color(station.accent)).setDepth(151));
      this.track(this.add.image(station.x - 11, station.y, station.texture).setDepth(152));
      this.track(this.add.rectangle(station.x + 9, station.y - 2, 13, 5, color(station.accent)).setDepth(153));
      this.track(this.add.rectangle(station.x + 9, station.y + 4, 13, 2, color(PALETTE.creamPaper)).setDepth(153));
      this.track(this.add.text(station.x, station.y + 12, station.label.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: station.accent
      }).setOrigin(0.5).setDepth(154));
    }
  }

  private drawOutbox(label: string) {
    this.track(this.add.rectangle(this.outbox.x, this.outbox.y, 52, 16, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(149));
    this.track(this.add.text(this.outbox.x, this.outbox.y + 12, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5).setDepth(154));
  }

  private drawProofMinimap() {
    (["E1", "S1"] as ProofRoomId[]).forEach((roomId, index) => {
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

  private updateProofMinimap() {
    for (const [roomId, cell] of this.mapCells) {
      const active = roomId === this.currentRoomId;
      const visited = this.visitedRoomIds.has(roomId);
      cell.setFillStyle(color(active ? PALETTE.goldStamp : visited ? PALETTE.terminalCyan : PALETTE.stoneDark));
      this.mapLabels.get(roomId)?.setColor(active ? PALETTE.black : PALETTE.creamPaper);
    }
  }

  private syncRoomTraversalState() {
    const room = PROOF_ROOMS[this.currentRoomId];
    const lockedExits: Partial<Record<Direction, string>> = {};
    if (room.id === "E1" && !canTraverseExit(room.id, "east", getHeldProcessItemIds())) {
      lockedExits.east = room.lockedExits?.east;
    }
    if (room.id === "S1" && !canTraverseExit(room.id, "east", getHeldProcessItemIds())) {
      lockedExits.east = room.lockedExits?.east;
    }
    setRoomTraversalState({
      currentRoomId: room.id,
      roomTitle: room.title,
      roomType: room.roomType,
      visitedRoomIds: [...this.visitedRoomIds],
      revealedRoomIds: [
        ...(hasProcessItem("red_pencil") || this.currentRoomId === "S1" ? ["E1", "S1"] : ["E1"]),
        ...getRevealedShortcutRoomIds(getHeldProcessItemIds()).filter((roomId): roomId is ProofRoomId => roomId in PROOF_ROOMS)
      ],
      exits: room.exits,
      lockedExits,
      requiredItems: room.requiredItems
    });
  }

  private startPhysicalVerificationLoop() {
    if (this.physicalFlags.length > 0) return;
    addProcessItem("review_folder");
    const restoredStep = deriveSilentReadReviewStep(gameState.sceneProgress, getHeldProcessItemIds());
    const restoredStatus = silentReadReviewStatusFromCode(gameState.sceneProgress.silentReadReviewStatus ?? 0);
    if (restoredStep < 5) setDocumentWorkflowState("proof_page_412", "selected");
    this.physicalFlags = PHYSICAL_FLAGS.map((flag, index) => {
      const status: PhysicalFlagStatus = index < restoredStep
        ? "stamped"
        : index === restoredStep
          ? restoredStatus
          : "waiting";
      const station = this.stationFor(flag.destination);
      const placed = status === "routed" || status === "verified";
      const physicalFlag: PhysicalFlag = {
        ...flag,
        status,
        x: placed ? station.x : this.outbox.x,
        y: placed ? station.y - 17 : this.outbox.y - 10,
        routedStation: placed ? station.id : undefined
      };
      physicalFlag.icon = this.add.image(physicalFlag.x, physicalFlag.y, flag.texture).setDepth(240).setVisible(false);
      physicalFlag.labelText = this.add.text(physicalFlag.x, physicalFlag.y + 14, flag.shortLabel, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: flag.kind === "mechanical" ? PALETTE.goldStamp : PALETTE.terminalCyan,
        backgroundColor: PALETTE.black
      }).setOrigin(0.5).setDepth(241).setVisible(false);
      return physicalFlag;
    });
    const carried = this.physicalFlags.find((flag) => flag.status === "carried");
    setHeldItem(carried ? `Review Folder: ${carried.shortLabel}` : null);
    gameState.sceneProgress.silentReadReviewStep = restoredStep;
    gameState.sceneProgress.silentReadReviewStatus = silentReadReviewStatusCode(restoredStatus);
    this.positionActiveWaitingFlagForRoom();
    const active = this.getActiveFlag();
    if (active) {
      setLatestMessage("Review Folder carries unresolved issues through accountable human review.");
      setObjective(`${PROOF_ROOMS[flagRoom(active)].title}: carry ${active.shortLabel} to ${this.stationFor(active.destination).label}.`);
    } else {
      if (!hasProcessItem("buckram_key")) addProcessItem("buckram_key");
      setObjective("Silent Read Tower: exit east with the Buckram Key.");
    }
    this.syncVisibleEntities();
    this.updatePhysicalVerification();
  }

  private savePhysicalReviewProgress(flag: PhysicalFlag | null = this.getActiveFlag()) {
    const index = flag ? this.physicalFlags.indexOf(flag) : SILENT_READ_REVIEW_TOTAL;
    gameState.sceneProgress.silentReadReviewStep = Math.max(0, index);
    gameState.sceneProgress.silentReadReviewStatus = flag ? silentReadReviewStatusCode(flag.status) : 0;
  }

  private positionActiveWaitingFlagForRoom() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag || flagRoom(activeFlag) !== this.currentRoomId || activeFlag.status !== "waiting") return;
    activeFlag.x = this.outbox.x;
    activeFlag.y = this.outbox.y - 10;
    activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y);
    activeFlag.labelText?.setPosition(activeFlag.x, activeFlag.y + 14);
  }

  private updatePhysicalInteractionPrompt(delta: number) {
    const prompt = this.physicalPromptTargets();
    this.interactionPrompt.update(
      delta,
      prompt.strictTarget ?? prompt.hintTarget,
      undefined,
      prompt.strictTarget
        ? { badge: "A", text: prompt.strictText }
        : prompt.hintTarget
        ? { badge: "!", text: "STEP CLOSER" }
        : undefined
    );
  }

  private physicalPromptTargets(): {
    strictTarget: Interactable | null;
    hintTarget: Interactable | null;
    strictText: string;
  } {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag || flagRoom(activeFlag) !== this.currentRoomId) {
      return { strictTarget: null, hintTarget: null, strictText: "" };
    }

    if (activeFlag.status === "waiting") {
      const strictTarget = this.isNear(activeFlag.x, activeFlag.y, 24) ? this.flagPromptTarget(activeFlag, 24) : null;
      const hintTarget = this.isNear(activeFlag.x, activeFlag.y, 38) ? this.flagPromptTarget(activeFlag, 24) : null;
      return { strictTarget, hintTarget, strictText: `CARRY ${activeFlag.shortLabel}` };
    }

    const strictStation = this.findActionWorkstation(activeFlag, 28);
    const hintStation = strictStation ?? this.findActionWorkstation(activeFlag, 42);
    const strictTarget = strictStation ? this.workstationPromptTarget(strictStation, 36) : null;
    const hintTarget = hintStation ? this.workstationPromptTarget(hintStation, 28) : null;
    return { strictTarget, hintTarget, strictText: `${this.verbFor(activeFlag)} ${activeFlag.shortLabel}` };
  }

  private flagPromptTarget(flag: PhysicalFlag, radius: number): Interactable {
    return {
      id: `proof-flag-${flag.id}`,
      label: flag.shortLabel,
      x: flag.x,
      y: flag.y,
      radius,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private workstationPromptTarget(station: Workstation, radius: number): Interactable {
    return {
      id: `proof-workstation-${station.id}`,
      label: station.label,
      x: station.x,
      y: station.y,
      radius,
      kind: "terminal",
      onInteract: () => undefined
    };
  }

  private updatePhysicalVerification() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag) {
      this.clearPhysicalRouteCue();
      this.actionHint.setText("DONE: exit east with the Buckram Key.");
      setNearestInteractable(null);
      this.syncPhysicalState("DONE", null);
      return;
    }

    if (flagRoom(activeFlag) !== this.currentRoomId) {
      this.clearPhysicalRouteCue();
      this.updateFlagVisibility();
      const target = PROOF_ROOMS[flagRoom(activeFlag)].title;
      this.actionHint.setText(`NEXT: enter ${target.toUpperCase()}.`);
      setNearestInteractable(null);
      this.syncPhysicalState("ROUTE", null);
      return;
    }

    const nearestStation = this.findNearestWorkstation();
    const carriedFlag = activeFlag.status === "carried" ? activeFlag : null;
    if (carriedFlag?.icon) {
      carriedFlag.x = Math.round(this.player.position.x);
      carriedFlag.y = Math.round(this.player.position.y - 15);
      carriedFlag.icon.setPosition(carriedFlag.x, carriedFlag.y);
      carriedFlag.icon.setDepth(Math.round(this.player.position.y) + 4);
      carriedFlag.labelText?.setPosition(carriedFlag.x, carriedFlag.y + 14);
      carriedFlag.labelText?.setDepth(Math.round(this.player.position.y) + 5);
    }

    this.updateFlagVisibility();
    const verb = this.verbFor(activeFlag);
    this.syncPhysicalState(verb, nearestStation);
    this.updateActionHint(activeFlag, nearestStation);
    this.refreshPhysicalRouteCue(activeFlag);
  }

  private handlePhysicalAction() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag) return;
    if (flagRoom(activeFlag) !== this.currentRoomId) {
      retroAudio.warning();
      setLatestMessage(`Enter ${PROOF_ROOMS[flagRoom(activeFlag)].title} to continue.`);
      return;
    }

    if (activeFlag.status === "waiting") {
      if (!this.isNear(activeFlag.x, activeFlag.y, 24)) {
        if (this.isNear(activeFlag.x, activeFlag.y, 38)) {
          retroAudio.blip();
          setLatestMessage(`Step closer to ${activeFlag.shortLabel}.`);
          return;
        }
        retroAudio.warning();
        setLatestMessage(`CARRY: move to ${activeFlag.shortLabel}.`);
        return;
      }
      activeFlag.status = "carried";
      setHeldItem(`Review Folder: ${activeFlag.shortLabel}`);
      setLatestMessage(`CARRY: ${activeFlag.label}.`);
      setObjective(`ROUTE: place ${activeFlag.shortLabel} on ${this.stationFor(activeFlag.destination).label}.`);
      this.savePhysicalReviewProgress(activeFlag);
      retroAudio.blip();
      this.updatePhysicalVerification();
      return;
    }

    const nearestStation = this.findActionWorkstation(activeFlag, 28);
    if (!nearestStation) {
      const hintStation = this.findNearestWorkstation(42);
      if (hintStation) {
        retroAudio.blip();
        setLatestMessage(`Step closer to ${hintStation.label}.`);
        return;
      }
      retroAudio.warning();
      setLatestMessage(`${this.verbFor(activeFlag)}: stand beside the correct workstation.`);
      return;
    }
    const correctStation = this.stationFor(activeFlag.destination);
    const step = this.physicalFlags.indexOf(activeFlag);
    const routed = routeSilentReadReviewItem(step, activeFlag.id, nearestStation.id);
    if (!routed.ok) {
      retroAudio.warning();
      adjustReliability(-2, `${activeFlag.shortLabel} filed at wrong workstation`);
      activeFlag.status = "waiting";
      activeFlag.routedStation = undefined;
      activeFlag.x = this.outbox.x;
      activeFlag.y = this.outbox.y - 10;
      activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y);
      activeFlag.labelText?.setPosition(activeFlag.x, activeFlag.y + 14);
      setHeldItem(null);
      setLatestMessage(`RETRY: ${activeFlag.shortLabel} belongs at ${correctStation.label}.`);
      setObjective(`RETRY: collect ${activeFlag.shortLabel} from the outbox.`);
      this.toast.show(`WRONG DESK - USE ${correctStation.label}`, this.player.position, "warn", PROOF_PLAY_BOUNDS);
      this.savePhysicalReviewProgress(activeFlag);
      this.reliability.update();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "carried") {
      activeFlag.status = "routed";
      setHeldItem(null);
      activeFlag.routedStation = nearestStation.id;
      activeFlag.x = nearestStation.x;
      activeFlag.y = nearestStation.y - 17;
      activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y).setDepth(242);
      activeFlag.labelText?.setPosition(activeFlag.x, activeFlag.y + 14).setDepth(243);
      setLatestMessage(`ROUTE: ${activeFlag.shortLabel} placed on ${nearestStation.label}.`);
      setObjective(`${activeFlag.kind === "production" ? "STAMP" : "VERIFY"}: press Space at ${nearestStation.label}.`);
      this.savePhysicalReviewProgress(activeFlag);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "routed") {
      if (activeFlag.kind === "production") {
        activeFlag.status = "stamped";
        this.addVerificationMark(nearestStation);
        this.addProcessStampMark(activeFlag, nearestStation);
        const shouldAdvance = this.applyFlagReward(activeFlag);
        this.savePhysicalReviewProgress();
        retroAudio.stamp();
        this.updatePhysicalVerification();
        if (shouldAdvance) this.advanceAfterStamp();
        return;
      }
      activeFlag.status = "verified";
      this.addVerificationMark(nearestStation);
      setLatestMessage(activeFlag.id === "mechanical-fix"
        ? "VERIFY: human editor added the visible bracketed insertion."
        : `VERIFY: human review resolved ${activeFlag.shortLabel}.`);
      setObjective(`STAMP: apply a process stamp at ${nearestStation.label}.`);
      this.savePhysicalReviewProgress(activeFlag);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "verified") {
      activeFlag.status = "stamped";
      this.addProcessStampMark(activeFlag, nearestStation);
      const shouldAdvance = this.applyFlagReward(activeFlag);
      this.savePhysicalReviewProgress();
      retroAudio.stamp();
      this.updatePhysicalVerification();
      if (shouldAdvance) this.advanceAfterStamp();
    }
  }

  private applyFlagReward(flag: PhysicalFlag) {
    if (flag.id === "mechanical-fix") {
      gameState.sceneProgress.aiAnnotationReviewComplete = 1;
      gameState.sceneProgress.aiAnnotationReviewStep = AI_ANNOTATION_REVIEW_PROMPTS.length;
      awardProcessStamp("sop");
      addInventoryItem("AI Annotation Review Log");
      clearDocumentUndisclosedDeletion("source_note_047", "visible bracket added during human editor verification");
      setDocumentWorkflowState("source_note_047", "ready_for_proof");
      addProcessItem("red_pencil");
      equipProcessItem("red_pencil");
      addDocumentPoints(12, "StateChat plan reviewed and visibly bracketed by human editor");
      adjustReliability(8, "AI proposal remained inside SOP with a visible bracket");
      addSnesRewardBurst(this, 128, 136, "red-pencil", "Red Pencil", (object) => this.track(object));
      setLatestMessage("MECHANICAL FIX ACCEPTED - VISIBLE BRACKET RECORDED");
      return true;
    }
    if (flag.id === "proof-date") {
      awardProcessStamp("proof");
      setDocumentWorkflowState("proof_page_412", "proofed");
      addProcessItem("proof_lens");
      addSnesRewardBurst(this, 128, 104, "proof-lens", "Proof Lens", (object) => this.track(object));
      addVolumeFragment("Proof Fragment");
      addDocumentPoints(16, "evidence-bound factual discrepancy physically verified");
      adjustReliability(12, "human caught factual discrepancy");
      setLatestMessage("VERIFIED BY HUMAN REVIEW - PROOF LENS EARNED");
      return true;
    }
    if (flag.id === "editorial-ledger") {
      gameState.sceneProgress.editorialMethodologyComplete = 1;
      gameState.sceneProgress.editorialMethodologyStep = EDITORIAL_METHODOLOGY_PROMPTS.length;
      gameState.sceneProgress.editorialTreatmentComplete = 1;
      gameState.sceneProgress.editorialTreatmentStep = EDITORIAL_TREATMENT_PROMPTS.length;
      addDocumentPoints(18, "editorial method and treatment ledger filed");
      adjustReliability(14, "human consultation preserved chronology, meaning, and reader clarity");
      setLatestMessage(`METHOD LEDGER FILED - ${flag.checkCount} HUMAN CHECKS`);
      return true;
    }
    if (flag.id === "printer-copy") {
      gameState.sceneProgress.typeflowOrderComplete = 1;
      gameState.sceneProgress.typeflowOrderStep = TYPEFLOW_ORDER_PROMPTS.length;
      gameState.sceneProgress.typesettingPreparationComplete = 1;
      gameState.sceneProgress.typesettingPreparationStep = TYPESETTING_PREPARATION_PROMPTS.length;
      addDocumentPoints(14, "cleared printer's copy sequence filed");
      adjustReliability(6, "clearance preceded typesetting and metadata stayed visible");
      setLatestMessage(`PRINTER COPY FILED - ${flag.checkCount} ORDER CHECKS`);
      return true;
    }
    if (flag.id === "typesetter-proof") {
      gameState.sceneProgress.typesetterProofComplete = 1;
      gameState.sceneProgress.typesetterProofStep = TYPESETTER_PROOF_PROMPTS.length;
      addDocumentPoints(12, "typeset pages compared to originals");
      setDocumentWorkflowState("telegram_001", "proofed");
      setDocumentWorkflowState("source_note_047", "proofed");
      setDocumentWorkflowState("cross_reference_001", "proofed");
      setDocumentWorkflowState("sbu_annotation_001", "proofed");
      setDocumentWorkflowState("proof_page_412", "proofed");
      adjustReliability(10, "typesetter proof preserved document metadata");
      setLatestMessage(`TYPESETTER PROOF FILED - ${flag.checkCount} COMPARISONS`);
      return true;
    }
    if (flag.id === "public-crossref") {
      setDocumentWorkflowState("cross_reference_001", "ready_for_proof");
    } else if (flag.id === "classified-source") {
      setDocumentWorkflowState("source_note_047", "ready_for_proof");
    } else if (flag.id === "referral-equity") {
      setDocumentWorkflowState("sbu_annotation_001", "ready_for_proof");
    }
    addDocumentPoints(5, `${flag.shortLabel} verified at ${this.stationFor(flag.destination).label}`);
    adjustReliability(3, `${flag.shortLabel} routed to human workstation`);
    return true;
  }

  private advanceAfterStamp() {
    this.syncVisibleEntities();
    this.syncRoomTraversalState();
    this.updateProofMinimap();
    const nextFlag = this.getActiveFlag();
    if (!nextFlag) {
      this.awardBuckramKeyAfterTypesetterProof();
      return;
    }

    if (flagRoom(nextFlag) !== this.currentRoomId) {
      this.redrawCurrentRoom();
      this.positionActiveWaitingFlagForRoom();
      setObjective("Editor's Labyrinth: enter east to the Silent Read Tower.");
      this.toast.show("RED PENCIL READY - ENTER EAST", this.player.position, "info", PROOF_PLAY_BOUNDS);
      return;
    }

    const nextIndex = this.physicalFlags.indexOf(nextFlag);
    const previous = nextIndex > 0 ? this.physicalFlags[nextIndex - 1] : null;
    if (previous && previous.phase !== nextFlag.phase) {
      this.redrawCurrentRoom();
      this.toast.show("PUBLICATION DOCKETS READY", this.player.position, "info", PROOF_PLAY_BOUNDS);
    }

    nextFlag.x = this.outbox.x;
    nextFlag.y = this.outbox.y - 10;
    nextFlag.icon?.setPosition(nextFlag.x, nextFlag.y).setVisible(true);
    nextFlag.labelText?.setPosition(nextFlag.x, nextFlag.y + 14).setVisible(true);
    setObjective(`Silent Read Tower: carry ${nextFlag.shortLabel} from the review outbox.`);
  }

  private awardBuckramKeyAfterTypesetterProof() {
    if (!hasProcessItem("buckram_key")) {
      addProcessItem("buckram_key");
      setLatestMessage("Buckram Key opens the final publication gate.");
    }
    gameState.sceneProgress.silentReadReviewStep = SILENT_READ_REVIEW_TOTAL;
    gameState.sceneProgress.silentReadReviewStatus = 0;
    setObjective("Silent Read Tower: exit east with Buckram Key.");
    this.redrawCurrentRoom();
    addSnesRewardBurst(this, this.outbox.x, this.outbox.y - 24, "buckram-key", "Buckram Key", (object) => this.track(object));
    this.actionHint.setText("DONE: typesetter proof filed. Exit east.");
    this.reliability.update();
    this.syncRoomTraversalState();
    this.toast.show("BUCKRAM KEY READY - EXIT EAST", this.player.position, "info", PROOF_PLAY_BOUNDS);
  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x >= PROOF_PLAY_BOUNDS.right - 4 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    else if (position.x <= PROOF_PLAY_BOUNDS.left + 4 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    if (!direction) return false;

    if (this.currentRoomId === "E1" && direction === "east") {
      const heldItems = getHeldProcessItemIds();
      if (!canTraverseExit(this.currentRoomId, direction, heldItems)) {
        const prompt = blockedExitPrompt(this.currentRoomId, direction, heldItems);
        setLatestMessage(prompt.message);
        setObjective(prompt.objective);
        this.player.setPosition(PROOF_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.enterRoom("S1", EXIT_SPAWNS.east, true, "east");
      return true;
    }

    if (this.currentRoomId === "S1" && direction === "west") {
      this.enterRoom("E1", EXIT_SPAWNS.west, true, "west");
      return true;
    }

    if (this.currentRoomId === "S1" && direction === "east") {
      const heldItems = getHeldProcessItemIds();
      if (!canTraverseExit(this.currentRoomId, direction, heldItems)) {
        const prompt = blockedExitPrompt(this.currentRoomId, direction, heldItems);
        setLatestMessage(prompt.message);
        setObjective(prompt.objective);
        this.player.setPosition(PROOF_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.roomTransitionLocked = true;
      gameState.sceneProgress.blackVaultClimaxRequired = 1;
      gameState.sceneProgress.blackVaultEnteredFromSilentRead = 1;
      setLatestMessage("Buckram Key turns: the Black Vault final-review route opens.");
      transitionTo(this, "BlackVaultLairScene");
      return true;
    }

    this.exitCooldownUntil = this.time.now + 360;
    return false;
  }

  private addVerificationMark(station: Workstation) {
    const glow = this.add.rectangle(station.x, station.y - 18, 24, 4, color(PALETTE.terminalCyan)).setDepth(245);
    this.tweens.add({
      targets: glow,
      y: glow.y - 1,
      duration: 260,
      yoyo: true,
      repeat: 2,
      onComplete: () => glow.destroy()
    });
  }

  private addProcessStampMark(flag: PhysicalFlag, station: Workstation) {
    const stationStampCount = this.physicalFlags.filter((candidate) => candidate.status === "stamped" && candidate.destination === station.id).length;
    const x = station.x - 14 + ((stationStampCount - 1) % 3) * 14;
    const y = station.y + 22 + Math.floor((stationStampCount - 1) / 3) * 7;
    this.track(this.add.rectangle(x, y, 12, 6, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(246));
    this.track(this.add.rectangle(x, y + 2, 10, 2, color(PALETTE.buckramHighlight)).setDepth(247));
    this.track(this.add.text(x, y - 3, "OK", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(248));
    flag.icon?.setTint(color(PALETTE.stoneGray));
    flag.labelText?.setColor(PALETTE.stoneGray);
    setLatestMessage(`STAMP: ${flag.shortLabel} human review recorded.`);
  }

  private refreshPhysicalRouteCue(flag: PhysicalFlag) {
    const station = this.stationFor(flag.destination);
    if (stationRoom(station.id) !== this.currentRoomId || flag.status === "stamped") {
      this.clearPhysicalRouteCue();
      return;
    }

    const start = flag.status === "carried"
      ? { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 15) }
      : { x: Math.round(flag.x), y: Math.round(flag.y) };
    const end = { x: Math.round(station.x), y: Math.round(station.y) };
    const cueKey = `${this.currentRoomId}:${flag.id}:${flag.status}:${start.x},${start.y}->${station.id}`;
    if (cueKey === this.physicalRouteCueKey) return;

    this.clearPhysicalRouteCue();
    this.physicalRouteCueKey = cueKey;

    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(8, Math.floor(distance / 14)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      const x = Math.round(Phaser.Math.Linear(start.x, end.x, t));
      const y = Math.round(Phaser.Math.Linear(start.y, end.y, t));
      const routeAccent = index % 2 === 0 ? color(PALETTE.terminalCyan) : color(PALETTE.goldStamp);
      const shadow = this.add.rectangle(x + 1, y + 1, 9, 9, color(PALETTE.black), 0.78).setDepth(235);
      const tile = this.add.rectangle(x, y, 7, 7, routeAccent, 0.96).setDepth(236);
      const shine = this.add.rectangle(x - 2, y - 2, 2, 2, color(PALETTE.creamPaper), 0.9).setDepth(237);
      this.physicalRouteCueObjects.push(shadow, tile, shine);
    }

    const targetLabel = `TO ${station.label.toUpperCase()}`;
    const targetWidth = Math.max(56, targetLabel.length * 4 + 8);
    const targetBack = this.add.rectangle(end.x, end.y - 30, targetWidth, 11, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(238);
    const targetText = this.add.text(end.x, end.y - 34, targetLabel, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(239);
    this.physicalRouteCueObjects.push(targetBack, targetText);
  }

  private clearPhysicalRouteCue() {
    for (const object of this.physicalRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.physicalRouteCueObjects = [];
    this.physicalRouteCueKey = "";
  }

  private updateActionHint(flag: PhysicalFlag, nearestStation: Workstation | null) {
    const correctStation = this.stationFor(flag.destination);
    const verb = this.verbFor(flag);
    const stationText = nearestStation ? ` NEAR: ${nearestStation.label.toUpperCase()}` : "";
    if (flag.status === "waiting") {
      const nearFlag = this.isNear(flag.x, flag.y, 24);
      setNearestInteractable(nearFlag ? `CARRY ${flag.shortLabel}` : null);
      this.actionHint.setText(`CARRY ${flag.shortLabel}: press Space at outbox.`);
      return;
    }
    if (flag.status === "carried") {
      setNearestInteractable(nearestStation ? `ROUTE to ${nearestStation.label}` : null);
      this.actionHint.setText(`ROUTE ${flag.shortLabel}: ${correctStation.label}.${stationText}`);
      return;
    }
    if (flag.status === "routed") {
      const verb = flag.kind === "production" ? "STAMP" : "VERIFY";
      setNearestInteractable(nearestStation?.id === flag.destination ? `${verb} ${flag.shortLabel}` : null);
      this.actionHint.setText(`${verb} ${flag.shortLabel}: press Space at ${correctStation.label}.`);
      return;
    }
    setNearestInteractable(nearestStation?.id === flag.destination ? `STAMP ${flag.shortLabel}` : null);
    this.actionHint.setText(`${verb} ${flag.shortLabel}: press Space at ${correctStation.label}.`);
  }

  private updateFlagVisibility() {
    const activeFlag = this.getActiveFlag();
    for (const flag of this.physicalFlags) {
      const inRoom = flagRoom(flag) === this.currentRoomId;
      const visible = inRoom && flag === activeFlag;
      flag.icon?.setVisible(visible);
      flag.labelText?.setVisible(visible && flag.status !== "carried");
    }
  }

  private syncPhysicalState(verb: "CARRY" | "ROUTE" | "VERIFY" | "STAMP" | "DONE", nearestStation: Workstation | null) {
    const completed = this.physicalFlags.filter((flag) => flag.status === "stamped").length;
    const carried = this.physicalFlags.find((flag) => flag.status === "carried");
    setPhysicalVerificationState({
      verb,
      carriedItem: carried ? `Review Folder: ${carried.shortLabel}` : null,
      nearestStation: nearestStation?.label ?? null,
      completed,
      total: this.physicalFlags.length,
      flags: this.physicalFlags.map((flag) => ({
        id: flag.id,
        label: flag.label,
        kind: flag.kind,
        destination: this.stationFor(flag.destination).label,
        status: flag.status
      }))
    });
  }

  private syncVisibleEntities() {
    const phase = this.activeReviewPhase();
    const roomLabels = this.currentRoomId === "E1"
      ? ["Priya", "StateChat draft terminal", "StateChat outbox", "Editor Desk", "Red Pencil"]
      : phase === "evidence"
        ? ["Manuscript page", "Typeset proof", "Review outbox", "Proof Lens", "OpenNet", "ClassNet", "Referral Tray", "Proof Table"]
        : ["Cleared copy", "Publication outbox", "Consult Desk", "Typeflow Rail", "Proof Table", "Buckram Key"];
    const active = this.getActiveFlag();
    setVisibleEntities([
      ...roomLabels,
      "Review Folder",
      ...(active && flagRoom(active) === this.currentRoomId ? [active.label] : [])
    ]);
  }

  private getActiveFlag() {
    return this.physicalFlags.find((flag) => flag.status !== "stamped") ?? null;
  }

  private verbFor(flag: PhysicalFlag): "CARRY" | "ROUTE" | "VERIFY" | "STAMP" {
    if (flag.status === "waiting") return "CARRY";
    if (flag.status === "carried") return "ROUTE";
    if (flag.status === "routed") return flag.kind === "production" ? "STAMP" : "VERIFY";
    return "STAMP";
  }

  private stationFor(id: WorkstationId) {
    const station = WORKSTATIONS.find((candidate) => candidate.id === id);
    if (!station) throw new Error(`Unknown workstation: ${id}`);
    return station;
  }

  private activeReviewPhase(): SilentReadReviewPhase {
    const active = this.getActiveFlag();
    if (active) return active.phase;
    return this.currentRoomId === "E1" ? "editor" : "production";
  }

  private findNearestWorkstation(maxDistance = 24) {
    const phase = this.activeReviewPhase();
    const nearest = WORKSTATIONS
      .filter((station) => stationRoom(station.id) === this.currentRoomId && station.phases.includes(phase))
      .map((station) => ({
        station,
        distance: Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, station.x, station.y)
      })).sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= maxDistance ? nearest.station : null;
  }

  private findActionWorkstation(flag: PhysicalFlag, maxDistance: number) {
    const intended = this.stationFor(flag.destination);
    const intendedDistance = Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      intended.x,
      intended.y
    );
    if (intendedDistance <= maxDistance + 8) return intended;
    return this.findNearestWorkstation(maxDistance);
  }

  private isNear(x: number, y: number, radius: number) {
    return Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, x, y) <= radius;
  }
}
