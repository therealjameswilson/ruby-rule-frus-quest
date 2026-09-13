import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { CROSS_REFERENCE_CATALOG, CROSS_REFERENCE_TARGET, CROSS_REFERENCE_TITLE, crossReferenceMatches, restoreCrossReferenceDraft } from "../game/crossReferenceCatalog";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class CrossReferenceBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fields: Phaser.GameObjects.Rectangle[] = [];
  private readonly feedback: Phaser.GameObjects.Text;
  private draft = 0;
  private cursor = 0;
  private onChange?: (draft: number) => void;
  private onFile?: (draft: number) => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("cross-reference-board")
      .setDepth(1600).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.7),
      scene.add.rectangle(128, 128, 238, 204, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.text(20, 35, "OPENNET / TRAINING", PALETTE.terminalCyan);
    this.text(20, 52, `CITED: ${CROSS_REFERENCE_TARGET}`, PALETTE.creamPaper);
    this.feedback = this.text(20, 69, "MATCH THE CITED RECORD", PALETTE.goldStamp);
    for (const [index, entry] of CROSS_REFERENCE_CATALOG.entries()) {
      this.button(54 + index * 74, 120, 68, 66, () => this.select(index + 1));
      this.text(26 + index * 74, 98, `DOC ${entry.number}\n${entry.date}\n${entry.label.replace(" ", "\n")}`, PALETTE.creamPaper).setLineSpacing(4);
    }
    // Keep filing outside the floating D-pad and above A/B; navigation cannot submit.
    this.button(140, 173, 92, 34, () => this.submit());
    this.text(140, 169, "FILE REFERENCE", PALETTE.creamPaper).setOrigin(0.5, 0);
    const close = scene.add.rectangle(230, 49, 34, 34, color(PALETTE.black), 0);
    bindPointerDown(close, () => this.hide());
    this.container.add(close);
    this.text(228, 45, "X", PALETTE.creamPaper);
  }

  get active() { return this.container.visible; }

  show(draft: number, onChange: (draft: number) => void, onFile: (draft: number) => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.draft = restoreCrossReferenceDraft(draft);
    this.cursor = this.draft ? this.draft - 1 : 0;
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
    if (input.navLeftJustPressed || input.navUpJustPressed) this.cursor = (this.cursor + 3) % 4;
    else if (input.navRightJustPressed || input.navDownJustPressed) this.cursor = (this.cursor + 1) % 4;
    else if (input.aJustPressed || input.confirmJustPressed) {
      if (this.cursor === 3) this.submit();
      else this.select(this.cursor + 1);
      return;
    } else return;
    this.refresh();
  }

  private select(draft: number) {
    if (!this.active) return;
    this.draft = draft;
    this.cursor = 3;
    this.onChange?.(draft);
    this.refresh();
    retroAudio.blip();
    swallowNextInputFrame();
  }

  private submit() {
    if (!this.active) return;
    if (!crossReferenceMatches(this.draft)) {
      const hint = CROSS_REFERENCE_CATALOG[this.draft - 1]?.hint ?? "SELECT A RECORD FIRST";
      this.feedback.setText(hint);
      setLatestMessage(hint);
      retroAudio.warning();
      swallowNextInputFrame();
      return;
    }
    this.hide();
    this.onFile?.(this.draft);
  }

  private hide() {
    if (!this.active) return;
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
  }

  private refresh() {
    this.fields.forEach((field, index) => field.setStrokeStyle(index === this.cursor ? 2 : 1,
      color(index === this.cursor ? PALETTE.goldStamp : index + 1 === this.draft ? PALETTE.terminalCyan : PALETTE.stoneGray)));
    this.feedback.setText(this.draft ? `PINNED: DOCUMENT ${CROSS_REFERENCE_CATALOG[this.draft - 1].number}` : "MATCH THE CITED RECORD");
    setChoiceState(CROSS_REFERENCE_TITLE, [
      ...CROSS_REFERENCE_CATALOG.map((entry, index) => ({ key: (["A", "B", "C"] as const)[index],
        label: `DOC ${entry.number}: ${entry.label}, ${entry.date}`, value: this.draft === index + 1 ? "pinned" : "available" })),
      { key: "D", label: "FILE REFERENCE", value: "file" }
    ]);
  }

  private button(x: number, y: number, width: number, height: number, action: () => void) {
    const field = this.scene.add.rectangle(x, y, width, height, color(PALETTE.shadowNavy));
    bindPointerDown(field, action);
    this.fields.push(field);
    this.container.add(field);
  }

  private text(x: number, y: number, value: string, ink: string) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: "8px", color: ink });
    this.container.add(text);
    return text;
  }
}
