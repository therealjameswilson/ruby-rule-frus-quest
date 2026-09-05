import Phaser from "phaser";
import { ABOUT_SERIES_SOURCE } from "../game/aboutSeries";
import { PALETTE } from "../game/constants";
import { BINDING_CERTIFICATION_TITLE, type BindingCertificationEvidence } from "../game/bindingCertification";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class BindingCertificationBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly ledger: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private readonly buttons: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;
  private evidence?: () => BindingCertificationEvidence;
  private onSeal?: () => void;
  private onCancel?: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("binding-certification-board")
      .setDepth(1600).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.72),
      scene.add.rectangle(128, 120, 238, 184, color(PALETTE.black), 0.98)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
    ]);
    this.text(22, 38, BINDING_CERTIFICATION_TITLE, PALETTE.goldStamp);
    this.ledger = this.text(26, 59, "", PALETTE.creamPaper).setLineSpacing(6);
    this.text(26, 117, "Keep major facts. Do not", PALETTE.creamPaper);
    this.text(26, 130, "conceal policy defects.", PALETTE.creamPaper);
    for (const [index, label] of ["SEAL RECORD", "RETURN"].entries()) {
      const x = index === 0 ? 80 : 192;
      const button = scene.add.rectangle(x, 158, index === 0 ? 110 : 90, 34, color(PALETTE.shadowNavy));
      bindPointerDown(button, () => this.choose(index));
      this.buttons.push(button);
      this.container.add(button);
      this.text(x, 154, label, PALETTE.creamPaper).setOrigin(0.5, 0);
    }
    this.feedback = this.text(22, 190, "", PALETTE.terminalCyan);
  }

  get active() { return this.container.visible; }

  show(evidence: () => BindingCertificationEvidence, onSeal: () => void, onCancel: () => void) {
    this.evidence = evidence;
    this.onSeal = onSeal;
    this.onCancel = onCancel;
    this.selected = 0;
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.container.setVisible(true);
    this.refresh();
    swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.bJustPressed || input.cancelJustPressed || input.pauseJustPressed) this.cancel();
    else if (input.navUpJustPressed || input.navDownJustPressed || input.navLeftJustPressed || input.navRightJustPressed) {
      this.selected = 1 - this.selected;
      this.refresh();
    } else if (input.aJustPressed || input.confirmJustPressed) this.choose(this.selected);
  }

  private choose(index: number) {
    if (!this.active) return;
    if (index === 1) { this.cancel(); return; }
    // Re-read live evidence so a stale open panel cannot authorize publication.
    if (!this.evidence?.().ready) {
      this.refresh();
      this.feedback.setText("REPAIR THE RECORD");
      setLatestMessage("The standards seal cannot clear missing proofs, open equities, hidden cuts or unresolved violations.");
      retroAudio.warning();
      return;
    }
    this.hide();
    this.onSeal?.();
  }

  private cancel() {
    this.hide();
    this.onCancel?.();
  }

  private hide() {
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
  }

  private refresh() {
    const evidence = this.evidence?.();
    if (!evidence) return;
    const lines = [
      `PROOFS FILED     ${evidence.proofed}/${evidence.documents}`,
      `REVIEWS FILED   ${evidence.resolved}/${evidence.equities}`,
      `HIDDEN CUTS     ${evidence.hiddenCuts}`,
      `OPEN VIOLATIONS ${evidence.unresolved}`
    ];
    this.ledger.setText(lines.join("\n"));
    this.feedback.setText(evidence.ready ? "ABOUT THE SERIES" : "REPAIR THE RECORD");
    this.buttons.forEach((button, index) => button.setStrokeStyle(1,
      color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneDark)));
    setChoiceState(`${BINDING_CERTIFICATION_TITLE}: ${lines.join("; ")}. Keep major facts and policy defects. Source: ${ABOUT_SERIES_SOURCE.url}`, [
      { key: "A", label: "Seal the full record", value: evidence.ready ? "attest" : "locked" },
      { key: "B", label: "Return to the desk", value: "cancel" }
    ]);
  }

  private text(x: number, y: number, value: string, ink: string) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: "8px", color: ink });
    this.container.add(text);
    return text;
  }
}
