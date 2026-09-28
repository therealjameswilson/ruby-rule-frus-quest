import '../styles/manuscript-desk.css';
import '../styles/proof-comparison-desk.css';
import { PROOF_TOKENS, proofTokenText } from '../game/proofComparison';
import { DeskControls } from './deskControls';
import type { InputState } from '../input/InputState';

export class ProofComparisonDesk {
  private root = document.createElement('dialog');
  private controls: DeskControls;
  private cards: HTMLButtonElement[] = [];
  private status: HTMLElement;
  get active() { return this.controls.active; }
  constructor(repair: (index: number) => void, file: () => void, leave: () => void) {
    this.root.className = 'manuscript-desk proof-comparison-desk';
    this.root.setAttribute('aria-labelledby', 'proof-comparison-title');
    this.root.innerHTML = `<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">PROOF LENS · FICTIONAL RECORD</p><h1 id="proof-comparison-title">Preserve the original.</h1><p>Inspect a proof fragment to check it against the original.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
      <aside class="desk-evidence-strip" aria-label="Original text"><span>Original</span><strong data-original></strong></aside>
      <div class="manuscript-body"><p class="proof-instruction" data-reading-start>The typeset copy below may contain errors. Restore the original text without strengthening its meaning.</p><h2>Typeset copy</h2><section class="proof-fragments" aria-label="Proof fragments"></section></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File proof →</button><small>Arrows / D-pad to read and move · A / Enter to inspect · B / Esc to save and leave</small></footer>
    </section>`;
    this.root.querySelector('[data-original]')!.textContent = PROOF_TOKENS[0].original + ' — ' + PROOF_TOKENS.slice(1).map(t => t.original).join(' ');
    this.status = this.root.querySelector('[data-status]')!;
    const host = this.root.querySelector('.proof-fragments')!;
    PROOF_TOKENS.forEach((token, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'proof-fragment';
      button.dataset.focusKey = `fragment-${index}`; button.dataset.fragment = String(index); button.dataset.readable = '';
      const label = document.createElement('span'); label.textContent = index === 0 ? 'Telegram designator' : `Wording · ${index} of 3`;
      const text = document.createElement('strong'); text.className = 'proof-fragment-text';
      const action = document.createElement('small'); action.className = 'proof-fragment-action';
      button.append(label, text, action); button.addEventListener('click', () => repair(index)); host.append(button); this.cards.push(button);
    });
    const submit = this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!, close = this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
    submit.addEventListener('click', file); close.addEventListener('click', leave);
    this.controls = new DeskControls(this.root, () => [...this.cards, submit, close], leave);
  }
  render(repairs: number, message: string, error = false) {
    this.cards.forEach((button, index) => {
      const restored = Boolean(PROOF_TOKENS[index].repairBit & repairs);
      button.dataset.restored = String(restored);
      button.querySelector('.proof-fragment-text')!.textContent = proofTokenText(index, repairs);
      button.querySelector('.proof-fragment-action')!.textContent = restored ? 'Restored · not filed' : 'Inspect against original';
    });
    this.status.textContent = message; this.status.dataset.error = String(error);
  }
  updateInput(input: InputState) { this.controls.updateInput(input); }
  close() { this.controls.close(); }
}
