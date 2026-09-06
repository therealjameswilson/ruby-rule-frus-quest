import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { EDITORIAL_RECHECK_TITLE, EDITORIAL_REPAIR_TITLE, type EditorialRepairRecord } from "../game/editorialRepair";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class EditorialRepairBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fields: Phaser.GameObjects.Rectangle[] = [];
  private readonly title: Phaser.GameObjects.Text;
  private readonly evidence: Phaser.GameObjects.Text;
  private readonly indication: Phaser.GameObjects.Text;
  private readonly fileLabel: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private selected = 0;
  private repaired = false;
  private proof = false;
  private record?: EditorialRepairRecord;
  private onChange?: () => void;
  private onFile?: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("editorial-repair-board")
      .setDepth(1600).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.7),
      scene.add.rectangle(128, 120, 238, 184, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.title = this.text(20, 38, "", PALETTE.goldStamp);
    this.text(20, 55, "RETAINED NOTE / TRAINING", PALETTE.terminalCyan);
    this.evidence = this.text(20, 70, "", PALETTE.creamPaper);
    this.text(20, 90, "READER'S PROOF", PALETTE.goldStamp);
    this.button(128, 116, 216, 32, () => this.repair());
    this.indication = this.text(24, 112, "", PALETTE.creamPaper);
    this.button(77, 158, 112, 34, () => this.submit());
    this.fileLabel = this.text(77, 154, "", PALETTE.creamPaper).setOrigin(0.5, 0);
    this.button(190, 158, 100, 34, () => this.hide());
    this.text(190, 154, "RETURN", PALETTE.creamPaper).setOrigin(0.5, 0);
    this.feedback = this.text(20, 190, "", PALETTE.terminalCyan);
  }

  get active() { return this.container.visible; }

  show(record: EditorialRepairRecord, repaired: boolean, proof: boolean, onChange: () => void, onFile: () => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.record = record;
    this.repaired = repaired;
    this.proof = proof;
    this.selected = repaired ? 1 : 0;
    this.onChange = onChange;
    this.onFile = onFile;
    this.container.setVisible(true);
    this.refresh();
    swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed || input.pauseJustPressed) { this.hide(); return; }
    if (input.navLeftJustPressed || input.navUpJustPressed) this.selected = (this.selected + 2) % 3;
    else if (input.navRightJustPressed || input.navDownJustPressed) this.selected = (this.selected + 1) % 3;
    else if (input.aJustPressed || input.confirmJustPressed) {
      if (this.selected === 0) this.repair();
      else if (this.selected === 1) this.submit();
      else this.hide();
      return;
    } else return;
    this.refresh();
  }

  private repair() {
    if (!this.active) return;
    this.selected = 1;
    if (!this.repaired && !this.proof) {
      this.repaired = true;
      this.onChange?.();
      retroAudio.stamp();
    }
    this.refresh();
  }

  private submit() {
    if (!this.active) return;
    if (!this.repaired) {
      this.feedback.setText("THE WITHHOLDING IS INVISIBLE");
      setLatestMessage("The retained note records withheld text. Restore its indication before filing the proof.");
      retroAudio.warning();
      return;
    }
    this.hide();
    this.onFile?.();
  }

  private hide() {
    if (!this.active) return;
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
  }

  private refresh() {
    if (!this.record) return;
    this.title.setText(this.record.label);
    this.evidence.setText(this.record.evidence);
    this.indication.setText(this.repaired ? this.record.indication : "[ INDICATION MISSING ]");
    const action = this.proof ? "FILE PROOF" : "FILE DRAFT";
    this.fileLabel.setText(action);
    this.feedback.setText(this.repaired ? "ITALIC / WITHHOLDING" : "ONE MISSING INDICATION");
    this.fields.forEach((field, index) => field.setStrokeStyle(1, color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneGray)));
    setChoiceState(`${this.proof ? EDITORIAL_RECHECK_TITLE : EDITORIAL_REPAIR_TITLE} ${this.record.label}. ${this.record.evidence}. Fictional training record.`, [
      { key: "A", label: this.repaired ? this.record.indication : "Indication missing", value: this.repaired ? "visible_italic" : "missing" },
      { key: "B", label: action, value: this.proof ? "file_proof" : "file_draft" },
      { key: "C", label: "RETURN", value: "cancel" }
    ]);
  }

  private button(x: number, y: number, width: number, height: number, action: () => void) {
    const field = this.scene.add.rectangle(x, y, width, height, color(PALETTE.shadowNavy));
    bindPointerDown(field, () => { swallowNextInputFrame(); action(); });
    this.fields.push(field);
    this.container.add(field);
  }

  private text(x: number, y: number, value: string, ink: string) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: "8px", color: ink });
    this.container.add(text);
    return text;
  }
}
