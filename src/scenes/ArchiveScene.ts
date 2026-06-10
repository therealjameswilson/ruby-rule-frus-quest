import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  addInventoryItem,
  addDocumentPoints,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  setHeldItem,
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
import { HistorianNPC } from "../entities/HistorianNPC";
import { Manuscript } from "../entities/Manuscript";
import { Player } from "../entities/Player";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, drawTiledFloor, transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type SourceNoteStatus = "inactive" | "carried" | "routed" | "verified" | "stamped";
type Direction = "north" | "south" | "west" | "east";
type ArchiveRoomId = "A1" | "A2" | "B1" | "B2";

interface ArchiveRoom {
  id: ArchiveRoomId;
  title: string;
  grid: { x: number; y: number };
  exits: Partial<Record<Direction, ArchiveRoomId>>;
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
    exits: { east: "A2", south: "B1" }
  },
  A2: {
    id: "A2",
    title: "OPENNET ANNEX",
    grid: { x: 1, y: 0 },
    exits: { west: "A1", south: "B2" }
  },
  B1: {
    id: "B1",
    title: "STACKS",
    grid: { x: 0, y: 1 },
    exits: { north: "A1", east: "B2" }
  },
  B2: {
    id: "B2",
    title: "PROOF CHAMBER",
    grid: { x: 1, y: 1 },
    exits: { north: "A2", west: "B1" }
  }
};

