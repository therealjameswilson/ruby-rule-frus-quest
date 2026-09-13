import Phaser from "phaser";
import { readChapterArrival } from "../game/chapterTravel";
import { GAMEPLAY_TILESETS } from "../assets/registry";
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
  repairEditorialRecord,
  setHeldItem,
  setDocumentWorkflowState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setPhysicalVerificationState,
  setRoomTraversalState,
  getVisitedRoomIds,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/items/Terminal";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { FeedbackToast } from "../systems/feedbackToast";
import { ChoicePrompt } from "../systems/verification";
import { ProofComparisonBoard } from "../systems/proofComparisonBoard";
import { EditorialRepairBoard } from "../systems/editorialRepairBoard";
import { EDITORIAL_REPAIR_RECORDS, editorialRepairDraftMatches, nextEditorialRepair } from "../game/editorialRepair";
import { proofMatchesOriginal, restoreProofRepairs } from "../game/proofComparison";
import { saveGameNow } from "../systems/save";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, canAutoApplyProposal, ReliabilityHud } from "../systems/reliability";
import { takeDanneLurkerHit } from "../systems/dannePressure";
import { tryEquippedToolSwing } from "../systems/toolSwing";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesGate, addSnesRewardBurst, addSnesRoomCompass, addSnesRoomLayer, addSnesTreasurePedestal } from "../systems/snesPixelArt";
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
  editorHint,
  routeSilentReadReviewItem,
  SILENT_READ_REVIEW_ITEMS,
  SILENT_READ_REVIEW_TOTAL,
  silentReadObjective,
  silentReadReviewStatusCode,
  silentReadReviewStatusFromCode,
  silentReadDecision,
  nextSilentReadStatus,
  silentReadResumeRoom,
  type SilentReadReviewPhase,
  type SilentReadReviewKind,
  type SilentReadReviewStatus,
  type SilentReadStationId
} from "../game/silentReadReview";
import { INTERIOR_TILES } from "../game/networkN1Tilemap";
import { PROOF_PATROL, PROOF_STATION_POSITIONS, proofWalkRoute } from "../game/proofFurniture";
import { crossReferenceMatches, restoreCrossReferenceDraft } from "../game/crossReferenceCatalog";
import { CrossReferenceBoard } from "../systems/crossReferenceBoard";
import { ChronologyBoard } from "../systems/withholdingChronologyBoard";
import { ReleaseScopeBoard } from "../systems/releaseScopeBoard";
import { restoreReleaseScope, validateReleaseScope } from "../game/releaseScope";
import { EDITOR_CHRONOLOGY_TITLE, EDITOR_CHRONOLOGY_EVIDENCE, restoreEditorChronology,
  shiftEditorChronology, editorChronologySequence, validateEditorChronology } from "../game/editorChronology";
import { WORKSTATION_DESK, workstationBounds, workstationApproach, safeWorkstationPosition } from "../game/workstationGeometry";
import { packedTileGid } from "../game/packedTileIndex";
import {
  EDITOR_E1_TILEMAP,
  EDITOR_DRAFT_OUTBOX,
  EDITOR_DESK_POSITION,
  EDITOR_PRIYA_POSITION,
  buildEditorE1TileLayers,
  editorE1CollisionRect
} from "../game/editorE1Tilemap";
import {
  SILENT_S1_TILEMAP,
  buildSilentS1TileLayers,
  silentS1CollisionRect
} from "../game/silentS1Tilemap";

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
  kind: SilentReadReviewKind;
  phase: SilentReadReviewPhase;
  checkCount: number;
  destination: WorkstationId;
  texture: string;
  status: PhysicalFlagStatus;
  x: number;
  y: number;
  icon?: Phaser.GameObjects.Image;
  routedStation?: WorkstationId;
}

interface ProofRoom {
  id: ProofRoomId;
  title: string;
  roomType: RoomType;
  exits: Partial<Record<Direction, ProofRoomId | "DV1" | "R2">>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, "red_pencil" | "buckram_key">>;
}

const PROOF_PLAY_BOUNDS = { left: 14, right: 242, top: 42, bottom: 220 };
const PROOF_OUTBOX = { x: 128, y: 202 };
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
    exits: { west: "R2", east: "S1" },
    lockedExits: { east: "Red Pencil query gate" },
    requiredItems: { east: "red_pencil" }
  },
  S1: {
    id: "S1",
    title: "Silent Read Tower",
    roomType: "reward",
    exits: { west: "E1", east: "DV1" },
    lockedExits: { east: "Black Vault final-review gate" },
    requiredItems: { east: "buckram_key" }
  }
};

const WORKSTATIONS: Workstation[] = [
  { id: "opennet", label: "OpenNet", ...PROOF_STATION_POSITIONS.opennet, accent: PALETTE.openNetGreen, texture: "opennet-terminal", phases: ["evidence"] },
  { id: "classnet", label: "ClassNet", ...PROOF_STATION_POSITIONS.classnet, accent: PALETTE.classNetRed, texture: "classnet-terminal", phases: ["evidence"] },
  { id: "editor-desk", label: "Editor Desk", ...EDITOR_DESK_POSITION, accent: PALETTE.buckramHighlight, texture: "red-pencil", phases: ["editor"] },
  { id: "referral-tray", label: "Referral Tray", ...PROOF_STATION_POSITIONS["referral-tray"], accent: PALETTE.goldStamp, texture: "concurrence-slip", phases: ["evidence"] },
  { id: "proof-table", label: "Proof Table", ...PROOF_STATION_POSITIONS["proof-table"], accent: PALETTE.terminalCyan, texture: "proof-page", phases: ["evidence", "production"] },
  { id: "consultation-desk", label: "Consult Desk", ...PROOF_STATION_POSITIONS["consultation-desk"], accent: PALETTE.goldStamp, texture: "review-folder", phases: ["production"] },
  { id: "typeflow-rail", label: "Typeflow Rail", ...PROOF_STATION_POSITIONS["typeflow-rail"], accent: PALETTE.buckramHighlight, texture: "proof-page", phases: ["production"] }
];

