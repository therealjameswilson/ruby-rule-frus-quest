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
import type { ChoiceOption } from "../game/types";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { HistorianNPC } from "../entities/HistorianNPC";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/Terminal";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addDocumentStack, addTinySparkle, addVaultBlocks, addWallMap } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionTo } from "../systems/sceneTransitions";
import { ChoicePrompt } from "../systems/verification";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface EquityMatch {
  label: string;
  agency: "CIA" | "DOD" | "NSC";
}

export class ReferralVaultScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private vaultText!: Phaser.GameObjects.Text;
  private matchIndex = 0;
  private correctMatches = 0;
  private bureaucraticWalls: BureaucraticWall[] = [];

  private readonly matches: EquityMatch[] = [
    { label: "Intelligence annex", agency: "CIA" },
    { label: "Base access memo", agency: "DOD" },
    { label: "White House minutes", agency: "NSC" }
  ];

  constructor() {
    super("ReferralVaultScene");
  }

  create() {
    setSceneState("ReferralVaultScene", "explore", "Match documents to agency equities.");
    retroAudio.startMusic("ReferralVaultScene");
    setVisibleEntities(["Marcus", "StateChat terminal", "CIA seal", "DOD seal", "NSC seal", "Stone Wall: Referral delay"]);
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    drawTiledFloor(this, "vault-tiles");
    drawRoomFrame(this, "REFERRAL VAULT");
    addVaultBlocks(this);
    addWallMap(this, 128, 60, "EQUITY MAP");
    addDocumentStack(this, 214, 116, true);
    addTinySparkle(this, 128, 120, PALETTE.goldStamp);
    this.bureaucraticWalls = [
      new BureaucraticWall(this, "cia-delay-wall", "WAIT", 44, 160),
      new BureaucraticWall(this, "nsc-delay-wall", "HOLD", 212, 160)
    ];
    this.syncThreatState();
    new HistorianNPC(this, "marcus", 42, 58);
    new Terminal(this, 214, 58, "StateChat");
    this.addSeal(70, 132, "CIA");
    this.addSeal(128, 132, "DOD");
    this.addSeal(186, 132, "NSC");
    this.vaultText = this.add.text(128, 88, "BATCH MANIFEST\nPENDING HUMAN CHECK", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center"
    }).setOrigin(0.5);

    this.player = new Player(this, 128, 192);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.dialog.show("MARCUS", [
      "Referral means agency equity.",
      "StateChat can draft a manifest. You confirm it."
    ], () => this.startMatching());
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
    if (this.choice.active || this.inventory.active || this.reliability.active) {
      this.player.update(delta, false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The vault waits.");
      return;
    }
    this.player.update(delta, true);
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private addSeal(x: number, y: number, label: string) {
    this.add.rectangle(x, y, 38, 30, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(x, y - 5, label, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
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

  private startMatching() {
    this.matchIndex = 0;
    this.correctMatches = 0;
    setObjective("Match each document to its agency equity.");
    this.showMatchChoice();
  }

  private showMatchChoice() {
    const item = this.matches[this.matchIndex];
    this.vaultText.setText(`MATCH ${this.matchIndex + 1}/3\n${item.label.toUpperCase()}`);
    const options: ChoiceOption[] = [
      { key: "A", label: "CIA equity", value: "CIA" },
      { key: "B", label: "DOD equity", value: "DOD" },
      { key: "C", label: "NSC equity", value: "NSC" }
    ];
    this.choice.show(`REFERRAL MATCH:\n${item.label}\n\nWHICH EQUITY SEAL?`, options, (option) => {
      if (option.value === item.agency) {
        this.correctMatches += 1;
        adjustReliability(3, `${item.label} matched to ${item.agency}`);
      } else {
        adjustReliability(-6, "agency equity mismatch");
      }
      this.reliability.update();
      this.matchIndex += 1;
      if (this.matchIndex >= this.matches.length) {
        this.showManifestChoice();
      } else {
        this.showMatchChoice();
      }
    });
  }

  private showManifestChoice() {
    setObjective("Confirm the manifest with human judgment.");
    this.vaultText.setText("STATECHAT MANIFEST\n3 REFERRALS QUEUED\nHUMAN CONFIRM?");
    const options: ChoiceOption[] = [
      { key: "A", label: "Accept without review", value: "blind" },
      { key: "B", label: "Confirm after checking equities", value: "checked" },
      { key: "C", label: "Let StateChat decide", value: "machine" }
    ];
    this.choice.show("STATECHAT GENERATED A BATCH MANIFEST.\n\nWHO DECIDES?", options, (option) => {
      if (option.value === "checked" && this.correctMatches === this.matches.length) {
        addInventoryItem("Concurrence Slip");
        addDocumentPoints(8, "agency concurrence checked");
        adjustReliability(7, "manifest confirmed by human review");
        this.reliability.update();
        this.showExcisionChoice();
        return;
      }
      adjustReliability(-14, "final referral decision ceded or unchecked");
      this.reliability.update();
      this.dialog.show("MARCUS", "No silent handoff. Review the equities again.", () => this.startMatching());
    });
  }

  private showExcisionChoice() {
    setObjective("Mark excised text visibly.");
    const options: ChoiceOption[] = [
      { key: "A", label: "Delete the missing passage", value: "erase" },
      { key: "B", label: "[Text not declassified]", value: "visible" },
      { key: "C", label: "Leave a blank gap", value: "blank" }
    ];
    this.choice.show("EXCISION REQUIRED.\nFRUS DOES NOT SILENTLY ERASE WITHHELD MATERIAL.\n\nWHAT PRINTS?", options, (option) => {
      if (option.value === "visible") {
        awardProcessStamp("referral");
        addVolumeFragment("Referral Fragment");
        addDocumentPoints(12, "visible withholding language printed");
        retroAudio.stamp();
        adjustReliability(8, "visible withholding language used");
        this.reliability.update();
        this.dialog.show("MARCUS", [
          "Correct.",
          "The reader sees the withholding. The record does not pretend.",
          "The clearance seal is ready for the cover."
        ], () => transitionTo(this, "SilentReadScene"));
        return;
      }
      adjustReliability(-10, "withholding was hidden or unclear");
      this.reliability.update();
      this.dialog.show("PRIYA", "Visible language. Never a silent gap.", () => this.showExcisionChoice());
    });
  }
}
