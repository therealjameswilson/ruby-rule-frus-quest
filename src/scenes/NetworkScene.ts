import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import {
  addDocumentPoints,
  addInventoryItem,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { ChoiceOption, RouteItem } from "../game/types";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { HistorianNPC } from "../entities/HistorianNPC";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/Terminal";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addNetworkCables, addTinySparkle, addWallMap } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionTo } from "../systems/sceneTransitions";
import { ChoicePrompt } from "../systems/verification";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class NetworkScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private routeText!: Phaser.GameObjects.Text;
  private currentRoute = 0;
  private correctRoutes = 0;
  private routingActive = false;
  private bureaucraticWalls: BureaucraticWall[] = [];

  private readonly routeItems: RouteItem[] = [
    { label: "Published FRUS cross-reference research", network: "OpenNet", classification: "unclassified" },
    { label: "Publication status verification", network: "OpenNet", classification: "unclassified" },
    { label: "Typeset unclassified proof", network: "OpenNet", classification: "unclassified" },
    { label: "SBU annotation sheet", network: "ClassNet", classification: "sbu" },
    { label: "Classified source note", network: "ClassNet", classification: "classified" },
    { label: "Codeword document review", network: "ClassNet", classification: "codeword" },
    { label: "Excision language review", network: "ClassNet", classification: "classified" }
  ];

  constructor() {
    super("NetworkScene");
  }

  create() {
    setSceneState("NetworkScene", "explore", "Learn the network split from Marcus.");
    retroAudio.startMusic("NetworkScene");
    setVisibleEntities(["Marcus", "OpenNet door", "ClassNet door", "Routing sorter", "Stone Wall: Firewall"]);
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    drawTiledFloor(this, "network-tiles");
    drawRoomFrame(this, "NETWORK");
    addNetworkCables(this);
    addWallMap(this, 128, 66, "NET MAP");
    addTinySparkle(this, 60, 108, PALETTE.openNetGreen);
    addTinySparkle(this, 196, 108, PALETTE.classNetRed);
    this.bureaucraticWalls = [
      new BureaucraticWall(this, "firewall-open", "FIREWALL", 96, 152),
      new BureaucraticWall(this, "firewall-class", "FORM 32", 160, 152)
    ];
    this.syncThreatState();
    new HistorianNPC(this, "marcus", 128, 54);
    new Terminal(this, 60, 124, "OpenNet");
    new Terminal(this, 196, 124, "ClassNet");
    this.add.rectangle(60, 166, 52, 34, color(PALETTE.black)).setStrokeStyle(3, color(PALETTE.openNetGreen));
    this.add.text(60, 159, "OPEN\nNET", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.openNetGreen,
      align: "center"
    }).setOrigin(0.5);
    this.add.rectangle(196, 166, 52, 34, color(PALETTE.black)).setStrokeStyle(3, color(PALETTE.classNetRed));
    this.add.text(196, 159, "CLASS\nNET", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5);

    this.routeText = this.add.text(128, 88, "ROUTING LOG EMPTY", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center",
      wordWrap: { width: 176, useAdvancedWrap: true }
    }).setOrigin(0.5);
    this.player = new Player(this, 128, 196);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.dialog.show("MARCUS", [
      "OpenNet is the open world.",
      "ClassNet is where the sharp edges live.",
      "Route each item. No leaks. No guessing."
    ], () => this.beginRouting());
  }

  update(_: number, delta: number) {
    const keys = this.player.inputKeys;
    this.bureaucraticWalls.forEach((wall) => wall.update(this.time.now, delta, this.player?.position));
    this.syncThreatState();
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
    if (this.choice.active || this.inventory.active || this.reliability.active || this.routingActive) {
      this.player.update(delta, false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The networks wait.");
      return;
    }
    this.player.update(delta, true);
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private beginRouting() {
    this.currentRoute = 0;
    this.correctRoutes = 0;
    this.routingActive = true;
    setObjective("Route each item to OpenNet or ClassNet.");
    this.showRouteChoice();
  }

  private syncThreatState() {
    setVisibleThreats(
      this.bureaucraticWalls.map((wall) => ({
        label: `Stone Wall: ${wall.label}`,
        x: wall.position.x,
        y: wall.position.y
      }))
    );
  }

  private showRouteChoice() {
    const item = this.routeItems[this.currentRoute];
    this.routeText.setText(`ITEM ${this.currentRoute + 1}/7\n${item.label.toUpperCase()}`);
    const options: ChoiceOption[] = [
      { key: "A", label: "Send to OpenNet", value: "OpenNet" },
      { key: "B", label: "Send to ClassNet", value: "ClassNet" }
    ];
    this.choice.show(`ROUTE:\n${item.label}\n\nCLASSIFICATION: ${item.classification.toUpperCase()}`, options, (option) => {
      this.resolveRoute(item, option.value as RouteItem["network"]);
    });
  }

  private resolveRoute(item: RouteItem, destination: RouteItem["network"]) {
    const correct = destination === item.network;
    if (correct) {
      this.correctRoutes += 1;
      adjustReliability(3, `${item.label} routed to ${destination}`);
      this.routeText.setText(`CORRECT\n${destination}`);
    } else {
      const leakWarning = destination === "OpenNet" && item.network === "ClassNet";
      adjustReliability(leakWarning ? -18 : -8, leakWarning ? "closed material sent to OpenNet" : "network routing mismatch");
      this.routeText.setText(leakWarning ? "WARNING\nOPENNET LEAK RISK" : "WARNING\nWRONG ROOM");
    }
    this.reliability.update();
    this.currentRoute += 1;
    if (this.currentRoute >= this.routeItems.length) {
      this.finishRouting();
      return;
    }
    this.time.delayedCall(450, () => this.showRouteChoice());
  }

  private finishRouting() {
    this.routingActive = false;
    if (this.correctRoutes === this.routeItems.length) {
      awardProcessStamp("network");
      addInventoryItem("Clearance Token");
      addVolumeFragment("Routing Fragment");
      addDocumentPoints(14, "OpenNet/ClassNet routes cleared");
      retroAudio.stamp();
      this.dialog.show("MARCUS", [
        "Good routing.",
        "The open world stays open. The closed world stays closed.",
        "The START band has a clean path onto the cover."
      ], () => transitionTo(this, "ReferralVaultScene"));
      return;
    }
    this.dialog.show("MARCUS", [
      "Routing log has warnings.",
      "Review the split before referrals move."
    ], () => this.beginRouting());
  }
}