const STATION_TAGS: Record<WorkstationId, string> = {
  opennet: "OPEN", classnet: "CLASS", "editor-desk": "EDITOR", "referral-tray": "REF",
  "proof-table": "PROOF", "consultation-desk": "METHOD", "typeflow-rail": "PRINT"
};

const PHYSICAL_FLAGS: Array<Omit<PhysicalFlag, "status" | "x" | "y" | "icon" | "routedStation">> =
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
  private reviewChoice!: ChoicePrompt;
  private proofBoard!: ProofComparisonBoard;
  private editorialBoard!: EditorialRepairBoard;
  private crossReferenceBoard!: CrossReferenceBoard;
  private chronologyBoard!: ChronologyBoard;
  private releaseScopeBoard!: ReleaseScopeBoard;
  private objectiveText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private interactionPrompt!: InteractionPrompt;
  private roomTitleText!: Phaser.GameObjects.Text;
  private currentRoomId: ProofRoomId = "E1";
  private visitedRoomIds = new Set<ProofRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private roomSolids: Phaser.Geom.Rectangle[] = [];
  private danneLurker!: DanneLurker;
  private mapCells = new Map<ProofRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ProofRoomId, Phaser.GameObjects.Text>();
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private physicalFlags: PhysicalFlag[] = [];
  private physicalRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private physicalRouteCueKey = "";
  private stationLabels: Array<{ text: Phaser.GameObjects.Text; x: number; y: number }> = [];
  private get outbox() {
    return this.currentRoomId === "E1" ? EDITOR_DRAFT_OUTBOX : PROOF_OUTBOX;
  }

  constructor() {
    super("SilentReadScene");
  }

  create(data?: unknown) {
    const arrival = readChapterArrival(data, "SilentReadScene", gameState.currentScene);
    const restoredVisitedRoomIds = getVisitedRoomIds(["E1", "S1"] as const);
    this.resetTransientState();
    this.visitedRoomIds = new Set(restoredVisitedRoomIds);
    setSceneState("SilentReadScene", "explore", "Editor's Labyrinth: earn the Red Pencil.");
    retroAudio.startMusic("SilentReadScene");
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
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
    this.toast = new FeedbackToast(this, 1200, () => this.player.sprite.getBounds());
    this.reviewChoice = new ChoicePrompt(this);
    this.proofBoard = new ProofComparisonBoard(this);
    this.editorialBoard = new EditorialRepairBoard(this);
    this.crossReferenceBoard = new CrossReferenceBoard(this);
    this.releaseScopeBoard = new ReleaseScopeBoard(this);
    this.chronologyBoard = new ChronologyBoard(this, {
      title: EDITOR_CHRONOLOGY_TITLE, heading: "REPAIR CHRONOLOGY", evidence: EDITOR_CHRONOLOGY_EVIDENCE,
      initialMessage: "MEMCON IS OUT OF ORDER", restore: restoreEditorChronology,
      shift: shiftEditorChronology, sequence: editorChronologySequence, validate: validateEditorChronology
    });
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this);
    this.interactionPrompt = new InteractionPrompt(this, 950, 61);
    this.danneLurker = new DanneLurker(this, PROOF_PATROL[0].x, PROOF_PATROL[0].y, {
      speechBlocked: () => this.toast.visible || this.interactionPrompt.visible
        || this.inventory.active || this.reliability.active || this.reviewChoice.active || this.proofBoard.active || this.editorialBoard.active || this.crossReferenceBoard.active || this.chronologyBoard.active || this.releaseScopeBoard.active,
      boltBlocked: (x, y) => this.roomSolids.some(rect => rect.contains(x, y)),
      waypoints: PROOF_PATROL
    });
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811).setVisible(false);
    const restoredStep = deriveSilentReadReviewStep(gameState.sceneProgress, new Set(getHeldProcessItemIds()));
    const restoredRoom = arrival ? "E1" : silentReadResumeRoom(gameState.sceneProgress, restoredStep);
    this.currentRoomId = restoredRoom;
    this.startPhysicalVerificationLoop();
    this.enterRoom(restoredRoom, arrival ? { x: arrival.x, y: arrival.y } : this.player.position, false);
    this.syncThreatState();
  }

  private resetTransientState() {
    this.currentRoomId = "E1";
    this.visitedRoomIds = new Set<ProofRoomId>();
    this.roomObjects = [];
    this.roomCleanups = [];
    this.roomSolids = [];
    this.roomTransitionLocked = false;
    this.exitCooldownUntil = 0;
    this.physicalFlags = [];
    this.physicalRouteCueObjects = [];
    this.physicalRouteCueKey = "";
    this.stationLabels = [];
    this.mapCells = new Map<ProofRoomId, Phaser.GameObjects.Rectangle>();
    this.mapLabels = new Map<ProofRoomId, Phaser.GameObjects.Text>();
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (this.reviewChoice.active || this.proofBoard.active || this.editorialBoard.active || this.crossReferenceBoard.active || this.chronologyBoard.active || this.releaseScopeBoard.active) {
      this.toast.update(delta, this.player.position, PROOF_PLAY_BOUNDS);
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      if (this.releaseScopeBoard.active) this.releaseScopeBoard.updateInput();
      else if (this.chronologyBoard.active) this.chronologyBoard.updateInput();
      else if (this.crossReferenceBoard.active) this.crossReferenceBoard.updateInput();
      else if (this.editorialBoard.active) this.editorialBoard.updateInput();
      else if (this.proofBoard.active) this.proofBoard.updateInput();
      else this.reviewChoice.updateInput();
      return;
    }
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    this.toast.update(delta, this.player.position, PROOF_PLAY_BOUNDS);
    if (this.roomTransitionLocked) {
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.updateDanneLurker(delta, false);
      this.interactionPrompt.update(delta, null);
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      this.updateDanneLurker(delta, false);
      return;
    }
    this.player.update(delta, true, { bounds: PROOF_PLAY_BOUNDS, solids: this.roomSolids });
    if (input.bJustPressed) {
      const swing = tryEquippedToolSwing(this.player);
      if (swing.reason) this.toast.show(swing.reason, this.player.position, "warn", PROOF_PLAY_BOUNDS);
    }
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

  private updateDanneLurker(delta: number, canPressure = true) {
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, canPressure, this.player.combatReadout);
    if (result.triggered && takeDanneLurkerHit(this.player, this.danneLurker.position, "contact", "DANN-E deadline pressure disrupted proof review.")) {
      this.toast.show("DANN-E DEADLINE PRESSURE", this.player.position, "warn", PROOF_PLAY_BOUNDS);
      this.reliability.update();
    } else if (result.egoBoltHit && takeDanneLurkerHit(this.player, this.danneLurker.position, "ego_bolt", "DANN-E ego bolt disrupted proof review.")) {
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
      const safeSpawn = safeWorkstationPosition(spawn, this.roomSolids);
      this.player.setPosition(safeSpawn.x, safeSpawn.y);
      this.danneLurker.enterRoom(this.time.now);
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
        saveGameNow();
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
    this.roomSolids = [];
    this.stationLabels = [];
    setNearestInteractable(null);
  }

  private redrawCurrentRoom() {
    this.clearRoom();
    this.renderCurrentRoom(false);
    const safePosition = safeWorkstationPosition(this.player.position, this.roomSolids);
    this.player.setPosition(safePosition.x, safePosition.y);
    this.positionActiveWaitingFlagForRoom();
    this.syncVisibleEntities();
  }

  private renderCurrentRoom(showIntro = true) {
    const room = PROOF_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    if (showIntro) {
      const banner = this.track(this.add.container(128, 39).setDepth(820).setName("proof-room-arrival"));
      banner.add([
        this.add.rectangle(0, 0, 184, 12, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)),
        this.add.text(0, 0, room.title.toUpperCase(), {
          fontFamily: "monospace", fontSize: "8px", color: PALETTE.creamPaper
        }).setOrigin(0.5)
      ]);
      this.tweens.add({ targets: banner, alpha: 0, delay: 1000, duration: 180,
        onComplete: () => { if (banner.active) banner.destroy(); } });
    }
    const packedTilemapRendered = this.renderProofTilemap(room.id);
    if (!packedTilemapRendered) {
      addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "proof", track: (object) => this.track(object) });
    }
    this.drawRoomDoors();
    if (!packedTilemapRendered) {
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
    }
    if (room.id === "E1") this.renderEditorsLabyrinth(packedTilemapRendered);
    else this.renderSilentReadTower(packedTilemapRendered);
    this.syncVisibleEntities();
  }

  private renderProofTilemap(roomId: ProofRoomId) {
    const asset = GAMEPLAY_TILESETS.interiorsNative;
    const definition = roomId === "E1"
      ? {
          id: "editor-e1",
          map: EDITOR_E1_TILEMAP,
          layers: buildEditorE1TileLayers(),
          collisionRect: editorE1CollisionRect
        }
      : {
          id: "silent-s1",
          map: SILENT_S1_TILEMAP,
          layers: buildSilentS1TileLayers(this.activeReviewPhase() === "production" ? "production" : "evidence"),
          collisionRect: silentS1CollisionRect
        };
    for (const cell of definition.layers.collisionCells) {
      const rect = definition.collisionRect(cell);
      this.roomSolids.push(new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height));
    }
    if (!this.textures.exists(asset.key)) return false;
    const map = this.make.tilemap({
      width: definition.map.columns,
      height: definition.map.rows,
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
      `${definition.id}-ground`,
      tileset,
      definition.map.x,
      definition.map.y,
      definition.map.columns,
      definition.map.rows,
      asset.tileSize,
      asset.tileSize
    );
    const walls = map.createBlankLayer(
      `${definition.id}-walls`,
      tileset,
      definition.map.x,
      definition.map.y,
      definition.map.columns,
      definition.map.rows,
      asset.tileSize,
      asset.tileSize
    );
    const decoration = map.createBlankLayer(
      `${definition.id}-decoration`,
      tileset,
      definition.map.x,
      definition.map.y,
      definition.map.columns,
      definition.map.rows,
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

    const layers = definition.layers;
    // Keep the floor below walls and entities; the room frame owns the backing.
    ground.putTilesAt(layers.ground, 0, 0, false).setDepth(1);
    walls.putTilesAt(layers.walls, 0, 0, true)
      .setCollision([
        packedTileGid(INTERIOR_TILES.wallPanel),
        packedTileGid(INTERIOR_TILES.wallMetal),
        packedTileGid(INTERIOR_TILES.wallBrick),
        packedTileGid(INTERIOR_TILES.wallBlue)
      ])
      .setDepth(44);
    decoration.putTilesAt(layers.decoration, 0, 0, false).setDepth(45);
    this.roomCleanups.push(() => {
      ground.destroy();
      walls.destroy();
      decoration.destroy();
      map.destroy();
    });
    return true;
  }

  private drawRoomDoors() {
    const room = PROOF_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      addSnesGate(this, {
        direction: "west",
        hasExit: true,
        unlocked: true,
        accent: PALETTE.buckramHighlight,
        exitLabel: this.currentRoomId === "E1" ? "REF" : "EDIT",
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

  private renderEditorsLabyrinth(packedTilemapRendered = false) {
    if (packedTilemapRendered) {
      this.track(new Terminal(this, 128, 60, "StateChat").container);
    } else {
      this.drawStagePanel("STATECHAT DRAFT", [
        `PLAN ${canAutoApplyProposal("mechanical") ? "READY" : "HOLD"}`,
        "HUMAN DECIDES",
        "BRACKETS PRINT"
      ], PALETTE.terminalCyan);
    }
    const priya = new HistorianNPC(this, "priya", EDITOR_PRIYA_POSITION.x, EDITOR_PRIYA_POSITION.y);
    this.roomCleanups.push(() => priya.destroy());
    if (!packedTilemapRendered) {
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
    }
    this.drawWorkstations();
    this.drawOutbox();
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
      setObjective(this.reviewObjective());
    } else {
      setObjective(this.reviewObjective());
    }
  }

  private renderSilentReadTower(packedTilemapRendered = false) {
    const phase = this.activeReviewPhase();
    if (phase === "evidence") {
      if (!packedTilemapRendered) {
        this.drawPage(74, 102, "MANUSCRIPT", ["Office opened", "in 1947", "original"]);
        this.drawPage(182, 102, "TYPESET PROOF", ["Office opened", "in 1974", "compare"]);
        this.track(addTinySparkle(this, 182, 88, PALETTE.classNetRed));
        this.drawStagePanel("SILENT READ", [
          "ROUTE EVIDENCE",
          "COMPARE DATES",
          "HUMAN STAMPS"
        ], PALETTE.goldStamp);
      }
    } else if (!packedTilemapRendered) {
      this.drawStagePanel("PUBLICATION LINE", [
        "METHOD LEDGER",
        "PRINTER COPY",
        "PROOF PULL"
      ], PALETTE.goldStamp);
      this.drawProductionLanes();
    }
    this.drawWorkstations();
    this.drawOutbox();
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
      setObjective(this.reviewObjective());
    } else {
      setObjective(this.reviewObjective());
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
      const bounds = workstationBounds(station.x, station.y);
      this.roomSolids.push(new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height));
      this.track(this.add.ellipse(station.x, station.y + 9, 32, 4, color(PALETTE.black), 0.3).setDepth(46));
      const desk = this.track(this.add.container(station.x, station.y).setDepth(station.y + 8).setName(`proof-desk-${station.id}`));
      const asset = GAMEPLAY_TILESETS.interiorsNative;
      if (this.textures.exists(asset.key)) {
        const frame = "proof-desk", texture = this.textures.get(asset.key);
        if (!texture.has(frame)) texture.add(frame, 0, WORKSTATION_DESK.tileIndex % asset.columns * asset.tileSize,
          Math.floor(WORKSTATION_DESK.tileIndex / asset.columns) * asset.tileSize, asset.tileSize, asset.tileSize);
        desk.add([this.add.image(-8, 0, asset.key, frame), this.add.image(8, 0, asset.key, frame)]);
      } else {
        desk.add(this.add.rectangle(0, 0, 32, 16, color(PALETTE.deepRuby)));
      }
      desk.add(this.add.rectangle(0, 0, 32, 16, 0, 0).setStrokeStyle(1, color(station.accent)));
      desk.add(this.add.image(-9, 1, station.texture).setDisplaySize(10, 10));
      desk.add(this.add.rectangle(7, 2, 10, 6, color(PALETTE.creamPaper)));
      const text = this.add.text(0, -7, STATION_TAGS[station.id], {
        fontFamily: "monospace", fontSize: "5px", color: PALETTE.creamPaper, backgroundColor: PALETTE.black
      }).setOrigin(0.5, 0);
      desk.add(text);
      this.stationLabels.push({ text, x: station.x, y: station.y - 7 });
    }
  }

  private drawOutbox() {
    this.track(this.add.rectangle(this.outbox.x, this.outbox.y, 28, 12, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(149));
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
        y: placed ? station.y - 3 : this.outbox.y - 10,
        routedStation: placed ? station.id : undefined
      };
      physicalFlag.icon = this.add.image(physicalFlag.x, physicalFlag.y, flag.texture)
        .setDisplaySize(12, 12).setDepth(placed ? station.y + 9 : 240).setVisible(false);
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
      setObjective(this.reviewObjective());
    } else {
      if (!hasProcessItem("buckram_key")) addProcessItem("buckram_key");
      setObjective(this.reviewObjective());
    }
    this.syncVisibleEntities();
    this.updatePhysicalVerification();
  }

  private savePhysicalReviewProgress(flag: PhysicalFlag | null = this.getActiveFlag()) {
    const index = flag ? this.physicalFlags.indexOf(flag) : SILENT_READ_REVIEW_TOTAL;
    gameState.sceneProgress.silentReadReviewStep = Math.max(0, index);
    gameState.sceneProgress.silentReadReviewStatus = flag ? silentReadReviewStatusCode(flag.status) : 0;
    saveGameNow();
  }

  private positionActiveWaitingFlagForRoom() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag || flagRoom(activeFlag) !== this.currentRoomId || activeFlag.status !== "waiting") return;
    activeFlag.x = this.outbox.x;
    activeFlag.y = this.outbox.y - 10;
    activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y);
  }

  private updatePhysicalInteractionPrompt(delta: number) {
    const prompt = this.physicalPromptTargets();
    const target = prompt.strictTarget ?? this.priyaTarget() ?? prompt.hintTarget;
    this.interactionPrompt.update(
      delta,
      this.toast.visible ? null : target,
      { left: 36, right: 220, top: 50, bottom: Math.floor(this.player.sprite.getBounds().top) - 16 },
      prompt.strictTarget
        ? { badge: "A", text: prompt.strictText }
        : target?.id === "editor-priya"
        ? { badge: "A", text: "ASK PRIYA" }
        : prompt.hintTarget
        ? { badge: "!", text: "STEP CLOSER" }
        : undefined
    );
  }

  private priyaTarget(): Interactable | null {
    if (this.currentRoomId !== "E1" || !this.isNear(EDITOR_PRIYA_POSITION.x, EDITOR_PRIYA_POSITION.y, 36)) return null;
    return { id: "editor-priya", label: "Priya", ...EDITOR_PRIYA_POSITION, radius: 36, kind: "npc", onInteract: () => undefined };
  }

  private physicalPromptTargets(): {
    strictTarget: Interactable | null;
    hintTarget: Interactable | null;
    strictText: string;
  } {
    const repair = this.pendingEditorialRepair();
    if (repair) {
      const station = this.stationFor(repair.proof ? "proof-table" : "editor-desk");
      const here = stationRoom(station.id) === this.currentRoomId;
      return {
        strictTarget: here && this.isNear(station.x, station.y, 40) ? this.workstationPromptTarget(station, 40) : null,
        hintTarget: here && this.isNear(station.x, station.y, 50) ? this.workstationPromptTarget(station, 40) : null,
        strictText: repair.proof ? "RECHECK PROOF" : "REPAIR BRACKET"
      };
    }
    const activeFlag = this.getActiveFlag();
    if (!activeFlag || flagRoom(activeFlag) !== this.currentRoomId) {
      return { strictTarget: null, hintTarget: null, strictText: "" };
    }

    if (activeFlag.status === "waiting") {
      const strictTarget = this.isNear(activeFlag.x, activeFlag.y, 24) ? this.flagPromptTarget(activeFlag, 24) : null;
      const hintTarget = this.isNear(activeFlag.x, activeFlag.y, 38) ? this.flagPromptTarget(activeFlag, 24) : null;
      return { strictTarget, hintTarget, strictText: `CARRY ${activeFlag.shortLabel}` };
    }

    const strictStation = this.findActionWorkstation(activeFlag, 32);
    const hintStation = strictStation ?? this.findActionWorkstation(activeFlag, 42);
    const strictTarget = strictStation?.id === activeFlag.destination ? this.workstationPromptTarget(strictStation, 36) : null;
    const hintTarget = hintStation?.id === activeFlag.destination ? this.workstationPromptTarget(hintStation, 28) : null;
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
    for (const label of this.stationLabels) {
      const dx = Math.abs(this.player.position.x - label.x);
      const dy = this.player.position.y - label.y;
      label.text.setVisible(dx > 28 || dy < -10 || dy > 44);
    }
    this.updateFlagVisibility();
    const activeFlag = this.getActiveFlag();
    if (!activeFlag) {
      this.clearPhysicalRouteCue();
      const repair = this.pendingEditorialRepair();
      const carried = repair?.proof ? `Corrected proof: ${repair.record.label}` : null;
      if (gameState.heldItem !== carried) setHeldItem(carried);
      setObjective(this.reviewObjective());
      this.actionHint.setText(this.reviewObjective());
      const prompt = this.physicalPromptTargets();
      setNearestInteractable(prompt.strictTarget ? prompt.strictText : this.priyaTarget() ? "ASK PRIYA" : null);
      this.syncPhysicalState(repair ? repair.proof ? "VERIFY" : "ROUTE" : "DONE", null);
      return;
    }

    if (flagRoom(activeFlag) !== this.currentRoomId) {
      this.clearPhysicalRouteCue();
      const target = PROOF_ROOMS[flagRoom(activeFlag)].title;
      this.actionHint.setText(`NEXT: enter ${target.toUpperCase()}.`);
      setNearestInteractable(this.priyaTarget() ? "ASK PRIYA" : null);
      this.syncPhysicalState("ROUTE", null);
      return;
    }

    const nearestStation = this.findNearestWorkstation();
    const carriedFlag = activeFlag.status === "carried" ? activeFlag : null;
    if (carriedFlag?.icon) {
      carriedFlag.x = Math.round(this.player.position.x + 11);
      carriedFlag.y = Math.round(this.player.position.y - 8);
      carriedFlag.icon.setPosition(carriedFlag.x, carriedFlag.y);
      carriedFlag.icon.setDepth(Math.round(this.player.position.y) + 4);
    }

    const verb = this.verbFor(activeFlag);
    this.syncPhysicalState(verb, nearestStation);
    this.updateActionHint(activeFlag, nearestStation);
    const prompt = this.physicalPromptTargets();
    setNearestInteractable(prompt.strictTarget ? prompt.strictText : this.priyaTarget() ? "ASK PRIYA" : null);
    this.refreshPhysicalRouteCue(activeFlag);
  }

  private handlePhysicalAction() {
    if (!this.physicalPromptTargets().strictTarget && this.priyaTarget()) {
      const active = this.getActiveFlag();
      const repair = this.pendingEditorialRepair();
      const hint = editorHint(active?.phase === "editor" ? active.status : null, repair ? repair.proof ? "proof" : "draft" : null);
      setLatestMessage(`Priya: ${hint}`);
      this.toast.show(hint, this.player.position, "info", PROOF_PLAY_BOUNDS);
      retroAudio.blip();
      return;
    }
    if (this.pendingEditorialRepair()) { this.reopenEditorialRecord(); return; }
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
          this.toast.show("STEP CLOSER TO THE FILE", this.player.position, "info", PROOF_PLAY_BOUNDS);
          return;
        }
        retroAudio.warning();
        setLatestMessage(`CARRY: move to ${activeFlag.shortLabel}.`);
        this.toast.show(`TAKE ${activeFlag.shortLabel}`, this.player.position, "info", PROOF_PLAY_BOUNDS);
        return;
      }
      activeFlag.status = "carried";
      setHeldItem(`Review Folder: ${activeFlag.shortLabel}`);
      setLatestMessage(`CARRY: ${activeFlag.label}.`);
      setObjective(this.reviewObjective());
      this.savePhysicalReviewProgress(activeFlag);
      retroAudio.blip();
      this.updatePhysicalVerification();
      return;
    }

    const nearestStation = this.findActionWorkstation(activeFlag, 32);
    if (!nearestStation) {
      const hintStation = this.findNearestWorkstation(42);
      if (hintStation) {
        retroAudio.blip();
        setLatestMessage(`Step closer to ${hintStation.label}.`);
        this.toast.show("STEP CLOSER TO THE DESK", this.player.position, "info", PROOF_PLAY_BOUNDS);
        return;
      }
      retroAudio.warning();
      setLatestMessage(`${this.verbFor(activeFlag)}: stand beside the correct workstation.`);
      this.toast.show(this.reviewObjective(), this.player.position, "info", PROOF_PLAY_BOUNDS);
      return;
    }
    const correctStation = this.stationFor(activeFlag.destination);
    const step = this.physicalFlags.indexOf(activeFlag);
    const routed = routeSilentReadReviewItem(step, activeFlag.id, nearestStation.id);
    if (!routed.ok) {
      retroAudio.warning();
      adjustReliability(-2, `${activeFlag.shortLabel} filed at wrong workstation`);
      activeFlag.status = "carried";
      activeFlag.routedStation = undefined;
      setHeldItem(`Review Folder: ${activeFlag.shortLabel}`);
      setLatestMessage(`RETRY: ${activeFlag.shortLabel} belongs at ${correctStation.label}.`);
      setObjective(this.reviewObjective());
      this.toast.show("WRONG DESK - RETRY", this.player.position, "warn", PROOF_PLAY_BOUNDS);
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
      activeFlag.y = nearestStation.y - 3;
      activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y).setDepth(correctStation.y + 9);
      setLatestMessage(`ROUTE: ${activeFlag.shortLabel} placed on ${nearestStation.label}.`);
      setObjective(this.reviewObjective());
      this.savePhysicalReviewProgress(activeFlag);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      // Placing a decision-bearing file opens its check, never answers or stamps it.
      if (!silentReadDecision(activeFlag.id) && activeFlag.id !== "typesetter-proof" && activeFlag.id !== "public-crossref" && activeFlag.id !== "proof-date" && activeFlag.id !== "classified-source") return;
    }

    if (activeFlag.status === "routed") {
      if (activeFlag.id === "classified-source") {
        this.markReleaseScope(activeFlag, nearestStation);
        return;
      }
      if (activeFlag.id === "proof-date") {
        this.repairChronology(activeFlag, nearestStation);
        return;
      }
      if (activeFlag.id === "public-crossref") {
        this.matchCrossReference(activeFlag, nearestStation);
        return;
      }
      if (activeFlag.id === "mechanical-fix") {
        this.repairVisibleBracket(activeFlag, nearestStation);
        return;
      }
      if (activeFlag.id === "typesetter-proof") {
        this.compareTypesetProof(activeFlag, nearestStation);
        return;
      }
      const decision = silentReadDecision(activeFlag.id);
      if (decision) {
        this.interactionPrompt.update(0, null);
        this.clearPhysicalRouteCue();
        this.reviewChoice.show(`${decision.question}\n\n${decision.context}`, [
          ...decision.options,
          { key: "C", label: "Back to the room", value: "back" }
        ], (option) => {
          if (option.value === "back") {
            setObjective(this.reviewObjective());
            return;
          }
          if (this.getActiveFlag() !== activeFlag || activeFlag.status !== "routed") return;
          if (option.value !== decision.correctValue) {
            setLatestMessage(decision.failureMessage);
            this.toast.show(decision.failureMessage, this.player.position, "warn", PROOF_PLAY_BOUNDS);
            this.savePhysicalReviewProgress(activeFlag);
            return;
          }
          gameState.sceneProgress[`silentReadDecision_${activeFlag.id}`] = 1;
          this.verifyFlag(activeFlag, nearestStation, decision.successMessage);
        }, 8, () => setObjective(this.reviewObjective()));
      } else {
        this.verifyFlag(activeFlag, nearestStation, `${activeFlag.shortLabel} CHECKED`);
      }
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
      // These rewards cross a room/layout boundary; show them after its cleanup.
      if (activeFlag.id === "mechanical-fix") {
        this.toast.hide();
        addSnesRewardBurst(this, 128, 72, "red-pencil", "Red Pencil", (object) => this.track(object), 600);
      } else if (activeFlag.id === "proof-date") {
        this.toast.hide();
        addSnesRewardBurst(this, 128, 72, "proof-lens", "Proof Lens", (object) => this.track(object), 600);
      }
    }
  }

  private verifyFlag(flag: PhysicalFlag, station: Workstation, message: string) {
    flag.status = "verified";
    this.addVerificationMark(station);
    setLatestMessage(message);
    this.toast.show(message, this.player.position, "info", PROOF_PLAY_BOUNDS);
    setObjective(this.reviewObjective());
    this.savePhysicalReviewProgress(flag);
    retroAudio.confirm();
    this.updatePhysicalVerification();
  }

  private markReleaseScope(flag: PhysicalFlag, station: Workstation) {
    this.interactionPrompt.update(0, null);
    this.clearPhysicalRouteCue();
    this.releaseScopeBoard.show(gameState.sceneProgress.silentReadReleaseScope, mask => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed") return;
      gameState.sceneProgress.silentReadReleaseScope = restoreReleaseScope(mask);
      saveGameNow();
    }, mask => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed"
        || !validateReleaseScope(mask).ok || gameState.sceneProgress.silentReadReleaseScope !== mask) return;
      gameState.sceneProgress["silentReadDecision_classified-source"] = 1;
      this.verifyFlag(flag, station, "RELEASE SCOPE VERIFIED");
    });
  }

  private repairChronology(flag: PhysicalFlag, station: Workstation) {
    this.interactionPrompt.update(0, null);
    this.clearPhysicalRouteCue();
    this.chronologyBoard.show(gameState.sceneProgress.silentReadChronologySlot, slot => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed") return;
      gameState.sceneProgress.silentReadChronologySlot = restoreEditorChronology(slot);
      saveGameNow();
    }, slot => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed"
        || !validateEditorChronology(slot).ok || gameState.sceneProgress.silentReadChronologySlot !== slot) return;
      gameState.sceneProgress["silentReadDecision_proof-date"] = 1;
      this.verifyFlag(flag, station, "CHRONOLOGY FILED");
    });
  }

  private matchCrossReference(flag: PhysicalFlag, station: Workstation) {
    this.interactionPrompt.update(0, null);
    this.clearPhysicalRouteCue();
    this.crossReferenceBoard.show(restoreCrossReferenceDraft(gameState.sceneProgress.silentReadCrossReferenceDraft), draft => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed") return;
      gameState.sceneProgress.silentReadCrossReferenceDraft = restoreCrossReferenceDraft(draft);
      saveGameNow();
    }, draft => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed"
        || !crossReferenceMatches(draft) || gameState.sceneProgress.silentReadCrossReferenceDraft !== draft) return;
      gameState.sceneProgress["silentReadDecision_public-crossref"] = 1;
      this.verifyFlag(flag, station, "CROSS-REFERENCE MATCHED");
    });
  }

  private repairVisibleBracket(flag: PhysicalFlag, station: Workstation) {
    this.interactionPrompt.update(0, null);
    this.clearPhysicalRouteCue();
    this.editorialBoard.show(EDITORIAL_REPAIR_RECORDS[0], gameState.sceneProgress.silentReadBracketDraft === 1, false, () => {
      gameState.sceneProgress.silentReadBracketDraft = 1;
      saveGameNow();
    }, () => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed" || gameState.sceneProgress.silentReadBracketDraft !== 1) return;
      gameState.sceneProgress["silentReadDecision_mechanical-fix"] = 1;
      this.verifyFlag(flag, station, "WITHHOLDING INDICATION RESTORED");
    });
  }

  private pendingEditorialRepair() {
    if (this.getActiveFlag()) return null;
    const record = nextEditorialRepair(gameState.documentCandidates, gameState.standardsViolations);
    if (!record) return null;
    const document = gameState.documentCandidates.find(document => document.id === record.documentId)!;
    return { record, proof: editorialRepairDraftMatches(document, record) };
  }

  private reopenEditorialRecord() {
    const repair = this.pendingEditorialRepair();
    if (!repair) return;
    const station = this.stationFor(repair.proof ? "proof-table" : "editor-desk");
    if (stationRoom(station.id) !== this.currentRoomId || !this.isNear(station.x, station.y, 40)) {
      this.toast.show(this.reviewObjective(), this.player.position, "info", PROOF_PLAY_BOUNDS);
      return;
    }
    if (!hasProcessItem(repair.proof ? "proof_lens" : "red_pencil")) {
      this.toast.show(repair.proof ? "NEED PROOF LENS" : "NEED RED PENCIL", this.player.position, "warn", PROOF_PLAY_BOUNDS);
      return;
    }
    this.interactionPrompt.update(0, null);
    saveGameNow();
    this.editorialBoard.show(repair.record, repair.proof, repair.proof, () => undefined, () => {
      const result = repairEditorialRecord(repair.record.documentId, repair.proof ? "proof" : "draft");
      if (!result.ok) {
        this.toast.show(result.reason ?? "RECHECK THE RECORD", this.player.position, "warn", PROOF_PLAY_BOUNDS);
        return;
      }
      this.addVerificationMark(station);
      this.toast.show(repair.proof ? "CORRECTION FILED" : "DRAFT READY - PROOF TABLE", this.player.position, "info", PROOF_PLAY_BOUNDS);
      retroAudio.stamp();
      setObjective(this.reviewObjective());
      this.syncVisibleEntities();
      saveGameNow();
    });
  }

  private compareTypesetProof(flag: PhysicalFlag, station: Workstation) {
    if (!hasProcessItem("proof_lens")) {
      this.toast.show("NEED PROOF LENS", this.player.position, "warn", PROOF_PLAY_BOUNDS);
      return;
    }
    this.interactionPrompt.update(0, null);
    this.clearPhysicalRouteCue();
    this.proofBoard.show(restoreProofRepairs(gameState.sceneProgress.silentReadProofRepairs), (repairs) => {
      gameState.sceneProgress.silentReadProofRepairs = repairs;
      saveGameNow();
    }, (repairs) => {
      if (this.getActiveFlag() !== flag || flag.status !== "routed" || !proofMatchesOriginal(repairs)) return;
      gameState.sceneProgress.silentReadProofRepairs = repairs;
      gameState.sceneProgress["silentReadDecision_typesetter-proof"] = 1;
      this.verifyFlag(flag, station, "TEXT AND DESIGNATOR PRESERVED");
    });
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
      setLatestMessage("MECHANICAL FIX ACCEPTED - VISIBLE BRACKET RECORDED");
      return true;
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
    if (flag.id === "editorial-ledger") {
      gameState.sceneProgress.editorialMethodologyComplete = 1;
      gameState.sceneProgress.editorialMethodologyStep = EDITORIAL_METHODOLOGY_PROMPTS.length;
      gameState.sceneProgress.editorialTreatmentComplete = 1;
      gameState.sceneProgress.editorialTreatmentStep = EDITORIAL_TREATMENT_PROMPTS.length;
      addDocumentPoints(18, "editorial method and treatment ledger filed");
      adjustReliability(14, "human consultation preserved chronology, meaning, and reader clarity");
      setLatestMessage("METHOD LEDGER FILED - MARGINAL NOTE PRESERVED");
      return true;
    }
    if (flag.id === "printer-copy") {
      gameState.sceneProgress.typeflowOrderComplete = 1;
      gameState.sceneProgress.typeflowOrderStep = TYPEFLOW_ORDER_PROMPTS.length;
      gameState.sceneProgress.typesettingPreparationComplete = 1;
      gameState.sceneProgress.typesettingPreparationStep = TYPESETTING_PREPARATION_PROMPTS.length;
      addDocumentPoints(14, "cleared printer's copy sequence filed");
      adjustReliability(6, "clearance preceded typesetting and metadata stayed visible");
      setLatestMessage("PRINTER COPY FILED - INDEX REFERENCE CORRECTED");
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
      setLatestMessage("TYPESETTER PROOF FILED - ORIGINAL TEXT PRESERVED");
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
      setObjective(this.reviewObjective());
      this.toast.show("PENCIL READY - EAST", this.player.position, "info", PROOF_PLAY_BOUNDS);
      this.savePhysicalReviewProgress(nextFlag);
      return;
    }

    const nextIndex = this.physicalFlags.indexOf(nextFlag);
    const previous = nextIndex > 0 ? this.physicalFlags[nextIndex - 1] : null;
    if (previous && previous.phase !== nextFlag.phase) {
      this.redrawCurrentRoom();
      this.toast.show("PUBLICATION DOCKETS READY", this.player.position, "info", PROOF_PLAY_BOUNDS);
    }

    nextFlag.status = previous ? nextSilentReadStatus(previous.phase, nextFlag.phase) : "waiting";
    setHeldItem(nextFlag.status === "carried" ? `Review Folder: ${nextFlag.shortLabel}` : null);
    setObjective(this.reviewObjective());
    this.updatePhysicalVerification();
    this.savePhysicalReviewProgress(nextFlag);
  }

  private awardBuckramKeyAfterTypesetterProof() {
    if (!hasProcessItem("buckram_key")) {
      addProcessItem("buckram_key");
      setLatestMessage("Buckram Key opens the final publication gate.");
    }
    gameState.sceneProgress.silentReadReviewStep = SILENT_READ_REVIEW_TOTAL;
    gameState.sceneProgress.silentReadReviewStatus = 0;
    setObjective(this.reviewObjective());
    this.redrawCurrentRoom();
    addSnesRewardBurst(this, this.outbox.x, this.outbox.y - 24, "buckram-key", "Buckram Key", (object) => this.track(object));
    this.actionHint.setText("DONE: typesetter proof filed. Exit east.");
    this.reliability.update();
    this.syncRoomTraversalState();
    this.toast.show("KEY READY - EAST", this.player.position, "info", PROOF_PLAY_BOUNDS);
    this.savePhysicalReviewProgress(null);
  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x >= PROOF_PLAY_BOUNDS.right - 4 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    else if (position.x <= PROOF_PLAY_BOUNDS.left + 4 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    if (!direction) return false;

    if (this.currentRoomId === "E1" && direction === "west") {
      this.roomTransitionLocked = true;
      saveGameNow();
      transitionTo(this, "ReferralVaultScene", { chapterFrom: "E1", chapterTo: "R2" });
      return true;
    }

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
    const x = station.x - 10 + ((stationStampCount - 1) % 3) * 10;
    const y = station.y + 4;
    this.track(this.add.rectangle(x, y, 6, 4, color(PALETTE.goldStamp))
      .setStrokeStyle(1, color(PALETTE.black)).setDepth(station.y + 10));
    flag.icon?.setTint(color(PALETTE.stoneGray));
    setLatestMessage(`STAMP: ${flag.shortLabel} human review recorded.`);
  }

  private refreshPhysicalRouteCue(flag: PhysicalFlag) {
    const station = this.stationFor(flag.destination);
    const waiting = flag.status === "waiting";
    if (stationRoom(station.id) !== this.currentRoomId || (!waiting && (flag.status !== "carried"
      || this.isNear(station.x, station.y, 42)))) {
      this.clearPhysicalRouteCue();
      return;
    }

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y) };
    const end = { x: Math.round(waiting ? flag.x : station.x), y: Math.round(waiting ? flag.y : station.y) };
    const cueKey = `${this.currentRoomId}:${flag.id}:${flag.status}:${waiting ? "tray" : `${Math.floor(start.x / 8)},${Math.floor(start.y / 8)}`}->${station.id}`;
    if (cueKey === this.physicalRouteCueKey) return;

    this.clearPhysicalRouteCue();
    this.physicalRouteCueKey = cueKey;

    const route = waiting ? [] : proofWalkRoute(start, workstationApproach(end, this.roomSolids), this.roomSolids);
    let previous = start;
    for (const next of route) {
      const steps = Math.floor(Phaser.Math.Distance.Between(previous.x, previous.y, next.x, next.y) / 14);
      for (let index = 1; index <= steps; index++) {
        const t = index / (steps + 1);
        const x = Math.round(Phaser.Math.Linear(previous.x, next.x, t));
        const y = Math.round(Phaser.Math.Linear(previous.y, next.y, t));
        this.physicalRouteCueObjects.push(this.add.rectangle(x, y, 2, 2, color(PALETTE.goldStamp), 0.85).setDepth(60));
      }
      previous = next;
    }

    this.physicalRouteCueObjects.push(this.add.rectangle(end.x, end.y, waiting ? 20 : 42, waiting ? 18 : 22)
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(61));
    if (waiting) {
      this.physicalRouteCueObjects.push(this.add.triangle(end.x, end.y - 16, 0, 0, 8, 0, 4, 6, color(PALETTE.black)).setDepth(62));
      this.physicalRouteCueObjects.push(this.add.triangle(end.x, end.y - 17, 0, 0, 6, 0, 3, 4, color(PALETTE.creamPaper)).setDepth(63));
    }
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
      setNearestInteractable(nearestStation?.id === flag.destination ? `ROUTE to ${nearestStation.label}` : null);
      this.actionHint.setText(`ROUTE ${flag.shortLabel}: ${correctStation.label}.${stationText}`);
      return;
    }
    if (flag.status === "routed") {
      const verb = "VERIFY";
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
    }
  }

  private syncPhysicalState(verb: "CARRY" | "ROUTE" | "VERIFY" | "STAMP" | "DONE", nearestStation: Workstation | null) {
    const completed = this.physicalFlags.filter((flag) => flag.status === "stamped").length;
    const carried = this.physicalFlags.find((flag) => flag.status === "carried");
    setPhysicalVerificationState({
      verb,
      carriedItem: carried ? `Review Folder: ${carried.shortLabel}` : this.pendingEditorialRepair()?.proof ? gameState.heldItem : null,
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
      ...(active && flagRoom(active) === this.currentRoomId ? [active.label] : []),
      ...(this.pendingEditorialRepair() ? ["Editorial correction: Editor Desk -> Proof Table"] : [])
    ]);
  }

  private getActiveFlag() {
    return this.physicalFlags.find((flag) => flag.status !== "stamped") ?? null;
  }

  private reviewObjective() {
    const repair = this.pendingEditorialRepair();
    if (repair) {
      if (repair.proof) return this.currentRoomId === "E1" ? "EAST - RECHECK PROOF" : "RECHECK AT PROOF TABLE";
      return this.currentRoomId === "E1" ? "REPAIR AT EDITOR DESK" : "WEST - EDITOR DESK";
    }
    const active = this.getActiveFlag();
    if (!active && this.currentRoomId === "E1") return "EXIT EAST - PROOF";
    return silentReadObjective(active, active?.status ?? "stamped", !active || flagRoom(active) === this.currentRoomId);
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
