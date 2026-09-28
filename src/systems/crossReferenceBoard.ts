import type Phaser from "phaser";
import { CROSS_REFERENCE_CATALOG, CROSS_REFERENCE_TITLE, crossReferenceMatches, restoreCrossReferenceDraft } from "../game/crossReferenceCatalog";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";
import { CrossReferenceDesk } from "./crossReferenceDesk";

export class CrossReferenceBoard {
  private view?: CrossReferenceDesk;
  private draft = 0;
  private message = "";
  private onChange?: (draft: number) => void;
  private onFile?: (draft: number) => void;
  constructor(private readonly scene: Phaser.Scene) {
    scene.events.once("shutdown", () => this.hide());
  }
  get active() { return this.view?.active ?? false; }
  show(draft: number, onChange: (draft: number) => void, onFile: (draft: number) => void) {
    this.hide();
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.draft = restoreCrossReferenceDraft(draft);
    this.onChange = onChange; this.onFile = onFile;
    this.message = this.draft ? "Pinned draft restored — not filed." : "Compare the date and record type before filing.";
    this.view = new CrossReferenceDesk(value => this.select(value), () => this.submit(), () => this.hide());
    this.refresh(); swallowNextInputFrame();
  }
  updateInput() { if (this.active) this.view!.updateInput(getInput()); }
  private select(draft: number) {
    if (!this.active) return;
    const next = restoreCrossReferenceDraft(draft);
    if (!next || next === this.draft) return;
    this.draft = next;
    this.onChange?.(this.draft);
    this.message = `Document ${CROSS_REFERENCE_CATALOG[this.draft - 1].number} pinned — not filed.`;
    this.refresh(); retroAudio.paperPickup();
  }
  private submit() {
    if (!this.active) return;
    if (!crossReferenceMatches(this.draft)) {
      this.message = CROSS_REFERENCE_CATALOG[this.draft - 1]?.hint ?? "SELECT A RECORD FIRST";
      this.refresh(true); setLatestMessage(this.message); retroAudio.warning(); return;
    }
    this.hide(); this.onFile?.(this.draft);
  }
  private hide() {
    if (!this.active) return;
    this.view!.close(); this.view = undefined; clearChoiceState(); swallowNextInputFrame();
  }
  private refresh(error = false) {
    this.view?.render(this.draft, this.message, error);
    setChoiceState(CROSS_REFERENCE_TITLE, [
      ...CROSS_REFERENCE_CATALOG.map((entry, index) => ({ key: (["A", "B", "C"] as const)[index],
        label: `DOC ${entry.number}: ${entry.label}, ${entry.date}`, value: this.draft === index + 1 ? "pinned" : "available" })),
      { key: "D", label: "FILE REFERENCE", value: "file" }
    ]);
  }
}
