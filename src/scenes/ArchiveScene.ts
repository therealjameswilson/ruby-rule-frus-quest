import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { ProcessItemId, RoomType } from "../game/constants";
import {
  addInventoryItem,
  addDocumentPoints,
  addProcessItem,
  addVolumeFragment,
  advanceDocumentWorkflow,
  awardProcessStamp,
  getAvailableWorkflowTools,
  gameState,
  hasProcessItem,
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
import { Manuscript } from "../entities/items/Manuscript";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { Player } from "../entities/Player";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import type { BureaucraticWallBehavior } from "../entities/BureaucraticWall";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestWorkflowInteraction } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesRoomLayer, addSnesWorldMap } from "../systems/snesPixelArt";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type SourceNoteStatus = "inactive" | "carried" | "routed" | "verified" | "stamped";
type Direction = "north" | "south" | "west" | "east";
type ArchiveRoomId = "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3";
type ArchiveEnemyType = "NO REPO" | "FIREWALL" | "PENDING" | "WAIT" | "HOLD" | "AMBIGUOUS" | "DANN-E QUEUE";

interface ArchiveRoom {
  id: ArchiveRoomId;
  title: string;
  grid: { x: number; y: number };
  exits: Partial<Record<Direction, ArchiveRoomId>>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, ProcessItemId>>;
  roomType: RoomType;
}

interface ArchiveEnemyDefinition {
  id: string;
  type: ArchiveEnemyType;
  label: string;
  roomId: ArchiveRoomId;
  x: number;
  y: number;
  behavior: BureaucraticWallBehavior;
  behaviorText: string;
  defeatMethod: string;
  accent: string;
  radius?: number;
}

const PLAY_BOUNDS = { left: 8, right: GAME_WIDTH - 8, top: 40, bottom: GAME_HEIGHT - 20 };
const DOOR_X_MIN = 112;
const DOOR_X_MAX = 144;
const DOOR_Y_MIN = 104;
const DOOR_Y_MAX = 136;

const ARCHIVE_ROOMS: Record<ArchiveRoomId, ArchiveRoom> = {
  A1: {
    id: "A1",
    title: "SOURCE ROOM",
    grid: { x: 0, y: 0 },
    exits: { east: "A2", south: "B1" },
    roomType: "normal"
  },
  A2: {
    id: "A2",
    title: "OPENNET ANNEX",
    grid: { x: 1, y: 0 },
    exits: { west: "A1", east: "A3", south: "B2" },
    lockedExits: { south: "CLASSNET SEAL" },
    requiredItems: { south: "clearance_token" },
    roomType: "puzzle"
  },
  A3: {
    id: "A3",
    title: "HINT ALCOVE",
    grid: { x: 2, y: 0 },
    exits: { west: "A2", south: "B3" },
    roomType: "hint"
  },
  B1: {
    id: "B1",
    title: "STACKS",
    grid: { x: 0, y: 1 },
    exits: { north: "A1", east: "B2", south: "C1" },
    lockedExits: { east: "REFERRAL GATE" },
    requiredItems: { east: "concurrence_slip" },
    roomType: "puzzle"
  },
  B2: {
    id: "B2",
    title: "PROOF CHAMBER",
    grid: { x: 1, y: 1 },
    exits: { north: "A2", west: "B1", east: "B3", south: "C2" },
    lockedExits: { south: "REVIEW FOLDER GATE" },
    requiredItems: { south: "review_folder" },
    roomType: "normal"
  },
  B3: {
    id: "B3",
    title: "GREEN RED HINT",
    grid: { x: 2, y: 1 },
    exits: { north: "A3", west: "B2", south: "C3" },
    roomType: "hint"
  },
  C1: {
    id: "C1",
    title: "CRACKED WALL",
    grid: { x: 0, y: 2 },
    exits: { north: "B1", east: "C2", south: "D1" },
    roomType: "puzzle"
  },
  C2: {
    id: "C2",
    title: "DATE MISMATCH",
    grid: { x: 1, y: 2 },
    exits: { north: "B2", west: "C1", east: "C3", south: "D2" },
    lockedExits: { east: "SILENT-READ LENS MARK" },
    requiredItems: { east: "proof_lens" },
    roomType: "puzzle"
  },
  C3: {
    id: "C3",
    title: "HIDDEN SOURCE CACHE",
    grid: { x: 2, y: 2 },
    exits: { north: "B3", west: "C2", south: "D3" },
    roomType: "secret"
  },
  D1: {
    id: "D1",
    title: "STAMP ROOM",
    grid: { x: 0, y: 3 },
    exits: { north: "C1", east: "D2" },
    roomType: "reward"
  },
  D2: {
    id: "D2",
    title: "HIDDEN WELL",
    grid: { x: 1, y: 3 },
    exits: { north: "C2", west: "D1", east: "D3" },
    lockedExits: { east: "BUCKRAM LOCK" },
    requiredItems: { east: "buckram_key" },
    roomType: "secret"
  },
  D3: {
    id: "D3",
    title: "QUEUE BOSS GATE",
    grid: { x: 2, y: 3 },
    exits: { north: "C3", west: "D2" },
    roomType: "boss"
  }
};

const EXIT_SPAWNS: Record<Direction, { x: number; y: number }> = {
  north: { x: 128, y: 208 },
  south: { x: 128, y: 52 },
  west: { x: 232, y: 120 },
  east: { x: 24, y: 120 }
};

const ARCHIVE_ENEMIES: ArchiveEnemyDefinition[] = [
  {
    id: "repo-wall",
    type: "NO REPO",
    label: "NO REPO",
    roomId: "A1",
    x: 102,
    y: 149,
    behavior: "slow-chase",
    behaviorText: "moves slowly toward player",
    defeatMethod: "Use citation stamp after checking source table",
    accent: PALETTE.goldStamp
  },
  {
    id: "firewall-door",
    type: "FIREWALL",
    label: "FIREWALL",
    roomId: "A2",
    x: 128,
    y: 194,
    behavior: "horizontal-patrol",
    behaviorText: "patrols the terminal door horizontally",
    defeatMethod: "Use correct OpenNet/ClassNet routing",
    accent: PALETTE.openNetGreen
  },
  {
    id: "hold-door",
    type: "HOLD",
    label: "HOLD",
    roomId: "C1",
    x: 128,
    y: 164,
    behavior: "block",
    behaviorText: "blocks a cracked source-note doorway",
    defeatMethod: "Use citation stamp on cracked source-note wall",
    accent: PALETTE.buckramHighlight
  },
  {
    id: "pending-manifest",
    type: "PENDING",
    label: "PENDING",
    roomId: "B1",
    x: 190,
    y: 162,
    behavior: "wander",
    behaviorText: "wanders randomly",
    defeatMethod: "Deliver manifest to referral tray",
    accent: PALETTE.archiveAmber
  },
  {
    id: "wait-timer",
    type: "WAIT",
    label: "WAIT",
    roomId: "B1",
    x: 68,
    y: 162,
    behavior: "freeze",
    behaviorText: "freezes exits temporarily",
    defeatMethod: "Resolve agency response timer",
    accent: PALETTE.terminalCyan
  },
  {
    id: "ambiguous-flag",
    type: "AMBIGUOUS",
    label: "AMBIG.",
    roomId: "B2",
    x: 94,
    y: 164,
    behavior: "splitter",
    behaviorText: "splits into two flags",
    defeatMethod: "Bring to correct human specialist",
    accent: PALETTE.goldStamp
  },
  {
    id: "danne-queue",
    type: "DANN-E QUEUE",
    label: "DANN-E\nQUEUE",
    roomId: "B2",
    x: 178,
    y: 166,
    behavior: "push",
    behaviorText: "pushes player backward",
    defeatMethod: "Use human decision at Golden Rule gate",
    accent: PALETTE.classNetRed,
    radius: 26
  }
];

