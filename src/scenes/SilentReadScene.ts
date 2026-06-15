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
  setVisibleEntities
} from "../game/state";
import type { ChoiceOption } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { Player } from "../entities/Player";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, canAutoApplyProposal, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addProofingTable, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesRoomLayer } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";

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
  private roomTitleText!: Phaser.GameObjects.Text;
  private currentRoomId: ProofRoomId = "E1";
  private visitedRoomIds = new Set<ProofRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private mapCells = new Map<ProofRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ProofRoomId, Phaser.GameObjects.Text>();
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private physicalFlags: PhysicalFlag[] = [];
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
    drawRoomFrame(this, "EDITOR / READ", PALETTE.deepRuby);
    this.drawProofMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902);

    this.player = new Player(this, 128, 202);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811);
    this.enterRoom("E1", { x: 128, y: 202 }, false);
    this.dialog.show("PRIYA", [
      "Run the AI annotation review tool first.",
      "It returns a JSON plan, not a final decision.",
      "The Red Pencil opens the proof tower. Then every evidence flag moves by hand."
    ], () => this.startPhysicalVerificationLoop());
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
      this.player.update(delta, false);
      return;
    }
    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.choice.active) {
      this.choice.updateInput();
      this.player.update(delta, false);
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show("PAUSED", "The page waits.");
      return;
    }
    this.player.update(delta, true, { bounds: PROOF_PLAY_BOUNDS });
    this.updatePhysicalVerification();
    if (input.aJustPressed) {
      this.handlePhysicalAction();
    }
    if (this.checkRoomExit()) return;
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
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
    addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "proof", track: (object) => this.track(object) });
    this.drawRoomDoors();
    if (room.id === "E1") this.renderEditorsLabyrinth();
    else this.renderSilentReadTower();
    this.syncVisibleEntities();
  }

  private drawRoomDoors() {
    const room = PROOF_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      this.track(this.add.rectangle(11, 124, 9, 36, color(PALETTE.black)).setDepth(65));
      this.track(this.add.rectangle(16, 124, 3, 26, color(PALETTE.buckramHighlight)).setDepth(66));
    }
    if (room.exits.east) {
      const open = this.currentRoomId === "E1" ? hasProcessItem("red_pencil") : hasProcessItem("buckram_key");
      const accent = open ? PALETTE.goldStamp : PALETTE.classNetRed;
      this.track(this.add.rectangle(245, 124, 9, 36, color(PALETTE.black)).setDepth(65));
      this.track(this.add.rectangle(240, 124, 3, 26, color(accent)).setDepth(66));
      if (!open) this.track(this.add.rectangle(242, 124, 2, 30, color(PALETTE.classNetRed)).setDepth(67));
    }
  }

  private renderEditorsLabyrinth() {
    this.track(addTerminalPanel(this, 128, 48, [
      "AI ANNO REVIEW",
      "SCHEMA: OK",
      `MECH AUTO: ${canAutoApplyProposal("mechanical") ? "YES" : "NO"}`,
      "EVIDENCE: COMMENT",
      "HUMAN TRIAGE"
    ]));
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
    this.track(this.add.image(128, 150, "red-pencil").setDepth(166));
    this.track(addTinySparkle(this, 128, 138, PALETTE.buckramHighlight));
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
    this.track(this.add.image(128, 82, "proof-lens").setDepth(166));
    this.track(addTinySparkle(this, 178, 87, PALETTE.classNetRed));
    this.track(addTerminalPanel(this, 128, 48, [
      "SILENT READ",
      "EVIDENCE FLAGS",
      "OPEN / CLASS / REF",
      "PROOF DATE",
      "HUMAN STAMPS"
    ], PALETTE.goldStamp));
    addProofingTable(this, 128, 172, (object) => this.track(object));
    this.drawWorkstations();
    this.drawOutbox("REVIEW OUTBOX");
    this.drawToolbeltIcons();
    if (hasProcessItem("buckram_key")) {
      this.track(this.add.image(128, 126, "buckram-key").setDepth(250));
      setObjective("Silent Read Tower: exit east with Buckram Key.");
    } else {
      setObjective("Silent Read Tower: carry next evidence flag.");
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

  private positionActiveWaitingFlagForRoom() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag || flagRoom(activeFlag) !== this.currentRoomId || activeFlag.status !== "waiting") return;
    activeFlag.x = this.outbox.x;
    activeFlag.y = this.outbox.y - 10;
    activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y);
    activeFlag.labelText?.setPosition(activeFlag.x, activeFlag.y + 14);
  }

  private updatePhysicalVerification() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag) {
      this.actionHint.setText("DONE: exit east with the Buckram Key.");
      setNearestInteractable(null);
      this.syncPhysicalState("DONE", null);
      return;
    }

    if (flagRoom(activeFlag) !== this.currentRoomId) {
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
      this.showRedPencilBracketChoice("source_note_047");
      return false;
    }
    if (flag.id === "proof-date") {
      awardProcessStamp("proof");
      setDocumentWorkflowState("proof_page_412", "proofed");
      addProcessItem("proof_lens");
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
      const violation = applyStandardsViolation("undisclosed_deletion", "Red Pencil excision skipped the bracketed insertion.");
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
      setDocumentWorkflowState("telegram_001", "proofed");
      setDocumentWorkflowState("source_note_047", "proofed");
      setDocumentWorkflowState("cross_reference_001", "proofed");
      setDocumentWorkflowState("sbu_annotation_001", "proofed");
      addProcessItem("buckram_key");
      setObjective("Silent Read Tower: exit east with Buckram Key.");
      setLatestMessage("Buckram Key opens the final publication gate.");
      this.track(this.add.image(this.outbox.x, this.outbox.y - 24, "buckram-key").setDepth(250));
      this.actionHint.setText("DONE: all flags verified. Exit east.");
      this.reliability.update();
      this.dialog.show(gameState.playerProfile.displayName.toUpperCase(), [
        "Every evidence-bound flag became a physical object.",
        "Mechanical fixes proposed; human workstations verified.",
        "Take the Buckram Key east to certify the ruby volume."
      ]);
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
