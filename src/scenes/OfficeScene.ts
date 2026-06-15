import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  addDanneItem,
  gameState,
  hasDanneItem,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { Player } from "../entities/Player";
import { JuniorCompiler } from "../entities/npcs/JuniorCompiler";
import { bindPointerDown, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InteractionAssist, nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { drawRoomFrame, transitionTo } from "../systems/sceneTransitions";

type OfficeDanneRoute = "CherryBlossomGardenScene" | "SenateHearingChamberScene";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private juniorCompiler!: JuniorCompiler;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private hintText!: Phaser.GameObjects.Text;
  private tutorialCard?: Phaser.GameObjects.Container;
  private readonly interactionAssist = new InteractionAssist();
  private interactables: Interactable[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];

  constructor() {
    super("OfficeScene");
  }

  create() {
    setSceneState("OfficeScene", "explore", "Office Hub: talk to the Junior Compiler or enter the Archive Guide.");
    setLatestMessage("Office Hub loaded.");
    setVisibleThreats([]);
    retroAudio.startMusic("GuideScene");
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    drawRoomFrame(this, "OFFICE HUB", PALETTE.goldStamp);
    this.drawOfficeInterior();

    const returnSpawn = this.consumeOfficeReturnSpawn();
    this.player = new Player(this, returnSpawn?.x ?? 128, returnSpawn?.y ?? 184);
    this.juniorCompiler = new JuniorCompiler(this, 70, 122);
    this.dialog = new DialogBox(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(900);
    this.solids = [
      new Phaser.Geom.Rectangle(34, 72, 72, 28),
      new Phaser.Geom.Rectangle(154, 72, 64, 28),
      new Phaser.Geom.Rectangle(32, 134, 56, 28),
      new Phaser.Geom.Rectangle(174, 132, 42, 34)
    ];
    this.interactables = [
      {
        id: "junior-compiler",
        label: "Junior Compiler",
        x: this.juniorCompiler.x,
        y: this.juniorCompiler.y,
        radius: 30,
        kind: "npc",
        onInteract: () => this.talkJuniorCompiler()
      },
      {
        id: "production-inbox",
        label: "Production Inbox",
        x: 60,
        y: 154,
        radius: 28,
        kind: "document",
        onInteract: () => this.handleJuniorQuestStation("inbox")
      },
      {
        id: "frus-cart",
        label: "FRUS Cart",
        x: 128,
        y: 132,
        radius: 30,
        kind: "document",
        onInteract: () => this.handleJuniorQuestStation("cart")
      },
      {
        id: "Archive Terminal",
        label: "Archive Terminal",
        x: 195,
        y: 154,
        radius: 36,
        kind: "terminal",
        onInteract: () => this.handleJuniorQuestStation("terminal")
      },
      {
        id: "archive-guide-door",
        label: "Archive Guide Door",
        x: 128,
        y: 216,
        radius: 24,
        kind: "door",
        onInteract: () => transitionTo(this, "GuideScene")
      },
      {
        id: "cherry-garden-door",
        label: "Cherry Blossom Garden",
        x: 39,
        y: 51,
        radius: 26,
        kind: "door",
        onInteract: () => this.routeToDanneMap("CherryBlossomGardenScene", 39, 58)
      },
      {
        id: "senate-hearing-door",
        label: "Senate Hearing Chamber",
        x: 215,
        y: 51,
        radius: 26,
        kind: "door",
        onInteract: () => this.routeToDanneMap("SenateHearingChamberScene", 215, 58)
      }
    ];
    setVisibleEntities([
      "Junior Compiler",
      "Production Inbox",
      "FRUS Cart",
      "Archive Terminal",
      "Archive Guide Door",
      "Cherry Blossom Garden Door",
      "Senate Hearing Chamber Door"
    ]);
    if (!gameState.sceneProgress.officeTutorialSeen) this.showOfficeTutorial();
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
    this.juniorCompiler.update(this.time.now);

    if (this.tutorialCard) {
      if (input.confirmJustPressed || input.aJustPressed || input.cancelJustPressed || input.pointerPrimaryJustPressed) {
        this.dismissOfficeTutorial();
      }
      this.player.update(delta, false);
      return;
    }

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show("OFFICE HUB", "The office route is paused.");
      return;
    }

    this.player.update(delta, true, {
      bounds: { left: 16, right: GAME_WIDTH - 16, top: 42, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    const nearest = nearestInteractable(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.hintText.setText(nearest ? `A: ${nearest.label.toUpperCase()}` : "");
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) bufferedInteraction.onInteract();
    setObjective("Office Hub: talk to the Junior Compiler or enter the Archive Guide.");
    this.reliability.update();
  }

  private talkJuniorCompiler() {
    retroAudio.confirm();
    const progress = gameState.sceneProgress.juniorCompilerFetch ?? 0;
    if (hasDanneItem("master-declass-key")) {
      this.dialog.show("JUNIOR COMPILER", [
        "Master Declass Key is logged.",
        "Use it only at approved classified doors.",
        ...this.juniorCompiler.dialogLines()
      ]);
      return;
    }
    if (progress >= 3) {
      const added = addDanneItem("master-declass-key");
      if (added) retroAudio.danneItemPickup("Master Declass Key");
      this.dialog.show("JUNIOR COMPILER", [
        "Inbox, cart, and terminal agree.",
        "Master Declass Key acquired.",
        "Carry it to the Marine Guard for approved access."
      ]);
      return;
    }
    const next = progress === 0 ? "Production Inbox" : progress === 1 ? "FRUS Cart" : "Archive Terminal";
    this.dialog.show("JUNIOR COMPILER", [
      ...this.juniorCompiler.dialogLines(),
      `Fetch check ${progress + 1}/3: inspect ${next}.`
    ]);
  }

  private showOfficeTutorial() {
    const shadow = this.add.rectangle(128, 126, 206, 92, color(PALETTE.black), 0.72);
    const panel = this.add.rectangle(128, 122, 198, 86, color(PALETTE.shadowNavy), 0.96)
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    const title = this.add.text(128, 86, "FIELD CONTROLS", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    const body = this.add.text(128, 105, [
      "MOVE: ARROWS / WASD",
      "INTERACT: ENTER / SPACE / A",
      "CANCEL: ESC / B",
      "CODEX/MENU: TAB / M"
    ], {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      align: "center",
      lineSpacing: 2
    }).setOrigin(0.5, 0);
    const prompt = this.add.text(128, 162, "PRESS A / ENTER TO BEGIN", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.tutorialCard = this.add.container(0, 0, [shadow, panel, title, body, prompt]).setDepth(1800);
    bindPointerDown(panel, () => this.dismissOfficeTutorial());
  }

  private dismissOfficeTutorial() {
    if (!this.tutorialCard) return;
    this.tutorialCard.destroy();
    this.tutorialCard = undefined;
    gameState.sceneProgress.officeTutorialSeen = 1;
    setLatestMessage("Controls logged.");
  }

  private handleJuniorQuestStation(station: "inbox" | "cart" | "terminal") {
    const progress = gameState.sceneProgress.juniorCompilerFetch ?? 0;
    const expected = progress === 0 ? "inbox" : progress === 1 ? "cart" : progress === 2 ? "terminal" : "done";
    if (expected === "done") {
      this.dialog.show("OFFICE CHECK", "The three production checks are complete. Return to the Junior Compiler.");
      return;
    }
    if (station !== expected) {
      const next = expected === "inbox" ? "Production Inbox" : expected === "cart" ? "FRUS Cart" : "Archive Terminal";
      retroAudio.warning();
      this.dialog.show("OFFICE CHECK", `Check order matters: go to ${next}.`);
      return;
    }
    gameState.sceneProgress.juniorCompilerFetch = progress + 1;
    retroAudio.confirm();
    const messages = {
      inbox: "Inbox slip logged: unresolved clearance request found.",
      cart: "FRUS cart checked: document packet is physically present.",
      terminal: "Archive terminal checked: request status matches the paper trail."
    } as const;
    setLatestMessage(messages[station]);
    this.dialog.show("OFFICE CHECK", [
      messages[station],
      progress + 1 >= 3 ? "Return to the Junior Compiler for key issuance." : "Continue the production check sequence."
    ]);
  }

  private consumeOfficeReturnSpawn() {
    const x = gameState.sceneProgress.officeReturnX;
    const y = gameState.sceneProgress.officeReturnY;
    delete gameState.sceneProgress.officeReturnX;
    delete gameState.sceneProgress.officeReturnY;
    if (typeof x !== "number" || typeof y !== "number") return null;
    return { x, y };
  }

  private routeToDanneMap(target: OfficeDanneRoute, returnX: number, returnY: number) {
    gameState.sceneProgress.officeReturnX = returnX;
    gameState.sceneProgress.officeReturnY = returnY;
    transitionTo(this, target);
  }

  private drawOfficeInterior() {
    this.add.rectangle(128, 128, 210, 160, color(PALETTE.creamPaper)).setDepth(-20);
    this.drawFloorPattern();
    this.drawWallDressing();
    this.drawOfficeProps();
    this.add.rectangle(128, 43, 208, 12, color(PALETTE.sepiaInk)).setDepth(-15);
    this.drawSmallDoor(39, 47, "GARDEN", PALETTE.openNetGreen);
    this.drawSmallDoor(215, 47, "SENATE", PALETTE.goldStamp);
    this.add.rectangle(128, 219, 30, 10, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(20);
    this.add.text(128, 213, "ARCHIVE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(21);
    this.drawDesk(70, 92, "JR");
    this.drawDesk(186, 92, "FILES");
    this.drawDesk(60, 154, "IN");
    this.drawTerminalDesk(195, 154);
    this.add.rectangle(128, 132, 40, 18, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-5);
    this.add.rectangle(128, 130, 26, 9, color(PALETTE.creamPaper)).setDepth(-4);
    this.add.text(128, 145, "FRUS CART", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(-3);
  }

  private drawFloorPattern() {
    // Subtle checker tiling across the cream floor to break up the empty space.
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if ((row + col) % 2 !== 0) continue;
        const x = 32 + col * 24;
        const y = 58 + row * 24;
        this.add.rectangle(x, y, 22, 22, color(PALETTE.sepiaInk), 0.16).setDepth(-19);
      }
    }
    // Central archive runner rug leading from the entrance to the FRUS cart.
    this.add.rectangle(128, 176, 70, 78, color(PALETTE.buckramRed), 0.55).setDepth(-18);
    this.add.rectangle(128, 176, 60, 68, color(PALETTE.deepRuby), 0.45)
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-17);
    this.add.rectangle(128, 176, 46, 54).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-16);
  }

  private drawWallDressing() {
    // Framed wall map and reference charts on the back wall strip (above desks).
    this.add.rectangle(108, 60, 30, 20, color(PALETTE.shadowNavy)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-14);
    this.add.rectangle(108, 60, 24, 14, color(PALETTE.mapWater)).setDepth(-13);
    this.add.rectangle(102, 58, 6, 4, color(PALETTE.openNetGreen)).setDepth(-12);
    this.add.rectangle(113, 62, 5, 5, color(PALETTE.archiveAmber)).setDepth(-12);
    this.add.rectangle(148, 60, 26, 18, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-14);
    for (let i = 0; i < 4; i += 1) {
      this.add.rectangle(148, 55 + i * 4, 18, 1, color(PALETTE.sepiaInk), 0.7).setDepth(-13);
    }
    // Hanging archive banner near the senate door.
    this.add.rectangle(128, 52, 18, 14, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-14);
    this.add.rectangle(128, 50, 10, 6, color(PALETTE.goldStamp)).setDepth(-13);
  }

  private drawOfficeProps() {
    // Stacked archive boxes in the lower-left corner.
    this.drawArchiveBox(28, 196);
    this.drawArchiveBox(28, 182);
    this.drawArchiveBox(40, 198);
    // Document stacks on the floor near the FILES desk.
    this.add.rectangle(214, 116, 12, 4, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(214, 112, 11, 4, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    // Potted plant in the lower-right corner for warmth.
    this.drawPottedPlant(228, 200);
    // Desk lamp glow on the terminal desk.
    this.add.ellipse(195, 150, 30, 16, color(PALETTE.goldStamp), 0.18).setDepth(-7);
  }

  private drawPottedPlant(x: number, y: number) {
    // Terracotta pot with a rim, so the foliage reads as a plant rather than a
    // solid colour blob. Leaves are layered shaded greens with a couple of
    // highlight fronds instead of one flat bright-green ellipse.
    this.add.rectangle(x, y + 2, 12, 8, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x, y - 2, 14, 3, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x, y + 4, 12, 2, color(PALETTE.sepiaInk), 0.4).setDepth(-5);
    this.add.ellipse(x, y - 10, 16, 14, color(PALETTE.plantLeafDark)).setDepth(-6);
    this.add.ellipse(x - 4, y - 12, 8, 11, color(PALETTE.plantLeafShade)).setDepth(-5);
    this.add.ellipse(x + 4, y - 11, 8, 11, color(PALETTE.plantLeafShade)).setDepth(-5);
    this.add.ellipse(x, y - 14, 7, 10, color(PALETTE.plantLeaf)).setDepth(-4);
    this.add.ellipse(x - 2, y - 16, 3, 6, color(PALETTE.plantLeaf)).setDepth(-4);
    this.add.ellipse(x + 3, y - 15, 2, 5, color(PALETTE.openNetGreen)).setDepth(-3);
  }

  private drawArchiveBox(x: number, y: number) {
    this.add.rectangle(x, y, 14, 11, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x, y - 3, 14, 3, color(PALETTE.sepiaInk), 0.5).setDepth(-5);
    this.add.rectangle(x, y + 1, 8, 3, color(PALETTE.creamPaper)).setDepth(-5);
  }

  private drawDesk(x: number, y: number, label: string) {
    this.add.rectangle(x + 2, y + 2, 58, 20, color(PALETTE.black), 0.35).setDepth(-8);
    this.add.rectangle(x, y, 58, 20, color(PALETTE.sepiaInk)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-6);
    this.add.rectangle(x - 15, y - 2, 18, 8, color(PALETTE.creamPaper)).setDepth(-5);
    this.add.rectangle(x + 13, y - 2, 15, 8, color(PALETTE.buckramRed)).setDepth(-5);
    this.add.text(x, y + 5, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(-4);
  }

  private drawTerminalDesk(x: number, y: number) {
    this.drawDesk(x, y, "TERM");
    this.add.rectangle(x, y - 9, 22, 14, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(-3);
    this.add.rectangle(x, y - 9, 14, 7, color(PALETTE.terminalCyan), 0.7).setDepth(-2);
  }

  private drawSmallDoor(x: number, y: number, label: string, accent: string) {
    this.add.rectangle(x, y, 30, 12, color(PALETTE.black)).setStrokeStyle(1, color(accent)).setDepth(16);
    this.add.rectangle(x, y + 3, 20, 5, color(PALETTE.deepRuby)).setDepth(17);
    this.add.text(x, y - 4, label, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: accent,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(18);
  }
}
