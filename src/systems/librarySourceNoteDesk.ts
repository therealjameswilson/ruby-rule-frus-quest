import '../styles/manuscript-desk.css';
import '../styles/chapter-assembly.css';
import '../styles/library-source-note.css';
import { sourceNoteFields, SOURCE_NOTE_TITLE, sourceNoteReadout, chooseSourceNoteField, toggleSourceNoteLog, evaluateSourceNote } from '../game/librarySourceNote';
import { requestCatalog } from '../game/libraryRequest';
import { COMPARISON_SOURCE } from '../game/libraryComparison';
import { setChoiceState } from '../game/state';
import type { InputState } from '../input/InputState';
import { DeskControls } from './deskControls';
import { retroAudio } from './audio';

export class LibrarySourceNoteDesk {
  private get isLog() { return ['bush41','clinton'].includes(this.library); }
  private root = document.createElement('dialog');
  private controls?: DeskControls;
  private body: HTMLElement;
  private status: HTMLElement;
  private submit: HTMLButtonElement;
  private leave: HTMLButtonElement;
  get active() { return this.controls?.active ?? false; }
  constructor(private progress: Record<string, number>, private onSave: () => void, onSubmit: () => void, onCancel: () => void, private reviewOnly = false, private library = 'reagan') {
    this.root.className = 'manuscript-desk chapter-desk library-source-note';
    this.root.setAttribute('aria-labelledby', 'source-note-title');
    this.root.innerHTML = `<section class="manuscript-panel"><header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE READING ROOM <span>03 / SOURCE NOTE</span></p><h1 id="source-note-title">Give the words a traceable source.</h1><p>Build a working note for the public remarks. Keep unexamined holdings in the research log.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header><div class="manuscript-body assembly-body"></div><footer class="manuscript-footer"><p data-status role="status">DANN-E: “Just put a box number under it. Nobody checks!”</p><button class="manuscript-submit" data-focus-key="submit">File working note →</button><small>Arrows / D-pad to move · A / Enter to act · B / Esc to save and leave</small></footer></section>`;
    this.body = this.root.querySelector('.manuscript-body')!;
    this.status = this.root.querySelector('[data-status]')!;
    this.submit = this.root.querySelector('.manuscript-submit')!;
    this.leave = this.root.querySelector('.manuscript-close')!;
    this.leave.addEventListener('click', onCancel);
    if(this.isLog) {
      this.root.querySelector('h1')!.textContent = 'Record the leads. Keep the gaps.';
      this.root.querySelector('.manuscript-eyebrow span')!.textContent = '03 / RESEARCH LOG';
      this.root.querySelector('.manuscript-heading p:last-child')!.textContent = 'Prepare an accurate log of unexamined holdings and the research still to do.';
      this.submit.textContent = 'File research log →';
      this.status.textContent = 'DANN-E: “Just write that you read it. Who will know?”';
    }
    if (reviewOnly) { this.root.querySelector('h1')!.textContent = this.isLog ? 'Your filed research log.' : 'Your filed working note.'; this.submit.textContent = 'Return to room'; this.leave.textContent = 'Close'; this.status.textContent = 'Filed for human review. Unfinished research remains listed below.'; }
    this.submit.addEventListener('click', () => {
      if (this.reviewOnly) { onCancel(); return; }
      const result = evaluateSourceNote(this.progress,this.library);
      this.status.textContent = result.message; this.status.dataset.error = String(!result.ok);
      if (result.ok) { this.onSave(); retroAudio.fileDocket(); onSubmit(); }
      else { retroAudio.warning(); if (result.field) this.body.querySelector(`[data-field="${result.field}"]`)?.scrollIntoView({ block: 'nearest' }); }
    });
    this.render();
    this.controls = new DeskControls(this.root, () => [...this.body.querySelectorAll<HTMLButtonElement>('button'), this.submit, this.leave], onCancel);
  }
  private button(label: string, key: string, action: () => void) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.dataset.focusKey = key; b.addEventListener('click', action); return b;
  }
  private changed(focus: string) {
    this.onSave(); retroAudio.paperPickup();
    this.status.textContent = 'Draft saved. Read the assembled note below before you file it.';
    this.status.dataset.error = 'false'; this.render(focus);
  }
  private render(focus?: string) {
    const note = sourceNoteReadout(this.progress,this.library); this.body.replaceChildren();
    const evidence = document.createElement('section'); evidence.className = 'source-note-evidence'; evidence.dataset.readable = '';
    const h = document.createElement('h2'); h.textContent = 'The source on your desk';
    const title = document.createElement('p'); title.textContent = this.isLog ? requestCatalog(this.library)!.collection : SOURCE_NOTE_TITLE;
    const metadata = document.createElement('p'); metadata.textContent = this.isLog ? `${requestCatalog(this.library)!.library} · Catalog metadata · Individual records unexamined` : 'February 20, 1985 · Ronald Reagan Presidential Library · Online Public Papers transcript';
    const reminder = document.createElement('p'); reminder.textContent = this.isLog ? 'Catalog dates and availability do not establish individual document contents or a complete historical account.' : 'You compared attributed public remarks. The RAC Box 6 folder was a finding-aid lead; no private meeting record was examined.';
    const link = this.button(this.isLog ? 'Inspect official inventory ↗' : 'Inspect official transcript ↗', 'source', () => window.open(this.isLog ? requestCatalog(this.library)!.source : COMPARISON_SOURCE, '_blank', 'noopener,noreferrer'));
    evidence.append(h, title, metadata, reminder, link); this.body.append(evidence);
    const editor = document.createElement('div'); editor.className = 'source-note-fields';
    for (const field of sourceNoteFields(this.library)) {
      const section = document.createElement('section'); section.dataset.field = field.id; section.dataset.readable = '';
      const title = document.createElement('h2'); title.textContent = field.title;
      const help = document.createElement('p'); help.textContent = field.help; section.append(title, help);
      for (const choice of field.choices) {
        const key = `${field.id}-${choice.value}`;
        const b = this.button(choice.label, key, () => { chooseSourceNoteField(this.progress, field.id, choice.value,this.library); this.changed(key); });
        b.dataset.value = String(choice.value); b.setAttribute('aria-pressed', String(note.fields[field.id] === choice.value)); section.append(b);
      }
      editor.append(section);
    }
    if (!this.reviewOnly) this.body.append(editor);
    const log = document.createElement('section'); log.className = 'source-note-log';
    const logTitle = document.createElement('h2'); logTitle.textContent = 'Keep the unfinished research'; log.append(logTitle);
    for (const [item, label] of [['lead', this.library==='clinton' ? 'Carry the MDR identifier and release coverage, marked unexamined' : this.isLog ? 'Carry both exact file-unit leads, marked unexamined' : 'Carry the exact folder lead, marked unexamined'], ['followups', this.isLog ? 'Carry pending examination and State comparison' : 'Carry both pending requests: meeting record and State/embassy reporting']] as const) {
      const b = this.button(`${note[item] ? '✓ ' : ''}${label}`, item, () => { toggleSourceNoteLog(this.progress, item,this.library); this.changed(item); });
      b.dataset.log = item; b.setAttribute('aria-pressed', String(note[item])); log.append(b);
    }
    if (!this.reviewOnly) this.body.append(log);
    const preview = document.createElement('section'); preview.className = 'source-note-preview'; preview.dataset.readable = ''; preview.setAttribute('aria-label', 'Assembled working note');
    const eyebrow = document.createElement('small'); eyebrow.textContent = this.isLog ? (this.reviewOnly ? 'RESEARCH LOG · FILED FOR HUMAN REVIEW' : 'RESEARCH LOG · DRAFT FOR HUMAN REVIEW') : this.reviewOnly ? 'WORKING NOTE · FILED FOR HUMAN REVIEW' : 'WORKING NOTE · DRAFT FOR HUMAN REVIEW';
    const heading = document.createElement('h2'); heading.textContent = note.heading;
    const citation = document.createElement('p'); citation.dataset.noteCitation = ''; citation.textContent = `Source: ${note.citation}`;
    const qualification = document.createElement('p'); qualification.textContent = note.qualification;
    const logLabel = document.createElement('h3'); logLabel.textContent = this.isLog ? 'Pending research' : 'Separate research log';
    const list = document.createElement('ul');
    for (const text of note.researchLog.length ? note.researchLog : ['No pending research attached yet.']) { const li = document.createElement('li'); li.textContent = text; list.append(li); }
    const inspect = this.button(this.reviewOnly ? 'Review this note' : 'Read this draft', 'preview', () => { preview.scrollIntoView({ block: 'start', behavior: 'instant' }); this.status.textContent = this.reviewOnly ? 'This record is filed for human review. Outstanding research remains listed.' : 'Check the source, date information and limits. Filing preserves work for human review; it does not clear a chapter for publication.'; });
    preview.append(eyebrow, heading, citation, qualification, logLabel, list, inspect); this.body.append(preview);
    setChoiceState(this.isLog ? (this.reviewOnly ? 'FILED LIBRARY RESEARCH LOG' : 'BUILD LIBRARY RESEARCH LOG') : this.reviewOnly ? 'FILED LIBRARY SOURCE NOTE' : 'BUILD LIBRARY SOURCE NOTE', [{ key: 'A', label: this.reviewOnly ? 'Read filed working note' : 'Assemble a traceable working note', value: 'work' }, { key: 'B', label: this.reviewOnly ? 'Return to room' : 'Save note and leave', value: 'leave' }]);
    this.controls?.refresh(focus);
  }
  updateInput(input: InputState) { this.controls?.updateInput(input); }
  close() { this.controls?.close(); }
}
