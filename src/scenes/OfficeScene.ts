import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { awardProcessStamp, gameState, setNearestInteractable, setObjective, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import type { Interactable } from "../game/types";
import { BeeSwarm } from "../entities/BeeSwarm";
import { FederalShutdown } from "../entities/FederalShutdown";
import { HacMember } from "../entities/HacMember";
import { NavyHillMice } from "../entities/NavyHillMice";
import { Player } from "../entities/Player";
import { ProductionColleague } from "../entities/ProductionColleague";
import { Terminal } from "../entities/Terminal";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addBookcase, addDesk, addDocumentStack, addRubyVolumeStack, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionTo } from "../systems/sceneTransitions";
import { addSnesRoomLayer, addSnesWorldMap } from "../systems/snesPixelArt";

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
  private hacMember!: HacMember;
  private federalShutdown!: FederalShutdown;
  private beeSwarm!: BeeSwarm;
  private navyHillMice!: NavyHillMice;
  private interactables: Interactable[] = [];

  constructor() {
    super("OfficeScene");
  }

  create() {
    setSceneState("OfficeScene", "explore", "Office Hub: learn the Golden Rule.");
    retroAudio.startMusic("OfficeScene");
    gameState.sceneProgress.office ??= 0;
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    drawTiledFloor(this, "office-tiles");
    drawRoomFrame(this, "OFFICE HUB");
    addSnesRoomLayer(this, { roomId: "O1", roomType: "hint", theme: "office" });
    this.add.rectangle(GAME_WIDTH / 2, 35, 166, 18, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp));
    this.add.text(128, 30, "OFFICE OF THE HISTORIAN", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    addBookcase(this, 25, 55, 30, 38);
    addBookcase(this, 231, 55, 30, 38);
    addSnesWorldMap(this, 128, 98, "DISTRICT MAP", "frus-snes-atlas", undefined, {
      viewportWidth: 170,
      viewportHeight: 106,
      cropX: 35,
      cropY: 37
    });
    addDesk(this, 58, 105, "SRC");
    addDesk(this, 198, 110, "NET");
    this.add.rectangle(40, 126, 36, 20, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.terminalCyan));
    this.add.rectangle(40, 131, 26, 9, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk));
    this.add.text(40, 118, "NAVY\nHILL", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5);
    this.add.text(40, 130, "NOTES", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5);
    addRubyVolumeStack(this, 112, 154, 3);
    addDocumentStack(this, 151, 157);
    addTinySparkle(this, 128, 50, PALETTE.goldStamp);

    const elena = new ProductionColleague(this, "compiler", 58, 78, { label: "ELENA", pose: "work" });
    const marcus = new ProductionColleague(this, "declass_coordinator", 198, 82, { label: "MARCUS", pose: "work" });
    const priya = new ProductionColleague(this, "editor", 136, 132, { label: "PRIYA", pose: "work" });
    const reviewer = new ProductionColleague(this, "reviewer", 86, 134, { label: "REVIEW", pose: "work" });
    const reviewSpecialist = new ProductionColleague(this, "review_specialist", 224, 128, { label: "STAMP", pose: "work" });
    this.hacMember = new HacMember(this, 88, 174);
    this.federalShutdown = new FederalShutdown(this, 214, 176);
    this.beeSwarm = new BeeSwarm(this, 162, 166);
    this.navyHillMice = new NavyHillMice(this, 39, 132);
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
      { id: "reviewer", label: "Reviewer", x: reviewer.x, y: reviewer.y, kind: "npc", onInteract: () => this.talkReviewer() },
      { id: "review-specialist", label: "Review Specialist", x: reviewSpecialist.x, y: reviewSpecialist.y, kind: "npc", onInteract: () => this.talkReviewSpecialist() },
      { id: "poster", label: "Golden Rule", x: 128, y: 66, kind: "poster", onInteract: () => this.readPoster() },
      { id: "opennet", label: "OpenNet terminal", x: openNet.x, y: openNet.y, kind: "terminal", onInteract: () => this.inspectOpenNet() },
      { id: "classnet", label: "ClassNet terminal", x: classNet.x, y: classNet.y, kind: "terminal", onInteract: () => this.inspectClassNet() }
    ];
    this.syncOfficeVisibility();
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
      this.updateHacMember(delta, false);
      this.updateFederalShutdown(delta, false);
      this.updateBeeSwarm(delta, false);
      this.updateNavyHillMice(delta, false);
      this.player.update(delta, false);
      return;
    }
    if (this.inventory.active || this.reliability.active) {
      this.updateHacMember(delta, false);
      this.updateFederalShutdown(delta, false);
      this.updateBeeSwarm(delta, false);
      this.updateNavyHillMice(delta, false);
      this.player.update(delta, false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The record waits.");
      return;
    }

    const shutdown = this.updateFederalShutdown(delta, true);
    this.player.update(delta, !shutdown.stopWorkActive);
    this.updateHacMember(delta, !shutdown.stopWorkActive);
    this.updateBeeSwarm(delta, !shutdown.stopWorkActive);
    this.updateNavyHillMice(delta, !shutdown.stopWorkActive);
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

  private talkReviewer() {
    this.dialog.show("REVIEWER", "A human review pass keeps the evidence, context, and process in the same room.");
  }

  private talkReviewSpecialist() {
    this.dialog.show("REVIEW SPECIALIST", "No rank settles the record. The stamp follows review, not the other way around.");
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
    this.dialog.show("OPENNET TERMINAL", [
      "READY",
      "OPEN SOURCE CHECKS ONLY.",
      "NO CLASSIFIED MATERIAL HERE."
    ]);
  }

  private inspectClassNet() {
    if (gameState.sceneProgress.office < 2) {
      this.dialog.show("CLASSNET TERMINAL", "Read the Golden Rule before the closed room opens.");
      return;
    }
    this.dialog.show("CLASSNET TERMINAL", [
      "PRE-SUBMISSION REVIEW",
      "AI ANNO TOOL QUEUED",
      "ARCHIVE CAVERN UNLOCKED"
    ], () => transitionTo(this, "GuideScene"));
  }

  private updateOfficeObjective() {
    const stage = gameState.sceneProgress.office;
    if (stage <= 0) setObjective("Office Hub: talk to Elena.");
    else if (stage === 1) setObjective("Office Hub: read the Golden Rule poster.");
    else setObjective("Office Hub: inspect ClassNet to open Archive Cavern.");
  }

  private updateHacMember(delta: number, canDistract: boolean) {
    const distracted = this.hacMember.update(this.time.now, delta, this.player.position, canDistract);
    if (distracted) {
      adjustReliability(-1, "HAC distraction pulled focus from FRUS workflow");
    }
    this.syncOfficeVisibility();
  }

  private updateFederalShutdown(delta: number, canImpede: boolean) {
    const shutdown = this.federalShutdown.update(this.time.now, delta, this.player.position, canImpede);
    if (shutdown.triggered) {
      adjustReliability(-2, "federal shutdown stop-work order delayed FRUS production");
    }
    this.syncOfficeVisibility();
    return shutdown;
  }

  private updateBeeSwarm(delta: number, canBuzz: boolean) {
    const buzzed = this.beeSwarm.update(this.time.now, delta, this.player.position, canBuzz);
    if (buzzed) {
      adjustReliability(-1, "bee swarm forced a detour around the FRUS production floor");
    }
    this.syncOfficeVisibility();
  }

  private updateNavyHillMice(delta: number, canScatter: boolean) {
    const scattered = this.navyHillMice.update(this.time.now, delta, this.player.position, canScatter);
    if (scattered) {
      adjustReliability(-1, "Navy Hill mice scattered source notes across the FRUS floor");
    }
    this.syncOfficeVisibility();
  }

  private syncOfficeVisibility() {
    setVisibleEntities([
      ...this.interactables.map((item) => item.label),
      "Main game map",
      "Navy Hill",
      "HAC member",
      "Federal government shutdown",
      "Bees",
      "Navy Hill mice"
    ]);
    const hacPosition = this.hacMember.position;
    const shutdownPosition = this.federalShutdown.position;
    const beePosition = this.beeSwarm.position;
    const micePosition = this.navyHillMice.position;
    setVisibleThreats([
      {
        label: "HAC member",
        x: hacPosition.x,
        y: hacPosition.y,
        spriteKey: this.hacMember.spriteKey,
        behavior: "roams around causing distractions",
        defeatMethod: "Keep focus on the Golden Rule and continue human review.",
        status: this.hacMember.status(this.time.now)
      },
      {
        label: "Federal government shutdown",
        x: shutdownPosition.x,
        y: shutdownPosition.y,
        spriteKey: this.federalShutdown.spriteKey,
        behavior: "roams around posting stop-work closure notices",
        defeatMethod: "Wait out the shutdown notice, keep records queued, and resume FRUS production.",
        status: this.federalShutdown.status(this.time.now)
      },
      {
        label: "Bees",
        x: beePosition.x,
        y: beePosition.y,
        spriteKey: this.beeSwarm.spriteKey,
        behavior: "swarm around the Office Hub and disrupt concentration if the player gets too close",
        defeatMethod: "Avoid the swarm and continue routing FRUS work through human review.",
        status: this.beeSwarm.status(this.time.now)
      },
      {
        label: "Navy Hill mice",
        x: micePosition.x,
        y: micePosition.y,
        spriteKey: this.navyHillMice.spriteKey,
        behavior: "scurry around Navy Hill and scatter source notes if the player gets too close",
        defeatMethod: "Skirt the Navy Hill landmark and keep source notes routed through human review.",
        status: this.navyHillMice.status(this.time.now)
      }
    ]);
  }
}
