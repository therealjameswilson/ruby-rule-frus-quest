import '../styles/manuscript-desk.css';
import '../styles/source-note-desk.css';
import { DeskControls } from './deskControls';
import type { InputState } from '../input/InputState';

/** Fictional packet: locator evidence must not imply undocumented readership. */
export class SourceNoteDesk {
  private root = document.createElement('dialog');
  private controls: DeskControls;
  get active() { return this.controls.active; }
  constructor(repair: () => void, file: () => void, leave: () => void) {
    this.root.className = 'manuscript-desk source-note-desk';
    this.root.setAttribute('aria-labelledby', 'source-note-title');
    this.root.innerHTML = `<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">SOURCE NOTE 47 · FICTIONAL RECORD</p><h1 id="source-note-title">Say what the evidence supports.</h1><p>Compare the draft claim with the research packet.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
      <aside class="desk-evidence-strip"><span>Packet evidence</span><strong>No presidential readership evidence found.</strong></aside>
      <div class="manuscript-body"><div class="source-note-cards">
        <section class="note47-evidence" data-reading-start><h2>What the packet records</h2>
          <dl><dt>Repository</dt><dd>National Archives</dd><dt>Collection</dt><dd>Policy Planning</dd><dt>File</dt><dd>Alliance Consultation</dd><dt>Original classification</dt><dd>Not recorded</dd><dt>Distribution</dt><dd>Not recorded</dd><dt>Drafting information</dt><dd>Not recorded</dd><dt>Context</dt><dd>Folder title only</dd></dl>
          <p class="source-note-limit">This locator does not supply a complete first footnote. Keep the missing information visible for follow-up research.</p>
        </section>
        <section class="source-note-claim" data-readable><h2>Readership claim in the draft</h2><p data-claim></p><button data-focus-key="repair" class="source-note-repair">Remove unsupported claim →</button><p data-effect></p></section>
      </div></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File working note →</button><small>Arrows / D-pad to read and move · A / Enter to choose · B / Esc to save and leave</small></footer>
    </section>`;
    const edit = this.root.querySelector<HTMLButtonElement>('[data-focus-key=repair]')!;
    const submit = this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!;
    const close = this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
    edit.addEventListener('click', repair); submit.addEventListener('click', file); close.addEventListener('click', leave);
    edit.dataset.readingTarget = '.source-note-cards';
    this.controls = new DeskControls(this.root, () => [edit, submit, close], leave);
  }
  render(repaired: boolean, message: string, error = false) {
    this.root.querySelector('[data-claim]')!.textContent = repaired ? 'Presidential readership: not established.' : 'The President read this document.';
    this.root.querySelector('[data-effect]')!.textContent = repaired ? 'The unsupported claim is removed. “Not established” does not mean the President did not read it. The other missing fields still need research.' : 'The packet does not support this claim. A folder title or archival location cannot show who read a document.';
    const edit = this.root.querySelector<HTMLButtonElement>('[data-focus-key=repair]')!;
    edit.textContent = repaired ? 'Evidence limit retained ✓' : 'Remove unsupported claim →';
    edit.setAttribute('aria-disabled', String(repaired));
    const status = this.root.querySelector<HTMLElement>('[data-status]')!;
    status.textContent = message; status.dataset.error = String(error);
  }
  updateInput(input: InputState) { this.controls.updateInput(input); }
  close() { this.controls.close(); }
}
