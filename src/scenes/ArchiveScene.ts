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
  getHeldProcessItemIds,
  getTreatyFragmentCount,
  gameState,
  hasProcessItem,
  recordHiddenCollectibleFound,
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
import { Manuscript } from "../entities/items/Manuscript";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { Player } from "../entities/Player";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import type { BureaucraticWallBehavior } from "../entities/BureaucraticWall";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import {
  decideInteractionFeedback,
  InteractionAssist,
  nearestInteractableHint,
  nearestWorkflowInteraction
} from "../systems/interaction";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { FeedbackToast } from "../systems/feedbackToast";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesMapTablet, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomIntroBanner, addSnesRoomLayer, addSnesTreasurePedestal, addSnesWorldMap } from "../systems/snesPixelArt";
import {
  SNES_ARCHIVE_COMPASS_RELIC_ASSET,
  SNES_ARCHIVE_PROP_ASSET,
  SNES_ARCHIVE_ROOM_DETAIL_ASSET,
  SNES_ARCHIVE_WALL_MAP_BOARD_ASSET,
  SNES_ROOM_MAP_MARKER_ASSET
} from "../game/snesAtlas";
import { ChoicePrompt } from "../systems/verification";
import {
  annotationDraftingComplete,
  ANNOTATION_DRAFTING_PROMPTS,
  evaluateAnnotationDraftingAnswer,
  getAnnotationDraftingPrompt
} from "../game/annotationDrafting";
import {
  evaluateSourceNoteProvenanceAnswer,
  getSourceNoteProvenancePrompt,
  sourceNoteProvenanceComplete,
  SOURCE_NOTE_PROVENANCE_PROMPTS
} from "../game/sourceNoteProvenance";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type SourceNoteStatus = "inactive" | "carried" | "routed" | "verified" | "stamped";
type Direction = "north" | "south" | "west" | "east";
type ArchiveRoomId = "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3";
type ArchiveEnemyType = "NO REPO" | "FIREWALL" | "PENDING" | "WAIT" | "HOLD" | "AMBIGUOUS" | "DANN-E QUEUE";
type ArchiveDanneRoute = "NaraStacksScene" | "EmbassyCableRoomScene" | "BlackVaultLairScene";
type ArchivePropFrame = (typeof SNES_ARCHIVE_PROP_ASSET.frames)[number];
type ArchiveRoomDetailFrame = (typeof SNES_ARCHIVE_ROOM_DETAIL_ASSET.frames)[number];

interface ArchiveRoom {
  id: ArchiveRoomId;
  title: string;
  grid: { x: number; y: number };
  exits: Partial<Record<Direction, ArchiveRoomId>>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, ProcessItemId>>;
  roomType: RoomType;
}

type ArchiveWallMapMarkerFrame = (typeof SNES_ROOM_MAP_MARKER_ASSET.frames)[number];

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
const ARCHIVE_RETURN_ROOM_CODES: Record<ArchiveRoomId, number> = {
  A1: 1,
  A2: 2,
  A3: 3,
  B1: 4,
  B2: 5,
  B3: 6,
  C1: 7,
  C2: 8,
  C3: 9,
  D1: 10,
  D2: 11,
  D3: 12
};
const ARCHIVE_RETURN_ROOM_BY_CODE = Object.fromEntries(
  Object.entries(ARCHIVE_RETURN_ROOM_CODES).map(([roomId, code]) => [code, roomId])
) as Record<number, ArchiveRoomId>;

