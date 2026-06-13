import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
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
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { drawRoomFrame, transitionTo } from "../systems/sceneTransitions";

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

    this.player = new Player(this, 128, 184);
    this.juniorCompiler = new JuniorCompiler(this, 70, 116);
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
        id: "archive-guide-door",
        label: "Archive Guide Door",
        x: 128,
        y: 216,
        radius: 24,
        kind: "door",
        onInteract: () => transitionTo(this, "GuideScene")
      }
    ];
    setVisibleEntities(["Junior Compiler", "Corner Desk", "Archive Guide Door"]);
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

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.inventory.active || this.reliability.active) {
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
    this.hintText.setText(nearest ? nearest.label.toUpperCase() : "");
    if (input.aJustPressed && nearest) nearest.onInteract();
    setObjective("Office Hub: talk to the Junior Compiler or enter the Archive Guide.");
    this.reliability.update();
  }

  private talkJuniorCompiler() {
    retroAudio.confirm();
    this.dialog.show("JUNIOR COMPILER", this.juniorCompiler.dialogLines());
  }

  private drawOfficeInterior() {
    this.add.rectangle(128, 128, 210, 160, color(PALETTE.creamPaper)).setDepth(-20);
    this.add.rectangle(128, 43, 208, 12, color(PALETTE.sepiaInk)).setDepth(-15);
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
}
