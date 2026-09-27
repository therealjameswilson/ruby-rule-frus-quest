import '../styles/manuscript-desk.css';
import '../styles/chapter-assembly.css';
import '../styles/library-packet.css';
import { libraryPacketReadout, togglePacketPart, evaluateLibraryPacket, fileLibraryPacket } from '../game/libraryPacket';
import { setChoiceState } from '../game/state';
import type { InputState } from '../input/InputState';
import { DeskControls } from './deskControls';
import { retroAudio } from './audio';

export class LibraryPacketDesk {
  private root = document.createElement('dialog');
  private controls?: DeskControls;
  private body: HTMLElement;
  private status: HTMLElement;
  private submit: HTMLButtonElement;
  private leave: HTMLButtonElement;
  private selected = 1;
  get active() { return this.controls?.active ?? false; }
  constructor(private progress: Record<string, number>, private onSave: () => void, onSubmit: () => void, private onCancel: () => void) {
    this.root.className = 'manuscript-desk chapter-desk library-packet';
    this.root.setAttribute('aria-labelledby', 'library-packet-title');
    this.root.innerHTML = `<section class="manuscript-panel"><header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE READING ROOM <span>04 / RESEARCH PACKET</span></p><h1 id="library-packet-title">Put the evidence in the packet.</h1><p>Inspect your saved work, attach each part, and carry unfinished research forward.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header><div class="manuscript-body assembly-body"></div><footer class="manuscript-footer"><p data-status role="status">DANN-E: “Three papers! Surely that means the entire volume is done.”</p><button class="manuscript-submit" data-focus-key="submit">Send for review →</button><small>Arrows / D-pad to move · A / Enter to act · B / Esc to leave</small></footer></section>`;
    this.body = this.root.querySelector('.manuscript-body')!; this.status = this.root.querySelector('[data-status]')!;
    this.submit = this.root.querySelector('.manuscript-submit')!; this.leave = this.root.querySelector('.manuscript-close')!;
    if (libraryPacketReadout(progress).filed) {
      this.root.querySelector('h1')!.textContent = 'Your filed research packet.';
      this.leave.textContent = 'Close'; this.submit.textContent = 'Return to room';
      this.status.textContent = 'Filed for supervisor review. The open research remains visible below.';
    }
    this.leave.addEventListener('click', onCancel);
    this.submit.addEventListener('click', () => {
      if (libraryPacketReadout(this.progress).filed) { this.onCancel(); return; }
      const result = evaluateLibraryPacket(this.progress); this.status.textContent = result.message; this.status.dataset.error = String(!result.ok);
      if (result.ok && fileLibraryPacket(this.progress)) { this.onSave(); retroAudio.fileDocket(); onSubmit(); }
      else retroAudio.warning();
    });
    this.render(); this.controls = new DeskControls(this.root, () => [...this.body.querySelectorAll<HTMLButtonElement>('button'), this.submit, this.leave], onCancel);
  }
  private button(text: string, key: string, action: () => void) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.focusKey = key; b.addEventListener('click', action); return b;
  }
  private render(focus?: string) {
    const packet = libraryPacketReadout(this.progress); this.body.replaceChildren();
    const cover = document.createElement('section'); cover.className = 'library-packet-cover';
    const title = document.createElement('h2'); title.textContent = packet.purpose;
    const count = document.createElement('strong'); count.dataset.packetCount = ''; count.textContent = `${packet.parts.filter(p => p.attached).length} / 3 attached`;
    const scope = document.createElement('p'); scope.textContent = packet.limit; cover.append(title, count, scope); this.body.append(cover);
    const grid = document.createElement('div'); grid.className = 'library-packet-grid';
    const tabs = document.createElement('nav'); tabs.setAttribute('aria-label', 'Inspect packet parts');
    for (const part of packet.parts) {
      const b = this.button(`${part.id}. ${part.label}`, `part-${part.id}`, () => { this.selected = part.id; this.render(`part-${part.id}`); });
      b.dataset.part = String(part.id); b.setAttribute('aria-pressed', String(this.selected === part.id));
      const badge = document.createElement('small'); badge.textContent = !part.ready ? `Revisit desk ${part.station + 1}` : part.attached ? 'Attached' : 'Ready to attach'; b.append(badge); tabs.append(b);
    }
    grid.append(tabs);
    const part = packet.parts.find(p => p.id === this.selected)!;
    const paper = document.createElement('article'); paper.className = 'library-packet-paper'; paper.dataset.readable = '';
    const titlePaper = document.createElement('h2'); titlePaper.textContent = part.label; paper.append(titlePaper);
    for (const text of part.contents) { const p = document.createElement('p'); p.textContent = text; paper.append(p); }
    for (const source of part.sources) {
      const link = this.button(`${source.label} ↗`, `source-${part.id}-${part.sources.indexOf(source)}`, () => window.open(source.url, '_blank', 'noopener,noreferrer'));
      link.className = 'library-packet-source'; paper.append(link);
    }
    if (!part.ready) {
      const missing = document.createElement('p'); missing.className = 'library-packet-missing'; missing.textContent = `Return to desk ${part.station + 1}: ${part.problem}`; paper.append(missing);
    }
    if (!packet.filed) {
      const attach = this.button(part.attached ? 'Remove from packet' : 'Attach this saved work', 'attach', () => { togglePacketPart(this.progress, part.id); this.onSave(); retroAudio.paperPickup(); this.status.textContent = 'Packet draft saved. The attached papers keep their original limits and pending work.'; this.status.dataset.error = 'false'; this.render('attach'); });
      attach.dataset.attach = ''; attach.disabled = !part.ready; paper.append(attach);
    }
    const inspect = this.button('Read this paper from the top', 'read', () => paper.scrollIntoView({ block: 'start', behavior: 'instant' })); paper.append(inspect);
    grid.append(paper); this.body.append(grid);
    const work = document.createElement('section'); work.className = 'library-packet-open'; work.dataset.readable = '';
    const h = document.createElement('h2'); h.textContent = 'Still open after filing'; work.append(h);
    const list = document.createElement('ul');
    for (const text of packet.openWork) { const item = document.createElement('li'); item.textContent = text; list.append(item); }
    work.append(list, this.button('Review the open research', 'open-work', () => work.scrollIntoView({ block: 'start', behavior: 'instant' }))); this.body.append(work);
    setChoiceState(packet.filed ? 'FILED LIBRARY PACKET' : 'ASSEMBLE LIBRARY PACKET', [{ key: 'A', label: 'Inspect saved evidence and open research', value: 'work' }, { key: 'B', label: 'Return to room', value: 'leave' }]);
    this.controls?.refresh(focus);
  }
  updateInput(input: InputState) { this.controls?.updateInput(input); }
  close() { this.controls?.close(); }
}