export class ArchiveScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private roomTitleText!: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];
  private collected = new Set<string>();
  private clearedWallIds = new Set<string>();
  private bureaucraticWalls: BureaucraticWall[] = [];
  private wallContactCooldown = 0;
  private sourceNoteStatus: SourceNoteStatus = "inactive";
  private sourceNoteIcon?: Phaser.GameObjects.Image;
  private sourceNoteLabel?: Phaser.GameObjects.Text;
  private readonly researchTable = { x: 128, y: 116, label: "Research Table" };
  private currentRoomId: ArchiveRoomId = "A1";
  private visitedRoomIds = new Set<ArchiveRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private ambiguousFlagObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private roomSolids: Phaser.Geom.Rectangle[] = [];
  private activeEnemyDefs = new Map<string, ArchiveEnemyDefinition>();
  private activeEnemyWalls = new Map<string, BureaucraticWall>();
  private mapCells = new Map<ArchiveRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ArchiveRoomId, Phaser.GameObjects.Text>();
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private revealedSecretIds = new Set<ArchiveRoomId>();
  private networkRoutingResolved = false;
  private referralManifestDelivered = false;
  private agencyTimerResolved = false;
  private ambiguousSplit = false;
  private specialistDecisionMade = false;
  private goldenRuleDecisionMade = false;

  constructor() {
    super("ArchiveScene");
  }

  create() {
    setSceneState("ArchiveScene", "explore", "Archive Cavern: explore room A1.");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.archiveAmber);
    drawTiledFloor(this, "archive-tiles");
    drawRoomFrame(this, "ARCHIVE CAVERN");
    this.drawVisitedMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902);

    this.dialog = new DialogBox(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.hintText = this.add.text(128, 211, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(810);
    this.player = new Player(this, 128, 184);

    this.enterRoom("A1", { x: 128, y: 184 }, false);
    this.dialog.show("ELENA", [
      "A compiler reads the trail.",
      "Collect the pieces. If bureaucracy turns to stone, name the record and keep moving.",
      "Use the edge gates to map each room, but verify Source Note 47 here."
    ]);
  }

  update(_: number, delta: number) {
    const keys = this.player.inputKeys;
    if (Phaser.Input.Keyboard.JustDown(keys.f)) this.scale.toggleFullscreen();
    if (Phaser.Input.Keyboard.JustDown(keys.m)) this.inventory.toggle();
    if (Phaser.Input.Keyboard.JustDown(keys.n)) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (Phaser.Input.Keyboard.JustDown(keys.r)) this.reliability.toggleDetails();
    if (Phaser.Input.Keyboard.JustDown(keys.e)) activateRoleAbility(this);

    if (this.roomTransitionLocked) {
      this.player.update(delta, false);
      return;
    }
    if (this.dialog.active) {
      if (Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.inventory.active || this.reliability.active) {
      this.player.update(delta, false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The archive waits.");
      return;
    }

    this.player.update(delta, true, { bounds: PLAY_BOUNDS, solids: this.roomSolids });
    if (this.checkRoomExit()) return;

    if (this.sourceNoteStatus !== "inactive" && this.sourceNoteStatus !== "stamped") {
      this.updateSourceNoteVerification();
      this.reliability.update();
      if (Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) {
        this.handleSourceNoteAction();
      }
      this.objectiveText.setText(gameState.objective);
      return;
    }
    this.updateBureaucraticWalls(delta);
    this.reliability.update();
    const workflowInteraction = nearestWorkflowInteraction(this.player.position, this.interactables, getAvailableWorkflowTools());
    const nearest = workflowInteraction.interactable;
    setNearestInteractable(nearest?.label ?? null);
    const toolCue = workflowInteraction.tool ? `${workflowInteraction.tool.shortLabel}: ` : "";
    this.hintText.setText(nearest ? `${toolCue}${nearest.label.toUpperCase()}` : this.exitHint());
    if (Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) {
      if (this.tryEnemyAction(nearest ?? undefined)) return;
      if (nearest) nearest.onInteract();
    }
    this.objectiveText.setText(gameState.objective);
  }

  private enterRoom(roomId: ArchiveRoomId, spawn: { x: number; y: number }, wipe = true, direction: Direction = "east") {
    const applyRoom = () => {
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      this.player.setPosition(spawn.x, spawn.y);
      this.syncRoomTraversalState();
      this.updateVisitedMinimap();
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
      label: ARCHIVE_ROOMS[roomId].title.toUpperCase(),
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
    this.ambiguousFlagObjects = [];
    this.roomSolids = [];
    this.interactables = [];
    this.bureaucraticWalls = [];
    this.activeEnemyDefs.clear();
    this.activeEnemyWalls.clear();
    if (this.sourceNoteStatus !== "carried") {
      if (this.sourceNoteIcon?.active) this.sourceNoteIcon.destroy();
      if (this.sourceNoteLabel?.active) this.sourceNoteLabel.destroy();
      this.sourceNoteIcon = undefined;
      this.sourceNoteLabel = undefined;
    }
  }

  private renderCurrentRoom() {
    const room = ARCHIVE_ROOMS[this.currentRoomId];
    this.cameras.main.setBackgroundColor(this.currentRoomId === "A2" || this.currentRoomId === "B2" ? PALETTE.shadowNavy : PALETTE.archiveAmber);
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    this.drawRoomExits(room);
    addSnesRoomLayer(this, {
      roomId: room.id,
      roomType: room.roomType,
      theme: this.currentRoomId === "A2" ? "network" : this.currentRoomId === "B2" ? "proof" : "archive",
      track: (object) => this.track(object)
    });
    if (room.id === "A1") this.renderSourceRoom();
    else if (room.id === "A2") this.renderOpenNetAnnex();
    else if (room.id === "A3" || room.id === "B3") this.renderHintRoom(room);
    else if (room.id === "B1") this.renderStacksRoom();
    else if (room.id === "B2") this.renderProofChamber();
    else if (room.id === "C1" || room.id === "C2") this.renderPuzzleRoom(room);
    else if (room.id === "C3" || room.id === "D2") this.renderSecretRoom(room);
    else if (room.id === "D1") this.renderRewardRoom();
    else this.renderBossGateRoom();
    this.refreshRoomObjective();
    this.syncWallState();
  }

  private renderSourceRoom() {
    this.drawBookcase(24, 82, 32, 58);
    this.drawBookcase(232, 82, 32, 58);
    this.drawBookcase(24, 158, 32, 52);
    this.drawBookcase(232, 158, 32, 52);
    addSnesWorldMap(this, 128, 74, "ARCHIVE MAP", "archive-cavern-map", (object) => this.track(object));
    this.drawDocumentStack(74, 96, true);
    this.drawResearchTable();
    this.drawRubyVolumeStack(178, 171, 4);
    this.drawSparkle(128, 90, PALETTE.terminalCyan);
    const elena = new HistorianNPC(this, "elena", 44, 58);
    this.roomCleanups.push(() => elena.destroy());
    this.track(addTerminalPanel(this, 202, 66, [
      "STATECHAT",
      "FLAG:",
      "SOURCE NOTE 47",
      "REPOSITORY ?",
      "COMPILER NEEDED"
    ]));

    this.addDocumentInteractables();
    this.addRoomEnemy("repo-wall");
    if (this.sourceNoteStatus === "routed" || this.sourceNoteStatus === "verified" || this.sourceNoteStatus === "stamped") {
      this.drawRoutedSourceNote();
    }
  }

  private renderOpenNetAnnex() {
    this.drawBookcase(28, 74, 34, 44);
    this.drawBookcase(228, 170, 34, 54);
    this.drawDesk(74, 148, "OPEN");
    this.track(addTerminalPanel(this, 184, 74, [
      "OPENNET",
      "PUBLIC STATUS",
      "CHECK LINKS",
      "NO FINAL SIGN",
      "HUMAN REVIEW"
    ], PALETTE.openNetGreen));
    this.track(this.add.image(72, 105, "opennet-terminal").setDepth(108));
    this.addSolid(48, 88, 48, 40);
    this.addSolid(144, 40, 88, 72);
    this.addSolid(56, 136, 48, 32);
    if (!this.clearedWallIds.has("firewall-door")) {
      this.addRoomEnemy("firewall-door");
    }
    this.interactables.push({
      id: "opennet-annex-terminal",
      label: "OpenNet terminal",
      x: 72,
      y: 105,
      radius: 34,
      kind: "terminal",
      onInteract: () => this.resolveNetworkRouting()
    });
  }

  private renderStacksRoom() {
    for (let x = 54; x <= 202; x += 37) {
      if (x === 128) continue;
      this.drawBookcase(x, 86, 26, 52);
    }
    this.drawDocumentStack(62, 159, false);
    this.drawDocumentStack(124, 166, true);
    this.drawDocumentStack(188, 159, false);
    this.drawDesk(128, 138, "TRAY");
    this.track(this.add.image(128, 119, "referral-manifest").setDepth(140));
    this.addSolid(96, 128, 64, 28);
    this.addRoomEnemy("pending-manifest");
    this.addRoomEnemy("wait-timer");
    this.interactables.push({
      id: "stacks-manifest",
      label: "Referral tray",
      x: 128,
      y: 122,
      radius: 34,
      kind: "document",
      onInteract: () => this.deliverReferralManifest()
    });
  }

  private renderProofChamber() {
    this.drawDesk(74, 128, "PROOF");
    this.drawDesk(182, 128, "CLASS");
    this.track(this.add.image(74, 106, "proof-page").setDepth(130));
    this.track(this.add.image(182, 106, "classnet-terminal").setDepth(130));
    this.track(addTerminalPanel(this, 128, 68, [
      "B2 CHAMBER",
      "NO SCROLLING",
      "ONE ROOM",
      "EDGE GATES",
      "HARD CUT"
    ], PALETTE.classNetRed));
    this.drawRubyVolumeStack(128, 173, 3);
    this.drawGoldenRuleGate();
    this.addRoomEnemy("ambiguous-flag");
    this.addRoomEnemy("danne-queue");
    if (this.ambiguousSplit && !this.clearedWallIds.has("ambiguous-flag")) this.drawAmbiguousFlags();
    this.addSolid(34, 104, 80, 36);
    this.addSolid(142, 104, 80, 36);
    this.addSolid(84, 40, 24, 68);
    this.addSolid(148, 40, 24, 68);
    this.interactables.push({
      id: "proof-chamber-table",
      label: "Human specialist",
      x: 74,
      y: 118,
      radius: 34,
      kind: "document",
      onInteract: () => this.resolveAmbiguousWithSpecialist()
    });
    this.interactables.push({
      id: "golden-rule-gate",
      label: "Golden Rule gate",
      x: 128,
      y: 199,
      radius: 34,
      kind: "door",
      onInteract: () => this.useGoldenRuleGate()
    });
  }

  private renderHintRoom(room: ArchiveRoom) {
    this.drawBookcase(48, 78, 42, 54);
    this.drawBookcase(208, 78, 42, 54);
    this.drawWallMap(128, 58, room.id);
    const lines = room.id === "A3"
      ? ["THE BOX WITHOUT", "A NUMBER HOLDS", "NO PROVENANCE."]
      : ["GREEN IS OPEN.", "RED HAS TEETH.", "READ THE GATE."];
    this.track(addTerminalPanel(this, 128, 112, ["ARCHIVE COLLEAGUE", ...lines], PALETTE.goldStamp));
    this.drawDocumentStack(88, 166, true);
    this.drawRubyVolumeStack(178, 166, 2);
    this.interactables.push({
      id: `${room.id}-suspicious-shelf`,
      label: room.id === "A3" ? "Suspicious shelf" : "Cryptic hint shelf",
      x: room.id === "A3" ? 48 : 208,
      y: 78,
      radius: 34,
      kind: "document",
      onInteract: () => {
        if (room.id === "A3") this.revealSecretRoom("C3", "A shelf slides aside. Hidden Source Cache revealed.");
        else this.dialog.show("MARCUS", ["GREEN IS OPEN.", "RED HAS TEETH."]);
      }
    });
  }

  private renderPuzzleRoom(room: ArchiveRoom) {
    this.drawDesk(128, 128, room.id === "C1" ? "CRACK" : "DATE");
    this.drawBookcase(38, 90, 30, 56);
    this.drawBookcase(218, 90, 30, 56);
    if (room.id === "C1") {
      this.track(this.add.rectangle(128, 169, 54, 28, color(PALETTE.stoneDark)).setStrokeStyle(2, color(PALETTE.buckramHighlight)).setDepth(82));
      this.track(this.add.rectangle(124, 162, 2, 24, color(PALETTE.black)).setAngle(18).setDepth(83));
      this.track(this.add.text(128, 159, "CRACKED\nSOURCE WALL", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        align: "center"
      }).setOrigin(0.5).setDepth(84));
      this.addRoomEnemy("hold-door");
      this.interactables.push({
        id: "cracked-source-wall",
        label: "Cracked source-note wall",
        x: 128,
        y: 164,
        radius: 34,
        kind: "door",
        onInteract: () => {
          if (!hasProcessItem("citation_stamp")) {
            this.dialog.show("CRACKED WALL", "A citation stamp fits the crack, but you do not carry one yet.");
            setLatestMessage("Citation Stamp required.");
            return;
          }
          this.revealSecretRoom("D2", "Citation stamp opens a hidden reliability well.");
          this.clearEnemyById("hold-door", "HOLD cleared by citation stamp on the cracked wall.");
        }
      });
      return;
    }

    this.track(this.add.image(118, 126, "proof-page").setDepth(86));
    this.track(this.add.text(148, 118, "1947\n1974", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.classNetRed,
      align: "center",
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(87));
    this.interactables.push({
      id: "mismatched-date-tile",
      label: "Mismatched date tile",
      x: 148,
      y: 126,
      radius: 34,
      kind: "document",
      onInteract: () => {
        if (!hasProcessItem("proof_lens")) {
          this.dialog.show("DATE TILE", ["A tiny discrepancy glints.", "The proof lens would reveal the hidden seam."]);
          setLatestMessage("Proof Lens required.");
          return;
        }
        this.revealSecretRoom("D2", "Proof Lens reveals the Hidden Reliability Well.");
      }
    });
  }

  private renderSecretRoom(room: ArchiveRoom) {
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.drawRubyVolumeStack(78, 130, 4);
    this.drawDocumentStack(170, 118, true);
    this.drawSparkle(128, 92, PALETTE.goldStamp);
    this.track(addTerminalPanel(this, 128, 62, [
      room.id === "C3" ? "HIDDEN CACHE" : "RELIABILITY WELL",
      "NOT ON FIRST MAP",
      "FOUND BY READING",
      "NOT BY GUESSING"
    ], PALETTE.goldStamp));
    this.interactables.push({
      id: `${room.id}-secret-reward`,
      label: room.id === "C3" ? "Lore card" : "Reliability refill",
      x: 128,
      y: 132,
      radius: 42,
      kind: "document",
      onInteract: () => {
        const key = `secret-${room.id}`;
        if (this.collected.has(key)) {
          this.dialog.show("SECRET", "This hidden room has already yielded its clue.");
          return;
        }
        this.collected.add(key);
        addDocumentPoints(room.id === "C3" ? 10 : 6, room.id === "C3" ? "hidden source cache" : "hidden reliability well");
        if (room.id === "D2") adjustReliability(8, "hidden reliability refill");
        else addVolumeFragment("Hidden Cache Fragment");
        retroAudio.confirm();
        this.dialog.show("SECRET", room.id === "C3" ? "A cover fragment was filed where only a careful reader would look." : "The well restores confidence because the check was physical.");
      }
    });
  }

  private renderRewardRoom() {
    this.drawRubyVolumeStack(128, 116, 5);
    this.track(this.add.image(128, 88, "citation-stamp").setDepth(110));
    this.track(this.add.rectangle(128, 150, 100, 26, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(111));
    this.track(this.add.text(128, 142, "STAMP REWARD ROOM\nSOURCE STAMP: HUMAN VERIFIED", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5).setDepth(112));
  }

  private renderBossGateRoom() {
    this.drawGoldenRuleGate();
    this.track(addTerminalPanel(this, 128, 68, [
      "DANN-E QUEUE",
      "BOSS GATE",
      "STATECHAT CHECKLIST",
      "HUMAN OPENS"
    ], PALETTE.classNetRed));
    this.addRoomEnemy("danne-queue");
    this.interactables.push({
      id: "boss-golden-rule-gate",
      label: "Golden Rule boss gate",
      x: 128,
      y: 199,
      radius: 34,
      kind: "door",
      onInteract: () => this.useGoldenRuleGate()
    });
  }

  private revealSecretRoom(roomId: ArchiveRoomId, message: string) {
    if (!ARCHIVE_ROOMS[roomId] || ARCHIVE_ROOMS[roomId].roomType !== "secret") return;
    this.revealedSecretIds.add(roomId);
    addDocumentPoints(3, `${roomId} secret revealed`);
    setLatestMessage(message);
    retroAudio.confirm();
    this.dialog.show("SECRET", message);
    this.updateVisitedMinimap();
    this.syncRoomTraversalState();
  }

  private drawGoldenRuleGate() {
    this.track(this.add.rectangle(128, 202, 72, 18, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(155));
    this.track(this.add.rectangle(101, 202, 8, 14, color(PALETTE.buckramRed)).setDepth(156));
    this.track(this.add.rectangle(155, 202, 8, 14, color(PALETTE.buckramRed)).setDepth(156));
    this.track(this.add.rectangle(128, 198, 38, 3, color(PALETTE.goldStamp)).setDepth(157));
    this.track(this.add.text(128, 200, "GOLDEN RULE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(158));
  }

  private drawAmbiguousFlags() {
    this.drawSplitFlag(83, 136, "A", PALETTE.terminalCyan);
    this.drawSplitFlag(105, 136, "B", PALETTE.goldStamp);
  }

  private drawSplitFlag(x: number, y: number, label: string, accent: string) {
    const flagParts = [
      this.track(this.add.rectangle(x, y, 15, 18, color(PALETTE.black)).setStrokeStyle(1, color(accent)).setDepth(170)),
      this.track(this.add.rectangle(x - 3, y - 2, 2, 20, color(PALETTE.creamPaper)).setDepth(171)),
      this.track(this.add.rectangle(x + 2, y - 5, 10, 8, color(accent)).setDepth(172)),
      this.track(this.add.rectangle(x + 4, y + 4, 8, 2, color(PALETTE.creamPaper)).setDepth(172)),
      this.track(this.add.text(x + 2, y - 4, label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.black
      }).setOrigin(0.5, 0).setDepth(173))
    ];
    this.ambiguousFlagObjects.push(...flagParts);
  }

  private drawResearchTable() {
    this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y, 68, 24, color(PALETTE.black)).setDepth(70));
    this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y - 1, 64, 20, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(71));
    this.track(this.add.image(this.researchTable.x - 20, this.researchTable.y - 3, "source-note").setDepth(72));
    this.track(this.add.image(this.researchTable.x + 17, this.researchTable.y - 4, "citation-stamp").setDepth(72));
    this.track(this.add.text(this.researchTable.x, this.researchTable.y + 14, "RESEARCH TABLE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(73));
    this.addSolid(96, 104, 64, 24);
  }

  private addDocumentInteractables() {
    const documents = [
      { id: "telegram", label: "Telegram", x: 68, y: 124 },
      { id: "source-note", label: "Source Note 47", x: 128, y: 164 },
      { id: "cross-reference", label: "Cross-Ref", x: 188, y: 124 }
    ];
    for (const documentData of documents) {
      if (this.collected.has(documentData.id)) continue;
      const document = new Manuscript(this, documentData.id, documentData.label, documentData.x, documentData.y);
      this.roomCleanups.push(() => {
        if (document.container.active) document.container.destroy();
      });
      this.interactables.push({
        id: document.id,
        label: document.label,
        x: document.x,
        y: document.y,
        kind: "document",
        onInteract: () => this.collect(document)
      });
    }
  }

  private addRoomEnemy(enemyId: string) {
    const definition = ARCHIVE_ENEMIES.find((enemy) => enemy.id === enemyId);
    if (!definition || this.clearedWallIds.has(definition.id)) return;
    const wall = new BureaucraticWall(this, definition.id, definition.label, definition.x, definition.y, {
      behavior: definition.behavior,
      accent: definition.accent
    });
    this.bureaucraticWalls.push(wall);
    this.activeEnemyDefs.set(wall.id, definition);
    this.activeEnemyWalls.set(wall.id, wall);
    this.roomCleanups.push(() => wall.destroy());
    this.interactables.push({
      id: wall.id,
      label: `${definition.type}: ${definition.defeatMethod}`,
      x: wall.x,
      y: wall.y,
      radius: definition.radius ?? 30,
      kind: "enemy",
      onInteract: () => this.handleEnemyInteract(definition, wall)
    });
  }

  private collect(document: Manuscript) {
    if (this.collected.has(document.id)) return;
    this.collected.add(document.id);
    document.collect();
    retroAudio.confirm();
    addInventoryItem(document.label);
    setHeldItem(document.id === "source-note" ? "Source Note 47" : document.label);
    addDocumentPoints(2, `${document.label} collected`);
    this.advanceCollectedDocument(document.id);
    this.interactables = this.interactables.filter((item) => item.id !== document.id);
    if (document.id === "source-note") {
      this.startSourceNoteVerification();
      return;
    }
    if (this.collected.size < 3) {
      setObjective(`Collect document tiles: ${this.collected.size}/3.`);
      this.dialog.show("ARCHIVE", `${document.label} filed.`);
      return;
    }
    this.finishArchiveIfReady();
  }

  private handleEnemyInteract(definition: ArchiveEnemyDefinition, wall: BureaucraticWall) {
    if (wall.isCleared) return;
    wall.markHit();

    if (definition.type === "NO REPO") {
      if (this.sourceNoteStatus === "stamped") {
        this.clearEnemy(definition, wall, "NO REPO cleared with citation stamp after source-table verification.");
        return;
      }
      retroAudio.warning();
      this.dialog.show("NO REPO", [
        "This wall wants a real repository trail.",
        "Check Source Note 47 at the research table first.",
        "Only the citation stamp can crack it."
      ]);
      setLatestMessage("NO REPO needs source-table verification.");
      return;
    }

    if (definition.type === "FIREWALL") {
      if (this.networkRoutingResolved) {
        this.clearEnemy(definition, wall, "FIREWALL cleared by correct OpenNet/ClassNet routing.");
        return;
      }
      retroAudio.warning();
      this.dialog.show("FIREWALL", [
        "Wrong network, wrong door.",
        "Use the OpenNet terminal to route public-status work.",
        "ClassNet remains for classified equities."
      ]);
      setLatestMessage("WRONG NETWORK");
      return;
    }

    if (definition.type === "PENDING") {
      if (this.referralManifestDelivered) {
        this.clearEnemy(definition, wall, "PENDING cleared after referral manifest delivery.");
        return;
      }
      retroAudio.warning();
      this.dialog.show("PENDING", [
        "Pending does not fall to a guess.",
        "Carry the manifest to the referral tray.",
        "A routed slip moves the process."
      ]);
      setLatestMessage("PENDING needs referral manifest delivery.");
      return;
    }

    if (definition.type === "WAIT") {
      this.agencyTimerResolved = true;
      this.clearEnemy(definition, wall, "WAIT cleared after agency response timer resolution.");
      return;
    }

    if (definition.type === "HOLD") {
      if (hasProcessItem("citation_stamp")) {
        this.revealSecretRoom("D2", "Citation stamp opens a hidden reliability well.");
        this.clearEnemy(definition, wall, "HOLD cleared by citation stamp on the cracked wall.");
        return;
      }
      retroAudio.warning();
      this.dialog.show("HOLD", [
        "This wall holds a cracked source-note seam.",
        "Use the citation stamp after provenance is verified."
      ]);
      setLatestMessage("HOLD needs Citation Stamp.");
      return;
    }

    if (definition.type === "AMBIGUOUS") {
      if (this.specialistDecisionMade) {
        this.clearEnemy(definition, wall, "AMBIGUOUS cleared by human specialist review.");
        return;
      }
      this.splitAmbiguousFlag();
      return;
    }

    if (definition.type === "DANN-E QUEUE") {
      if (this.goldenRuleDecisionMade) {
        this.clearEnemy(definition, wall, "DANN-E QUEUE cleared by a human decision at the Golden Rule gate.");
        return;
      }
      retroAudio.warning();
      this.dialog.show("DANN-E QUEUE", [
        "The queue can push work backward.",
        "It cannot make the final call.",
        "Use the Golden Rule gate for a human decision."
      ]);
      setLatestMessage("DANN-E QUEUE needs a human decision.");
    }
  }

  private tryEnemyAction(nearest?: Interactable) {
    const facingHitbox = this.player.getFacingActionHitbox();
    const facedWall = [...this.activeEnemyWalls.values()].find((wall) => wall.intersectsHitbox(facingHitbox));
    const wall = facedWall ?? (nearest?.kind === "enemy" ? this.activeEnemyWalls.get(nearest.id) : undefined);
    const definition = wall ? this.activeEnemyDefs.get(wall.id) : undefined;
    if (!wall && nearest?.kind !== "enemy") return false;
    this.player.startAction();
    const hitbox = this.player.activeActionHitbox;
    if (!wall || !definition || !hitbox || !wall.intersectsHitbox(hitbox)) {
      retroAudio.warning();
      setLatestMessage("Face the stonewall before applying the process.");
      this.hintText.setText("FACE THE WALL");
      return true;
    }
    this.handleEnemyInteract(definition, wall);
    return true;
  }

  private clearEnemy(definition: ArchiveEnemyDefinition, wall: BureaucraticWall, message: string) {
    if (wall.isCleared) return;
    this.clearedWallIds.add(definition.id);
    this.activeEnemyWalls.delete(definition.id);
    this.activeEnemyDefs.delete(definition.id);
    if (definition.type === "AMBIGUOUS") this.clearAmbiguousFlags();
    wall.clear();
    retroAudio.stamp();
    addDocumentPoints(3, `${definition.type} process wall cleared`);
    adjustReliability(2, message);
    setLatestMessage(message);
    this.reliability.update();
    this.interactables = this.interactables.filter((item) => item.id !== definition.id);
    this.syncWallState();
  }

  private clearEnemyById(enemyId: string, message: string) {
    const definition = this.activeEnemyDefs.get(enemyId);
    const wall = this.activeEnemyWalls.get(enemyId);
    if (definition && wall) this.clearEnemy(definition, wall, message);
  }

  private resolveNetworkRouting() {
    this.networkRoutingResolved = true;
    addProcessItem("clearance_token");
    this.dialog.show("OPENNET TERMINAL", [
      "Route public-status work through OpenNet.",
      "Keep classified equities on ClassNet.",
      "The FIREWALL loses its door claim."
    ]);
    this.clearEnemyById("firewall-door", "FIREWALL cleared by correct OpenNet/ClassNet routing.");
    setObjective("Routing correct. The south terminal door is open.");
  }

  private deliverReferralManifest() {
    this.referralManifestDelivered = true;
    this.agencyTimerResolved = true;
    addProcessItem("concurrence_slip");
    this.dialog.show("REFERRAL TRAY", [
      "Manifest delivered.",
      "Agency response timer resolved.",
      "Pending work can move again."
    ]);
    this.clearEnemyById("pending-manifest", "PENDING cleared after manifest delivery to the referral tray.");
    this.clearEnemyById("wait-timer", "WAIT cleared after agency response timer resolution.");
    setObjective("Referral manifest delivered; exits unfrozen.");
  }

  private splitAmbiguousFlag() {
    if (!this.ambiguousSplit) {
      this.ambiguousSplit = true;
      addProcessItem("review_folder");
      this.drawAmbiguousFlags();
    }
    retroAudio.warning();
    this.dialog.show("AMBIGUOUS", [
      "The flag splits into two plausible readings.",
      "Plausible is not enough.",
      "Bring both flags to the human specialist."
    ]);
    setLatestMessage("AMBIGUOUS split into two flags.");
    setObjective("Bring split flags to the human specialist.");
    this.syncWallState();
  }

  private clearAmbiguousFlags() {
    this.ambiguousSplit = false;
    for (const object of this.ambiguousFlagObjects) {
      if (object.active) object.destroy();
    }
    this.ambiguousFlagObjects = [];
  }

  private resolveAmbiguousWithSpecialist() {
    if (!this.ambiguousSplit && !this.activeEnemyWalls.has("ambiguous-flag")) {
      this.dialog.show("HUMAN SPECIALIST", "No ambiguous flags are waiting.");
      return;
    }
    this.specialistDecisionMade = true;
    this.dialog.show("HUMAN SPECIALIST", [
      "Two flags reviewed.",
      "Meaning is resolved by human judgment.",
      "The ambiguity wall is cleared."
    ]);
    this.clearEnemyById("ambiguous-flag", "AMBIGUOUS cleared by the correct human specialist.");
    setObjective("Ambiguous flags resolved by human review.");
  }

  private useGoldenRuleGate() {
    this.goldenRuleDecisionMade = true;
    this.dialog.show("GOLDEN RULE GATE", [
      "AI queues may assist.",
      "They do not decide source meaning.",
      "Human decision recorded at the gate."
    ]);
    this.clearEnemyById("danne-queue", "DANN-E QUEUE cleared by a human decision at the Golden Rule gate.");
    setObjective("Golden Rule decision recorded.");
  }

  private updateBureaucraticWalls(delta: number) {
    for (const wall of this.bureaucraticWalls) {
      wall.update(this.time.now, delta, this.player.position);
    }
    this.syncWallInteractables();
    this.syncWallState();
    const activeWall = this.bureaucraticWalls.find((wall) => wall.isTouching(this.player.position, 19));
    if (!activeWall || this.time.now < this.wallContactCooldown) return;
    activeWall.markHit();
    const definition = this.activeEnemyDefs.get(activeWall.id);
    const hit = this.player.takeHit(activeWall.position, definition?.type === "DANN-E QUEUE" ? 22 : 15);
    if (!hit) return;
    this.wallContactCooldown = this.time.now + 1200;
    adjustReliability(definition?.type === "DANN-E QUEUE" ? -3 : -2, `${definition?.type ?? activeWall.label} process wall delayed source work`);
    this.reliability.update();
    if (definition?.type === "DANN-E QUEUE") setObjective("Use the Golden Rule gate for a human decision.");
    else if (definition?.type === "WAIT") setObjective("Resolve the agency response timer at the referral tray.");
    else setObjective("Clear stonewalls with the matching human process.");
  }

  private syncWallInteractables() {
    for (const item of this.interactables) {
      if (item.kind !== "enemy") continue;
      const wall = this.bureaucraticWalls.find((candidate) => candidate.id === item.id);
      if (!wall || wall.isCleared) continue;
      item.x = wall.position.x;
      item.y = wall.position.y;
    }
  }

  private syncWallState() {
    const activeThreats = this.bureaucraticWalls
      .filter((wall) => !wall.isCleared)
      .map((wall) => {
        const definition = this.activeEnemyDefs.get(wall.id);
        return {
          label: definition?.type ?? `Stone Wall: ${wall.label}`,
          x: wall.position.x,
          y: wall.position.y,
          spriteKey: wall.spriteKey,
          behavior: definition?.behaviorText,
          defeatMethod: definition?.defeatMethod,
          status: this.enemyStatus(definition)
        };
      });
    setVisibleThreats(activeThreats);
    setVisibleEntities([
      `Room ${this.currentRoomId}`,
      ...this.interactables.map((item) => item.label),
      ...(this.currentRoomId === "A1" ? ["Elena", "StateChat terminal", "Research Table"] : []),
      ...(this.currentRoomId === "B2" && this.ambiguousSplit && !this.clearedWallIds.has("ambiguous-flag") ? ["Split ambiguity flag A", "Split ambiguity flag B"] : []),
      ...(this.sourceNoteStatus !== "inactive" ? ["Source Note 47 verification object"] : [])
    ]);
  }

  private enemyStatus(definition?: ArchiveEnemyDefinition) {
    if (!definition) return "active";
    if (this.clearedWallIds.has(definition.id)) return "cleared";
    if (definition.type === "NO REPO") return this.sourceNoteStatus === "stamped" ? "citation stamp ready" : "needs source table";
    if (definition.type === "FIREWALL") return this.networkRoutingResolved ? "routing ready" : "wrong network blocks door";
    if (definition.type === "PENDING") return this.referralManifestDelivered ? "manifest delivered" : "awaiting manifest";
    if (definition.type === "WAIT") return this.agencyTimerResolved ? "timer resolved" : "exits frozen";
    if (definition.type === "AMBIGUOUS") return this.specialistDecisionMade ? "specialist ready" : this.ambiguousSplit ? "split flags waiting" : "unsplit";
    if (definition.type === "DANN-E QUEUE") return this.goldenRuleDecisionMade ? "human decision ready" : "pushing backward";
    return "active";
  }

  private startSourceNoteVerification() {
    this.sourceNoteStatus = "carried";
    setDocumentWorkflowState("source_note_047", "source_note_needed");
    setHeldItem("Source Note 47");
    setLatestMessage("EVIDENCE-BOUND: HUMAN CHECK REQUIRED");
    setObjective("ROUTE: carry Source Note 47 to research table.");
    this.sourceNoteIcon = this.add.image(this.player.position.x, this.player.position.y - 15, "source-note").setDepth(240);
    this.sourceNoteLabel = this.add.text(this.player.position.x, this.player.position.y - 1, "SRC NOTE 47", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(241);
    this.syncWallState();
    this.updateSourceNoteVerification();
    this.dialog.show("ELENA", [
      "StateChat flagged the missing repository on the terminal.",
      "It cannot guess provenance.",
      "Carry Source Note 47 to the research table in room A1 for human verification."
    ]);
  }

  private updateSourceNoteVerification() {
    if (this.sourceNoteStatus === "carried" && this.sourceNoteIcon) {
      const x = Math.round(this.player.position.x);
      const y = Math.round(this.player.position.y - 15);
      this.sourceNoteIcon.setPosition(x, y).setDepth(Math.round(this.player.position.y) + 4);
      this.sourceNoteLabel?.setPosition(x, y + 14).setDepth(Math.round(this.player.position.y) + 5);
    }

    const nearResearchTable = this.isNearResearchTable();
    const verb = this.verbForSourceNote();
    setNearestInteractable(nearResearchTable ? `${verb} Source Note 47` : null);
    if (this.sourceNoteStatus === "carried") {
      this.hintText.setText(nearResearchTable ? "ROUTE SOURCE NOTE 47" : "CARRY SOURCE NOTE 47");
      setObjective("ROUTE: carry Source Note 47 to research table in A1.");
    } else if (this.sourceNoteStatus === "routed") {
      this.hintText.setText("VERIFY SOURCE NOTE 47");
      setObjective("VERIFY: provenance at research table.");
    } else if (this.sourceNoteStatus === "verified") {
      this.hintText.setText("STAMP SOURCE NOTE 47");
      setObjective("STAMP: apply citation stamp after human review.");
    }
    this.syncSourceNotePhysicalState(nearResearchTable ? this.researchTable.label : null);
  }

  private handleSourceNoteAction() {
    if (!this.isNearResearchTable()) {
      retroAudio.warning();
      setLatestMessage("PROVENANCE CANNOT BE GUESSED");
      return;
    }
    if (this.sourceNoteStatus === "carried") {
      this.sourceNoteStatus = "routed";
      this.sourceNoteIcon?.setPosition(this.researchTable.x - 16, this.researchTable.y - 17).setDepth(245);
      this.sourceNoteLabel?.setPosition(this.researchTable.x, this.researchTable.y - 4).setDepth(246);
      setHeldItem(null);
      setLatestMessage("EVIDENCE-BOUND: HUMAN CHECK REQUIRED");
      retroAudio.confirm();
      this.updateSourceNoteVerification();
      return;
    }
    if (this.sourceNoteStatus === "routed") {
      this.sourceNoteStatus = "verified";
      setDocumentWorkflowState("source_note_047", "citation_verified");
      this.addVerificationGlow();
      setLatestMessage("VERIFIED BY HUMAN REVIEW");
      retroAudio.confirm();
      this.updateSourceNoteVerification();
      return;
    }
    if (this.sourceNoteStatus === "verified") {
      this.sourceNoteStatus = "stamped";
      this.applySourceNoteStamp();
    }
  }

  private drawRoutedSourceNote() {
    this.sourceNoteIcon = this.track(this.add.image(this.researchTable.x - 16, this.researchTable.y - 17, "source-note").setDepth(245));
    this.sourceNoteLabel = this.track(this.add.text(this.researchTable.x, this.researchTable.y - 4, "SRC NOTE 47", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(246));
    if (this.sourceNoteStatus === "stamped") this.drawSourceNoteStampMark();
  }

  private applySourceNoteStamp() {
    this.drawSourceNoteStampMark();
    awardProcessStamp("archive");
    setDocumentWorkflowState("source_note_047", "annotation_needed");
    addProcessItem("citation_stamp");
    addInventoryItem("Source Note 47 Citation Stamp");
    addInventoryItem("FRUS Fragment: Source Note");
    addVolumeFragment("Source Note Fragment");
    addDocumentPoints(12, "source note provenance verified");
    retroAudio.stamp();
    adjustReliability(10, "provenance verified by a human");
    setHeldItem(null);
    setNearestInteractable(null);
    setLatestMessage("VERIFIED BY HUMAN REVIEW");
    this.syncSourceNotePhysicalState(this.researchTable.label, "DONE");
    this.reliability.update();
    this.finishArchiveIfReady();
  }

  private drawSourceNoteStampMark() {
    this.track(this.add.image(this.researchTable.x + 20, this.researchTable.y - 16, "citation-stamp").setDepth(248));
    this.track(this.add.rectangle(this.researchTable.x + 20, this.researchTable.y - 4, 20, 6, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(249));
    this.track(this.add.text(this.researchTable.x + 20, this.researchTable.y - 7, "CITED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(250));
  }

  private addVerificationGlow() {
    const glow = this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y - 18, 34, 4, color(PALETTE.terminalCyan)).setDepth(247));
    this.tweens.add({
      targets: glow,
      y: glow.y - 1,
      duration: 260,
      yoyo: true,
      repeat: 2
    });
  }

  private verbForSourceNote(): "ROUTE" | "VERIFY" | "STAMP" {
    if (this.sourceNoteStatus === "carried") return "ROUTE";
    if (this.sourceNoteStatus === "routed") return "VERIFY";
    return "STAMP";
  }

  private syncSourceNotePhysicalState(nearestStation: string | null, overrideVerb?: "DONE") {
    const status = this.sourceNoteStatus === "inactive" ? "waiting" : this.sourceNoteStatus;
    setPhysicalVerificationState({
      verb: overrideVerb ?? this.verbForSourceNote(),
      carriedItem: this.sourceNoteStatus === "carried" ? "Source Note 47" : null,
      nearestStation,
      completed: this.sourceNoteStatus === "stamped" ? 1 : 0,
      total: 1,
      flags: [
        {
          id: "source-note-47",
          label: "Source Note 47",
          kind: "provenance",
          destination: this.researchTable.label,
          status
        }
      ]
    });
  }

  private isNearResearchTable() {
    return this.currentRoomId === "A1"
      && Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, this.researchTable.x, this.researchTable.y) <= 32;
  }

  private finishArchiveIfReady() {
    if (this.sourceNoteStatus !== "stamped") {
      setObjective("Archive Cavern: pick up Source Note 47 in A1.");
      return;
    }
    if (this.collected.size < 3) {
      setObjective(`Collect remaining document tiles in A1: ${this.collected.size}/3.`);
      this.dialog.show("ELENA", [
        "Good. Source Note 47 now has a repository trail.",
        "File the remaining document tiles before routing the volume onward."
      ]);
      return;
    }
    setDocumentWorkflowState("telegram_001", "selected");
    setDocumentWorkflowState("cross_reference_001", "selected");
    setDocumentWorkflowState("source_note_047", "ready_for_review");
    this.dialog.show("ELENA", [
      "Good. The source note now has a repository trail.",
      "A flag is not a fact until a compiler can defend it.",
      "That citation-stamped panel locks into the final cover."
    ], () => transitionTo(this, "NetworkScene"));
  }

  private advanceCollectedDocument(documentId: string) {
    if (documentId === "telegram") {
      advanceDocumentWorkflow("telegram_001", "evaluate");
      return;
    }
    if (documentId === "cross-reference") {
      advanceDocumentWorkflow("cross_reference_001", "evaluate");
      return;
    }
    if (documentId === "source-note") {
      setDocumentWorkflowState("source_note_047", "selected");
      setDocumentWorkflowState("source_note_047", "source_note_needed");
    }
  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.y <= PLAY_BOUNDS.top + 1 && position.x >= DOOR_X_MIN && position.x <= DOOR_X_MAX) direction = "north";
    else if (position.y >= PLAY_BOUNDS.bottom - 1 && position.x >= DOOR_X_MIN && position.x <= DOOR_X_MAX) direction = "south";
    else if (position.x <= PLAY_BOUNDS.left + 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    else if (position.x >= PLAY_BOUNDS.right - 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    if (!direction) return false;

    if (this.currentRoomId === "B1" && this.activeEnemyWalls.has("wait-timer") && !this.agencyTimerResolved) {
      setLatestMessage("WAIT freezes exits until the agency response timer is resolved.");
      setObjective("Resolve agency response timer at the referral tray.");
      this.exitCooldownUntil = this.time.now + 500;
      const push = direction === "north" ? { x: 128, y: 58 } : direction === "east" ? { x: 228, y: 120 } : { x: 128, y: 120 };
      this.player.setPosition(push.x, push.y);
      return false;
    }

    const currentRoom = ARCHIVE_ROOMS[this.currentRoomId];
    const target = currentRoom.exits[direction];
    if (!target) {
      setLatestMessage(`No ${direction} route from room ${this.currentRoomId}`);
      this.exitCooldownUntil = this.time.now + 360;
      return false;
    }

    const targetRoom = ARCHIVE_ROOMS[target];
    if (targetRoom.roomType === "secret" && !this.revealedSecretIds.has(target)) {
      setLatestMessage("A hidden wall has not been revealed.");
      setObjective("Find a secret trigger before entering that room.");
      this.exitCooldownUntil = this.time.now + 500;
      this.player.setPosition(position.x, position.y);
      return false;
    }

    const requiredItem = currentRoom.requiredItems?.[direction];
    if (requiredItem && !hasProcessItem(requiredItem)) {
      const lockLabel = currentRoom.lockedExits?.[direction] ?? "locked door";
      setLatestMessage(`${lockLabel} requires ${requiredItem.replace(/_/g, " ").toUpperCase()}.`);
      setObjective(`Use the required item to open ${lockLabel}.`);
      this.exitCooldownUntil = this.time.now + 500;
      const push = direction === "north"
        ? { x: position.x, y: PLAY_BOUNDS.top + 18 }
        : direction === "south"
          ? { x: position.x, y: PLAY_BOUNDS.bottom - 18 }
          : direction === "west"
            ? { x: PLAY_BOUNDS.left + 18, y: position.y }
            : { x: PLAY_BOUNDS.right - 18, y: position.y };
      this.player.setPosition(push.x, push.y);
      return false;
    }

    this.enterRoom(target, EXIT_SPAWNS[direction], true, direction);
    return true;
  }

  private exitHint() {
    const exits = Object.keys(ARCHIVE_ROOMS[this.currentRoomId].exits).map((direction) => direction.toUpperCase()).join(" ");
    return exits ? `EXITS: ${exits}` : "";
  }

  private refreshRoomObjective() {
    if (this.currentRoomId === "A1") {
      if (this.sourceNoteStatus !== "inactive" && this.sourceNoteStatus !== "stamped") {
        this.updateSourceNoteVerification();
        return;
      }
      if (this.sourceNoteStatus !== "stamped") {
        setObjective("Archive Cavern: collect Source Note 47 in A1.");
        return;
      }
      if (this.collected.size < 3) {
        setObjective(`Collect remaining document tiles in A1: ${this.collected.size}/3.`);
        return;
      }
    }
    setObjective(`Explore room ${this.currentRoomId}; exits ${this.exitHint().replace("EXITS: ", "")}.`);
  }

  private syncRoomTraversalState() {
    const room = ARCHIVE_ROOMS[this.currentRoomId];
    setRoomTraversalState({
      currentRoomId: room.id,
      roomTitle: room.title,
      roomType: room.roomType,
      visitedRoomIds: [...this.visitedRoomIds],
      revealedRoomIds: [
        ...Object.values(ARCHIVE_ROOMS)
          .filter((candidate) => candidate.roomType !== "secret")
          .map((candidate) => candidate.id),
        ...this.revealedSecretIds
      ],
      exits: room.exits,
      lockedExits: room.lockedExits,
      requiredItems: room.requiredItems
    });
  }

  private drawVisitedMinimap() {
    this.add.rectangle(26, 16, 42, 27, color(PALETTE.black)).setDepth(878);
    for (const room of Object.values(ARCHIVE_ROOMS)) {
      const cell = this.add.rectangle(14 + room.grid.x * 12, 8 + room.grid.y * 6, 8, 5, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.stoneLight))
        .setDepth(879);
      const label = this.add.text(14 + room.grid.x * 12, 5 + room.grid.y * 6, "", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.black
      }).setOrigin(0.5, 0).setDepth(880);
      this.mapCells.set(room.id, cell);
      this.mapLabels.set(room.id, label);
    }
  }

  private updateVisitedMinimap() {
    for (const room of Object.values(ARCHIVE_ROOMS)) {
      const visited = this.visitedRoomIds.has(room.id);
      const revealed = room.roomType !== "secret" || this.revealedSecretIds.has(room.id) || visited;
      const current = room.id === this.currentRoomId;
      this.mapCells.get(room.id)?.setFillStyle(color(current ? PALETTE.goldStamp : visited ? PALETTE.stoneLight : revealed ? PALETTE.stoneDark : PALETTE.black));
      this.mapLabels.get(room.id)?.setText(visited ? room.id : revealed && room.roomType === "secret" ? "?" : "").setColor(current ? PALETTE.black : PALETTE.shadowNavy);
    }
  }

  private drawRoomExits(room: ArchiveRoom) {
    const exits = room.exits;
    (["north", "south", "west", "east"] as Direction[]).forEach((direction) => {
      const hasExit = !!exits[direction];
      this.drawGate(direction, hasExit);
      if (hasExit && !this.exitIsOpen(room, direction)) this.drawLockSeal(direction, room.requiredItems?.[direction]);
    });
  }

  private exitIsOpen(room: ArchiveRoom, direction: Direction) {
    const target = room.exits[direction];
    if (!target) return false;
    const targetRoom = ARCHIVE_ROOMS[target];
    if (targetRoom.roomType === "secret" && !this.revealedSecretIds.has(target)) return false;
    const requiredItem = room.requiredItems?.[direction];
    return !requiredItem || hasProcessItem(requiredItem);
  }

  private drawGate(direction: Direction, open: boolean) {
    const fill = open ? PALETTE.black : PALETTE.stoneDark;
    const accent = open ? PALETTE.goldStamp : PALETTE.stoneGray;
    if (direction === "north") {
      this.track(this.add.rectangle(128, 36, 34, 8, color(fill)).setDepth(61));
      this.track(this.add.rectangle(128, 41, 26, 2, color(accent)).setDepth(62));
      if (!open) this.addSolid(112, 32, 32, 16);
    } else if (direction === "south") {
      this.track(this.add.rectangle(128, 220, 34, 8, color(fill)).setDepth(61));
      this.track(this.add.rectangle(128, 215, 26, 2, color(accent)).setDepth(62));
      if (!open) this.addSolid(112, 208, 32, 16);
    } else if (direction === "west") {
      this.track(this.add.rectangle(8, 120, 8, 34, color(fill)).setDepth(61));
      this.track(this.add.rectangle(13, 120, 2, 26, color(accent)).setDepth(62));
      if (!open) this.addSolid(0, 104, 16, 32);
    } else {
      this.track(this.add.rectangle(248, 120, 8, 34, color(fill)).setDepth(61));
      this.track(this.add.rectangle(243, 120, 2, 26, color(accent)).setDepth(62));
      if (!open) this.addSolid(240, 104, 16, 32);
    }
  }

  private drawLockSeal(direction: Direction, requiredItem?: ProcessItemId) {
    const label = requiredItem ? requiredItem.split("_")[0].slice(0, 4).toUpperCase() : "LOCK";
    const positions: Record<Direction, { x: number; y: number }> = {
      north: { x: 128, y: 45 },
      south: { x: 128, y: 211 },
      west: { x: 18, y: 120 },
      east: { x: 238, y: 120 }
    };
    const { x, y } = positions[direction];
    this.track(this.add.rectangle(x, y, 22, 10, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.classNetRed)).setDepth(170));
    this.track(this.add.text(x, y - 3, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.classNetRed
    }).setOrigin(0.5, 0).setDepth(171));
  }

  private drawBookcase(x: number, y: number, width = 34, height = 34) {
    this.track(this.add.rectangle(x, y, width, height, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.deepRuby)).setDepth(y - 2));
    for (let row = -1; row <= 1; row += 1) {
      const shelfY = y + row * 9;
      this.track(this.add.rectangle(x, shelfY + 4, width - 5, 1, color(PALETTE.goldStamp)).setDepth(y - 1));
      for (let i = 0; i < 5; i += 1) {
        const bookColor = [PALETTE.buckramRed, PALETTE.goldStamp, PALETTE.archiveAmber, PALETTE.creamPaper][(i + row + 4) % 4];
        this.track(this.add.rectangle(x - width / 2 + 6 + i * 5, shelfY, 3, 7, color(bookColor)).setDepth(y - 1));
      }
    }
    const solidX = Math.round((x - width / 2) / 8) * 8;
    const solidY = Math.round((y - height / 2) / 8) * 8;
    this.addSolid(solidX + 4, solidY + 4, Math.max(8, width - 8), Math.max(8, height - 8));
  }

  private drawDesk(x: number, y: number, label?: string) {
    this.track(this.add.rectangle(x, y, 38, 20, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(y - 2));
    this.track(this.add.rectangle(x - 12, y - 4, 10, 6, color(PALETTE.creamPaper)).setDepth(y - 1));
    this.track(this.add.rectangle(x + 8, y + 2, 12, 2, color(PALETTE.archiveAmber)).setDepth(y - 1));
    if (label) {
      this.track(this.add.text(x, y - 4, label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.black
      }).setOrigin(0.5).setDepth(y));
    }
  }

  private drawWallMap(x: number, y: number, label = "MAP") {
    this.track(this.add.rectangle(x + 2, y + 3, 48, 30, color(PALETTE.black)).setDepth(y - 3));
    this.track(this.add.rectangle(x, y, 48, 30, color(PALETTE.creamPaper)).setStrokeStyle(2, color(PALETTE.sepiaInk)).setDepth(y - 2));
    this.track(this.add.rectangle(x - 16, y - 7, 12, 7, color(PALETTE.mapWater)).setDepth(y - 1));
    this.track(this.add.rectangle(x - 2, y - 3, 18, 3, color(PALETTE.archiveAmber)).setDepth(y - 1));
    this.track(this.add.rectangle(x + 7, y + 5, 13, 3, color(PALETTE.buckramRed)).setDepth(y - 1));
    this.track(this.add.rectangle(x - 14, y + 8, 5, 5, color(PALETTE.goldStamp)).setDepth(y));
    this.track(this.add.rectangle(x + 17, y - 8, 4, 4, color(PALETTE.classNetRed)).setDepth(y));
    this.track(this.add.text(x, y + 10, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5).setDepth(y + 1));
    this.addSolid(104, 48, 48, 28);
  }

  private drawDocumentStack(x: number, y: number, flagged = false) {
    for (let i = 0; i < 4; i += 1) {
      this.track(this.add.rectangle(x + i, y - i * 3, 20, 12, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(y + i));
      this.track(this.add.rectangle(x - 5 + i, y - 2 - i * 3, 9, 1, color(PALETTE.sepiaInk)).setDepth(y + i + 1));
    }
    if (flagged) this.track(this.add.rectangle(x - 12, y - 9, 3, 22, color(PALETTE.classNetRed)).setDepth(y + 6));
  }

  private drawRubyVolumeStack(x: number, y: number, count = 3) {
    for (let i = 0; i < count; i += 1) {
      this.track(this.add.rectangle(x + i * 3, y - i * 6, 24, 8, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(y + i));
      this.track(this.add.rectangle(x - 5 + i * 3, y - i * 6, 10, 1, color(PALETTE.goldStamp)).setDepth(y + i + 1));
    }
  }

  private drawSparkle(x: number, y: number, tint: string = PALETTE.goldStamp) {
    const sparkle = this.add.container(x, y).setDepth(700);
    sparkle.add([
      this.add.rectangle(0, -3, 1, 3, color(tint)),
      this.add.rectangle(0, 3, 1, 3, color(tint)),
      this.add.rectangle(-3, 0, 3, 1, color(tint)),
      this.add.rectangle(3, 0, 3, 1, color(tint))
    ]);
    this.track(sparkle);
    this.tweens.add({ targets: sparkle, y: y - 1, duration: 360, yoyo: true, repeat: -1, ease: "Stepped" });
  }

  private addSolid(x: number, y: number, width: number, height: number) {
    this.roomSolids.push(new Phaser.Geom.Rectangle(x, y, width, height));
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.roomObjects.push(object);
    return object;
  }
}
