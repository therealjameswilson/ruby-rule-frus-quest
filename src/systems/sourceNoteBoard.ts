import type Phaser from 'phaser';
import { SOURCE_NOTE_47_TITLE } from '../game/sourceNote47';
import { clearChoiceState, setChoiceState, setLatestMessage } from '../game/state';
import { getInput, swallowNextInputFrame } from '../input/InputState';
import { retroAudio } from './audio';
import { CHOICE_PROMPT_OPEN_EVENT } from './verification';
import { SourceNoteDesk } from './sourceNoteDesk';

export class SourceNoteBoard {
  private view?: SourceNoteDesk;
  private repaired = false;
  private message = '';
  private onChange?: () => void;
  private onFile?: () => void;
  private onCancel?: () => void;
  constructor(private readonly scene: Phaser.Scene) {
    scene.events.once('shutdown', () => this.hide());
  }
  get active() { return this.view?.active ?? false; }
  show(repaired: boolean, onChange: () => void, onFile: () => void, onCancel: () => void) {
    this.hide();
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.repaired = repaired; this.onChange = onChange; this.onFile = onFile; this.onCancel = onCancel;
    this.message = repaired ? 'Draft kept — not filed. Unknown is not a denial.' : 'One unsupported claim. Check it against the packet.';
    this.view = new SourceNoteDesk(() => this.repair(), () => this.submit(), () => this.hide());
    this.refresh(); swallowNextInputFrame();
  }
  updateInput() { if (this.active) this.view!.updateInput(getInput()); }
  private repair() {
    if (!this.active || this.repaired) return;
    this.repaired = true; this.onChange?.(); retroAudio.annotatePaper();
    this.message = 'Draft edited — not filed. Unknown is not a denial.'; this.refresh();
  }
  private submit() {
    if (!this.active) return;
    if (!this.repaired) {
      this.message = 'Check the readership claim before filing.'; this.refresh(true);
      setLatestMessage('The training packet does not establish presidential readership. Remove the unsupported claim before filing.');
      retroAudio.warning(); return;
    }
    this.hide(false); this.onFile?.();
  }
  private hide(cancel = true) {
    if (!this.active) return;
    this.view!.close(); this.view = undefined;
    clearChoiceState(); swallowNextInputFrame(); if (cancel) this.onCancel?.();
  }
  private refresh(error = false) {
    this.view?.render(this.repaired, this.message, error);
    setChoiceState(SOURCE_NOTE_47_TITLE, [
      { key: 'A', label: this.repaired ? 'READERS: NOT ESTABLISHED' : 'DRAFT: PRESIDENT READ IT', value: this.repaired ? 'evidence_limited' : 'unsupported_readership' },
      { key: 'B', label: 'FILE NOTE', value: 'file' },
      { key: 'C', label: 'RETURN', value: 'cancel' }
    ]);
  }
}
