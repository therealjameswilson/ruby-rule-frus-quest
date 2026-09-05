import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { SOURCE_NOTE_47_TITLE } from "../game/sourceNote47";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class SourceNoteBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fields: Phaser.GameObjects.Rectangle[] = [];
  private readonly reader: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private selected = 0;
  private repaired = false;
  private onChange?: () => void;
  private onFile?: () => void;
  private onCancel?: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("source-note-board")
      .setDepth(1600).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.7),
      scene.add.rectangle(128, 120, 238, 186, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.text(20, 36, "SOURCE NOTE 47 / TRAINING", PALETTE.goldStamp);
    this.text(20, 53, "REPO  NATIONAL ARCHIVES\nCOLL  POLICY PLANNING\nFILE  ALLIANCE CONSULTATION", PALETTE.creamPaper).setLineSpacing(4);
    this.text(20, 96, "NO READERSHIP EVIDENCE FOUND", PALETTE.terminalCyan);
    this.button(128, 123, 216, 34, () => this.repair());
    this.reader = this.text(28, 119, "", PALETTE.creamPaper);
    this.button(77, 158, 112, 34, () => this.submit());
    this.text(50, 154, "FILE NOTE", PALETTE.creamPaper);
    this.button(190, 158, 100, 34, () => this.hide());
    this.text(170, 154, "RETURN", PALETTE.creamPaper);
    this.feedback = this.text(20, 191, "", PALETTE.goldStamp);
  }

  get active() { return this.container.visible; }

  show(repaired: boolean, onChange: () => void, onFile: () => void, onCancel: () => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.repaired = repaired;
    this.selected = repaired ? 1 : 0;
    this.onChange = onChange;
    this.onFile = onFile;
    this.onCancel = onCancel;
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
    if (!this.repaired) {
      this.repaired = true;
      this.onChange?.();
      retroAudio.stamp();
    }
    this.refresh();
  }

  private submit() {
    if (!this.active) return;
    if (!this.repaired) {
      this.feedback.setText("CHECK THE READERSHIP CLAIM");
      setLatestMessage("The training packet does not establish presidential readership. Remove the unsupported claim before filing.");
      retroAudio.warning();
      return;
    }
    this.hide(false);
    this.onFile?.();
  }

  private hide(cancel = true) {
    if (!this.active) return;
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
    if (cancel) this.onCancel?.();
  }

  private refresh() {
    const readers = this.repaired ? "READERS: NOT ESTABLISHED" : "DRAFT: PRESIDENT READ IT";
    this.reader.setText(readers);
    this.feedback.setText(this.repaired ? "UNKNOWN IS NOT A DENIAL" : "ONE UNSUPPORTED CLAIM");
    this.fields.forEach((field, index) => field.setStrokeStyle(1, color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneGray)));
    setChoiceState(SOURCE_NOTE_47_TITLE, [
      { key: "A", label: readers, value: this.repaired ? "evidence_limited" : "unsupported_readership" },
      { key: "B", label: "FILE NOTE", value: "file" },
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
