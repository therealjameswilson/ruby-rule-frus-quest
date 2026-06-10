import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { awardProcessStamp, gameState, setNearestInteractable, setObjective, setSceneState, setVisibleEntities } from "../game/state";
import type { Interactable } from "../game/types";
import { HistorianNPC } from "../entities/HistorianNPC";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/Terminal";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addBookcase, addDesk, addDocumentStack, addRubyVolumeStack, addTinySparkle, addWallMap } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];

  constructor() {
    super("OfficeScene");
  }

  create() {
    setSceneState("OfficeScene", "explore", "Talk to Elena.");
    retroAudio.startMusic("OfficeScene");
    gameState.sceneProgress.office ??= 0;
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    drawTiledFloor(this, "office-tiles");
    drawRoomFrame(this, "OFFICE HUB");
    this.add.rectangle(GAME_WIDTH / 2, 35, 166, 18, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp));
    this.add.text(128, 30, "OFFICE OF THE HISTORIAN", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    addBookcase(this, 25, 55, 30, 38);
    addBookcase(this, 231, 55, 30, 38);
    addWallMap(this, 128, 96, "FRUS MAP");
    addDesk(this, 58, 105, "SRC");
    addDesk(this, 198, 110, "NET");
    addRubyVolumeStack(this, 112, 154, 3);
    addDocumentStack(this, 151, 157);
    addTinySparkle(this, 128, 50, PALETTE.goldStamp);

    const elena = new HistorianNPC(this, "elena", 58, 78);
    const marcus = new HistorianNPC(this, "marcus", 198, 82);
    const priya = new HistorianNPC(this, "priya", 136, 132);
    const openNet = new Terminal(this, 50, 150, "OpenNet");
    const classNet = new Terminal(this, 206, 150, "ClassNet");
    this.add.rectangle(128, 66, 38, 26, color(PALETTE.goldStamp)).setStrokeStyle(2, color(PALETTE.sepiaInk));
    this.add.text(128, 58, "GOLDEN\nRULE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.deepRuby,
      align: "center"
    }).setOrigin(0.5);

    this.player = new Player(this, 128, 184);
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
      { id: "elena", label: "Elena", x: elena.x, y: elena.y, kind: "npc", onInteract: () => this.talkElena() },
      { id: "marcus", label: "Marcus", x: marcus.x, y: marcus.y, kind: "npc", onInteract: () => this.talkMarcus() },
      { id: "priya", label: "Priya", x: priya.x, y: priya.y, kind: "npc", onInteract: () => this.talkPriya() },
      { id: "poster", label: "Golden Rule", x: 128, y: 66, kind: "poster", onInteract: () => this.readPoster() },
      { id: "opennet", label: "OpenNet terminal", x: openNet.x, y: openNet.y, kind: "terminal", onInteract: () => this.inspectOpenNet() },
      { id: "classnet", label: "ClassNet terminal", x: classNet.x, y: classNet.y, kind: "terminal", onInteract: () => this.inspectClassNet() }
    ];
    setVisibleEntities(this.interactables.map((item) => item.label));
    this.updateOfficeObjective();

    this.dialog.show("PRIYA", [
      `Welcome, ${gameState.playerProfile.displayName}.`,
      `${gameState.playerProfile.roleLabel} joins the table. The record gets another human reader.`
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
      this.dialog.show("PAUSED", "The record waits.");
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

  private talkElena() {
    if (gameState.sceneProgress.office === 0) {
      this.dialog.show("ELENA", [
        "The machine proposes.\nWe decide.",
        "Nothing reaches print on its word alone.",
        "The AI annotation review tool can flag patterns; it cannot settle evidence."
      ], () => {
        gameState.sceneProgress.office = 1;
        this.updateOfficeObjective();
      });
      return;
    }
    this.dialog.show("ELENA", "Archive work begins with a source you can defend.");
  }

  private talkMarcus() {
    this.dialog.show("MARCUS", [
      "OpenNet is the open world.",
      "ClassNet is where the sharp edges live."
    ]);
  }

  private talkPriya() {
    this.dialog.show("PRIYA", "Style can be checked. Meaning has to be read.");
  }

  private readPoster() {
    if (gameState.sceneProgress.office < 1) {
      this.dialog.show("POSTER", "Talk to Elena. Then the rule will land.");
      return;
    }
    this.dialog.show("GOLDEN RULE", [
      "STATECHAT PROPOSES.",
      "HUMANS DECIDE.",
      "PUBLISHED FRUS IS THE RECORD."
    ], () => {
      awardProcessStamp("rule");
      retroAudio.stamp();
      gameState.sceneProgress.office = Math.max(gameState.sceneProgress.office, 2);
      this.updateOfficeObjective();
    });
  }

  private inspectOpenNet() {
    this.dialog.show("STATECHAT / OPENNET", [
      "READY",
      "OPEN SOURCE CHECKS ONLY.",
      "NO CLASSIFIED MATERIAL HERE."
    ]);
  }

  private inspectClassNet() {
    if (gameState.sceneProgress.office < 2) {
      this.dialog.show("STATECHAT / CLASSNET", "Read the Golden Rule before the closed room opens.");
      return;
    }
    this.dialog.show("STATECHAT / CLASSNET", [
      "PRE-SUBMISSION REVIEW",
      "AI ANNO TOOL QUEUED",
      "COMMENT-ONLY GATES ON"
    ], () => transitionTo(this, "ArchiveScene"));
  }

  private updateOfficeObjective() {
    const stage = gameState.sceneProgress.office;
    if (stage <= 0) setObjective("Talk to Elena.");
    else if (stage === 1) setObjective("Read the Golden Rule poster.");
    else setObjective("Inspect the ClassNet terminal.");
  }
}
