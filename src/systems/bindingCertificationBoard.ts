import type Phaser from "phaser";
import { ABOUT_SERIES_SOURCE } from "../game/aboutSeries";
import { BINDING_CERTIFICATION_TITLE, type BindingCertificationEvidence } from "../game/bindingCertification";
import { clearChoiceState, gameState, setChoiceState, setLatestMessage } from "../game/state";
import { editorialRepairDraftMatches, nextEditorialRepair } from "../game/editorialRepair";
import { getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";
import { BindingCertificationDesk } from "./bindingCertificationDesk";

export class BindingCertificationBoard {
  private view?: BindingCertificationDesk;
  private evidence?: () => BindingCertificationEvidence;
  private onSeal?: () => void;
  private onCancel?: () => void;
  constructor(private readonly scene: Phaser.Scene) { scene.events.once("shutdown", () => this.hide()); }
  get active() { return this.view?.active ?? false; }
  show(evidence: () => BindingCertificationEvidence, onSeal: () => void, onCancel: () => void) {
    this.hide(); this.evidence = evidence; this.onSeal = onSeal; this.onCancel = onCancel;
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.view = new BindingCertificationDesk(() => this.seal(), () => this.cancel());
    this.refresh(); swallowNextInputFrame();
  }
  updateInput() { if (this.active) this.view!.updateInput(getInput()); }
  private seal() {
    if (!this.active) return;
    // Read the live record again, never authorize from the displayed snapshot.
    if (!this.evidence?.().ready) {
      this.refresh(true);
      setLatestMessage(`The standards seal cannot clear missing proofs, open equities, hidden cuts or unresolved violations. ${this.repairHint()}`);
      retroAudio.warning(); return;
    }
    this.hide(); this.onSeal?.();
  }
  private cancel() { if (!this.active) return; this.hide(); this.onCancel?.(); }
  private hide() { if (!this.active) return; this.view!.close(); this.view = undefined; clearChoiceState(); swallowNextInputFrame(); }
  private refresh(error = false) {
    const evidence = this.evidence?.(); if (!evidence) return;
    this.view?.render(evidence, evidence.ready ? "Evidence complete. Review the record, then make your attestation." : this.repairHint(), error);
    const lines = [`PROOFS FILED ${evidence.proofed}/${evidence.documents}`, `REVIEWS FILED ${evidence.resolved}/${evidence.equities}`, `HIDDEN CUTS ${evidence.hiddenCuts}`, `OPEN VIOLATIONS ${evidence.unresolved}`];
    setChoiceState(`${BINDING_CERTIFICATION_TITLE}: ${lines.join("; ")}. Keep major facts and policy defects. Source: ${ABOUT_SERIES_SOURCE.url}`, [
      {key:"A",label:"Seal the full record",value:evidence.ready?"attest":"locked"},
      {key:"B",label:"Return to the desk",value:"cancel"}
    ]);
  }
  private repairHint() {
    const record = nextEditorialRepair(gameState.documentCandidates, gameState.standardsViolations);
    if (!record) return "REPAIR THE RECORD";
    const document = gameState.documentCandidates.find(document => document.id === record.documentId)!;
    return editorialRepairDraftMatches(document, record) ? "WEST EXIT -> PROOF TABLE" : "WEST EXIT -> EDITOR DESK";
  }

}
