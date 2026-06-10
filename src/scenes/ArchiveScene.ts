import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import {
  addInventoryItem,
  awardProcessStamp,
  gameState,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { ChoiceOption, Interactable } from "../game/types";
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
import { ChoicePrompt } from "../systems/verification";

export class ArchiveScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];
  private collected = new Set<string>();
  private bureaucraticWalls: BureaucraticWall[] = [];
  private wallContactCooldown = 0;

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
    this.choice = new ChoicePrompt(this);
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
      new Manuscript(this, "source-note", "Source Note", 128, 104),
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
    if (this.choice.active || this.inventory.active || this.reliability.active) {
      this.player.update(delta, false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The archive waits.");
      return;
    }

    this.player.update(delta, true);
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

  private collect(document: Manuscript) {
    if (this.collected.has(document.id)) return;
    this.collected.add(document.id);
    document.collect();
    retroAudio.confirm();
    addInventoryItem(document.label);
    this.interactables = this.interactables.filter((item) => item.id !== document.id);
    if (this.collected.size < 3) {
      setObjective(`Collect document tiles: ${this.collected.size}/3.`);
      this.dialog.show("ARCHIVE", `${document.label} filed.`);
      return;
    }
    setObjective("Verify Source Note 47.");
    this.dialog.show("STATECHAT / CLASSNET", [
      "FLAG:",
      "SOURCE NOTE 47 REPOSITORY NOT SPECIFIED.",
      "CANNOT PROPOSE. ARCHIVAL QUESTION REQUIRES COMPILER."
    ], () => this.showVerification());
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
    setVisibleEntities(["Elena", "StateChat terminal", ...this.interactables.map((item) => item.label)]);
  }

  private showVerification() {
    const options: ChoiceOption[] = [
      { key: "A", label: "Accept StateChat guess", value: "guess" },
      { key: "B", label: "Check compiler research file", value: "research" },
      { key: "C", label: "Ignore flag", value: "ignore" }
    ];
    this.choice.show("STATECHAT FLAG:\nSOURCE NOTE 47 REPOSITORY NOT SPECIFIED.\n\nWHAT DO YOU DO?", options, (option) => {
      if (option.value === "research") {
        awardProcessStamp("archive");
        retroAudio.stamp();
        adjustReliability(10, "provenance verified by a human");
        this.reliability.update();
        this.dialog.show("ELENA", [
          "Good. The source note needs a repository.",
          "A flag is not a fact until a compiler can defend it."
        ], () => transitionTo(this, "NetworkScene"));
        return;
      }
      adjustReliability(-15, "missing provenance not resolved");
      this.reliability.update();
      this.dialog.show("ELENA", [
        "Return to the human decision.",
        "The archive has to answer this one."
      ], () => this.showVerification());
    });
  }
}
