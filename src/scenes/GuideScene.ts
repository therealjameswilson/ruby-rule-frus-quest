import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  addDocumentPoints,
  addInventoryItem,
  addVolumeFragment,
  gameState,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { Player } from "../entities/Player";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addObjectiveText, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class GuideScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stampIcon!: Phaser.GameObjects.Image;
  private fragmentIcon!: Phaser.GameObjects.Image;
  private gateGlow!: Phaser.GameObjects.Rectangle;
  private hasStamp = false;
  private hasFragment = false;
  private interactables: Interactable[] = [];

  constructor() {
    super("GuideScene");
  }

  create() {
    setSceneState("GuideScene", "explore", "Compare notes with an Archive Colleague.");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-30);
    drawRoomFrame(this, "ARCHIVE ROOM", PALETTE.goldStamp);
    this.drawCaveInterior();
    this.drawArchiveLamp(86, 88);
    this.drawArchiveLamp(170, 88);
    this.drawAntagonistPlaque(58, 164, "30-YEAR\nLINE", PALETTE.classNetRed);
    this.drawAntagonistPlaque(198, 164, "DANN-E\nQUEUE", PALETTE.terminalCyan);
    const colleague = this.add.image(128, 87, "archive-colleague").setScale(2).setDepth(90);
    this.tweens.add({ targets: colleague, y: 86, duration: 560, yoyo: true, repeat: -1, ease: "Stepped" });
    this.stampIcon = this.add.image(96, 132, "citation-stamp").setScale(1.25).setDepth(120);
    this.fragmentIcon = this.add.image(160, 132, "volume-fragment").setScale(1.25).setDepth(120);
    this.tweens.add({ targets: this.stampIcon, y: 130, duration: 460, yoyo: true, repeat: -1, ease: "Stepped" });
    this.tweens.add({ targets: this.fragmentIcon, y: 130, duration: 580, yoyo: true, repeat: -1, ease: "Stepped" });
    this.add.text(96, 148, "CITE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(121);
    this.add.text(160, 148, "FRAG", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(121);
    this.drawVerificationGate();

    this.player = new Player(this, 128, 160);
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

    this.interactables = [
      { id: "colleague", label: "Archive Colleague", x: 128, y: 87, radius: 24, kind: "npc", onInteract: () => this.talkColleague() },
      { id: "stamp", label: "Citation Stamp", x: 96, y: 132, radius: 30, kind: "document", onInteract: () => this.takeStamp() },
      { id: "fragment", label: "FRUS Volume Fragment", x: 160, y: 132, radius: 30, kind: "document", onInteract: () => this.takeFragment() },
      { id: "gate", label: "Verification Gate", x: 128, y: 198, radius: 30, kind: "door", onInteract: () => this.openGate() }
    ];
    this.syncVisibleState();
    this.dialog.show("ARCHIVE COLLEAGUE", [
      `Good to compare notes, ${gameState.playerProfile.displayName}.`,
      "Same rank, same burden: make the volume reliable.",
      "Take the citation stamp. Find the fragments. Let no delay decide for us."
    ], () => setObjective("Take the Citation Stamp."));
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
      this.dialog.show("PAUSED", "Your colleague waits.");
      return;
    }

    this.player.update(delta, true);
    this.reliability.update();
    const nearest = nearestInteractable(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.hintText.setText(nearest ? nearest.label.toUpperCase() : "");
    if ((Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) && nearest) {
      nearest.onInteract();
    }
    this.objectiveText.setText(gameState.objective);
  }

  private talkColleague() {
    this.dialog.show("ARCHIVE COLLEAGUE", [
      "The 30-year line is a deadline, not a decision-maker.",
      "DANN-E can queue a task. It cannot own judgment.",
      "Our tools are citations, concurrence, clearance, and reading."
    ]);
  }

  private takeStamp() {
    if (this.hasStamp) {
      this.dialog.show("CITATION STAMP", "Already in your folder.");
      return;
    }
    this.hasStamp = true;
    this.stampIcon.setVisible(false);
    addInventoryItem("Citation Stamp");
    addDocumentPoints(5, "citation stamp claimed");
    retroAudio.confirm();
    setObjective("Claim the first FRUS volume fragment.");
    this.dialog.show("CITATION STAMP", "A source note is not magic. It is a claim you can defend.");
    this.syncVisibleState();
  }

  private takeFragment() {
    if (!this.hasStamp) {
      this.dialog.show("FRUS FRAGMENT", "Stamp the citation trail before taking the fragment.");
      return;
    }
    if (this.hasFragment) {
      this.dialog.show("FRUS FRAGMENT", "Front matter fragment secured.");
      return;
    }
    this.hasFragment = true;
    this.fragmentIcon.setVisible(false);
    addInventoryItem("FRUS Fragment: Front Matter");
    addVolumeFragment("Front Matter Fragment");
    addDocumentPoints(10, "front matter fragment secured");
    retroAudio.stamp();
    setObjective("Open the Verification Gate.");
    this.gateGlow.setFillStyle(color(PALETTE.openNetGreen), 0.32);
    this.dialog.show("FRUS FRAGMENT", "The ruby cover gains its title plate because the chain is visible.");
    this.syncVisibleState();
  }

  private openGate() {
    if (!this.hasFragment) {
      this.dialog.show("VERIFICATION GATE", "The gate opens for a cited fragment, not a hunch.");
      return;
    }
    this.dialog.show("VERIFICATION GATE", [
      "Citation accepted.",
      "Confidence carries forward."
    ], () => transitionTo(this, "OfficeScene"));
  }

  private syncVisibleState() {
    const labels = ["Archive Colleague", "Verification Gate", "30-Year Line", "DANN-E Queue"];
    if (!this.hasStamp) labels.push("Citation Stamp");
    if (!this.hasFragment) labels.push("FRUS Volume Fragment");
    setVisibleEntities(labels);
    setVisibleThreats([
      { label: "30-Year Line", x: 58, y: 164 },
      { label: "DANN-E Queue", x: 198, y: 164 }
    ]);
  }

  private drawCaveInterior() {
    this.add.rectangle(128, 126, 210, 156, color(PALETTE.black)).setStrokeStyle(3, color(PALETTE.sepiaInk)).setDepth(-10);
    for (let x = 32; x <= 224; x += 16) {
      this.add.rectangle(x, 53, 10, 12, color(PALETTE.sepiaInk)).setDepth(-5);
      this.add.rectangle(x, 201, 10, 12, color(PALETTE.sepiaInk)).setDepth(-5);
    }
    for (let y = 65; y <= 193; y += 16) {
      this.add.rectangle(29, y, 12, 10, color(PALETTE.sepiaInk)).setDepth(-5);
      this.add.rectangle(227, y, 12, 10, color(PALETTE.sepiaInk)).setDepth(-5);
    }
    this.add.rectangle(128, 202, 40, 11, color(PALETTE.black)).setDepth(45);
  }

  private drawArchiveLamp(x: number, y: number) {
    const flame = this.add.container(x, y).setDepth(80);
    flame.add([
      this.add.rectangle(0, 9, 18, 5, color(PALETTE.sepiaInk)),
      this.add.rectangle(-5, 1, 5, 11, color(PALETTE.buckramHighlight)),
      this.add.rectangle(0, -3, 7, 14, color(PALETTE.goldStamp)),
      this.add.rectangle(2, 1, 4, 8, color(PALETTE.creamPaper))
    ]);
    this.tweens.add({ targets: flame, y: y - 1, duration: 260, yoyo: true, repeat: -1, ease: "Stepped" });
  }

  private drawAntagonistPlaque(x: number, y: number, label: string, accent: string) {
    this.add.rectangle(x, y, 50, 26, color(PALETTE.black), 0.92).setStrokeStyle(2, color(accent)).setDepth(60);
    this.add.text(x, y - 7, label, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: accent,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(61);
  }

  private drawVerificationGate() {
    this.gateGlow = this.add.rectangle(128, 198, 54, 24, color(PALETTE.classNetRed), 0.18).setDepth(55);
    this.add.rectangle(128, 198, 54, 24, color(PALETTE.black), 0.82).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(56);
    this.add.text(128, 190, "VERIFY\nGATE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(57);
  }
}