const EXIT_SPAWNS: Record<Direction, { x: number; y: number }> = {
  north: { x: 128, y: 208 },
  south: { x: 128, y: 52 },
  west: { x: 232, y: 120 },
  east: { x: 24, y: 120 }
};

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
  private roomCleanups: Array<() => void> = [];
  private roomSolids: Phaser.Geom.Rectangle[] = [];
  private mapCells = new Map<ArchiveRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ArchiveRoomId, Phaser.GameObjects.Text>();
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;

  constructor() {
    super("ArchiveScene");
  }

  create() {
    setSceneState("ArchiveScene", "explore", "Explore Archive room A1.");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.archiveAmber);
    drawTiledFloor(this, "archive-tiles");
    drawRoomFrame(this, "ARCHIVE");
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
    const nearest = nearestInteractable(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.hintText.setText(nearest ? nearest.label.toUpperCase() : this.exitHint());
    if ((Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) && nearest) {
      nearest.onInteract();
    }
    this.objectiveText.setText(gameState.objective);
  }

  private enterRoom(roomId: ArchiveRoomId, spawn: { x: number; y: number }, wipe = true) {
    const applyRoom = () => {
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      this.player.setPosition(spawn.x, spawn.y);
      this.syncRoomTraversalState();
      this.updateVisitedMinimap();
      this.roomTransitionLocked = false;
      this.exitCooldownUntil = this.time.now + 280;
    };

    if (!wipe) {
      applyRoom();
      return;
    }

    this.roomTransitionLocked = true;
    retroAudio.transition();
    this.cameras.main.fadeOut(90, 5, 5, 5);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      applyRoom();
      this.cameras.main.fadeIn(90, 5, 5, 5);
    });
  }

  private clearRoom() {
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    this.roomCleanups = [];
    this.roomObjects = [];
    this.roomSolids = [];
    this.interactables = [];
    this.bureaucraticWalls = [];
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
    if (room.id === "A1") this.renderSourceRoom();
    else if (room.id === "A2") this.renderOpenNetAnnex();
    else if (room.id === "B1") this.renderStacksRoom();
    else this.renderProofChamber();
    this.refreshRoomObjective();
    this.syncWallState();
  }

  private renderSourceRoom() {
    this.drawBookcase(24, 82, 32, 58);
    this.drawBookcase(232, 82, 32, 58);
    this.drawBookcase(24, 158, 32, 52);
    this.drawBookcase(232, 158, 32, 52);
    this.drawWallMap(128, 60, "A1 MAP");
    this.drawDocumentStack(74, 68, true);
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
    this.addBureaucraticWalls();
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
    this.interactables.push({
      id: "opennet-annex-terminal",
      label: "OpenNet terminal",
      x: 72,
      y: 105,
      radius: 34,
      kind: "terminal",
      onInteract: () => this.dialog.show("OPENNET TERMINAL", [
        "Publication status lives on the network.",
        "StateChat can point to a manifest, but a person verifies the citation."
      ])
    });
  }

  private renderStacksRoom() {
    for (let x = 54; x <= 202; x += 37) this.drawBookcase(x, 86, 26, 52);
    this.drawDocumentStack(62, 159, false);
    this.drawDocumentStack(124, 166, true);
    this.drawDocumentStack(188, 159, false);
    this.drawDesk(128, 138, "TRAY");
    this.track(this.add.image(128, 119, "referral-manifest").setDepth(140));
    this.addSolid(40, 56, 176, 56);
    this.addSolid(96, 128, 64, 28);
    this.interactables.push({
      id: "stacks-manifest",
      label: "Referral manifest",
      x: 128,
      y: 122,
      radius: 34,
      kind: "document",
      onInteract: () => this.dialog.show("REFERRAL MANIFEST", [
        "A room can be mapped without solving every equity.",
        "The path is physical: carry, route, verify, stamp."
      ])
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
    this.addSolid(34, 104, 80, 36);
    this.addSolid(142, 104, 80, 36);
    this.addSolid(84, 40, 88, 68);
    this.interactables.push({
      id: "proof-chamber-table",
      label: "Proof table",
      x: 74,
      y: 118,
      radius: 34,
      kind: "document",
      onInteract: () => this.dialog.show("PROOF TABLE", [
        "This room proves traversal, not a new puzzle.",
        "The HUD stays fixed while the room hard-cuts around you."
      ])
    });
  }

  private drawResearchTable() {
    this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y, 68, 24, color(PALETTE.black), 0.88).setDepth(70));
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

  private addBureaucraticWalls() {
    const wallData = [
      { id: "repo-wall", label: "NO REPO", x: 100, y: 148 },
      { id: "memo-wall", label: "PENDING", x: 158, y: 148 }
    ];
    this.bureaucraticWalls = wallData
      .filter((wall) => !this.clearedWallIds.has(wall.id))
      .map((wall) => new BureaucraticWall(this, wall.id, wall.label, wall.x, wall.y));
    for (const wall of this.bureaucraticWalls) {
      this.roomCleanups.push(() => wall.destroy());
      this.interactables.push({
        id: wall.id,
        label: `Stone Wall: ${wall.label}`,
        x: wall.x,
        y: wall.y,
        radius: 30,
        kind: "enemy",
        onInteract: () => this.clearBureaucraticWall(wall)
      });
    }
  }

  private collect(document: Manuscript) {
    if (this.collected.has(document.id)) return;
    this.collected.add(document.id);
    document.collect();
    retroAudio.confirm();
    addInventoryItem(document.label);
    setHeldItem(document.id === "source-note" ? "Source Note 47" : document.label);
    addDocumentPoints(2, `${document.label} collected`);
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

  private clearBureaucraticWall(wall: BureaucraticWall) {
    if (wall.isCleared) return;
    wall.markHit();
    retroAudio.warning();
    adjustReliability(2, `${wall.label} stonewall challenged with source evidence`);
    this.reliability.update();
    this.dialog.show("BUREAUCRATIC WALL", [
      `${wall.label} is not a monster with claws.`,
      "It is paperwork turned to stone.",
      "A named source note cracks it."
    ], () => {
      this.clearedWallIds.add(wall.id);
      wall.clear();
      retroAudio.stamp();
      this.interactables = this.interactables.filter((item) => item.id !== wall.id);
      this.syncWallState();
    });
  }

  private updateBureaucraticWalls(delta: number) {
    if (this.currentRoomId !== "A1") {
      setVisibleThreats([]);
      return;
    }
    for (const wall of this.bureaucraticWalls) {
      wall.update(this.time.now, delta, this.player.position);
    }
    this.syncWallInteractables();
    this.syncWallState();
    const activeWall = this.bureaucraticWalls.find((wall) => wall.isTouching(this.player.position, 19));
    if (!activeWall || this.time.now < this.wallContactCooldown) return;
    this.wallContactCooldown = this.time.now + 1200;
    activeWall.markHit();
    this.player.pushAwayFrom(activeWall.position, 15);
    adjustReliability(-4, `${activeWall.label} stonewall delayed source work`);
    this.reliability.update();
    setObjective("Clear stonewalls with evidence, then collect document tiles.");
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
    const activeThreats = this.currentRoomId === "A1"
      ? this.bureaucraticWalls
        .filter((wall) => !wall.isCleared)
        .map((wall) => ({
          label: `Stone Wall: ${wall.label}`,
          x: wall.position.x,
          y: wall.position.y
        }))
      : [];
    setVisibleThreats(activeThreats);
    setVisibleEntities([
      `Room ${this.currentRoomId}`,
      ...this.interactables.map((item) => item.label),
      ...(this.currentRoomId === "A1" ? ["Elena", "StateChat terminal", "Research Table"] : []),
      ...(this.sourceNoteStatus !== "inactive" ? ["Source Note 47 verification object"] : [])
    ]);
  }

  private startSourceNoteVerification() {
    this.sourceNoteStatus = "carried";
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
    const glow = this.track(this.add.rectangle(this.researchTable.x, this.researchTable.y - 18, 34, 4, color(PALETTE.terminalCyan), 0.92).setDepth(247));
    this.tweens.add({
      targets: glow,
      alpha: 0.25,
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
      setObjective("Pick up Source Note 47 in A1 and verify provenance.");
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
    this.dialog.show("ELENA", [
      "Good. The source note now has a repository trail.",
      "A flag is not a fact until a compiler can defend it.",
      "That citation-stamped panel locks into the final cover."
    ], () => transitionTo(this, "NetworkScene"));
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

    const target = ARCHIVE_ROOMS[this.currentRoomId].exits[direction];
    if (!target) {
      setLatestMessage(`No ${direction} route from room ${this.currentRoomId}`);
      this.exitCooldownUntil = this.time.now + 360;
      return false;
    }
    this.enterRoom(target, EXIT_SPAWNS[direction]);
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
        setObjective("Collect Source Note 47 in A1; use edge gates to map rooms.");
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
      visitedRoomIds: [...this.visitedRoomIds],
      exits: room.exits
    });
  }

  private drawVisitedMinimap() {
    this.add.rectangle(26, 16, 42, 20, color(PALETTE.black), 0.35).setDepth(878);
    for (const room of Object.values(ARCHIVE_ROOMS)) {
      const cell = this.add.rectangle(18 + room.grid.x * 14, 12 + room.grid.y * 8, 10, 6, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.stoneLight))
        .setDepth(879);
      const label = this.add.text(18 + room.grid.x * 14, 9 + room.grid.y * 8, "", {
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
      const current = room.id === this.currentRoomId;
      this.mapCells.get(room.id)?.setFillStyle(color(current ? PALETTE.goldStamp : visited ? PALETTE.stoneLight : PALETTE.black));
      this.mapLabels.get(room.id)?.setText(visited ? room.id : "").setColor(current ? PALETTE.black : PALETTE.shadowNavy);
    }
  }

  private drawRoomExits(room: ArchiveRoom) {
    const exits = room.exits;
    this.drawGate("north", !!exits.north);
    this.drawGate("south", !!exits.south);
    this.drawGate("west", !!exits.west);
    this.drawGate("east", !!exits.east);
  }

  private drawGate(direction: Direction, open: boolean) {
    const fill = open ? PALETTE.black : PALETTE.stoneDark;
    const accent = open ? PALETTE.goldStamp : PALETTE.stoneGray;
    if (direction === "north") {
      this.track(this.add.rectangle(128, 36, 34, 8, color(fill), open ? 0.88 : 1).setDepth(61));
      this.track(this.add.rectangle(128, 41, 26, 2, color(accent)).setDepth(62));
      if (!open) this.addSolid(112, 32, 32, 16);
    } else if (direction === "south") {
      this.track(this.add.rectangle(128, 220, 34, 8, color(fill), open ? 0.88 : 1).setDepth(61));
      this.track(this.add.rectangle(128, 215, 26, 2, color(accent)).setDepth(62));
      if (!open) this.addSolid(112, 208, 32, 16);
    } else if (direction === "west") {
      this.track(this.add.rectangle(8, 120, 8, 34, color(fill), open ? 0.88 : 1).setDepth(61));
      this.track(this.add.rectangle(13, 120, 2, 26, color(accent)).setDepth(62));
      if (!open) this.addSolid(0, 104, 16, 32);
    } else {
      this.track(this.add.rectangle(248, 120, 8, 34, color(fill), open ? 0.88 : 1).setDepth(61));
      this.track(this.add.rectangle(243, 120, 2, 26, color(accent)).setDepth(62));
      if (!open) this.addSolid(240, 104, 16, 32);
    }
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
    this.addSolid(Math.round((x - width / 2) / 8) * 8, Math.round((y - height / 2) / 8) * 8, width, height);
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
    this.track(this.add.rectangle(x + 2, y + 3, 48, 30, color(PALETTE.black), 0.35).setDepth(y - 3));
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
    this.tweens.add({ targets: sparkle, alpha: 0.2, duration: 360, yoyo: true, repeat: -1, ease: "Stepped" });
  }

  private addSolid(x: number, y: number, width: number, height: number) {
    this.roomSolids.push(new Phaser.Geom.Rectangle(x, y, width, height));
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.roomObjects.push(object);
    return object;
  }
}
