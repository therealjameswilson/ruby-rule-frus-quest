import type Phaser from "phaser";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { PROOF_COMPARISON_TITLE, PROOF_TOKENS, proofMatchesOriginal, proofTokenText, remainingProofRepairs, repairProofToken, restoreProofRepairs } from "../game/proofComparison";
import { getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";
import { ProofComparisonDesk } from "./proofComparisonDesk";

export class ProofComparisonBoard {
  private view?: ProofComparisonDesk;
  private repairs = 0;
  private message = "";
  private onChange?: (repairs: number) => void;
  private onApprove?: (repairs: number) => void;
  constructor(private readonly scene: Phaser.Scene) { scene.events.once("shutdown", () => this.hide()); }
  get active() { return this.view?.active ?? false; }
  show(repairs: number, onChange: (repairs: number) => void, onApprove: (repairs: number) => void) {
    this.hide(); this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.repairs = restoreProofRepairs(repairs); this.onChange = onChange; this.onApprove = onApprove;
    const remaining = remainingProofRepairs(this.repairs);
    this.message = remaining ? `${remaining} changes to find. Compare each fragment with the original.` : "Text restored — not filed.";
    this.view = new ProofComparisonDesk(index => this.repair(index), () => this.submit(), () => this.hide());
    this.refresh(); swallowNextInputFrame();
  }
  updateInput() { if (this.active) this.view!.updateInput(getInput()); }
  hide() { if (!this.active) return; this.view!.close(); this.view = undefined; clearChoiceState(); swallowNextInputFrame(); }
  private repair(index: number) {
    if (!this.active) return;
    const next = repairProofToken(this.repairs, index);
    if (next !== this.repairs) {
      this.repairs = next; this.onChange?.(next); retroAudio.annotatePaper();
      this.message = index === 0
        ? "Secto restored: preserve the telegram designator as well as its number."
        : "“May” restored: “will” would make a tentative statement sound certain.";
    } else this.message = "This fragment already matches the original. No change needed.";
    this.refresh();
  }
  private submit() {
    if (!this.active) return;
    if (!proofMatchesOriginal(this.repairs)) {
      this.message = "The proof still changes the original. Compare its designator and wording.";
      this.refresh(true); setLatestMessage(this.message); retroAudio.warning(); return;
    }
    this.hide(); this.onApprove?.(this.repairs);
  }
  private refresh(error = false) {
    this.view?.render(this.repairs, this.message, error);
    setChoiceState(PROOF_COMPARISON_TITLE, PROOF_TOKENS.map((token, index) => ({
      key: (["A", "B", "C", "D"] as const)[index], label: proofTokenText(index, this.repairs),
      value: proofTokenText(index, this.repairs) === token.original ? "faithful" : "altered"
    })));
  }
}
