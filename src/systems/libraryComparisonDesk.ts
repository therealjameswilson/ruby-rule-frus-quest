import '../styles/manuscript-desk.css';
import '../styles/chapter-assembly.css';
import '../styles/library-comparison.css';
import { comparisonCatalog, comparisonReadout, classifyComparisonCard, toggleComparisonFollowup, evaluateComparison } from '../game/libraryComparison';
import { setChoiceState } from '../game/state';
import type { InputState } from '../input/InputState';
import { DeskControls } from './deskControls';
import { retroAudio } from './audio';

export class LibraryComparisonDesk {
  private get catalog() { return comparisonCatalog(this.library)!; }
  private root = document.createElement('dialog');
  private controls?: DeskControls;
  private body: HTMLElement;
  private status: HTMLElement;
  private submit: HTMLButtonElement;
  private leave: HTMLButtonElement;
  get active() { return this.controls?.active ?? false; }
  constructor(private progress: Record<string, number>, private onSave: () => void, onSubmit: () => void, onCancel: () => void, private reviewOnly = false, private library = 'reagan') {
    this.root.className = 'manuscript-desk chapter-desk library-comparison';
    this.root.setAttribute('aria-labelledby', 'comparison-title');
    this.root.innerHTML = `<section class="manuscript-panel"><header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE READING ROOM <span>02 / COMPARE EVIDENCE</span></p><h1 id="comparison-title">What does each source establish?</h1><p>Thatcher’s February 1985 visit · Sort the evidence, then preserve the open work.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header><div class="manuscript-body assembly-body"></div><footer class="manuscript-footer"><p data-status role="status">DANN-E: “A cordial press appearance. Every private difference settled!”</p><button class="manuscript-submit" data-focus-key="submit">File comparison →</button><small>Optional source trail · Arrows / D-pad to move · A / Enter to act · B / Esc to save and leave</small></footer></section>`;
    this.body = this.root.querySelector('.manuscript-body')!;
    this.status = this.root.querySelector('[data-status]')!;
    this.submit = this.root.querySelector('.manuscript-submit')!;
    this.leave = this.root.querySelector('.manuscript-close')!;
    this.leave.addEventListener('click', onCancel);
    this.root.querySelector('.manuscript-heading p:last-child')!.textContent = this.catalog.subtitle;
    this.status.textContent = this.catalog.taunt;
    if (reviewOnly) {
      this.root.querySelector('h1')!.textContent = 'Your filed evidence comparison.';
      this.root.querySelector('.manuscript-heading p:last-child')!.textContent = 'Review the source distinctions and the research still outstanding.';
      this.submit.textContent = 'Return to room'; this.leave.textContent = 'Close';
      this.status.textContent = this.catalog.receipt;
    }
    this.submit.addEventListener('click', () => {
      if (this.reviewOnly) { onCancel(); return; }
      const result = evaluateComparison(this.progress,this.library);
      this.status.textContent = result.message;
      this.status.dataset.error = String(!result.ok);
      if (result.ok) { this.onSave(); retroAudio.fileDocket(); onSubmit(); }
      else { retroAudio.warning(); if (result.card) this.body.querySelector(`[data-card="${result.card}"]`)?.scrollIntoView({ block: 'nearest' }); }
    });
    this.render();
    this.controls = new DeskControls(this.root, () => [...this.body.querySelectorAll<HTMLButtonElement>('button'), this.submit, this.leave], onCancel);
  }
  private button(label: string, key: string, action: () => void) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label; button.dataset.focusKey = key;
    button.addEventListener('click', action); return button;
  }
  private changed(focus: string) {
    this.onSave(); retroAudio.annotatePaper();
    this.status.textContent = 'Comparison draft saved. File it when every claim has a place and both follow-ups are carried forward.';
    this.status.dataset.error = 'false'; this.render(focus);
  }
  private render(focus?: string) {
    this.body.replaceChildren();
    const state = comparisonReadout(this.progress,this.library);
    const brief = document.createElement('p'); brief.className = 'assembly-brief';
    brief.textContent = this.catalog.brief;
    this.body.append(brief);
    const grid = document.createElement('div'); grid.className = 'comparison-cards';
    for (const card of this.catalog.cards) {
      const article = document.createElement('article'); article.dataset.card = String(card.id); article.dataset.readable = '';
      const provenance = document.createElement('small'); provenance.textContent = card.provenance;
      const title = document.createElement('h2'); title.textContent = card.title;
      const text = document.createElement('p'); text.textContent = card.text;
      const citation = document.createElement('p'); citation.className = 'comparison-citation'; citation.textContent = card.citation;
      article.append(provenance, title, text, citation);
      if (card.source) {
        const link = this.button('Inspect official source ↗', `source-${card.id}`, () => window.open(card.source!, '_blank', 'noopener,noreferrer'));
        link.className = 'comparison-source'; article.append(link);
      }
      const lane = state.cards.find(c => c.id === card.id)!.lane;
      const group = document.createElement('div'); group.className = 'comparison-sort'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', `Classify ${card.title}`);
      if (this.reviewOnly) {
        const filed = document.createElement('p'); filed.className = 'comparison-filed';
        filed.textContent = `Filed as: ${this.catalog.lanes.find(l => l.id === lane)?.label ?? 'Unclassified'}`;
        const limit = document.createElement('p'); limit.textContent = card.feedback;
        group.append(filed, limit);
      }
      for (const target of this.reviewOnly ? [] : this.catalog.lanes) {
        const key = `card-${card.id}-lane-${target.id}`;
        const button = this.button(target.label, key, () => { classifyComparisonCard(this.progress, card.id, target.id,this.library); this.changed(key); });
        button.dataset.lane = String(target.id); button.setAttribute('aria-pressed', String(lane === target.id)); group.append(button);
      }
      article.append(group); grid.append(article);
    }
    this.body.append(grid);
    const table = document.createElement('section'); table.className = 'comparison-table';
    const h = document.createElement('h2'); h.textContent = 'Your comparison table'; table.append(h);
    for (const lane of this.catalog.lanes) {
      const row = document.createElement('p');
      const label = document.createElement('strong'); label.textContent = `${lane.label}: `;
      row.append(label, this.catalog.cards.filter(c => state.cards.find(s => s.id === c.id)?.lane === lane.id).map(c => c.title).join(' · ') || 'No evidence placed'); table.append(row);
    }
    const heading = document.createElement('h3'); heading.textContent = 'Carry the missing evidence forward'; table.append(heading);
    for (const task of this.catalog.followups) {
      const key = `followup-${task.id}`, selected = state.followups.includes(task.id);
      if (this.reviewOnly) {
        const item = document.createElement('p'); item.dataset.readable = '';
        const label = document.createElement('strong'); label.textContent = `Pending: ${task.label}. `;
        item.append(label, task.detail); table.append(item); continue;
      }
      const button = this.button(`${selected ? '✓ ' : ''}${task.label}`, key, () => { toggleComparisonFollowup(this.progress, task.id,this.library); this.changed(key); });
      button.dataset.followup = String(task.id); button.setAttribute('aria-pressed', String(selected));
      const detail = document.createElement('small'); detail.textContent = task.detail; button.append(detail); table.append(button);
    }
    this.body.append(table);
    setChoiceState(this.reviewOnly ? 'REVIEW FILED COMPARISON' : 'COMPARE LIBRARY EVIDENCE', [{ key: 'A', label: this.reviewOnly ? 'Read saved evidence and open research' : 'Sort evidence and carry forward requests', value: 'work' }, { key: 'B', label: this.reviewOnly ? 'Close comparison' : 'Save comparison and leave', value: 'leave' }]);
    this.controls?.refresh(focus);
  }
  updateInput(input: InputState) { this.controls?.updateInput(input); }
  close() { this.controls?.close(); }
}
