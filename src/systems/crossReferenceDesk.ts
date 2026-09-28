import '../styles/manuscript-desk.css';
import '../styles/cross-reference-desk.css';
import { CROSS_REFERENCE_CATALOG, CROSS_REFERENCE_TARGET } from '../game/crossReferenceCatalog';
import { DeskControls } from './deskControls';
import type { InputState } from '../input/InputState';

export class CrossReferenceDesk {
  private root = document.createElement('dialog');
  private controls: DeskControls;
  private cards: HTMLButtonElement[] = [];
  private status: HTMLElement;
  private initialRender = true;
  get active() { return this.controls.active; }

  constructor(select: (draft: number) => void, file: () => void, leave: () => void) {
    this.root.className = 'manuscript-desk cross-reference-desk';
    this.root.setAttribute('aria-labelledby', 'cross-reference-title');
    this.root.innerHTML = `<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">PROOF CHECK · FICTIONAL CATALOG</p><h1 id="cross-reference-title">Find the cited record.</h1><p>A matching subject is only the start. Check the date and record type.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
      <aside class="desk-evidence-strip" aria-label="Cited record"><span>Cited record</span><strong data-evidence-summary></strong></aside>
      <div class="manuscript-body"><section class="reference-target" data-reading-start><h2>The manuscript cites</h2><strong></strong><p>Memcon means memorandum of conversation. A cable on the same date is a different record.</p></section><section class="reference-catalog" aria-label="Catalog candidates"></section></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File reference →</button><small>Arrows / D-pad to read and move · A / Enter to pin · B / Esc to save and leave</small></footer>
    </section>`;
    this.root.querySelector('.reference-target strong')!.textContent = CROSS_REFERENCE_TARGET;
    this.root.querySelector('[data-evidence-summary]')!.textContent = CROSS_REFERENCE_TARGET;
    this.status = this.root.querySelector('[data-status]')!;
    const host = this.root.querySelector('.reference-catalog')!;
    for (const [index, entry] of CROSS_REFERENCE_CATALOG.entries()) {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'reference-card';
      card.dataset.focusKey = `record-${index + 1}`; card.dataset.record = String(index + 1); card.dataset.readable = '';
      const number = document.createElement('span'); number.className = 'reference-number'; number.textContent = `Document ${entry.number}`;
      const title = document.createElement('strong'); title.textContent = entry.label;
      const date = document.createElement('span'); date.textContent = `Date: ${entry.date}`;
      const mark = document.createElement('b'); mark.className = 'reference-pin';
      card.append(number, title, date, mark);
      card.addEventListener('click', () => select(index + 1)); host.append(card); this.cards.push(card);
    }
    const submit = this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!;
    const close = this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
    submit.addEventListener('click', file); close.addEventListener('click', leave);
    this.controls = new DeskControls(this.root, () => [...this.cards, submit, close], leave);
  }
  render(draft: number, message: string, error = false) {
    this.cards.forEach((card, index) => {
      const pinned = draft === index + 1;
      card.setAttribute('aria-pressed', String(pinned));
      card.querySelector('.reference-pin')!.textContent = pinned ? 'Pinned · not filed' : 'Pin this record';
    });
    this.status.textContent = message; this.status.dataset.error = String(error);
    if (this.initialRender && draft) this.controls.refresh(`record-${draft}`);
    this.initialRender = false;
  }
  updateInput(input: InputState) { this.controls.updateInput(input); }
  close() { this.controls.close(); }
}
