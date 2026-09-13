import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { RELEASE_SCOPE_TITLE, RELEASE_SCOPE_EVIDENCE, RELEASE_SCOPE_PARTS,
  restoreReleaseScope, toggleReleaseScope, validateReleaseScope, type ReleaseScopePart } from "../game/releaseScope";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class ReleaseScopeBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fields: Phaser.GameObjects.Rectangle[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly feedback: Phaser.GameObjects.Text;
  private mask = 7;
  private selected = 0;
  private onChange?: (mask: number) => void;
  private onFile?: (mask: number) => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("release-scope-board")
      .setDepth(1600).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.7),
      scene.add.rectangle(128, 125, 238, 182, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.text(20, 43, "MARK THE RELEASE", PALETTE.terminalCyan);
    this.text(20, 58, "FICTIONAL TRAINING FILE C", PALETTE.goldStamp);
    this.text(20, 73, RELEASE_SCOPE_EVIDENCE, PALETTE.creamPaper);
    this.text(20, 89, "PARENT RECORD: CLASSIFIED", PALETTE.goldStamp);
    for (const part of [0, 1, 2] as const) {
      const x = [52, 128, 204][part];
      this.button(x, 121, 68, 48, () => this.toggle(part));
      this.labels.push(this.text(x, 107, "", PALETTE.creamPaper).setOrigin(0.5, 0));
    }
    this.button(128, 169, 100, 34, () => this.submit());
    this.text(128, 165, "FILE MARKINGS", PALETTE.creamPaper).setOrigin(0.5, 0);
    const close = scene.add.rectangle(228, 54, 44, 44, color(PALETTE.black), 0);
    bindPointerDown(close, () => this.hide()); this.container.add(close);
    this.text(226, 46, "X", PALETTE.creamPaper);
    this.feedback = this.text(20, 191, "", PALETTE.goldStamp);
  }

  get active() { return this.container.visible; }

  show(mask: number | undefined, onChange: (mask: number) => void, onFile: (mask: number) => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.mask = restoreReleaseScope(mask);
    this.selected = 0;
    this.onChange = onChange; this.onFile = onFile;
    this.container.setVisible(true);
    this.feedback.setText(mask === undefined ? "CHECK THE DRAFT MARKINGS" : "DRAFT KEPT - NOT FILED");
    this.refresh(); swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed || input.pauseJustPressed) { this.hide(); return; }
    if (input.navLeftJustPressed || input.navUpJustPressed) this.selected = (this.selected + 3) % 4;
    else if (input.navRightJustPressed || input.navDownJustPressed) this.selected = (this.selected + 1) % 4;
    else if (input.aJustPressed || input.confirmJustPressed) {
      if (this.selected === 3) this.submit();
      else this.toggle(this.selected as ReleaseScopePart);
      return;
    } else return;
    this.refresh();
  }

  private toggle(part: ReleaseScopePart) {
    if (!this.active) return;
    this.selected = part;
    this.mask = toggleReleaseScope(this.mask, part);
    this.onChange?.(this.mask);
    this.feedback.setText("DRAFT EDITED - NOT FILED");
    retroAudio.blip(); this.refresh();
  }

  private submit() {
    if (!this.active) return;
    const result = validateReleaseScope(this.mask);
    if (!result.ok) {
      this.feedback.setText(result.message); setLatestMessage(result.message);
      retroAudio.warning(); return;
    }
    this.hide(); this.onFile?.(this.mask);
  }

  private hide() {
    if (!this.active) return;
    this.container.setVisible(false); clearChoiceState(); swallowNextInputFrame();
  }

  private refresh() {
    RELEASE_SCOPE_PARTS.forEach((part, index) => {
      const marked = Boolean(this.mask & (1 << index));
      this.labels[index].setText(`${part.label}\n\n${marked ? "[X] PRINT" : "[ ] HOLD"}`);
      this.fields[index].setFillStyle(color(marked ? PALETTE.deepRuby : PALETTE.shadowNavy));
    });
    this.fields.forEach((field, index) => field.setStrokeStyle(1, color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneGray)));
    setChoiceState(RELEASE_SCOPE_TITLE, RELEASE_SCOPE_PARTS.map((part, index) => ({
      key: (["A", "B", "C"] as const)[index], label: part.label, value: this.mask & (1 << index) ? "print" : "hold"
    })));
  }

  private button(x: number, y: number, width: number, height: number, action: () => void) {
    const field = this.scene.add.rectangle(x, y, width, height, color(PALETTE.shadowNavy));
    bindPointerDown(field, () => { swallowNextInputFrame(); action(); });
    this.fields.push(field); this.container.add(field);
  }

  private text(x: number, y: number, value: string, ink: string) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: "8px", color: ink });
    this.container.add(text); return text;
  }
}
