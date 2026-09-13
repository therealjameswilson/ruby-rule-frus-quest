import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { TREATMENT_FIELDS, TREATMENT_REVIEW_TITLE, toggleTreatmentField, treatmentDraftProblem, type TreatmentDraft } from "../game/referralTreatmentDraft";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class ReferralTreatmentBoard {
  private readonly panel: Phaser.GameObjects.Container;
  private readonly rows: Phaser.GameObjects.Rectangle[] = [];
  private readonly values: Phaser.GameObjects.Text[] = [];
  private readonly feedback: Phaser.GameObjects.Text;
  private draft: TreatmentDraft = { permission: "PRINT", withholding: "OMIT" };
  private selected = 0;
  private changed?: (draft: TreatmentDraft) => void;
  private filed?: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.panel = scene.add.container(0, 0).setDepth(950).setScrollFactor(0).setVisible(false);
    this.panel.add(scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.65));
    this.panel.add(scene.add.rectangle(128, 122, 238, 178, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan)));
    this.text(20, 43, "REVIEW TREATMENT", PALETTE.terminalCyan);
    this.text(20, 58, "FICTIONAL CASE NOTES", PALETTE.goldStamp);
    for (const [i, evidence] of ["FOREIGN NOTE: CONSENT PENDING", "WHOLE DOCUMENT: WITHHELD"].entries()) {
      const y = 88 + i * 48;
      this.text(20, y - 13, evidence, PALETTE.creamPaper, 6);
      const row = scene.add.rectangle(128, y + 9, 216, 26, color(PALETTE.black));
      this.panel.add(row); this.rows.push(row);
      bindPointerDown(row, () => { if (this.active) { this.selected = i; this.toggle(); } });
      this.values.push(this.text(88, y + 5, "", PALETTE.goldStamp));
    }
    const file = scene.add.rectangle(128, 177, 130, 24, color(PALETTE.black));
    this.panel.add(file); this.rows.push(file);
    bindPointerDown(file, () => this.submit());
    this.text(81, 173, "FILE TREATMENT", PALETTE.creamPaper);
    this.feedback = this.text(20, 193, "", PALETTE.goldStamp, 6);
    const close = scene.add.rectangle(230, 48, 28, 28, color(PALETTE.black), 0);
    this.panel.add(close); bindPointerDown(close, () => this.hide());
    this.text(226, 44, "X", PALETTE.creamPaper);
  }
  get active() { return this.panel.visible; }
  show(draft: TreatmentDraft, changed: (draft: TreatmentDraft) => void, filed: () => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.draft = { ...draft }; this.changed = changed; this.filed = filed; this.selected = 0;
    this.feedback.setText("COMPARE THE DRAFT WITH THE NOTES");
    this.panel.setVisible(true); this.refresh(); swallowNextInputFrame();
  }
  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed || input.pauseJustPressed) { this.hide(); return; }
    if (input.navUpJustPressed || input.navDownJustPressed) {
      this.selected = (this.selected + (input.navUpJustPressed ? 2 : 1)) % 3; this.refresh();
    } else if (this.selected < 2 && (input.navLeftJustPressed || input.navRightJustPressed || input.aJustPressed || input.confirmJustPressed)) this.toggle();
    else if (this.selected === 2 && (input.aJustPressed || input.confirmJustPressed)) this.submit();
  }
  private toggle() {
    this.draft = toggleTreatmentField(this.draft, TREATMENT_FIELDS[this.selected]);
    this.changed?.({ ...this.draft }); this.feedback.setText("DRAFT EDITED - NOT FILED"); retroAudio.blip(); this.refresh();
  }
  private submit() {
    if (!this.active) return;
    const problem = treatmentDraftProblem(this.draft);
    if (problem) { this.feedback.setText(problem); setLatestMessage(problem.replace("\n", ". ")); retroAudio.warning(); return; }
    this.hide(); this.filed?.();
  }
  private hide() {
    if (!this.active) return;
    this.panel.setVisible(false); clearChoiceState(); swallowNextInputFrame();
  }
  private refresh() {
    this.rows.forEach((row, i) => row.setStrokeStyle(1, color(i === this.selected ? PALETTE.goldStamp : PALETTE.stoneDark)));
    TREATMENT_FIELDS.forEach((field, i) => this.values[i].setText(`< ${this.draft[field]} >`));
    setChoiceState(TREATMENT_REVIEW_TITLE, [
      { key: "A", label: `FOREIGN NOTE: ${this.draft.permission}`, value: this.draft.permission },
      { key: "B", label: `WITHHELD FILE: ${this.draft.withholding}`, value: this.draft.withholding }
    ]);
  }
  private text(x: number, y: number, value: string, ink: string, size = 8) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: `${size}px`, color: ink });
    this.panel.add(text); return text;
  }
}