const ARCHIVE_ROOMS: Record<ArchiveRoomId, ArchiveRoom> = {
  A1: {
    id: "A1",
    title: "SOURCE ROOM",
    grid: { x: 0, y: 0 },
    exits: { east: "A2", south: "B1" },
    lockedExits: {
      east: "OPENNET SOURCE-NOTE LOCK",
      south: "REFERRAL STACKS CITATION LOCK"
    },
    requiredItems: {
      east: "citation_stamp",
      south: "citation_stamp"
    },
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
  private danneLurker!: DanneLurker;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private toast!: FeedbackToast;
  private roomTitleText!: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];
  private readonly interactionAssist = new InteractionAssist();
  private collected = new Set<string>();
  private clearedWallIds = new Set<string>();
  private bureaucraticWalls: BureaucraticWall[] = [];
  private wallContactCooldown = 0;
  private sourceNoteStatus: SourceNoteStatus = "inactive";
  private sourceNoteIcon?: Phaser.GameObjects.Image;
  private sourceNoteLabel?: Phaser.GameObjects.Text;
  private sourceNoteRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private sourceNoteRouteCueKey = "";
  private naraStacksGateObjects: Phaser.GameObjects.GameObject[] = [];
  private noRepoStampCue?: Phaser.GameObjects.Container;
  private readyWallCues = new Map<string, Phaser.GameObjects.Container>();
  private archiveKeyRewardCue?: Phaser.GameObjects.Container;
  private secretRewardCue?: Phaser.GameObjects.Container;
  private bossReadinessObjects: Phaser.GameObjects.GameObject[] = [];
  private blackVaultDoorObjects: Phaser.GameObjects.GameObject[] = [];
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
  private mapMarkers = new Map<ArchiveRoomId, Phaser.GameObjects.Text>();
  private archiveCompassRelicLabel?: Phaser.GameObjects.Text;
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
    const archiveReturn = this.consumeArchiveReturnSpawn();
    const restoringArchive = gameState.currentScene === "ArchiveScene";
    const candidateRestoredRoomId = gameState.roomTraversal?.currentRoomId as ArchiveRoomId | undefined;
    const restoredRoomId = archiveReturn?.roomId
      ?? (restoringArchive && candidateRestoredRoomId && ARCHIVE_ROOMS[candidateRestoredRoomId]
      ? candidateRestoredRoomId
      : restoringArchive
        ? "A1"
        : null);
    const restoredPlayer = archiveReturn
      ? { x: archiveReturn.x, y: archiveReturn.y }
      : restoringArchive
      ? { ...gameState.player }
      : null;
    setSceneState("ArchiveScene", "explore", "Archive Cavern: explore room A1.");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.archiveAmber);
    drawTiledFloor(this, "archive-tiles");
    drawRoomFrame(this, "ARCHIVE CAVERN", PALETTE.goldStamp, { showLegacyHud: false });
    this.drawVisitedMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902).setVisible(false);

    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this);
    this.hintText = this.add.text(128, 211, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(810);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.toast = new FeedbackToast(this);
    this.player = new Player(this, 128, 184);
    this.danneLurker = new DanneLurker(this, 214, 74, {
      waypoints: [
        { x: 214, y: 74 },
        { x: 142, y: 54 },
        { x: 54, y: 98 },
        { x: 58, y: 190 },
        { x: 198, y: 188 }
      ]
    });

    this.enterRoom(restoredRoomId ?? "A1", restoredPlayer ?? { x: 128, y: 184 }, false);
    if (!restoredPlayer) {
      this.dialog.show("ELENA", [
        "A compiler reads the trail.",
        "Collect the pieces. If bureaucracy turns to stone, name the record and keep moving.",
        "Use the edge gates to map each room, but verify Source Note 47 here."
      ]);
    }
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
      this.toast.update(delta, this.player.position);
      return;
    }
    if (this.choice.active) {
      this.interactionPrompt.update(delta, null);
      this.choice.updateInput();
      this.player.update(delta, false);
      this.updateSourceNoteVerification();
      this.reliability.update();
      this.toast.update(delta, this.player.position);
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      this.toast.update(delta, this.player.position);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }

    this.player.update(delta, true, { bounds: PLAY_BOUNDS, solids: this.roomSolids });
    this.updateDanneLurker(delta);
    if (this.checkRoomExit()) return;

    if (this.sourceNoteStatus !== "inactive" && this.sourceNoteStatus !== "stamped") {
      this.updateSourceNoteVerification();
      this.reliability.update();
      this.updateSourceNoteInteractionPrompt(delta);
      this.toast.update(delta, this.player.position);
      if (input.aJustPressed) {
        if (this.warnIfSourceNoteHintOnly()) {
          this.objectiveText.setText(gameState.objective);
          return;
        }
        this.handleSourceNoteAction();
      }
      this.objectiveText.setText(gameState.objective);
      return;
    }
    this.updateBureaucraticWalls(delta);
    this.reliability.update();
    const workflowInteraction = nearestWorkflowInteraction(this.player.position, this.interactables, getAvailableWorkflowTools());
    const nearest = workflowInteraction.interactable;
    const hintTarget = nearestInteractableHint(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    const toolCue = workflowInteraction.tool ? `${workflowInteraction.tool.shortLabel}: ` : "";
    this.hintText.setText(nearest ? `A: ${toolCue}${nearest.label.toUpperCase()}` : this.exitHint());
    this.interactionPrompt.update(delta, nearest ?? hintTarget, undefined, nearest ? undefined : hintTarget ? {
      badge: "!",
      text: "STEP CLOSER"
    } : undefined);
    this.toast.update(delta, this.player.position);
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (input.aJustPressed && !bufferedInteraction && this.tryEnemyAction(nearest ?? undefined)) return;
    if (input.aJustPressed && !bufferedInteraction) {
      const feedback = decideInteractionFeedback(nearest, hintTarget);
      if (feedback.kind === "step-closer") {
        retroAudio.blip();
        setLatestMessage(`Step closer to ${feedback.target.label}.`);
        this.objectiveText.setText(gameState.objective);
        return;
      }
    }
    if (bufferedInteraction) {
      if (bufferedInteraction.kind === "enemy" && this.tryEnemyAction(bufferedInteraction)) return;
      bufferedInteraction.onInteract();
    }
    this.objectiveText.setText(gameState.objective);
  }

  private updateDanneLurker(delta: number) {
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, true);
    if (result.triggered) {
      this.player.takeHit(this.danneLurker.position, 11, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E deadline pressure disrupted archive verification.");
      setObjective("Archive Cavern: verify sources by human review, not DANN-E pressure.");
      this.reliability.update();
    } else if (result.egoBoltHit) {
      this.player.takeHit(this.danneLurker.position, 9, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E ego bolt disrupted archive verification.");
      setObjective("Archive Cavern: dodge Ego bolts and keep verifying sources.");
      this.reliability.update();
    }
    this.syncWallState();
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
    this.clearSourceNoteRouteCue();
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    this.roomCleanups = [];
    this.roomObjects = [];
    this.ambiguousFlagObjects = [];
    this.naraStacksGateObjects = [];
    this.noRepoStampCue = undefined;
    this.readyWallCues.clear();
    this.archiveKeyRewardCue = undefined;
    this.bossReadinessObjects = [];
    this.blackVaultDoorObjects = [];
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
    addSnesRoomIntroBanner(this, {
      title: `${room.id} ${room.title}`,
      subtitle: "ARCHIVE CAVERN",
      accent: room.roomType === "reward" || room.roomType === "secret" ? PALETTE.goldStamp : PALETTE.buckramRed,
      track: (object) => this.track(object)
    });
    this.drawRoomExits(room);
    addSnesRoomLayer(this, {
      roomId: room.id,
      roomType: room.roomType,
      theme: this.currentRoomId === "A2" ? "network" : this.currentRoomId === "B2" ? "proof" : "archive",
      track: (object) => this.track(object)
    });
    this.drawArchiveRoomDetailLayer(room);
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
    this.drawArchiveDoor(128, 201, "NARA II\nSTAIRS", PALETTE.terminalCyan);
    this.interactables.push({
      id: "nara-stacks-stairs",
      label: "NARA II Stacks",
      x: 128,
      y: 201,
      radius: 14,
      kind: "door",
      onInteract: () => this.tryRouteToNaraStacks()
    });
    this.addRoomEnemy("repo-wall");
    if (this.sourceNoteStatus === "routed" || this.sourceNoteStatus === "verified" || this.sourceNoteStatus === "stamped") {
      this.drawRoutedSourceNote();
    }
    this.refreshSourceNoteRouteCue();
    this.drawNaraStacksGateSeal();
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
    this.drawArchiveDoor(42, 188, "EMBASSY\nCABLES", PALETTE.goldStamp);
    this.interactables.push({
      id: "opennet-annex-terminal",
      label: "OpenNet terminal",
      x: 72,
      y: 105,
      radius: 34,
      kind: "terminal",
      onInteract: () => this.resolveNetworkRouting()
    });
    this.interactables.push({
      id: "embassy-cable-hallway",
      label: "Embassy Cable Room",
      x: 42,
      y: 188,
      radius: 30,
      kind: "door",
      onInteract: () => this.routeToDanneMap("EmbassyCableRoomScene", "A2", 52, 184)
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
    addSnesMapTablet(this, {
      x: 128,
      y: 151,
      label: room.id === "A3" ? "SECRET MAP" : "GATE MAP",
      nodes: room.id === "A3" ? ["A1", "A3", "C3", "D1"] : ["B1", "B2", "C2", "D3"],
      activeIndex: room.id === "A3" ? 1 : 2,
      accent: room.id === "A3" ? PALETTE.goldStamp : PALETTE.terminalCyan,
      track: (object) => this.track(object),
      depth: 118
    });
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
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 132,
      textureKey: room.id === "C3" ? "volume-fragment" : "citation-stamp",
      label: room.id === "C3" ? "Hidden Fragment" : "Reliability Well",
      collected: this.collected.has(`secret-${room.id}`),
      track: (object) => this.track(object),
      depth: 146
    });
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
          setLatestMessage(`${room.id} secret reward already filed.`);
          setObjective("Return to the marked Archive route; this hidden room is complete.");
          this.dialog.show("SECRET", "This hidden room has already yielded its clue.");
          return;
        }
        this.collected.add(key);
        addDocumentPoints(room.id === "C3" ? 10 : 6, room.id === "C3" ? "hidden source cache" : "hidden reliability well");
        if (room.id === "D2") {
          adjustReliability(8, "hidden reliability refill");
          recordHiddenCollectibleFound("Hidden Reliability Well");
          setLatestMessage("Hidden reliability well restored confidence.");
          setObjective("Reliability restored; return to the marked Archive route.");
        } else {
          addVolumeFragment("Hidden Cache Fragment");
          recordHiddenCollectibleFound("Hidden Source Cache");
          setLatestMessage("Hidden source cache fragment filed.");
          setObjective("Hidden Source Cache filed; return to the Archive map marker.");
        }
        retroAudio.confirm();
        this.showSecretRewardCue(room.id);
        this.dialog.show("SECRET", room.id === "C3" ? "A cover fragment was filed where only a careful reader would look." : "The well restores confidence because the check was physical.");
      }
    });
  }

  private renderRewardRoom() {
    this.drawRubyVolumeStack(66, 116, 3);
    this.drawRubyVolumeStack(190, 116, 3);
    addSnesTreasurePedestal(this, {
      x: 128,
      y: 106,
      textureKey: "citation-stamp",
      label: "Citation Stamp",
      collected: hasProcessItem("citation_stamp"),
      track: (object) => this.track(object),
      depth: 150
    });
    this.track(this.add.rectangle(128, 162, 122, 26, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(111));
    this.track(this.add.text(128, 154, "STAMP REWARD ROOM\nSOURCE STAMP: HUMAN VERIFIED", {
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
    this.drawBossReadinessBoard();
    this.drawBlackVaultDoorSeal();
    this.addRoomEnemy("danne-queue");
    this.interactables.push({
      id: "black-vault-seal",
      label: "Black Vault Lair",
      x: 128,
      y: 154,
      radius: 32,
      kind: "door",
      onInteract: () => this.openBlackVaultRoute()
    });
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
    if (this.revealedSecretIds.has(roomId)) {
      setLatestMessage(`${roomId} secret route already mapped.`);
      this.dialog.show("SECRET", "That hidden route is already marked on the archive map.");
      this.updateVisitedMinimap();
      this.syncRoomTraversalState();
      return;
    }

    this.revealedSecretIds.add(roomId);
    addDocumentPoints(3, `${roomId} secret revealed`);
    setLatestMessage(message);
    setObjective(`Secret route ${roomId} revealed; follow the map marker.`);
    retroAudio.confirm();
    this.showSecretRevealCue(roomId);
    this.dialog.show("SECRET", message);
    this.updateVisitedMinimap();
    this.syncRoomTraversalState();
  }

  private showSecretRevealCue(roomId: ArchiveRoomId) {
    const flash = this.track(this.add.rectangle(128, 120, 236, 162, color(PALETTE.goldStamp), 0.12)
      .setName("archive-secret-reveal-flash")
      .setDepth(760));
    const back = this.add.rectangle(0, 0, 110, 30, color(PALETTE.black), 0.94)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 0.96)
      .setName("archive-secret-reveal-back");
    const rule = this.add.rectangle(0, -1, 86, 2, color(PALETTE.goldStamp), 1)
      .setName("archive-secret-reveal-rule");
    const label = this.add.text(0, -13, "SECRET ROUTE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0)
      .setName("archive-secret-reveal-label");
    const roomText = this.add.text(0, 4, `${roomId} REVEALED`, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0)
      .setName("archive-secret-reveal-room");
    const sparkleA = this.add.rectangle(-43, -1, 3, 3, color(PALETTE.terminalCyan), 1)
      .setName("archive-secret-reveal-spark");
    const sparkleB = this.add.rectangle(43, -1, 3, 3, color(PALETTE.terminalCyan), 1)
      .setName("archive-secret-reveal-spark");
    const cue = this.track(this.add.container(128, 112, [back, rule, label, roomText, sparkleA, sparkleB])
      .setName("archive-secret-reveal-cue")
      .setDepth(880));

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 420,
      ease: "Stepped",
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: cue,
      y: 106,
      alpha: 0,
      duration: 780,
      delay: 420,
      ease: "Stepped",
      onComplete: () => cue.destroy()
    });
    this.tweens.add({
      targets: [sparkleA, sparkleB],
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 160,
      yoyo: true,
      repeat: 3,
      ease: "Stepped"
    });
  }

  private showSecretRewardCue(roomId: ArchiveRoomId) {
    if (this.secretRewardCue?.active) this.secretRewardCue.destroy();
    const isFragment = roomId === "C3";
    const textureKey = isFragment ? "volume-fragment" : "citation-stamp";
    const labelText = isFragment ? "FRUS FRAGMENT" : "RELIABILITY WELL";
    addSnesRewardBurst(this, 128, 112, textureKey, labelText, (object) => this.track(object));

    const back = this.add.rectangle(0, 0, 122, 32, color(PALETTE.black), 0.9)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 0.96)
      .setName("archive-secret-reward-back");
    const label = this.add.text(0, -13, labelText, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0)
      .setName("archive-secret-reward-label");
    const roomText = this.add.text(0, 3, `${roomId} FILED`, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0)
      .setName("archive-secret-reward-room");
    const sparkleA = this.add.rectangle(-52, -1, 3, 3, color(PALETTE.creamPaper), 1)
      .setName("archive-secret-reward-spark");
    const sparkleB = this.add.rectangle(52, -1, 3, 3, color(PALETTE.creamPaper), 1)
      .setName("archive-secret-reward-spark");

    this.secretRewardCue = this.track(this.add.container(128, 62, [
      back,
      label,
      roomText,
      sparkleA,
      sparkleB
    ]).setName("archive-secret-reward-cue").setDepth(890));
    this.secretRewardCue.setAlpha(0);
    this.tweens.add({
      targets: this.secretRewardCue,
      alpha: 1,
      y: 58,
      duration: 160,
      ease: "Stepped"
    });
    this.time.delayedCall(1450, () => {
      if (!this.secretRewardCue?.active) return;
      this.tweens.add({
        targets: this.secretRewardCue,
        alpha: 0,
        duration: 220,
        ease: "Stepped",
        onComplete: () => {
          if (this.secretRewardCue?.active) this.secretRewardCue.destroy();
          this.secretRewardCue = undefined;
        }
      });
    });
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
    const prop = this.drawArchivePropFrame(
      "research_table",
      this.researchTable.x,
      this.researchTable.y - 3,
      72,
      "research-table"
    );
    if (!prop) {
      this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y, 68, 24, color(PALETTE.black)).setDepth(70));
      this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y - 1, 64, 20, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(71));
      this.track(this.add.image(this.researchTable.x - 20, this.researchTable.y - 3, "source-note").setDepth(72));
      this.track(this.add.image(this.researchTable.x + 17, this.researchTable.y - 4, "citation-stamp").setDepth(72));
    }
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
      this.toast.show(`${document.label} filed`, this.player.position, "info");
      setLatestMessage(`${document.label} filed. Keep collecting document tiles.`);
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
    if (!this.player.startAction(gameState.equippedProcessItem)) {
      setLatestMessage("Process tool is cooling down.");
      this.hintText.setText("COOLDOWN");
      return true;
    }
    if (!wall || !definition || !wall.intersectsHitbox(facingHitbox)) {
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
    this.clearReadyWallCue(definition.id);
    if (definition.id === "repo-wall") {
      this.clearNoRepoStampCue();
      this.showArchiveKeyRewardCue();
    }
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
    if (this.currentRoomId === "D3") {
      this.drawBossReadinessBoard();
      this.drawBlackVaultDoorSeal();
    }
    setLatestMessage("Black Vault route open by Golden Rule decision.");
    setObjective("Black Vault route open: press A at the open door.");
  }

  private consumeArchiveReturnSpawn() {
    const roomCode = gameState.sceneProgress.archiveReturnRoom;
    const x = gameState.sceneProgress.archiveReturnX;
    const y = gameState.sceneProgress.archiveReturnY;
    delete gameState.sceneProgress.archiveReturnRoom;
    delete gameState.sceneProgress.archiveReturnX;
    delete gameState.sceneProgress.archiveReturnY;
    const roomId = typeof roomCode === "number" ? ARCHIVE_RETURN_ROOM_BY_CODE[roomCode] : undefined;
    if (!roomId || typeof x !== "number" || typeof y !== "number") return null;
    return { roomId, x, y };
  }

  private routeToDanneMap(target: ArchiveDanneRoute, roomId: ArchiveRoomId, returnX: number, returnY: number) {
    gameState.sceneProgress.archiveReturnRoom = ARCHIVE_RETURN_ROOM_CODES[roomId];
    gameState.sceneProgress.archiveReturnX = returnX;
    gameState.sceneProgress.archiveReturnY = returnY;
    transitionTo(this, target);
  }

  private openBlackVaultRoute() {
    if (this.blackVaultRouteOpen()) {
      this.routeToDanneMap("BlackVaultLairScene", "D3", 128, 188);
      return;
    }
    retroAudio.warning();
    setLatestMessage("Black Vault seal requires Treaty Fragments or a Golden Rule gate decision.");
    setObjective("Record the Golden Rule decision or assemble Treaty Fragments before the Black Vault.");
    this.dialog.show("BLACK VAULT SEAL", [
      "The route is restricted.",
      "Record the Golden Rule gate decision, or bring the full treaty file."
    ]);
  }

  private blackVaultRouteOpen() {
    return getTreatyFragmentCount() >= 3
      || this.goldenRuleDecisionMade
      || hasProcessItem("buckram_key")
      || Boolean(gameState.sceneProgress.blackVaultBossCleared);
  }

  private drawBossReadinessBoard() {
    this.clearBossReadinessBoard();
    const fragments = getTreatyFragmentCount();
    const ruleReady = this.goldenRuleDecisionMade || Boolean(gameState.sceneProgress.blackVaultBossCleared);
    const keyReady = hasProcessItem("buckram_key");
    const fragmentReady = fragments >= 3;
    const routeOpen = this.blackVaultRouteOpen();
    const rows = [
      { label: "FRAG", value: `${fragments}/3`, ready: fragmentReady },
      { label: "RULE", value: ruleReady ? "YES" : "NO", ready: ruleReady },
      { label: "KEY", value: keyReady ? "YES" : "NO", ready: keyReady }
    ] as const;

    const board = this.trackBossReadinessObject(this.add.container(66, 81).setDepth(176).setName("archive-boss-readiness-board"));
    board.add(this.add.rectangle(0, 0, 76, 54, color(PALETTE.black), 1)
      .setStrokeStyle(2, color(routeOpen ? PALETTE.goldStamp : PALETTE.classNetRed))
      .setName("archive-boss-readiness-back"));
    board.add(this.add.text(0, -23, "VAULT CHECK", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: routeOpen ? PALETTE.goldStamp : PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5, 0).setName("archive-boss-readiness-title"));

    rows.forEach((row, index) => {
      const y = -10 + index * 12;
      const accent = row.ready ? PALETTE.openNetGreen : PALETTE.classNetRed;
      board.add(this.add.rectangle(-28, y + 4, 5, 5, color(accent), 1)
        .setStrokeStyle(1, color(PALETTE.black))
        .setName("archive-boss-readiness-light"));
      board.add(this.add.text(-20, y, row.label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper
      }).setOrigin(0, 0).setName("archive-boss-readiness-row"));
      board.add(this.add.text(26, y, row.value, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: row.ready ? PALETTE.goldStamp : PALETTE.stoneLight,
        align: "right"
      }).setOrigin(1, 0).setName("archive-boss-readiness-value"));
    });

    board.add(this.add.rectangle(0, 22, 60, 7, color(routeOpen ? PALETTE.openNetGreen : PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(routeOpen ? PALETTE.goldStamp : PALETTE.classNetRed))
      .setName("archive-boss-readiness-status-back"));
    board.add(this.add.text(0, 18, routeOpen ? "ROUTE OPEN" : "SEALED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: routeOpen ? PALETTE.black : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0).setName("archive-boss-readiness-status"));
  }

  private clearBossReadinessBoard() {
    for (const object of this.bossReadinessObjects) {
      if (object.active) object.destroy();
    }
    this.bossReadinessObjects = [];
  }

  private trackBossReadinessObject<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.bossReadinessObjects.push(object);
    return this.track(object);
  }

  private drawBlackVaultDoorSeal() {
    this.clearBlackVaultDoorSeal();
    const routeOpen = this.blackVaultRouteOpen();
    const accent = routeOpen ? PALETTE.terminalCyan : PALETTE.classNetRed;
    const fill = routeOpen ? PALETTE.black : PALETTE.deepRuby;
    const status = routeOpen ? "OPEN" : "SEALED";
    const x = 128;
    const y = 154;

    this.trackBlackVaultDoorObject(this.add.ellipse(x + 1, y + 9, 42, 9, color(PALETTE.black), 0.55)
      .setDepth(y - 6)
      .setName("archive-black-vault-door-shadow"));
    this.trackBlackVaultDoorObject(this.add.rectangle(x, y, 48, 22, color(PALETTE.black), 1)
      .setStrokeStyle(2, color(routeOpen ? PALETTE.goldStamp : PALETTE.classNetRed))
      .setDepth(y - 5)
      .setName("archive-black-vault-door-frame"));
    this.trackBlackVaultDoorObject(this.add.rectangle(x, y + 2, 36, 12, color(fill), 1)
      .setStrokeStyle(1, color(accent))
      .setDepth(y - 4)
      .setName("archive-black-vault-door-panel"));

    if (routeOpen) {
      this.trackBlackVaultDoorObject(this.add.rectangle(x, y + 2, 22, 16, color(PALETTE.black), 1)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(y - 3)
        .setName("archive-black-vault-door-open-throat"));
      this.trackBlackVaultDoorObject(this.add.rectangle(x, y + 11, 34, 3, color(PALETTE.terminalCyan), 1)
        .setDepth(y - 2)
        .setName("archive-black-vault-door-open-threshold"));
      this.trackBlackVaultDoorObject(this.add.rectangle(x - 18, y - 1, 3, 14, color(PALETTE.goldStamp), 1)
        .setDepth(y - 2)
        .setName("archive-black-vault-door-open-left"));
      this.trackBlackVaultDoorObject(this.add.rectangle(x + 18, y - 1, 3, 14, color(PALETTE.goldStamp), 1)
        .setDepth(y - 2)
        .setName("archive-black-vault-door-open-right"));
      this.drawBlackVaultEnterCue(x, y);
    } else {
      for (let i = 0; i < 3; i += 1) {
        this.trackBlackVaultDoorObject(this.add.rectangle(x, y - 4 + i * 6, 30, 2, color(PALETTE.classNetRed), 1)
          .setDepth(y - 2)
          .setName("archive-black-vault-door-lock-bar"));
      }
      this.trackBlackVaultDoorObject(this.add.rectangle(x, y + 2, 8, 8, color(PALETTE.black), 1)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(y - 1)
        .setName("archive-black-vault-door-lock"));
    }

    this.trackBlackVaultDoorObject(this.add.text(x, y - 15, "BLACK\nVAULT", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent,
      align: "center",
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(y - 1).setName("archive-black-vault-door-label"));
    this.trackBlackVaultDoorObject(this.add.text(x, y + 17, status, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: routeOpen ? PALETTE.black : PALETTE.creamPaper,
      align: "center",
      backgroundColor: routeOpen ? PALETTE.terminalCyan : PALETTE.deepRuby
    }).setOrigin(0.5).setDepth(y).setName("archive-black-vault-door-status"));
  }

  private drawBlackVaultEnterCue(x: number, y: number) {
    const cue = this.trackBlackVaultDoorObject(this.add.container(x, y + 33).setDepth(y + 1).setName("archive-black-vault-enter-cue"));
    cue.add(this.add.rectangle(0, 0, 50, 12, color(PALETTE.black), 0.95)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.94)
      .setName("archive-black-vault-enter-cue-back"));
    cue.add(this.add.text(0, -4, "A ENTER", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0).setName("archive-black-vault-enter-cue-text"));
    cue.add(this.add.triangle(-32, -1, 0, 0, 7, 4, 0, 8, color(PALETTE.goldStamp), 0.96)
      .setAngle(180)
      .setName("archive-black-vault-enter-cue-arrow"));
    cue.add(this.add.triangle(32, -1, 0, 0, 7, 4, 0, 8, color(PALETTE.goldStamp), 0.96)
      .setName("archive-black-vault-enter-cue-arrow"));
    this.tweens.add({
      targets: cue,
      y: y + 31,
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
  }

  private clearBlackVaultDoorSeal() {
    for (const object of this.blackVaultDoorObjects) {
      if (object.active) object.destroy();
    }
    this.blackVaultDoorObjects = [];
  }

  private trackBlackVaultDoorObject<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.blackVaultDoorObjects.push(object);
    return this.track(object);
  }

  private tryRouteToNaraStacks() {
    if (this.sourceNoteGateOpen()) {
      this.routeToDanneMap("NaraStacksScene", "A1", 128, 188);
      return;
    }

    retroAudio.warning();
    const message = this.sourceNoteStatus === "inactive"
      ? "Pick up Source Note 47 before leaving the source room."
      : this.sourceNoteStatus === "carried"
        ? "Route Source Note 47 to the research table before taking the stairs."
        : this.sourceNoteStatus === "routed"
          ? "Verify Source Note 47 provenance before taking the stairs."
          : "Stamp Source Note 47 before taking the stairs.";
    setLatestMessage("Source Note 47 locks the NARA II stair route.");
    setObjective("Archive Cavern: verify and stamp Source Note 47 before taking the NARA II stairs.");
    this.dialog.show("NARA II STAIRS", [
      "Visible route. Not open yet.",
      message,
      "The next archive wing opens after the first citation stamp."
    ]);
  }

  private sourceNoteGateOpen() {
    return this.sourceNoteStatus === "stamped"
      || hasProcessItem("citation_stamp");
  }

  private drawNaraStacksGateSeal() {
    this.clearNaraStacksGateSeal();
    if (this.sourceNoteGateOpen()) {
      this.trackNaraStacksGateSeal(this.add.rectangle(128, 191, 42, 4, color(PALETTE.terminalCyan), 0.9).setName("archive-nara-stairs-open-seal").setDepth(170));
      this.trackNaraStacksGateSeal(this.add.text(128, 190, "OPEN", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.black
      }).setName("archive-nara-stairs-open-label").setOrigin(0.5).setDepth(171));
      return;
    }

    this.trackNaraStacksGateSeal(this.add.rectangle(128, 191, 60, 10, color(PALETTE.black), 0.88).setStrokeStyle(1, color(PALETTE.classNetRed)).setName("archive-nara-stairs-source-lock-seal").setDepth(170));
    this.trackNaraStacksGateSeal(this.add.text(128, 188, "SOURCE LOCK", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.classNetRed
    }).setName("archive-nara-stairs-source-lock-label").setOrigin(0.5, 0).setDepth(171));
    this.trackNaraStacksGateSeal(this.add.rectangle(104, 196, 8, 2, color(PALETTE.goldStamp), 1).setName("archive-nara-stairs-source-lock-rivet").setDepth(172));
    this.trackNaraStacksGateSeal(this.add.rectangle(152, 196, 8, 2, color(PALETTE.goldStamp), 1).setName("archive-nara-stairs-source-lock-rivet").setDepth(172));
  }

  private clearNaraStacksGateSeal() {
    for (const object of this.naraStacksGateObjects) {
      if (object.active) object.destroy();
    }
    this.naraStacksGateObjects = [];
  }

  private trackNaraStacksGateSeal<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.naraStacksGateObjects.push(object);
    return this.track(object);
  }

  private updateBureaucraticWalls(delta: number) {
    for (const wall of this.bureaucraticWalls) {
      wall.update(this.time.now, delta, this.player.position);
    }
    this.syncWallInteractables();
    this.syncWallState();
    this.refreshNoRepoStampCue();
    this.refreshReadyWallCues();
    const activeWall = this.bureaucraticWalls.find((wall) => wall.isTouching(this.player.position, 19));
    if (!activeWall || this.time.now < this.wallContactCooldown) return;
    const definition = this.activeEnemyDefs.get(activeWall.id);
    if (this.wallReadyForProcess(definition)) {
      this.wallContactCooldown = this.time.now + 620;
      setNearestInteractable(`${definition?.type ?? "WALL"}: use ${this.readyWallActionLabel(definition)}`);
      setLatestMessage(`${definition?.type ?? "Process wall"} is ready for ${this.readyWallActionLabel(definition)}.`);
      setObjective("Press A near the process wall to apply the verified human workflow step.");
      return;
    }
    activeWall.markHit();
    const hit = this.player.takeHit(activeWall.position, definition?.type === "DANN-E QUEUE" ? 22 : 15);
    if (!hit) return;
    this.wallContactCooldown = this.time.now + 1200;
    applyStandardsViolation("missed_30_year_deadline", `${definition?.type ?? activeWall.label} process wall delayed source work.`);
    this.reliability.update();
    if (definition?.type === "DANN-E QUEUE") setObjective("Use the Golden Rule gate for a human decision.");
    else if (definition?.type === "WAIT") setObjective("Resolve the agency response timer at the referral tray.");
    else setObjective("Clear stonewalls with the matching human process.");
  }

  private wallReadyForProcess(definition?: ArchiveEnemyDefinition) {
    if (!definition) return false;
    if (definition.type === "NO REPO") return this.sourceNoteStatus === "stamped";
    if (definition.type === "FIREWALL") return this.networkRoutingResolved;
    if (definition.type === "PENDING") return this.referralManifestDelivered;
    if (definition.type === "WAIT") return this.agencyTimerResolved;
    if (definition.type === "AMBIGUOUS") return this.specialistDecisionMade;
    if (definition.type === "DANN-E QUEUE") return this.goldenRuleDecisionMade;
    return false;
  }

  private readyWallActionLabel(definition?: ArchiveEnemyDefinition) {
    if (!definition) return "human review";
    if (definition.type === "NO REPO") return "citation stamp";
    if (definition.type === "FIREWALL") return "network routing";
    if (definition.type === "PENDING") return "referral manifest";
    if (definition.type === "WAIT") return "agency timer";
    if (definition.type === "AMBIGUOUS") return "specialist decision";
    if (definition.type === "DANN-E QUEUE") return "Golden Rule decision";
    return "human review";
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
    setVisibleThreats([...activeThreats, this.danneLurker.readout(this.time.now)]);
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
    this.refreshSourceNoteRouteCue();
    this.toast.show("CARRY SN47 TO TABLE", this.player.position, "info");
    setLatestMessage("StateChat flagged a missing repository. Carry Source Note 47 to the research table.");
  }

  private updateSourceNoteInteractionPrompt(delta: number) {
    const hintTarget = this.sourceNoteResearchTableHint();
    const strictTarget = this.isNearResearchTable() ? hintTarget : null;
    this.interactionPrompt.update(
      delta,
      strictTarget ?? hintTarget,
      undefined,
      strictTarget
        ? { badge: "A", text: this.sourceNotePromptText() }
        : hintTarget
        ? { badge: "!", text: "STEP CLOSER" }
        : undefined
    );
  }

  private warnIfSourceNoteHintOnly() {
    if (this.isNearResearchTable() || !this.sourceNoteResearchTableHint()) return false;
    retroAudio.blip();
    setLatestMessage(`Step closer to ${this.researchTable.label}.`);
    return true;
  }

  private sourceNoteResearchTableHint(): Interactable | null {
    if (this.currentRoomId !== "A1") return null;
    const distance = Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      this.researchTable.x,
      this.researchTable.y
    );
    if (distance > 70) return null;
    return {
      id: "source-note-research-table",
      label: this.researchTable.label,
      x: this.researchTable.x,
      y: this.researchTable.y,
      radius: 54,
      kind: "document",
      onInteract: () => undefined
    };
  }

  private sourceNotePromptText() {
    if (this.sourceNoteStatus === "carried") return "ROUTE SRC NOTE";
    if (this.sourceNoteStatus === "routed") return "VERIFY SRC NOTE";
    if (this.sourceNoteStatus === "verified") return "STAMP SRC NOTE";
    return "RESEARCH TABLE";
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
    setNearestInteractable(nearResearchTable ? `${verb} SRC NOTE 47` : null);
    if (this.sourceNoteStatus === "carried") {
      this.hintText.setText(nearResearchTable ? "ROUTE SOURCE NOTE 47" : "CARRY SOURCE NOTE 47");
      setObjective("ROUTE: carry Source Note 47 to research table in A1.");
    } else if (this.sourceNoteStatus === "routed") {
      this.hintText.setText("VERIFY SOURCE NOTE 47");
      setObjective("VERIFY: provenance at research table.");
    } else if (this.sourceNoteStatus === "verified") {
      this.hintText.setText("STAMP SOURCE NOTE 47");
      setObjective("STAMP: apply citation stamp after human review.");
    } else if (this.sourceNoteStatus === "stamped" && !gameState.sceneProgress.annotationDraftingComplete) {
      this.hintText.setText("DRAFT EXPANDED ANNOTATION");
      setObjective("ANNOTATE: draft provenance and context notes at the research table.");
      setNearestInteractable(nearResearchTable ? "DRAFT Annotation" : null);
    }
    this.syncSourceNotePhysicalState(nearResearchTable ? this.researchTable.label : null);
    this.refreshSourceNoteRouteCue();
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
      this.refreshSourceNoteRouteCue();
      return;
    }
    if (this.sourceNoteStatus === "routed") {
      this.showSourceNoteProvenanceChoice();
      return;
    }
    if (this.sourceNoteStatus === "verified") {
      this.sourceNoteStatus = "stamped";
      this.applySourceNoteStamp();
      return;
    }
    if (this.sourceNoteStatus === "stamped" && !gameState.sceneProgress.annotationDraftingComplete) {
      this.showAnnotationDraftingChoice();
    }
  }

  private showSourceNoteProvenanceChoice() {
    if (gameState.sceneProgress.sourceNoteProvenanceComplete) {
      this.completeSourceNoteVerification("Source Note 47 provenance was already checked.");
      return;
    }

    const step = gameState.sceneProgress.sourceNoteProvenanceStep ?? 0;
    const prompt = getSourceNoteProvenancePrompt(step);
    setObjective(`VERIFY: Source Note 47 provenance ${step + 1}/${SOURCE_NOTE_PROVENANCE_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateSourceNoteProvenanceAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        adjustReliability(-2, "source-note provenance correction");
        setLatestMessage("PROVENANCE CANNOT BE GUESSED");
        this.reliability.update();
        this.dialog.show("SOURCE NOTE 47", [
          result.message,
          "Return to the repository, collection, and folder trail before stamping."
        ], () => this.showSourceNoteProvenanceChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.sourceNoteProvenanceStep = nextStep;
      if (!sourceNoteProvenanceComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Source Note 47 provenance check ${nextStep}/${SOURCE_NOTE_PROVENANCE_PROMPTS.length}.`);
        this.dialog.show("SOURCE NOTE 47", [
          result.message,
          "Continue the human provenance check before the citation stamp."
        ], () => this.showSourceNoteProvenanceChoice());
        return;
      }

      gameState.sceneProgress.sourceNoteProvenanceComplete = 1;
      this.completeSourceNoteVerification(result.message);
    });
  }

  private completeSourceNoteVerification(message: string) {
    this.sourceNoteStatus = "verified";
    setDocumentWorkflowState("source_note_047", "citation_verified");
    addDocumentPoints(6, "Source Note 47 provenance matched to repository, collection, and folder");
    this.addVerificationGlow();
    setLatestMessage("VERIFIED BY HUMAN REVIEW - SOURCE NOTE PROVENANCE");
    setObjective("STAMP: apply citation stamp after human provenance review.");
    retroAudio.confirm();
    this.reliability.update();
    this.updateSourceNoteVerification();
    this.refreshSourceNoteRouteCue();
    this.toast.show("SN47 VERIFIED - STAMP NEXT", this.player.position, "info");
    setLatestMessage(`${message} Apply the citation stamp to lock the source note.`);
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
    addSnesRewardBurst(this, this.researchTable.x + 20, this.researchTable.y - 36, "citation-stamp", "Citation Stamp", (object) => this.track(object));
    adjustReliability(10, "provenance verified by a human");
    setHeldItem(null);
    setNearestInteractable(null);
    setLatestMessage("VERIFIED BY HUMAN REVIEW");
    this.syncSourceNotePhysicalState(this.researchTable.label, "DONE");
    this.clearSourceNoteRouteCue();
    this.drawNaraStacksGateSeal();
    this.syncRoomTraversalState();
    this.refreshNoRepoStampCue();
    this.reliability.update();
    this.showAnnotationDraftingChoice();
    this.syncRoomTraversalState();
    this.time.delayedCall(0, () => this.syncRoomTraversalState());
  }

  private refreshNoRepoStampCue() {
    const wall = this.activeEnemyWalls.get("repo-wall");
    if (this.currentRoomId !== "A1" || this.sourceNoteStatus !== "stamped" || !wall || wall.isCleared) {
      this.clearNoRepoStampCue();
      return;
    }

    const position = wall.position;
    const { x, y } = this.readyWallCuePosition(position.x, position.y, 26);
    if (this.noRepoStampCue?.active) {
      this.noRepoStampCue.setPosition(x, y);
      this.noRepoStampCue.setDepth(268);
      return;
    }

    const ring = this.add.rectangle(0, 0, 42, 22, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 0.96)
      .setName("archive-no-repo-stamp-target-ring");
    const crossH = this.add.rectangle(0, 0, 30, 2, color(PALETTE.goldStamp), 0.88)
      .setName("archive-no-repo-stamp-target-cross");
    const crossV = this.add.rectangle(0, 0, 2, 18, color(PALETTE.creamPaper), 0.82)
      .setName("archive-no-repo-stamp-target-cross");
    const plate = this.add.rectangle(0, -19, 34, 9, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.classNetRed), 0.86)
      .setName("archive-no-repo-stamp-target-plate");
    const label = this.add.text(0, -23, "STAMP", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setName("archive-no-repo-stamp-target-label")
      .setOrigin(0.5, 0);
    const arrow = this.add.triangle(0, 18, 0, 0, 10, 0, 5, 8, color(PALETTE.goldStamp), 0.9)
      .setName("archive-no-repo-stamp-target-arrow")
      .setAngle(90);
    this.noRepoStampCue = this.track(this.add.container(x, y, [
      ring,
      crossH,
      crossV,
      plate,
      label,
      arrow
    ]).setName("archive-no-repo-stamp-target-cue").setDepth(268));
    this.tweens.add({
      targets: this.noRepoStampCue,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
  }

  private clearNoRepoStampCue() {
    if (this.noRepoStampCue?.active) this.noRepoStampCue.destroy();
    this.noRepoStampCue = undefined;
  }

  private refreshReadyWallCues() {
    const activeReadyIds = new Set<string>();
    for (const [id, wall] of this.activeEnemyWalls) {
      const definition = this.activeEnemyDefs.get(id);
      if (!definition || definition.type === "NO REPO" || !this.wallReadyForProcess(definition) || wall.isCleared) continue;
      activeReadyIds.add(id);
      const position = wall.position;
      const { x, y } = this.readyWallCuePosition(position.x, position.y, 27);
      const existing = this.readyWallCues.get(id);
      if (existing?.active) {
        existing.setPosition(x, y).setDepth(267);
        continue;
      }
      this.readyWallCues.set(id, this.drawReadyWallCue(id, x, y, this.readyWallCueText(definition)));
    }

    for (const id of [...this.readyWallCues.keys()]) {
      if (!activeReadyIds.has(id)) this.clearReadyWallCue(id);
    }
  }

  private drawReadyWallCue(id: string, x: number, y: number, action: string) {
    const ring = this.add.rectangle(0, 0, 44, 22, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(PALETTE.terminalCyan), 0.92)
      .setName("archive-ready-wall-ring");
    const crossH = this.add.rectangle(0, 0, 28, 2, color(PALETTE.terminalCyan), 0.82)
      .setName("archive-ready-wall-cross");
    const crossV = this.add.rectangle(0, 0, 2, 18, color(PALETTE.goldStamp), 0.78)
      .setName("archive-ready-wall-cross");
    const plate = this.add.rectangle(0, -19, 42, 10, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.86)
      .setName("archive-ready-wall-plate");
    const label = this.add.text(0, -23, "READY", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }).setName("archive-ready-wall-label")
      .setOrigin(0.5, 0);
    const actionLabel = this.add.text(0, 13, action, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setName("archive-ready-wall-action")
      .setOrigin(0.5, 0);
    const arrow = this.add.triangle(0, 23, 0, 0, 10, 0, 5, 8, color(PALETTE.terminalCyan), 0.9)
      .setName("archive-ready-wall-arrow")
      .setAngle(90);

    const cue = this.track(this.add.container(x, y, [
      ring,
      crossH,
      crossV,
      plate,
      label,
      actionLabel,
      arrow
    ]).setName("archive-ready-wall-cue").setData("wallId", id).setDepth(267));
    this.tweens.add({
      targets: cue,
      scaleX: 1.07,
      scaleY: 1.07,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
    return cue;
  }

  private clearReadyWallCue(id: string) {
    const cue = this.readyWallCues.get(id);
    if (cue?.active) cue.destroy();
    this.readyWallCues.delete(id);
  }

  private readyWallCueText(definition: ArchiveEnemyDefinition) {
    if (definition.type === "FIREWALL") return "ROUTE";
    if (definition.type === "PENDING") return "MANIFEST";
    if (definition.type === "WAIT") return "TIMER";
    if (definition.type === "AMBIGUOUS") return "DECIDE";
    if (definition.type === "DANN-E QUEUE") return "RULE";
    return "REVIEW";
  }

  private readyWallCuePosition(x: number, y: number, offset: number) {
    return {
      x: Math.round(Phaser.Math.Clamp(x, PLAY_BOUNDS.left + 24, PLAY_BOUNDS.right - 24)),
      y: Math.round(Phaser.Math.Clamp(y - offset, PLAY_BOUNDS.top + 28, GAME_HEIGHT - 92))
    };
  }

  private showArchiveKeyRewardCue() {
    if (this.archiveKeyRewardCue?.active) this.archiveKeyRewardCue.destroy();
    const dungeon = gameState.dungeons.archive_cavern;
    const keyCount = `${dungeon.smallKeys}/${Math.max(1, dungeon.smallKeysRequired)}`;
    const back = this.add.rectangle(0, 0, 104, 34, color(PALETTE.black), 0.9)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 0.96)
      .setName("archive-chapter-key-reward-back");
    const keyStem = this.add.rectangle(-38, -2, 18, 4, color(PALETTE.goldStamp), 1)
      .setName("archive-chapter-key-reward-icon");
    const keyHead = this.add.rectangle(-50, -2, 10, 10, color(PALETTE.black), 1)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 1)
      .setName("archive-chapter-key-reward-icon");
    const keyBitA = this.add.rectangle(-28, 2, 4, 7, color(PALETTE.goldStamp), 1)
      .setName("archive-chapter-key-reward-icon");
    const keyBitB = this.add.rectangle(-22, 0, 4, 5, color(PALETTE.goldStamp), 1)
      .setName("archive-chapter-key-reward-icon");
    const title = this.add.text(-8, -13, "CHAPTER KEY", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0)
      .setName("archive-chapter-key-reward-label");
    const count = this.add.text(31, -1, keyCount, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0.5)
      .setName("archive-chapter-key-reward-count");
    const route = this.add.text(0, 10, "NARA II ROUTE OPEN", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0)
      .setName("archive-chapter-key-reward-route");

    this.archiveKeyRewardCue = this.track(this.add.container(128, 58, [
      back,
      keyStem,
      keyHead,
      keyBitA,
      keyBitB,
      title,
      count,
      route
    ]).setName("archive-chapter-key-reward-cue").setDepth(286));
    this.archiveKeyRewardCue.setAlpha(0);
    this.tweens.add({
      targets: this.archiveKeyRewardCue,
      alpha: 1,
      y: 54,
      duration: 180,
      ease: "Stepped"
    });
    this.time.delayedCall(1700, () => {
      if (!this.archiveKeyRewardCue?.active) return;
      this.tweens.add({
        targets: this.archiveKeyRewardCue,
        alpha: 0,
        duration: 220,
        ease: "Stepped",
        onComplete: () => {
          if (this.archiveKeyRewardCue?.active) this.archiveKeyRewardCue.destroy();
          this.archiveKeyRewardCue = undefined;
        }
      });
    });
    setObjective("Archive Cavern: use the Citation Stamp route to enter NARA II or clear the next source lock.");
  }

  private refreshSourceNoteRouteCue() {
    if (this.currentRoomId !== "A1") {
      this.clearSourceNoteRouteCue();
      return;
    }
    if (this.sourceNoteStatus !== "carried" && this.sourceNoteStatus !== "routed" && this.sourceNoteStatus !== "verified") {
      this.clearSourceNoteRouteCue();
      return;
    }

    const start = this.sourceNoteStatus === "carried"
      ? { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 15) }
      : {
          x: Math.round(this.sourceNoteIcon?.x ?? this.researchTable.x - 16),
          y: Math.round(this.sourceNoteIcon?.y ?? this.researchTable.y - 17)
        };
    const end = { x: Math.round(this.researchTable.x), y: Math.round(this.researchTable.y) };
    const cueKey = `${this.currentRoomId}:${this.sourceNoteStatus}:${start.x},${start.y}->${end.x},${end.y}`;
    if (cueKey === this.sourceNoteRouteCueKey) return;

    this.clearSourceNoteRouteCue();
    this.sourceNoteRouteCueKey = cueKey;
    this.drawSourceNoteRouteCue(this.verbForSourceNote(), start, end);
  }

  private clearSourceNoteRouteCue() {
    for (const object of this.sourceNoteRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.sourceNoteRouteCueObjects = [];
    this.sourceNoteRouteCueKey = "";
  }

  private trackSourceNoteRouteCue<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.sourceNoteRouteCueObjects.push(object);
    return this.track(object);
  }

  private drawSourceNoteRouteCue(verb: "ROUTE" | "VERIFY" | "STAMP", start: { x: number; y: number }, end: { x: number; y: number }) {
    const accent = verb === "ROUTE"
      ? PALETTE.terminalCyan
      : verb === "VERIFY"
        ? PALETTE.goldStamp
        : PALETTE.classNetRed;
    this.trackSourceNoteRouteCue(this.add.ellipse(end.x, end.y + 12, 88, 18, color(PALETTE.black), 0.34)
      .setName("archive-source-note-route-shadow")
      .setDepth(136));
    this.trackSourceNoteRouteCue(this.add.rectangle(end.x, end.y + 1, 78, 34, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(accent))
      .setName("archive-source-note-route-table-glow")
      .setDepth(236));

    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(7, Math.floor(distance / 13)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      const x = Math.round(Phaser.Math.Linear(start.x, end.x, t));
      const y = Math.round(Phaser.Math.Linear(start.y, end.y, t));
      this.trackSourceNoteRouteCue(this.add.rectangle(x, y, 5, 5, color(index % 2 === 0 ? PALETTE.goldStamp : accent), 0.9)
        .setAngle(45)
        .setName("archive-source-note-route-dot")
        .setDepth(237));
    }

    this.trackSourceNoteRouteCue(this.add.rectangle(end.x, end.y + 32, 54, 10, color(PALETTE.black), 0.92)
      .setStrokeStyle(1, color(accent))
      .setName("archive-source-note-route-label-frame")
      .setDepth(238));
    this.trackSourceNoteRouteCue(this.add.text(end.x, end.y + 29, `${verb} HERE`, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setName("archive-source-note-route-label")
      .setOrigin(0.5, 0)
      .setDepth(239));
  }

  private showAnnotationDraftingChoice() {
    if (!gameState.sceneProgress.sourceNoteProvenanceComplete || this.sourceNoteStatus !== "stamped") {
      this.dialog.show("ANNOTATION", "Verify and stamp Source Note 47 before drafting annotation.");
      return;
    }
    if (gameState.sceneProgress.annotationDraftingComplete) {
      this.finishArchiveIfReady();
      return;
    }

    const step = gameState.sceneProgress.annotationDraftingStep ?? 0;
    const prompt = getAnnotationDraftingPrompt(step);
    setObjective(`ANNOTATE: draft expanded annotation ${step + 1}/${ANNOTATION_DRAFTING_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateAnnotationDraftingAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Annotation drafting shortcut: ${option.value}`);
        this.reliability.update();
        this.dialog.show("ANNOTATION", [
          result.message,
          "Annotation must make provenance and context visible to the reader."
        ], () => this.showAnnotationDraftingChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.annotationDraftingStep = nextStep;
      if (!annotationDraftingComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Annotation drafting check ${nextStep}/${ANNOTATION_DRAFTING_PROMPTS.length}.`);
        this.dialog.show("ANNOTATION", [
          result.message,
          "Continue drafting expanded annotation before manuscript review."
        ], () => this.showAnnotationDraftingChoice());
        return;
      }

      gameState.sceneProgress.annotationDraftingComplete = 1;
      gameState.sceneProgress.annotationDraftingStep = ANNOTATION_DRAFTING_PROMPTS.length;
      for (const documentId of ["source_note_047", "cross_reference_001", "sbu_annotation_001"]) {
        setDocumentWorkflowState(documentId, "ready_for_review", "expanded annotation drafted for provenance, context, and selectivity");
      }
      addDocumentPoints(8, "expanded annotation drafted");
      retroAudio.confirm();
      setLatestMessage("Expanded annotation drafted: provenance and context notes filed.");
      setObjective("Annotation filed. Collect remaining document tiles, then route the manuscript onward.");
      this.reliability.update();
      this.dialog.show("ANNOTATION", [
        result.message,
        "Expanded annotation now covers provenance, persons/events/policies, references, and attachments.",
        "The manuscript can move toward human review once the room packet is complete."
      ], () => this.finishArchiveIfReady());
    });
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
      && Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, this.researchTable.x, this.researchTable.y) <= 54;
  }

  private finishArchiveIfReady() {
    if (this.sourceNoteStatus !== "stamped") {
      setObjective("Archive Cavern: pick up Source Note 47 in A1.");
      return;
    }
    if (!gameState.sceneProgress.annotationDraftingComplete) {
      setObjective("ANNOTATE: draft expanded annotation at the research table.");
      this.dialog.show("ELENA", [
        "The citation stamp proves the source trail.",
        "Now draft the annotation: provenance, context, references, and attachments."
      ], () => this.showAnnotationDraftingChoice());
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

    const heldItems = getHeldProcessItemIds();
    if (!canTraverseExit(currentRoom.id, direction, heldItems)) {
      const prompt = blockedExitPrompt(currentRoom.id, direction, heldItems);
      setLatestMessage(prompt.message);
      setObjective(prompt.objective);
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
    const lockedExits = this.compassLockedExits(room);
    setRoomTraversalState({
      currentRoomId: room.id,
      roomTitle: room.title,
      roomType: room.roomType,
      visitedRoomIds: [...this.visitedRoomIds],
      revealedRoomIds: [
        ...Object.values(ARCHIVE_ROOMS)
          .filter((candidate) => candidate.roomType !== "secret")
          .map((candidate) => candidate.id),
        ...this.revealedSecretIds,
        ...getRevealedShortcutRoomIds(getHeldProcessItemIds()).filter((roomId): roomId is ArchiveRoomId => roomId in ARCHIVE_ROOMS)
      ],
      exits: room.exits,
      lockedExits,
      requiredItems: room.requiredItems
    });
  }

  private drawVisitedMinimap() {
    this.add.rectangle(26, 16, 42, 27, color(PALETTE.black)).setDepth(878);
    this.drawArchiveCompassRelic(58, 16);
    for (const room of Object.values(ARCHIVE_ROOMS)) {
      const x = 14 + room.grid.x * 12;
      const y = 8 + room.grid.y * 6;
      const cell = this.add.rectangle(x, y, 8, 5, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.stoneLight))
        .setDepth(879)
        .setName("archive-minimap-cell");
      const label = this.add.text(x, y - 3, "", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.black
      }).setOrigin(0.5, 0).setDepth(880).setName("archive-minimap-label");
      const marker = this.add.text(x, y - 1, "", {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.goldStamp
      }).setOrigin(0.5, 0.5).setDepth(881).setName("archive-minimap-marker");
      this.mapCells.set(room.id, cell);
      this.mapLabels.set(room.id, label);
      this.mapMarkers.set(room.id, marker);
    }
  }

  private drawArchiveCompassRelic(x: number, y: number) {
    this.add.rectangle(x, y, 23, 25, color(PALETTE.black), 0.92)
      .setName("archive-compass-relic-panel")
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.9)
      .setDepth(878);
    if (this.textures.exists(SNES_ARCHIVE_COMPASS_RELIC_ASSET.key)) {
      this.add.image(x, y - 2, SNES_ARCHIVE_COMPASS_RELIC_ASSET.key)
        .setName("archive-compass-relic")
        .setDepth(880);
    } else {
      this.add.rectangle(x, y - 2, 18, 18, color(PALETTE.terminalCyan), 0.86)
        .setName("archive-compass-relic-fallback")
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(880);
    }
    this.archiveCompassRelicLabel = this.add.text(x, y + 8, "MAP", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setName("archive-compass-relic-label").setOrigin(0.5, 0).setDepth(881);
  }

  private updateVisitedMinimap() {
    const dungeonMapRevealed = gameState.dungeons.archive_cavern?.mapRevealed ?? false;
    this.archiveCompassRelicLabel?.setText(dungeonMapRevealed ? "MAP" : "???")
      .setColor(dungeonMapRevealed ? PALETTE.goldStamp : PALETTE.stoneGray);
    for (const room of Object.values(ARCHIVE_ROOMS)) {
      const visited = this.visitedRoomIds.has(room.id);
      const revealed = room.roomType !== "secret" || this.revealedSecretIds.has(room.id) || visited || dungeonMapRevealed;
      const current = room.id === this.currentRoomId;
      this.mapCells.get(room.id)?.setFillStyle(color(current ? PALETTE.goldStamp : visited ? PALETTE.stoneLight : revealed ? PALETTE.stoneDark : PALETTE.black));
      this.mapLabels.get(room.id)?.setText(visited ? room.id : revealed && room.roomType === "secret" ? "?" : "").setColor(current ? PALETTE.black : PALETTE.shadowNavy);
      const marker = this.minimapMarkerForRoom(room, revealed, visited, current);
      this.mapMarkers.get(room.id)
        ?.setText(marker.text)
        .setColor(marker.color)
        .setVisible(Boolean(marker.text));
    }
  }

  private minimapMarkerForRoom(room: ArchiveRoom, revealed: boolean, visited: boolean, current: boolean) {
    if (!revealed) return { text: "", color: PALETTE.black };
    const colorHex = current ? PALETTE.black : PALETTE.goldStamp;
    if (room.roomType === "secret") return { text: visited ? "S" : "?", color: current ? PALETTE.black : PALETTE.terminalCyan };
    if (room.roomType === "reward") return { text: "R", color: colorHex };
    if (room.roomType === "boss") return { text: "B", color: current ? PALETTE.black : PALETTE.classNetRed };
    return { text: "", color: PALETTE.black };
  }

  private drawRoomExits(room: ArchiveRoom) {
    const exits = room.exits;
    (["north", "south", "west", "east"] as Direction[]).forEach((direction) => {
      const target = exits[direction];
      const hasExit = !!target;
      this.drawGate(direction, hasExit, hasExit ? this.exitIsOpen(room, direction) : false, room.requiredItems?.[direction], target ? this.gateRouteLabel(target) : undefined, target);
    });
  }

  private compassLockedExits(room: ArchiveRoom) {
    const locked: Partial<Record<Direction, string>> = {};
    (["north", "south", "west", "east"] as Direction[]).forEach((direction) => {
      if (room.exits[direction] && !this.exitIsOpen(room, direction)) {
        locked[direction] = room.lockedExits?.[direction] ?? room.requiredItems?.[direction] ?? "LOCK";
      }
    });
    return locked;
  }

  private exitIsOpen(room: ArchiveRoom, direction: Direction) {
    const target = room.exits[direction];
    if (!target) return false;
    const targetRoom = ARCHIVE_ROOMS[target];
    if (targetRoom.roomType === "secret" && !this.revealedSecretIds.has(target)) return false;
    return canTraverseExit(room.id, direction, getHeldProcessItemIds());
  }

  private drawGate(direction: Direction, hasExit: boolean, unlocked: boolean, requiredItem?: ProcessItemId, exitLabel?: string, target?: ArchiveRoomId) {
    addSnesGate(this, {
      direction,
      hasExit,
      unlocked,
      accent: unlocked ? PALETTE.goldStamp : PALETTE.stoneGray,
      lockLabel: requiredItem ? requiredItem.split("_")[0].slice(0, 4).toUpperCase() : "LOCK",
      exitLabel,
      track: (object) => this.track(object),
      depth: 61
    });
    if (target && ARCHIVE_ROOMS[target].roomType === "secret") {
      this.drawSecretExitMarker(direction, this.revealedSecretIds.has(target), requiredItem);
    }
    if (!hasExit) {
      if (direction === "north") this.addSolid(112, 32, 32, 16);
      else if (direction === "south") this.addSolid(112, 208, 32, 16);
      else if (direction === "west") this.addSolid(0, 104, 16, 32);
      else this.addSolid(240, 104, 16, 32);
    }
  }

  private gateRouteLabel(target: ArchiveRoomId) {
    const room = ARCHIVE_ROOMS[target];
    if (room.roomType === "reward") return "REWARD";
    if (room.roomType === "secret") return "SECRET";
    if (room.roomType === "boss") return "BOSS";
    if (room.roomType === "puzzle") return "PUZZLE";
    if (room.roomType === "hint") return "HINT";
    return target;
  }

  private drawSecretExitMarker(direction: Direction, revealed: boolean, requiredItem?: ProcessItemId) {
    const accent = revealed ? PALETTE.goldStamp : requiredItem ? PALETTE.terminalCyan : PALETTE.buckramHighlight;
    const label = revealed ? "SECRET" : requiredItem ? "SEAM" : "?";
    const horizontal = direction === "north" || direction === "south";
    const x = direction === "west" ? 31 : direction === "east" ? 225 : 128;
    const y = direction === "north" ? 57 : direction === "south" ? 160 : 120;
    const plateWidth = revealed ? 36 : 26;
    const plateHeight = 10;
    this.track(this.add.rectangle(x, y, horizontal ? plateWidth : plateHeight, horizontal ? plateHeight : plateWidth, color(PALETTE.black), 0.92)
      .setStrokeStyle(1, color(accent), 0.9)
      .setName("archive-secret-exit-marker")
      .setDepth(77));
    if (horizontal) {
      this.track(this.add.rectangle(x - 7, y, 10, 1, color(accent), 0.96)
        .setAngle(-18)
        .setName("archive-secret-exit-crack")
        .setDepth(78));
      this.track(this.add.rectangle(x + 4, y + 1, 8, 1, color(accent), 0.9)
        .setAngle(20)
        .setName("archive-secret-exit-crack")
        .setDepth(78));
      this.track(this.add.text(x, y - 4, label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: accent
      }).setOrigin(0.5, 0)
        .setName("archive-secret-exit-label")
        .setDepth(79));
      return;
    }

    this.track(this.add.rectangle(x, y - 7, 1, 10, color(accent), 0.96)
      .setAngle(-18)
      .setName("archive-secret-exit-crack")
      .setDepth(78));
    this.track(this.add.rectangle(x + 1, y + 4, 1, 8, color(accent), 0.9)
      .setAngle(20)
      .setName("archive-secret-exit-crack")
      .setDepth(78));
    this.track(this.add.text(x, y - 9, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5, 0)
      .setName("archive-secret-exit-label")
      .setDepth(79));
  }

  private drawBookcase(x: number, y: number, width = 34, height = 34) {
    const prop = this.drawArchivePropFrame("bookcase", x, y, y - 1, "bookcase");
    if (!prop) {
      this.track(this.add.rectangle(x, y, width, height, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.deepRuby)).setDepth(y - 2));
      for (let row = -1; row <= 1; row += 1) {
        const shelfY = y + row * 9;
        this.track(this.add.rectangle(x, shelfY + 4, width - 5, 1, color(PALETTE.goldStamp)).setDepth(y - 1));
        for (let i = 0; i < 5; i += 1) {
          const bookColor = [PALETTE.buckramRed, PALETTE.goldStamp, PALETTE.archiveAmber, PALETTE.creamPaper][(i + row + 4) % 4];
          this.track(this.add.rectangle(x - width / 2 + 6 + i * 5, shelfY, 3, 7, color(bookColor)).setDepth(y - 1));
        }
      }
    }
    const solidX = Math.round((x - width / 2) / 8) * 8;
    const solidY = Math.round((y - height / 2) / 8) * 8;
    this.addSolid(solidX + 4, solidY + 4, Math.max(8, width - 8), Math.max(8, height - 8));
  }

  private drawDesk(x: number, y: number, label?: string) {
    const prop = this.drawArchivePropFrame("desk", x, y, y - 1, "desk");
    if (!prop) {
      this.track(this.add.rectangle(x, y, 38, 20, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(y - 2));
      this.track(this.add.rectangle(x - 12, y - 4, 10, 6, color(PALETTE.creamPaper)).setDepth(y - 1));
      this.track(this.add.rectangle(x + 8, y + 2, 12, 2, color(PALETTE.archiveAmber)).setDepth(y - 1));
    }
    if (label) {
      this.track(this.add.text(x, y - 4, label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.black
      }).setOrigin(0.5).setDepth(y));
    }
  }

  private drawArchiveDoor(x: number, y: number, label: string, accent: string) {
    this.track(this.add.ellipse(x + 1, y + 8, 34, 8, color(PALETTE.black), 0.48).setDepth(y - 4));
    this.track(this.add.rectangle(x, y, 42, 18, color(PALETTE.black)).setStrokeStyle(1, color(accent)).setDepth(y - 3));
    this.track(this.add.rectangle(x, y + 4, 30, 8, color(PALETTE.deepRuby)).setDepth(y - 2));
    this.track(this.add.text(x, y - 8, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent,
      align: "center",
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(y - 1));
  }

  private drawWallMap(x: number, y: number, label = "MAP") {
    this.track(this.add.rectangle(x + 2, y + 3, 48, 30, color(PALETTE.black)).setDepth(y - 3));
    if (this.textures.exists(SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.key)) {
      this.track(this.add.image(x, y, SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.key)
        .setName(`archive-wall-map-board-${label}`)
        .setDepth(y - 2));
    } else {
      this.track(this.add.rectangle(x, y, 48, 30, color(PALETTE.creamPaper)).setStrokeStyle(2, color(PALETTE.sepiaInk)).setDepth(y - 2));
      this.track(this.add.rectangle(x - 16, y - 7, 12, 7, color(PALETTE.mapWater)).setDepth(y - 1));
      this.track(this.add.rectangle(x - 2, y - 3, 18, 3, color(PALETTE.archiveAmber)).setDepth(y - 1));
      this.track(this.add.rectangle(x + 7, y + 5, 13, 3, color(PALETTE.buckramRed)).setDepth(y - 1));
      this.track(this.add.rectangle(x - 14, y + 8, 5, 5, color(PALETTE.goldStamp)).setDepth(y));
      this.track(this.add.rectangle(x + 17, y - 8, 4, 4, color(PALETTE.classNetRed)).setDepth(y));
    }
    this.drawWallMapMarkers(x, y, label);
    this.track(this.add.text(x, y + 10, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5).setDepth(y + 1));
    this.addSolid(104, 48, 48, 28);
  }

  private drawWallMapMarkers(x: number, y: number, label: string) {
    const routeRoomIds = this.wallMapRouteRoomIds(label);
    const markerTextureReady = this.textures.exists(SNES_ROOM_MAP_MARKER_ASSET.key);
    for (const roomId of routeRoomIds) {
      const room = ARCHIVE_ROOMS[roomId];
      const visited = this.visitedRoomIds.has(room.id);
      const dungeonMapRevealed = gameState.dungeons.archive_cavern?.mapRevealed ?? false;
      const revealed = room.roomType !== "secret" || this.revealedSecretIds.has(room.id) || visited || dungeonMapRevealed;
      const current = room.id === this.currentRoomId;
      const px = Math.round(x - 17 + room.grid.x * 11);
      const py = Math.round(y - 8 + room.grid.y * 6);
      const frame = this.wallMapMarkerFrame(room, revealed, visited, current);
      if (markerTextureReady) {
        this.track(this.add.image(px, py, SNES_ROOM_MAP_MARKER_ASSET.key, frame)
          .setName(`archive-wall-map-marker-${label}-${room.id}-${frame}`)
          .setDepth(y + 2)
          .setAlpha(current || visited ? 1 : 0.82));
      } else {
        const fill = frame === "current"
          ? PALETTE.goldStamp
          : frame === "boss"
            ? PALETTE.classNetRed
            : frame === "reward"
              ? PALETTE.terminalCyan
              : frame === "visited"
                ? PALETTE.stoneLight
                : PALETTE.stoneDark;
        this.track(this.add.rectangle(px, py, 5, 5, color(fill), current || visited ? 1 : 0.82)
          .setName(`archive-wall-map-marker-fallback-${label}-${room.id}`)
          .setDepth(y + 2));
      }
    }
  }

  private wallMapRouteRoomIds(label: string): ArchiveRoomId[] {
    if (label === "A3") return ["A1", "A3", "C3", "D1"];
    if (label === "B3") return ["B1", "B2", "C2", "D3"];
    return ["A1", "B1", "C1", "D1"];
  }

  private wallMapMarkerFrame(room: ArchiveRoom, revealed: boolean, visited: boolean, current: boolean): ArchiveWallMapMarkerFrame {
    if (current) return "current";
    if (!revealed) return "locked";
    if (room.roomType === "boss") return "boss";
    if (room.roomType === "reward") return "reward";
    return visited ? "visited" : "locked";
  }

  private drawDocumentStack(x: number, y: number, flagged = false) {
    const prop = this.drawArchivePropFrame("document_stack", x, y - 4, y + 4, "document-stack");
    if (!prop) {
      for (let i = 0; i < 4; i += 1) {
        this.track(this.add.rectangle(x + i, y - i * 3, 20, 12, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(y + i));
        this.track(this.add.rectangle(x - 5 + i, y - 2 - i * 3, 9, 1, color(PALETTE.sepiaInk)).setDepth(y + i + 1));
      }
    }
    if (flagged) this.track(this.add.rectangle(x - 12, y - 9, 3, 22, color(PALETTE.classNetRed)).setDepth(y + 6));
  }

  private drawRubyVolumeStack(x: number, y: number, count = 3) {
    const prop = this.drawArchivePropFrame("ruby_volumes", x, y - 5, y + count, "ruby-volumes");
    if (!prop) {
      for (let i = 0; i < count; i += 1) {
        this.track(this.add.rectangle(x + i * 3, y - i * 6, 24, 8, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(y + i));
        this.track(this.add.rectangle(x - 5 + i * 3, y - i * 6, 10, 1, color(PALETTE.goldStamp)).setDepth(y + i + 1));
      }
    }
  }

  private drawArchiveRoomDetailLayer(room: ArchiveRoom) {
    const seed = room.id.charCodeAt(0) * 11 + Number(room.id.slice(1)) * 17;
    const wallCaps = [
      [48, 50],
      [80, 50],
      [176, 50],
      [208, 50],
      [48, 204],
      [80, 204],
      [176, 204],
      [208, 204]
    ] as const;
    wallCaps.forEach(([x, y]) => {
      const detail = this.drawArchiveRoomDetailFrame("wall_cap", x, y, -7, `wall-cap-${x}-${y}`);
      if (detail instanceof Phaser.GameObjects.Image) detail.setFlipY(y > 120);
    });

    ([
      { x: 30, y: 52, flipX: false, flipY: false },
      { x: 226, y: 52, flipX: true, flipY: false },
      { x: 30, y: 202, flipX: false, flipY: true },
      { x: 226, y: 202, flipX: true, flipY: true }
    ] as const).forEach((corner) => {
      const detail = this.drawArchiveRoomDetailFrame("corner_shadow", corner.x, corner.y, -8, `corner-${corner.x}-${corner.y}`);
      if (detail instanceof Phaser.GameObjects.Image) detail.setFlipX(corner.flipX).setFlipY(corner.flipY);
    });

    const scuffs = [
      { x: 58 + (seed % 5) * 12, y: 82 + (seed % 3) * 18 },
      { x: 112 + (seed % 4) * 11, y: 138 + (seed % 2) * 20 },
      { x: 192 - (seed % 5) * 9, y: 100 + (seed % 4) * 18 },
      { x: 76 + (seed % 3) * 21, y: 174 - (seed % 3) * 8 }
    ];
    scuffs.forEach((scuff, index) => {
      this.drawArchiveRoomDetailFrame("floor_scuff", scuff.x, scuff.y, -6, `floor-scuff-${index}`);
    });

    (["north", "south", "west", "east"] as Direction[]).forEach((direction) => {
      const target = room.exits[direction];
      if (!target) return;
      const frame = this.archiveThresholdFrame(room, direction, target);
      const position = this.archiveThresholdPosition(direction);
      this.drawArchiveRoomDetailFrame(frame, position.x, position.y, 67, `threshold-${direction}-${frame}`)
        ?.setAngle(position.angle);
    });
  }

  private archiveThresholdFrame(
    room: ArchiveRoom,
    direction: Direction,
    target: ArchiveRoomId
  ): ArchiveRoomDetailFrame {
    if (room.roomType === "boss" || ARCHIVE_ROOMS[target].roomType === "boss") return "threshold_boss";
    return this.exitIsOpen(room, direction) ? "threshold_open" : "threshold_locked";
  }

  private archiveThresholdPosition(direction: Direction) {
    if (direction === "north") return { x: 128, y: 58, angle: 0 };
    if (direction === "south") return { x: 128, y: 198, angle: 0 };
    if (direction === "west") return { x: 34, y: 120, angle: -90 };
    return { x: 222, y: 120, angle: 90 };
  }

  private drawArchiveRoomDetailFrame(
    frame: ArchiveRoomDetailFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | null {
    const px = Math.round(x);
    const py = Math.round(y);
    if (this.textures.exists(SNES_ARCHIVE_ROOM_DETAIL_ASSET.key)) {
      const texture = this.textures.get(SNES_ARCHIVE_ROOM_DETAIL_ASSET.key);
      if (texture.has(frame)) {
        return this.track(this.add.image(px, py, SNES_ARCHIVE_ROOM_DETAIL_ASSET.key, frame)
          .setName(`archive-room-detail-${name}`)
          .setDepth(depth));
      }
    }

    const fallback = this.archiveRoomDetailFallback(frame, px, py, depth, name);
    return fallback ? this.track(fallback) : null;
  }

  private archiveRoomDetailFallback(
    frame: ArchiveRoomDetailFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ) {
    if (frame === "floor_scuff") {
      return this.add.rectangle(x, y, 12, 2, color(PALETTE.sepiaInk), 0.44)
        .setName(`archive-room-detail-fallback-${name}`)
        .setDepth(depth);
    }
    if (frame === "corner_shadow") {
      return this.add.rectangle(x, y, 12, 12, color(PALETTE.black), 0.38)
        .setName(`archive-room-detail-fallback-${name}`)
        .setDepth(depth);
    }
    if (frame === "wall_cap") {
      return this.add.rectangle(x, y, 16, 5, color(PALETTE.goldStamp), 0.72)
        .setName(`archive-room-detail-fallback-${name}`)
        .setDepth(depth);
    }
    const fill = frame === "threshold_open"
      ? PALETTE.terminalCyan
      : frame === "threshold_boss"
        ? PALETTE.goldStamp
        : PALETTE.classNetRed;
    return this.add.rectangle(x, y, 16, 5, color(fill), 0.82)
      .setName(`archive-room-detail-fallback-${name}`)
      .setDepth(depth);
  }

  private drawArchivePropFrame(
    frame: ArchivePropFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ) {
    if (!this.textures.exists(SNES_ARCHIVE_PROP_ASSET.key)) return null;
    if (!this.textures.get(SNES_ARCHIVE_PROP_ASSET.key).has(frame)) return null;
    return this.track(this.add.image(Math.round(x), Math.round(y), SNES_ARCHIVE_PROP_ASSET.key, frame)
      .setName(`archive-prop-${name}`)
      .setDepth(depth));
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
