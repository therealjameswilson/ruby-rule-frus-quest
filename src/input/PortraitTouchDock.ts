import { setTouchControl, type CardinalDirection, type TouchControlKey } from './InputState';
import { triggerTouchHaptic } from '../platform/haptics';

type DirectionResolver = (x: number, y: number, previous: CardinalDirection | null) => CardinalDirection | null;

/** A portrait-only touch surface outside the room, using the same game input state. */
export class PortraitTouchDock {
  readonly element: HTMLDivElement;
  private readonly pad: HTMLDivElement;
  private readonly buttons = new Map<TouchControlKey, HTMLButtonElement>();
  private pointers = new Map<number, TouchControlKey | 'pad'>();
  private direction: CardinalDirection | null = null;
  private signature = '';
  private lastCooldown = -1;
  private mode = '';
  active = false;

  constructor(private readonly resolve: DirectionResolver) {
    this.element = document.createElement('div'); this.element.id = 'portrait-touch-dock';
    this.element.setAttribute('role', 'group'); this.element.setAttribute('aria-label', 'Game controls'); this.element.hidden = true;
    this.pad = document.createElement('div'); this.pad.className = 'portrait-dpad'; this.pad.dataset.control = 'pad';
    this.pad.setAttribute('aria-label', 'Movement and menu navigation');
    for (const [direction, glyph] of [['up', '▲'], ['down', '▼'], ['left', '◀'], ['right', '▶']]) {
      const arrow = document.createElement('span'); arrow.dataset.direction = direction; arrow.textContent = glyph; this.pad.appendChild(arrow);
    }
    const center = document.createElement('span'); center.className = 'portrait-dpad-center'; this.pad.appendChild(center); this.element.appendChild(this.pad);
    for (const [key, label, accessible] of [['space', 'A', 'Interact or confirm'], ['b', 'B', 'Attack or back'], ['start', 'MENU', 'Open or close menu']] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.dataset.control = key; button.setAttribute('aria-label', accessible);
      this.buttons.set(key, button); this.element.appendChild(button);
    }
    document.body.appendChild(this.element);
    this.element.addEventListener('pointerdown', this.down);
    this.element.addEventListener('pointermove', this.move);
    this.element.addEventListener('pointerup', this.up);
    this.element.addEventListener('pointercancel', this.up);
    this.element.addEventListener('lostpointercapture', this.up);
    window.addEventListener('blur', this.release);
    window.addEventListener('resize', this.release);
    window.addEventListener('orientationchange', this.release);
    document.addEventListener('visibilitychange', this.visibility);
  }

  update(enabled: boolean, mode: string, secondaryAvailable: boolean, cooldown: number) {
    const active = enabled && document.documentElement.dataset.portraitDock === 'true';
    if (this.active !== active || this.mode !== mode) this.release();
    this.active = active; this.mode = mode;
    const signature = `${active}:${mode}:${secondaryAvailable}`;
    if (signature !== this.signature) {
      this.signature = signature; this.element.hidden = !active;
      this.pad.classList.toggle('disabled', mode === 'dialog');
      this.buttons.get('b')!.disabled = !secondaryAvailable;
      this.buttons.get('start')!.disabled = mode !== 'explore' && mode !== 'pause';
    }
    const remaining = Math.round(Math.max(0, Math.min(1, cooldown)) * 100);
    if (remaining !== this.lastCooldown) {
      this.lastCooldown = remaining; this.buttons.get('b')!.style.setProperty('--cooldown', `${remaining}%`);
    }
  }

  private setDirection(next: CardinalDirection | null) {
    if (next === this.direction) return;
    if (this.direction) setTouchControl(this.direction, false);
    this.direction = next;
    if (next) setTouchControl(next, true);
    this.pad.dataset.direction = next ?? '';
  }

  private steer(event: PointerEvent) {
    const box = this.pad.getBoundingClientRect();
    this.setDirection(this.resolve((event.clientX - box.left - box.width / 2) * 68 / box.width,
      (event.clientY - box.top - box.height / 2) * 68 / box.height, this.direction));
  }

  private readonly down = (event: PointerEvent) => {
    if (!this.active) return;
    const target = (event.target as Element).closest<HTMLElement>('[data-control]');
    if (!target || target instanceof HTMLButtonElement && target.disabled) return;
    const key = target.dataset.control as TouchControlKey | 'pad';
    if ([...this.pointers.values()].includes(key) || key === 'pad' && this.mode === 'dialog') return;
    event.preventDefault(); event.stopPropagation();
    this.pointers.set(event.pointerId, key);
    try { this.element.setPointerCapture(event.pointerId); } catch { /* Synthetic/older pointer event. */ }
    if (key === 'pad') this.steer(event);
    else { setTouchControl(key, true); this.buttons.get(key)?.classList.add('pressed'); triggerTouchHaptic(); }
  };

  private readonly move = (event: PointerEvent) => {
    if (this.pointers.get(event.pointerId) !== 'pad') return;
    event.preventDefault(); event.stopPropagation(); this.steer(event);
  };

  private readonly up = (event: PointerEvent) => {
    const key = this.pointers.get(event.pointerId); if (!key) return;
    event.preventDefault(); event.stopPropagation(); this.pointers.delete(event.pointerId);
    if (key === 'pad') this.setDirection(null);
    else { setTouchControl(key, false); this.buttons.get(key)?.classList.remove('pressed'); }
  };

  readonly release = () => {
    this.setDirection(null);
    for (const key of this.pointers.values()) if (key !== 'pad') { setTouchControl(key, false); this.buttons.get(key)?.classList.remove('pressed'); }
    this.pointers.clear();
  };
  private readonly visibility = () => { if (document.hidden) this.release(); };

  destroy() {
    this.release(); this.element.remove();
    window.removeEventListener('blur', this.release); window.removeEventListener('resize', this.release);
    window.removeEventListener('orientationchange', this.release); document.removeEventListener('visibilitychange', this.visibility);
  }
}
