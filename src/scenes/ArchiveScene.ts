import Phaser from "phaser";
import { PALETTE } from "../game/constants";
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
import { addArchiveShelves, addDocumentStack, addRubyVolumeStack, addTinySparkle, addWallMap } from "../systems/roomDressing";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, drawTiledFloor, transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type SourceNoteStatus = "inactive" | "carried" | "routed" | "verified" | "stamped";

export class ArchiveScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];
  private collected = new Set<string>();
  private bureaucraticWalls: BureaucraticWall[] = [];
  private wallContactCooldown = 0;
  private sourceNoteStatus: SourceNoteStatus = "inactive";
  private sourceNoteIcon?: Phaser.GameObjects.Image;
  private sourceNoteLabel?: Phaser.GameObjects.Text;
  private readonly researchTable = { x: 128, y: 116, label: "Research Table" };

  constructor() {
    super("ArchiveScene");
  }

  create() {
    setSceneState("ArchiveScene", "explore", "Collect three document tiles.");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.archiveAmber);
    drawTiledFloor(this, "archive-tiles");
    drawRoomFrame(this, "ARCHIVE");
    addArchiveShelves(this);
    addWallMap(this, 128, 60, "NA MAP");
    addDocumentStack(this, 74, 68, true);
    this.drawResearchTable();
    addRubyVolumeStack(this, 178, 171, 4);
    addTinySparkle(this, 128, 90, PALETTE.terminalCyan);
    new HistorianNPC(this, "elena", 44, 58);
    addTerminalPanel(this, 202, 66, [
      "STATECHAT",
      "FLAG:",
      "SOURCE NOTE 47",
      "REPOSITORY ?",
      "COMPILER NEEDED"
    ]);

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

    const documents = [
      new Manuscript(this, "telegram", "Telegram", 68, 124),
      new Manuscript(this, "source-note", "Source Note 47", 128, 164),
      new Manuscript(this, "cross-reference", "Cross-Ref", 188, 124)
    ];
    this.bureaucraticWalls = [
      new BureaucraticWall(this, "repo-wall", "NO REPO", 100, 148),
      new BureaucraticWall(this, "memo-wall", "PENDING", 158, 148)
    ];
    const documentInteractables = documents.map((document) => ({
      id: document.id,
      label: document.label,
      x: document.x,
      y: document.y,
      kind: "document",
      onInteract: () => this.collect(document)
    }) satisfies Interactable);
    const wallInteractables = this.bureaucraticWalls.map((wall) => ({
      id: wall.id,
      label: `Stone Wall: ${wall.label}`,
      x: wall.x,
      y: wall.y,
      radius: 30,
      kind: "enemy",
      onInteract: () => this.clearBureaucraticWall(wall)
    }) satisfies Interactable);
    this.interactables = [...documentInteractables, ...wallInteractables];
    this.syncWallState();
    this.dialog.show("ELENA", [
      "A compiler reads the trail.",
      "Collect the pieces. If bureaucracy turns to stone, name the record and keep moving.",
      "Do not fight it. Verify it."
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

    this.player.update(delta, true);
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
    this.hintText.setText(nearest ? nearest.label.toUpperCase() : "");
    if ((Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) && nearest) {
      nearest.onInteract();
    }
    this.objectiveText.setText(gameState.objective);
  }

  private drawResearchTable() {
    this.add.rectangle(this.researchTable.x, this.researchTable.y, 68, 24, color(PALETTE.black), 0.88).setDepth(70);
    this.add.rectangle(this.researchTable.x, this.researchTable.y - 1, 64, 20, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(71);
    this.add.image(this.researchTable.x - 20, this.researchTable.y - 3, "source-note").setDepth(72);
    this.add.image(this.researchTable.x + 17, this.researchTable.y - 4, "citation-stamp").setDepth(72);
    this.add.text(this.researchTable.x, this.researchTable.y + 14, "RESEARCH TABLE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(73);
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
      wall.clear();
      retroAudio.stamp();
      this.interactables = this.interactables.filter((item) => item.id !== wall.id);
      this.syncWallState();
    });
  }

  private updateBureaucraticWalls(delta: number) {
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
    const activeThreats = this.bureaucraticWalls
      .filter((wall) => !wall.isCleared)
      .map((wall) => ({
        label: `Stone Wall: ${wall.label}`,
        x: wall.position.x,
        y: wall.position.y
      }));
    setVisibleThreats(activeThreats);
    setVisibleEntities([
      "Elena",
      "StateChat terminal",
      "Research Table",
      ...this.interactables.map((item) => item.label),
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
      "Carry Source Note 47 to the research table for human verification."
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
      setObjective("ROUTE: carry Source Note 47 to research table.");
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
      return;
    }
  }

  private applySourceNoteStamp() {
    this.add.image(this.researchTable.x + 20, this.researchTable.y - 16, "citation-stamp").setDepth(248);
    this.add.rectangle(this.researchTable.x + 20, this.researchTable.y - 4, 20, 6, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(249);
    this.add.text(this.researchTable.x + 20, this.researchTable.y - 7, "CITED", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(250);
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

  private addVerificationGlow() {
    const glow = this.add.rectangle(this.researchTable.x, this.researchTable.y - 18, 34, 4, color(PALETTE.terminalCyan), 0.92).setDepth(247);
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
    return Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, this.researchTable.x, this.researchTable.y) <= 32;
  }

  private finishArchiveIfReady() {
    if (this.sourceNoteStatus !== "stamped") {
      setObjective("Pick up Source Note 47 and verify provenance.");
      return;
    }
    if (this.collected.size < 3) {
      setObjective(`Collect remaining document tiles: ${this.collected.size}/3.`);
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
}
