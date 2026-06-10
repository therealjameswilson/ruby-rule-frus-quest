import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { addDocumentPoints, addInventoryItem, addVolumeFragment, awardProcessStamp, gameState, setObjective, setSceneState, setVisibleEntities } from "../game/state";
import type { ChoiceOption } from "../game/types";
import { HistorianNPC } from "../entities/HistorianNPC";
import { Player } from "../entities/Player";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, canAutoApplyProposal, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addProofingTable, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";
import { ChoicePrompt } from "../systems/verification";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class SilentReadScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;

  constructor() {
    super("SilentReadScene");
  }

  create() {
    setSceneState("SilentReadScene", "explore", "Catch the factual discrepancy StateChat missed.");
    retroAudio.startMusic("SilentReadScene");
    setVisibleEntities(["Priya", "Manuscript page", "Typeset proof", "StateChat terminal"]);
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    this.add.rectangle(128, 120, 256, 240, color(PALETTE.sepiaInk));
    this.add.rectangle(128, 120, 248, 232, color(PALETTE.creamPaper));
    drawRoomFrame(this, "SILENT READ", PALETTE.deepRuby);
    addProofingTable(this, 128, 172);
    addTinySparkle(this, 178, 87, PALETTE.classNetRed);
    new HistorianNPC(this, "priya", 28, 52);
    this.drawPage(78, 114, "MANUSCRIPT", [
      "The office office",
      "opened in 1947.",
      "The record said",
      "\"publish fully."
    ]);
    this.drawPage(178, 114, "TYPESET PROOF", [
      "The office",
      "opened in 1974.",
      "The record said",
      "\"publish fully."
    ]);
    addTerminalPanel(this, 128, 44, [
      "STATECHAT",
      "MECH FLAGS:",
      "DUPLICATE WORD",
      "MISSING QUOTE",
      `AUTO: ${canAutoApplyProposal("mechanical") ? "YES" : "NO"}`
    ]);

    this.player = new Player(this, 128, 202);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.dialog.show("PRIYA", [
      "StateChat found the mechanical slips.",
      "Now read for meaning. Plausible is not enough."
    ], () => this.showSilentReadChoice());
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
      this.dialog.show("PAUSED", "The page waits.");
      return;
    }
    this.player.update(delta, true);
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private drawPage(x: number, y: number, title: string, lines: string[]) {
    this.add.rectangle(x, y, 86, 112, color(PALETTE.white)).setStrokeStyle(2, color(PALETTE.sepiaInk));
    this.add.rectangle(x - 38, y, 3, 104, color(PALETTE.classNetRed));
    this.add.text(x, y - 49, title, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5);
    lines.forEach((line, index) => {
      const isDate = line.includes("1974") || line.includes("1947");
      this.add.text(x - 34, y - 31 + index * 16, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: isDate ? PALETTE.classNetRed : PALETTE.sepiaInk
      });
    });
  }

  private showSilentReadChoice() {
    setObjective("Select the factual error StateChat missed.");
    const options: ChoiceOption[] = [
      { key: "A", label: "Duplicate word: office office", value: "duplicate" },
      { key: "B", label: "Missing closing quote", value: "quote" },
      { key: "C", label: "1974 should be 1947", value: "date" }
    ];
    this.choice.show("STATECHAT FLAGS MECHANICAL TYPOS.\nONE FACTUAL ERROR REMAINS.\n\nWHAT DO YOU CATCH?", options, (option) => {
      if (option.value === "date") {
        awardProcessStamp("proof");
        addInventoryItem("Red Pencil Mark");
        addVolumeFragment("Proof Fragment");
        addDocumentPoints(16, "factual discrepancy caught");
        retroAudio.stamp();
        adjustReliability(12, "human caught factual discrepancy");
        this.reliability.update();
        this.dialog.show(gameState.playerProfile.displayName.toUpperCase(), [
          "Gotcha.",
          "Both years are plausible. Only one is true."
        ], () => transitionTo(this, "EndingScene"));
        return;
      }
      adjustReliability(-10, "mechanical flag chosen while factual error remained");
      this.reliability.update();
      this.dialog.show("PRIYA", "StateChat already had that one. Read the date again.", () => this.showSilentReadChoice());
    });
  }
}
