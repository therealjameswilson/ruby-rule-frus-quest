import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { PROOF_COMPARISON_TITLE, PROOF_TOKENS, proofMatchesOriginal, proofTokenText, remainingProofRepairs, repairProofToken, restoreProofRepairs } from "../game/proofComparison";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class ProofComparisonBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fields: Phaser.GameObjects.Rectangle[] = [];
  private readonly words: Phaser.GameObjects.Text[] = [];
  private readonly fileButton: Phaser.GameObjects.Rectangle;
  private readonly feedback: Phaser.GameObjects.Text;
  private selected = 0;
  private repairs = 0;
  private onChange?: (repairs: number) => void;
  private onApprove?: (repairs: number) => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("proof-comparison-board")
      .setDepth(950).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.65),
      scene.add.rectangle(128, 125, 238, 182, color(PALETTE.black), 0.98)
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.text(20, 43, "PROOF LENS / TRAINING", PALETTE.terminalCyan);
    this.text(26, 62, "ORIGINAL", PALETTE.goldStamp);
    this.text(104, 62, PROOF_TOKENS[0].original, PALETTE.creamPaper);
    this.text(26, 76, PROOF_TOKENS.slice(1).map(token => token.original).join(" "), PALETTE.creamPaper);
    this.text(26, 90, "TYPESET COPY", PALETTE.goldStamp);
    for (const [index, token] of PROOF_TOKENS.entries()) {
      const field = scene.add.rectangle(token.x + token.width / 2, token.y + 2, token.width, 28, color(PALETTE.shadowNavy));
      bindPointerDown(field, () => this.repair(index));
      this.container.add(field);
      this.fields.push(field);
      this.words.push(this.text(token.x + 6, token.y - 2, "", PALETTE.creamPaper));
    }
    this.fileButton = scene.add.rectangle(128, 181, 120, 22, color(PALETTE.deepRuby));
    bindPointerDown(this.fileButton, () => this.submit());
    this.container.add(this.fileButton);
    this.text(98, 177, "FILE PROOF", PALETTE.creamPaper);
    const close = scene.add.rectangle(230, 50, 30, 30, color(PALETTE.black), 0);
    bindPointerDown(close, () => this.hide());
    this.container.add(close);
    this.text(226, 46, "X", PALETTE.creamPaper);
    this.feedback = this.text(20, 202, "", PALETTE.goldStamp);
  }

  get active() { return this.container.visible; }

  show(repairs: number, onChange: (repairs: number) => void, onApprove: (repairs: number) => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.repairs = restoreProofRepairs(repairs);
    this.selected = 0;
    this.onChange = onChange;
    this.onApprove = onApprove;
    this.container.setVisible(true);
    this.refresh();
    swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed || input.pauseJustPressed) {
      this.hide();
      return;
    }
    if (input.navLeftJustPressed || input.navUpJustPressed) this.selected = (this.selected + 4) % 5;
    else if (input.navRightJustPressed || input.navDownJustPressed) this.selected = (this.selected + 1) % 5;
    else if (input.aJustPressed || input.confirmJustPressed) {
      if (this.selected === 4) this.submit();
      else this.repair(this.selected);
      return;
    } else return;
    this.refresh();
  }

  hide() {
    if (!this.active) return;
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
  }

  private repair(index: number) {
    if (!this.active) return;
    this.selected = index;
    const next = repairProofToken(this.repairs, index);
    const changed = next !== this.repairs;
    this.repairs = next;
    if (changed) {
      this.onChange?.(next);
      retroAudio.stamp();
    } else retroAudio.blip();
    this.refresh();
    if (!changed) this.feedback.setText("MATCHES ORIGINAL");
  }

  private submit() {
    if (!this.active) return;
    if (!proofMatchesOriginal(this.repairs)) {
      this.feedback.setText("COMPARE ORIGINAL");
      setLatestMessage("The proof still changes the training original. Preserve the telegram designator and wording.");
      retroAudio.warning();
      return;
    }
    this.hide();
    this.onApprove?.(this.repairs);
  }

  private refresh() {
    for (const [index, token] of PROOF_TOKENS.entries()) {
      const changed = Boolean(token.repairBit && (this.repairs & token.repairBit));
      this.fields[index].setStrokeStyle(1, color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneDark));
      this.words[index].setText(proofTokenText(index, this.repairs)).setColor(changed ? PALETTE.terminalCyan : PALETTE.creamPaper);
    }
    this.fileButton.setStrokeStyle(1, color(this.selected === 4 ? PALETTE.goldStamp : PALETTE.stoneDark));
    const remaining = remainingProofRepairs(this.repairs);
    this.feedback.setText(remaining ? `${remaining} CHANGE${remaining === 1 ? "" : "S"} TO FIND` : "TEXT RESTORED");
    setChoiceState(PROOF_COMPARISON_TITLE, PROOF_TOKENS.map((token, index) => ({
      key: (["A", "B", "C", "D"] as const)[index], label: proofTokenText(index, this.repairs),
      value: proofTokenText(index, this.repairs) === token.original ? "faithful" : "altered"
    })));
  }

  private text(x: number, y: number, value: string, ink: string) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: "8px", color: ink });
    this.container.add(text);
    return text;
  }
}
