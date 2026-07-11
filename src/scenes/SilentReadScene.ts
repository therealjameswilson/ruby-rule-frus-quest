import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Direction, RoomType } from "../game/constants";
import {
  addDocumentPoints,
  addInventoryItem,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  getHeldProcessItemIds,
  hasProcessItem,
  clearDocumentUndisclosedDeletion,
  markDocumentUndisclosedDeletion,
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
import type { ChoiceOption, Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import { Player } from "../entities/Player";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, canAutoApplyProposal, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addProofingTable, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesMapTablet, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";
import {
  aiAnnotationReviewComplete,
  AI_ANNOTATION_REVIEW_PROMPTS,
  evaluateAiAnnotationReviewAnswer,
  getAiAnnotationReviewPrompt
} from "../game/aiAnnotationReview";
import {
  evaluateTypesetterProofAnswer,
  getTypesetterProofPrompt,
  typesetterProofComplete,
  TYPESETTER_PROOF_PROMPTS
} from "../game/typesetterProof";
import {
  evaluateTypesettingPreparationAnswer,
  getTypesettingPreparationPrompt,
  typesettingPreparationComplete,
  TYPESETTING_PREPARATION_PROMPTS
} from "../game/typesettingPreparation";
import {
  EDITORIAL_METHODOLOGY_PROMPTS,
  editorialMethodologyComplete,
  evaluateEditorialMethodologyAnswer,
  getEditorialMethodologyPrompt
} from "../game/editorialMethodology";
import {
  editorialTreatmentComplete,
  EDITORIAL_TREATMENT_PROMPTS,
  evaluateEditorialTreatmentAnswer,
  getEditorialTreatmentPrompt
} from "../game/editorialTreatment";
import {
  evaluateTypeflowOrderAnswer,
  getTypeflowOrderPrompt,
  typeflowOrderComplete,
  TYPEFLOW_ORDER_PROMPTS
} from "../game/typeflowOrder";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type WorkstationId = "opennet" | "classnet" | "editor-desk" | "referral-tray" | "proof-table";
type PhysicalFlagStatus = "waiting" | "carried" | "routed" | "verified" | "stamped";
type ProofRoomId = "E1" | "S1";

interface Workstation {
  id: WorkstationId;
  label: string;
  x: number;
  y: number;
  accent: string;
  texture: string;
}

interface PhysicalFlag {
  id: string;
  label: string;
  shortLabel: string;
  kind: string;
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
  exits: Partial<Record<Direction, ProofRoomId | "EndingScene">>;
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
    exits: { west: "E1", east: "EndingScene" },
    lockedExits: { east: "Buckram publication gate" },
    requiredItems: { east: "buckram_key" }
  }
};

const WORKSTATIONS: Workstation[] = [
  { id: "opennet", label: "OpenNet", x: 42, y: 184, accent: PALETTE.openNetGreen, texture: "opennet-terminal" },
  { id: "classnet", label: "ClassNet", x: 214, y: 184, accent: PALETTE.classNetRed, texture: "classnet-terminal" },
  { id: "editor-desk", label: "Editor Desk", x: 128, y: 176, accent: PALETTE.buckramHighlight, texture: "red-pencil" },
  { id: "referral-tray", label: "Referral Tray", x: 76, y: 160, accent: PALETTE.goldStamp, texture: "concurrence-slip" },
  { id: "proof-table", label: "Proof Table", x: 180, y: 160, accent: PALETTE.terminalCyan, texture: "proof-page" }
];

const PHYSICAL_FLAGS: Array<Omit<PhysicalFlag, "status" | "x" | "y" | "icon" | "labelText" | "routedStation">> = [
  {
    id: "mechanical-fix",
    label: "StateChat Mechanical Fix Proposal",
    shortLabel: "MECH FIX",
    kind: "mechanical",
    destination: "editor-desk",
    texture: "red-pencil"
  },
  {
    id: "public-crossref",
    label: "Evidence-Bound OpenNet Cross-Reference",
    shortLabel: "OPEN NOTE",
    kind: "evidence_bound",
    destination: "opennet",
    texture: "cross-reference"
  },
  {
    id: "classified-source",
    label: "Evidence-Bound ClassNet Source Note",
    shortLabel: "CLASS NOTE",
    kind: "classification",
    destination: "classnet",
    texture: "source-note"
  },
  {
    id: "referral-equity",
    label: "Evidence-Bound Referral Equity Slip",
    shortLabel: "REF SLIP",
    kind: "evidence_bound",
    destination: "referral-tray",
    texture: "concurrence-slip"
  },
  {
    id: "proof-date",
    label: "Evidence-Bound Proof Date Discrepancy",
    shortLabel: "PROOF DATE",
    kind: "evidence_bound",
    destination: "proof-table",
    texture: "proof-page"
  }
];

function stationRoom(id: WorkstationId): ProofRoomId {
  return id === "editor-desk" ? "E1" : "S1";
}

function flagRoom(flag: PhysicalFlag): ProofRoomId {
  return stationRoom(flag.destination);
}

export class SilentReadScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
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
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
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
    }).setDepth(811);
    this.enterRoom("E1", { x: 128, y: 202 }, false);
    this.syncThreatState();
    this.dialog.show("PRIYA", [
      "Run the AI annotation review tool first.",
      "It returns a JSON plan, not a final decision.",
      "The Red Pencil opens the proof tower. Then every evidence flag moves by hand."
    ], () => this.beginAiAnnotationReview());
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
    if (this.choice.active) {
      this.interactionPrompt.update(delta, null);
      this.choice.updateInput();
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
    this.objectiveText.setText(gameState.objective);
  }

  private updateDanneLurker(delta: number) {
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, true);
    if (result.triggered) {
      this.player.takeHit(this.danneLurker.position, 11, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E deadline pressure disrupted proof review.");
      setObjective("Silent Read Tower: proof by human review, not DANN-E pressure.");
      this.reliability.update();
    } else if (result.egoBoltHit) {
      this.player.takeHit(this.danneLurker.position, 9, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E ego bolt disrupted proof review.");
      setObjective("Silent Read Tower: dodge Ego bolts and keep proofing.");
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

  private renderCurrentRoom() {
    const room = PROOF_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    addSnesRoomIntroBanner(this, {
      title: `${room.id} ${room.title}`,
      subtitle: room.id.startsWith("E") ? "EDITOR'S LABYRINTH" : "SILENT READ TOWER",
      accent: PALETTE.buckramRed,
      track: (object) => this.track(object)
    });
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
    this.track(addTerminalPanel(this, 128, 48, [
      "AI ANNO REVIEW",
      "SCHEMA: OK",
      `MECH AUTO: ${canAutoApplyProposal("mechanical") ? "YES" : "NO"}`,
      "EVIDENCE: COMMENT",
      "HUMAN TRIAGE"
    ]));
    addSnesMapTablet(this, {
      x: 128,
      y: 88,
      label: "EDIT MAP",
      nodes: ["AI", "DESK", "PENC", "READ"],
      activeIndex: hasProcessItem("red_pencil") ? 2 : 1,
      accent: hasProcessItem("red_pencil") ? PALETTE.goldStamp : PALETTE.buckramHighlight,
      track: (object) => this.track(object),
      depth: -5
    });
    const priya = new HistorianNPC(this, "priya", 28, 52);
    this.roomCleanups.push(() => priya.destroy());
    this.drawPage(76, 118, "DRAFT QUERY", [
      "Unsupported",
      "claim marked",
      "for editor",
      "judgment."
    ]);
    this.drawPage(180, 118, "STYLE FILE", [
      "StateChat may",
      "propose text.",
      "Editor decides",
      "meaning."
    ]);
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 150,
      textureKey: "red-pencil",
      label: "Red Pencil",
      collected: hasProcessItem("red_pencil"),
      accent: PALETTE.buckramHighlight,
      track: (object) => this.track(object),
      depth: 160
    });
    this.drawWorkstations();
    this.drawOutbox("STATECHAT OUTBOX");
    this.drawToolbeltIcons();
    if (hasProcessItem("red_pencil")) {
      this.track(this.add.rectangle(128, 84, 104, 10, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(170));
      this.track(this.add.text(128, 80, "RED PENCIL EARNED - EAST", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp
      }).setOrigin(0.5, 0).setDepth(171));
      setObjective("Editor's Labyrinth: enter east to the Silent Read Tower.");
    } else if (!gameState.sceneProgress.aiAnnotationReviewComplete) {
      setObjective("Editor's Labyrinth: run AI annotation review before carrying flags.");
    } else {
      setObjective("Editor's Labyrinth: route the mechanical flag to the editor desk.");
    }
  }

  private renderSilentReadTower() {
    this.drawPage(76, 110, "MANUSCRIPT", [
      "The office office",
      "opened in 1947.",
      "The record said",
      "\"publish fully."
    ]);
    this.drawPage(180, 110, "TYPESET PROOF", [
      "The office",
      "opened in 1974.",
      "The record said",
      "\"publish fully."
    ]);
    this.track(this.add.image(180, 158, "proof-page").setDepth(165));
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 82,
      textureKey: "proof-lens",
      label: "Proof Lens",
      collected: hasProcessItem("proof_lens"),
      accent: PALETTE.terminalCyan,
      track: (object) => this.track(object),
      depth: 160
    });
    this.track(addTinySparkle(this, 178, 87, PALETTE.classNetRed));
    this.track(addTerminalPanel(this, 128, 48, [
      "SILENT READ",
      "EVIDENCE FLAGS",
      "OPEN / CLASS / REF",
      "PROOF DATE",
      "HUMAN STAMPS"
    ], PALETTE.goldStamp));
    addSnesMapTablet(this, {
      x: 128,
      y: 156,
      label: "PROOF MAP",
      nodes: ["READ", "LENS", "STAMP", "BUCK"],
      activeIndex: hasProcessItem("buckram_key") ? 3 : hasProcessItem("proof_lens") ? 2 : 1,
      accent: hasProcessItem("buckram_key") ? PALETTE.goldStamp : PALETTE.terminalCyan,
      track: (object) => this.track(object),
      depth: -5
    });
    addProofingTable(this, 128, 172, (object) => this.track(object));
    this.drawWorkstations();
    this.drawOutbox("REVIEW OUTBOX");
    this.drawToolbeltIcons();
    if (hasProcessItem("buckram_key")) {
      addSnesTreasurePedestal(this, {
        x: 128,
        y: 126,
        textureKey: "buckram-key",
        label: "Buckram Key",
        collected: true,
        track: (object) => this.track(object),
        depth: 230
      });
      setObjective("Silent Read Tower: exit east with Buckram Key.");
    } else if (gameState.sceneProgress.typesetterProofComplete) {
      setObjective("Silent Read Tower: take the Buckram Key after proofing.");
    } else if (!gameState.sceneProgress.editorialMethodologyComplete) {
      setObjective("Silent Read Tower: route flags, then file editorial methodology.");
    } else if (!gameState.sceneProgress.editorialTreatmentComplete) {
      setObjective("Silent Read Tower: route flags, then resolve editorial treatment.");
    } else if (!gameState.sceneProgress.typeflowOrderComplete) {
      setObjective("Silent Read Tower: file the manuscript-clearance order before typesetting.");
    } else if (!gameState.sceneProgress.typesettingPreparationComplete) {
      setObjective("Silent Read Tower: prepare the printer's copy before proof comparison.");
    } else {
      setObjective("Silent Read Tower: carry flags, then run typesetter proof.");
    }
  }

  private drawPage(x: number, y: number, title: string, lines: string[]) {
    this.track(this.add.rectangle(x, y, 86, 112, color(PALETTE.white)).setStrokeStyle(2, color(PALETTE.sepiaInk)));
    this.track(this.add.rectangle(x - 38, y, 3, 104, color(PALETTE.classNetRed)));
    this.track(this.add.text(x, y - 49, title, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5));
    lines.forEach((line, index) => {
      const isDate = line.includes("1974") || line.includes("1947");
      this.track(this.add.text(x - 34, y - 31 + index * 16, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: isDate ? PALETTE.classNetRed : PALETTE.sepiaInk
      }));
    });
  }

  private drawWorkstations() {
    for (const station of WORKSTATIONS.filter((candidate) => stationRoom(candidate.id) === this.currentRoomId)) {
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

  private drawToolbeltIcons() {
    const tools = [
      { x: 92, y: 72, key: "review-folder", label: "FOLDER", color: PALETTE.goldStamp },
      { x: 128, y: 72, key: "proof-lens", label: "LENS", color: PALETTE.terminalCyan },
      { x: 164, y: 72, key: "red-pencil", label: "PENCIL", color: PALETTE.buckramHighlight }
    ];
    for (const tool of tools) {
      this.track(this.add.rectangle(tool.x, tool.y, 28, 22, color(PALETTE.black)).setStrokeStyle(1, color(tool.color)).setDepth(146));
      this.track(this.add.image(tool.x, tool.y - 3, tool.key).setDepth(147));
      this.track(this.add.text(tool.x, tool.y + 9, tool.label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: tool.color
      }).setOrigin(0.5).setDepth(148));
    }
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
    setDocumentWorkflowState("proof_page_412", "selected");
    this.physicalFlags = PHYSICAL_FLAGS.map((flag) => {
      const physicalFlag: PhysicalFlag = {
        ...flag,
        status: "waiting",
        x: this.outbox.x,
        y: this.outbox.y - 10
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
    this.positionActiveWaitingFlagForRoom();
    setLatestMessage("Review Folder carries unresolved issues through human review.");
    setObjective("Editor's Labyrinth: carry the StateChat mechanical flag.");
    this.syncVisibleEntities();
    this.updatePhysicalVerification();
  }

  private beginAiAnnotationReview() {
    if (gameState.sceneProgress.aiAnnotationReviewComplete) {
      this.startPhysicalVerificationLoop();
      return;
    }
    this.showAiAnnotationReviewChoice();
  }

  private showAiAnnotationReviewChoice() {
    if (gameState.sceneProgress.aiAnnotationReviewComplete) {
      this.startPhysicalVerificationLoop();
      return;
    }

    const step = gameState.sceneProgress.aiAnnotationReviewStep ?? 0;
    const prompt = getAiAnnotationReviewPrompt(step);
    setObjective(`AI Annotation Review: answer ${step + 1}/${AI_ANNOTATION_REVIEW_PROMPTS.length}.`);
    this.actionHint.setText(`STATECHAT SOP ${step + 1}/${AI_ANNOTATION_REVIEW_PROMPTS.length}: choose A/B/C.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateAiAnnotationReviewAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        adjustReliability(-2, "AI annotation SOP correction");
        setLatestMessage("EVIDENCE-BOUND: HUMAN CHECK REQUIRED");
        this.reliability.update();
        this.dialog.show("AI ANNOTATION REVIEW", [
          result.message,
          "The terminal can propose. A human must route and decide."
        ], () => this.showAiAnnotationReviewChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.aiAnnotationReviewStep = nextStep;
      if (!aiAnnotationReviewComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`AI annotation SOP check ${nextStep}/${AI_ANNOTATION_REVIEW_PROMPTS.length}.`);
        this.dialog.show("AI ANNOTATION REVIEW", [
          result.message,
          "Continue the SOP check before carrying review flags."
        ], () => this.showAiAnnotationReviewChoice());
        return;
      }

      gameState.sceneProgress.aiAnnotationReviewComplete = 1;
      addDocumentPoints(4, "AI annotation review SOP filed");
      retroAudio.confirm();
      setLatestMessage("AI Annotation Review Log filed: terminal support, human decisions.");
      this.dialog.show("AI ANNOTATION REVIEW", [
        result.message,
        "The review log is filed.",
        "Now carry each flag to the correct human workstation."
      ], () => this.startPhysicalVerificationLoop());
    });
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

    const strictStation = this.findNearestWorkstation(28);
    const hintStation = strictStation ?? this.findNearestWorkstation(42);
    const strictTarget = strictStation ? this.workstationPromptTarget(strictStation, 28) : null;
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
      retroAudio.blip();
      this.updatePhysicalVerification();
      return;
    }

    const nearestStation = this.findNearestWorkstation(28);
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
    if (nearestStation.id !== activeFlag.destination) {
      retroAudio.warning();
      setLatestMessage(`ROUTE: ${activeFlag.shortLabel} belongs at ${correctStation.label}.`);
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
      setObjective(`VERIFY: press Space at ${nearestStation.label}.`);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "routed") {
      activeFlag.status = "verified";
      this.addVerificationMark(nearestStation);
      setLatestMessage(`VERIFY: human review resolved ${activeFlag.shortLabel}.`);
      setObjective(`STAMP: apply a process stamp at ${nearestStation.label}.`);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "verified") {
      activeFlag.status = "stamped";
      this.addProcessStampMark(activeFlag, nearestStation);
      const shouldAdvance = this.applyFlagReward(activeFlag);
      retroAudio.stamp();
      this.updatePhysicalVerification();
      if (shouldAdvance) this.advanceAfterStamp();
    }
  }

  private applyFlagReward(flag: PhysicalFlag) {
    if (flag.id === "mechanical-fix") {
      awardProcessStamp("sop");
      addInventoryItem("AI Annotation Review Log");
      addProcessItem("red_pencil");
      addSnesRewardBurst(this, 128, 136, "red-pencil", "Red Pencil", (object) => this.track(object));
      this.showRedPencilBracketChoice("source_note_047");
      return false;
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

  private showRedPencilBracketChoice(documentId: string) {
    setObjective("Red Pencil: add bracketed insertion before the edit can move to proof.");
    const options: ChoiceOption[] = [
      { key: "A", label: "[Text not declassified]", value: "bracket" },
      { key: "B", label: "Skip bracket", value: "skip" }
    ];
    this.choice.show("RED PENCIL EXCISION.\nABOUT THE SERIES REQUIRES VISIBLE ALTERATION.\n\nWHAT PRINTS?", options, (option) => {
      if (option.value === "bracket") {
        clearDocumentUndisclosedDeletion(documentId, "bracketed insertion added");
        setDocumentWorkflowState(documentId, "ready_for_proof");
        addDocumentPoints(8, "mechanical StateChat proposal bracketed by editor");
        adjustReliability(8, "AI checker output kept inside SOP with visible brackets");
        setLatestMessage("MECHANICAL FIX ACCEPTED - BRACKETED INSERTION RECORDED");
        this.advanceAfterStamp();
        return;
      }

      markDocumentUndisclosedDeletion(documentId, "Red Pencil excision skipped bracketed insertion");
      const violation = applyStandardsViolation(
        "undisclosed_deletion",
        "Red Pencil excision skipped the bracketed insertion.",
        documentId
      );
      this.reliability.update();
      setObjective("Correct the Red Pencil edit with bracketed insertion before publication.");
      this.dialog.show("STANDARD VIOLATION", [
        violation.label,
        "Add the bracketed insertion before this document can publish."
      ], () => this.showRedPencilBracketChoice(documentId));
    });
  }

  private advanceAfterStamp() {
    this.syncVisibleEntities();
    this.syncRoomTraversalState();
    this.updateProofMinimap();
    const nextFlag = this.getActiveFlag();
    if (!nextFlag) {
      this.showEditorialMethodologyChoice();
      return;
    }

    if (flagRoom(nextFlag) !== this.currentRoomId) {
      this.renderCurrentRoom();
      this.positionActiveWaitingFlagForRoom();
      setObjective("Editor's Labyrinth: enter east to the Silent Read Tower.");
      this.dialog.show("PRIYA", [
        "Red Pencil earned.",
        "The mechanical proposal is handled.",
        "Now enter the tower and route the evidence-bound flags by hand."
      ]);
      return;
    }

    nextFlag.x = this.outbox.x;
    nextFlag.y = this.outbox.y - 10;
    nextFlag.icon?.setPosition(nextFlag.x, nextFlag.y).setVisible(true);
    nextFlag.labelText?.setPosition(nextFlag.x, nextFlag.y + 14).setVisible(true);
    setObjective(`Silent Read Tower: carry ${nextFlag.shortLabel} from the review outbox.`);
  }

  private showEditorialMethodologyChoice() {
    if (gameState.sceneProgress.editorialMethodologyComplete) {
      this.showEditorialTreatmentChoice();
      return;
    }

    const step = gameState.sceneProgress.editorialMethodologyStep ?? 0;
    const prompt = getEditorialMethodologyPrompt(step);
    setObjective(`Editorial Methodology: answer ${step + 1}/${EDITORIAL_METHODOLOGY_PROMPTS.length}.`);
    this.actionHint.setText(`METHOD ${step + 1}/${EDITORIAL_METHODOLOGY_PROMPTS.length}: choose A/B/C.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateEditorialMethodologyAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Editorial methodology shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("EDITORIAL METHODOLOGY FAILED - RETURN TO OFFICIAL METHOD");
        this.dialog.show("EDITORIAL METHODOLOGY", [
          result.message,
          "Chronology, transcription, source notes, and annotation rules keep the reader oriented."
        ], () => this.showEditorialMethodologyChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.editorialMethodologyStep = nextStep;
      if (!editorialMethodologyComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Editorial methodology check ${nextStep}/${EDITORIAL_METHODOLOGY_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("EDITORIAL METHODOLOGY", [
          result.message,
          "Continue the methodology ledger before final editorial treatment."
        ], () => this.showEditorialMethodologyChoice());
        return;
      }

      gameState.sceneProgress.editorialMethodologyComplete = 1;
      gameState.sceneProgress.editorialMethodologyStep = EDITORIAL_METHODOLOGY_PROMPTS.length;
      addDocumentPoints(8, "editorial methodology ledger filed");
      adjustReliability(6, "official editorial methodology preserved chronology and source notes");
      retroAudio.confirm();
      setLatestMessage("Editorial methodology filed: chronology, transcription, source notes, and annotation are anchored.");
      this.dialog.show("EDITORIAL METHODOLOGY", [
        result.message,
        "Official methodology ledger filed.",
        "Now resolve the final textual treatment by human consultation."
      ], () => this.showEditorialTreatmentChoice());
    });
  }

  private showEditorialTreatmentChoice() {
    if (!gameState.sceneProgress.editorialMethodologyComplete) {
      this.showEditorialMethodologyChoice();
      return;
    }
    if (gameState.sceneProgress.editorialTreatmentComplete) {
      this.showTypeflowOrderChoice();
      return;
    }

    const step = gameState.sceneProgress.editorialTreatmentStep ?? 0;
    const prompt = getEditorialTreatmentPrompt(step);
    setObjective(`Editorial Treatment: answer ${step + 1}/${EDITORIAL_TREATMENT_PROMPTS.length}.`);
    this.actionHint.setText(`EDITORIAL ${step + 1}/${EDITORIAL_TREATMENT_PROMPTS.length}: choose A/B/C.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateEditorialTreatmentAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Editorial treatment shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("EDITORIAL TREATMENT FAILED - HUMAN CONSULTATION REQUIRED");
        this.dialog.show("EDITORIAL TREATMENT", [
          result.message,
          "Readable text still has to preserve the record."
        ], () => this.showEditorialTreatmentChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.editorialTreatmentStep = nextStep;
      if (!editorialTreatmentComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Editorial treatment check ${nextStep}/${EDITORIAL_TREATMENT_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("EDITORIAL TREATMENT", [
          result.message,
          "Continue the human editorial pass before typesetting."
        ], () => this.showEditorialTreatmentChoice());
        return;
      }

      gameState.sceneProgress.editorialTreatmentComplete = 1;
      gameState.sceneProgress.editorialTreatmentStep = EDITORIAL_TREATMENT_PROMPTS.length;
      addDocumentPoints(10, "editorial treatment consultation filed");
      adjustReliability(8, "human editorial treatment preserved record meaning");
      retroAudio.confirm();
      setLatestMessage("Editorial treatment filed: textual issues resolved visibly.");
      this.dialog.show("EDITORIAL TREATMENT", [
        result.message,
        "The editor and compiler preserved the record while improving readability.",
        "Now file the manuscript-clearance order before typesetting."
      ], () => this.showTypeflowOrderChoice());
    });
  }

  private showTypeflowOrderChoice() {
    if (!gameState.sceneProgress.editorialTreatmentComplete) {
      this.showEditorialTreatmentChoice();
      return;
    }
    if (gameState.sceneProgress.typeflowOrderComplete) {
      this.showTypesettingPreparationChoice();
      return;
    }

    const step = gameState.sceneProgress.typeflowOrderStep ?? 0;
    const prompt = getTypeflowOrderPrompt(step);
    setObjective(`Typeflow Order: answer ${step + 1}/${TYPEFLOW_ORDER_PROMPTS.length}.`);
    this.actionHint.setText(`TYPEFLOW ${step + 1}/${TYPEFLOW_ORDER_PROMPTS.length}: choose A/B/C.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateTypeflowOrderAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Typeflow order shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("TYPEFLOW ORDER FAILED - CLEAR MANUSCRIPT BEFORE TYPESETTING");
        this.dialog.show("TYPEFLOW ORDER", [
          result.message,
          "Modern FRUS typeflow must keep clearance and typesetting in the right order."
        ], () => this.showTypeflowOrderChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.typeflowOrderStep = nextStep;
      if (!typeflowOrderComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Typeflow order check ${nextStep}/${TYPEFLOW_ORDER_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("TYPEFLOW ORDER", [
          result.message,
          "Continue logging the historical sequence before proofing."
        ], () => this.showTypeflowOrderChoice());
        return;
      }

      gameState.sceneProgress.typeflowOrderComplete = 1;
      gameState.sceneProgress.typeflowOrderStep = TYPEFLOW_ORDER_PROMPTS.length;
      addDocumentPoints(6, "modern manuscript-clearance typeflow filed");
      retroAudio.confirm();
      setLatestMessage("Typeflow order filed: manuscript clearance precedes typesetting.");
      this.dialog.show("TYPEFLOW ORDER", [
        result.message,
        "Modern sequence filed: clear manuscript, then prepare printer's copy.",
        "Now prepare the text and notes for typesetting."
      ], () => this.showTypesettingPreparationChoice());
    });
  }

  private showTypesettingPreparationChoice() {
    if (!gameState.sceneProgress.typeflowOrderComplete) {
      this.showTypeflowOrderChoice();
      return;
    }
    if (gameState.sceneProgress.typesettingPreparationComplete) {
      this.showTypesetterProofChoice();
      return;
    }
    const step = gameState.sceneProgress.typesettingPreparationStep ?? 0;
    const prompt = getTypesettingPreparationPrompt(step);
    setObjective(`Typesetting Preparation: answer ${step + 1}/${TYPESETTING_PREPARATION_PROMPTS.length}.`);
    this.actionHint.setText(`TYPESET PREP ${step + 1}/${TYPESETTING_PREPARATION_PROMPTS.length}: choose A/B/C.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateTypesettingPreparationAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Typesetting preparation shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("TYPESETTING PREP FAILED - PREPARE PRINTER'S COPY");
        this.dialog.show("TYPESETTING PREP", [
          result.message,
          "The printer's copy must preserve document metadata before proof comparison."
        ], () => this.showTypesettingPreparationChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.typesettingPreparationStep = nextStep;
      if (!typesettingPreparationComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Typesetting prep check ${nextStep}/${TYPESETTING_PREPARATION_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("TYPESETTING PREP", [
          result.message,
          "Continue preparing the cleared text before proofing the typeset pages."
        ], () => this.showTypesettingPreparationChoice());
        return;
      }

      gameState.sceneProgress.typesettingPreparationComplete = 1;
      gameState.sceneProgress.typesettingPreparationStep = TYPESETTING_PREPARATION_PROMPTS.length;
      addDocumentPoints(8, "printer's copy prepared for typesetting");
      retroAudio.confirm();
      setLatestMessage("Typesetting preparation complete: printer's copy and document notes are ready.");
      this.dialog.show("TYPESETTING PREP", [
        result.message,
        "Printer's copy prepared: classification, drafting, and dates are preserved in notes.",
        "Now compare the typeset pages to the originals."
      ], () => this.showTypesetterProofChoice());
    });
  }

  private showTypesetterProofChoice() {
    if (!gameState.sceneProgress.typeflowOrderComplete) {
      this.showTypeflowOrderChoice();
      return;
    }
    if (!gameState.sceneProgress.typesettingPreparationComplete) {
      this.showTypesettingPreparationChoice();
      return;
    }
    if (gameState.sceneProgress.typesetterProofComplete) {
      this.awardBuckramKeyAfterTypesetterProof();
      return;
    }
    const step = gameState.sceneProgress.typesetterProofStep ?? 0;
    const prompt = getTypesetterProofPrompt(step);
    setObjective(`Typesetter Proof: answer ${step + 1}/${TYPESETTER_PROOF_PROMPTS.length}.`);
    this.actionHint.setText(`TYPESET PROOF ${step + 1}/${TYPESETTER_PROOF_PROMPTS.length}: choose A/B/C.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateTypesetterProofAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Typesetter proof shortcut: ${option.value}`);
        this.reliability.update();
        setLatestMessage("TYPESETTER PROOF FAILED - COMPARE TO ORIGINALS");
        this.dialog.show("TYPESETTER PROOF", [
          result.message,
          "The typeset page must match the original record before binding."
        ], () => this.showTypesetterProofChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.typesetterProofStep = nextStep;
      if (!typesetterProofComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Typesetter proof check ${nextStep}/${TYPESETTER_PROOF_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("TYPESETTER PROOF", [
          result.message,
          "Continue proofing before the Buckram Key is issued."
        ], () => this.showTypesetterProofChoice());
        return;
      }

      gameState.sceneProgress.typesetterProofComplete = 1;
      gameState.sceneProgress.typesetterProofStep = TYPESETTER_PROOF_PROMPTS.length;
      addDocumentPoints(12, "typeset pages compared to originals");
      setDocumentWorkflowState("telegram_001", "proofed");
      setDocumentWorkflowState("source_note_047", "proofed");
      setDocumentWorkflowState("cross_reference_001", "proofed");
      setDocumentWorkflowState("sbu_annotation_001", "proofed");
      setDocumentWorkflowState("proof_page_412", "proofed");
      adjustReliability(10, "typesetter proof preserved document metadata");
      retroAudio.confirm();
      setLatestMessage("Typesetter proof complete: pages compared to originals.");
      this.dialog.show("TYPESETTER PROOF", [
        result.message,
        "Classification, drafting, dates, and text match the originals.",
        "Buckram Key issued for final assembly."
      ], () => this.awardBuckramKeyAfterTypesetterProof());
    });
  }

  private awardBuckramKeyAfterTypesetterProof() {
    if (!hasProcessItem("buckram_key")) {
      addProcessItem("buckram_key");
      setLatestMessage("Buckram Key opens the final publication gate.");
    }
    setObjective("Silent Read Tower: exit east with Buckram Key.");
    addSnesRewardBurst(this, this.outbox.x, this.outbox.y - 24, "buckram-key", "Buckram Key", (object) => this.track(object));
    this.actionHint.setText("DONE: typesetter proof filed. Exit east.");
    this.reliability.update();
    this.syncRoomTraversalState();
    this.dialog.show(gameState.playerProfile.displayName.toUpperCase(), [
      "Every evidence-bound flag became a physical object.",
      "Typeset pages were checked against the originals.",
      "Take the Buckram Key east to certify the ruby volume."
    ]);
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
      transitionTo(this, "EndingScene");
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
      repeat: 2
    });
  }

  private addProcessStampMark(flag: PhysicalFlag, station: Workstation) {
    const stationStampCount = this.physicalFlags.filter((candidate) => candidate.status === "stamped" && candidate.destination === station.id).length;
    const x = station.x - 14 + ((stationStampCount - 1) % 3) * 14;
    const y = station.y + 22 + Math.floor((stationStampCount - 1) / 3) * 7;
    this.add.rectangle(x, y, 12, 6, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(246);
    this.add.rectangle(x, y + 2, 10, 2, color(PALETTE.buckramHighlight)).setDepth(247);
    this.add.text(x, y - 3, "OK", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(248);
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
      setNearestInteractable(nearestStation?.id === flag.destination ? `VERIFY ${flag.shortLabel}` : null);
      this.actionHint.setText(`VERIFY ${flag.shortLabel}: press Space at ${correctStation.label}.`);
      return;
    }
    setNearestInteractable(nearestStation?.id === flag.destination ? `STAMP ${flag.shortLabel}` : null);
    this.actionHint.setText(`${verb} ${flag.shortLabel}: press Space at ${correctStation.label}.`);
  }

  private updateFlagVisibility() {
    const activeFlag = this.getActiveFlag();
    for (const flag of this.physicalFlags) {
      const inRoom = flagRoom(flag) === this.currentRoomId;
      const visible = inRoom && (flag === activeFlag || flag.status === "stamped");
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
    const roomLabels = this.currentRoomId === "E1"
      ? ["Priya", "AI Annotation Review terminal", "StateChat outbox", "Editor Desk", "Red Pencil"]
      : ["Manuscript page", "Typeset proof", "Review outbox", "Proof Lens", "OpenNet", "ClassNet", "Referral Tray", "Proof Table"];
    setVisibleEntities([
      ...roomLabels,
      "Review Folder",
      ...this.physicalFlags
        .filter((flag) => flag.status !== "stamped" && flagRoom(flag) === this.currentRoomId)
        .map((flag) => flag.label)
    ]);
  }

  private getActiveFlag() {
    return this.physicalFlags.find((flag) => flag.status !== "stamped") ?? null;
  }

  private verbFor(flag: PhysicalFlag): "CARRY" | "ROUTE" | "VERIFY" | "STAMP" {
    if (flag.status === "waiting") return "CARRY";
    if (flag.status === "carried") return "ROUTE";
    if (flag.status === "routed") return "VERIFY";
    return "STAMP";
  }

  private stationFor(id: WorkstationId) {
    const station = WORKSTATIONS.find((candidate) => candidate.id === id);
    if (!station) throw new Error(`Unknown workstation: ${id}`);
    return station;
  }

  private findNearestWorkstation(maxDistance = 24) {
    const nearest = WORKSTATIONS
      .filter((station) => stationRoom(station.id) === this.currentRoomId)
      .map((station) => ({
        station,
        distance: Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, station.x, station.y)
      })).sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= maxDistance ? nearest.station : null;
  }

  private isNear(x: number, y: number, radius: number) {
    return Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, x, y) <= radius;
  }
}
