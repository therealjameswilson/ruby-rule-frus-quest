import { addInputGestureListener, getGamepadDebugState, getLastInputKind } from '../input/InputState';
import type { HitFeedbackKind } from '../systems/combatFeedback';

export const CONTROLLER_VIBRATION_KEY = 'ruby-rule.controllerVibration';
export const CONTROLLER_PULSES = {
  'boss-hit': { duration: 65, weakMagnitude: .28, strongMagnitude: .08 },
  'player-hurt': { duration: 130, weakMagnitude: .18, strongMagnitude: .42 },
  'player-hurt-heavy': { duration: 180, weakMagnitude: .3, strongMagnitude: .6 },
  'boss-defeat': { duration: 240, weakMagnitude: .4, strongMagnitude: .5 }
} as const;

export interface RumbleActuator {
  playEffect(type: 'dual-rumble', options: { duration: number; startDelay: number; weakMagnitude: number; strongMagnitude: number }): Promise<unknown>;
  reset(): Promise<unknown>;
}

/** Overlapping light hits must not repeatedly restart a stronger damage pulse. */
export class ControllerRumble {
  private actuator: RumbleActuator | null = null;
  private until = 0;
  private strength = 0;

  play(actuator: RumbleActuator, kind: HitFeedbackKind, now: number, scale = 1) {
    const amount = Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : 1;
    if (!amount) return;
    const pulse = CONTROLLER_PULSES[kind];
    const strength = Math.max(pulse.weakMagnitude, pulse.strongMagnitude) * amount;
    if (this.actuator === actuator && now < this.until && strength <= this.strength) return;
    if (this.actuator && this.actuator !== actuator) this.stop();
    this.actuator = actuator;
    this.until = now + pulse.duration;
    this.strength = strength;
    try {
      void actuator.playEffect('dual-rumble', {
        duration: pulse.duration, startDelay: 0,
        weakMagnitude: pulse.weakMagnitude * amount,
        strongMagnitude: pulse.strongMagnitude * amount
      }).catch(() => undefined);
    } catch { /* Unsupported or disconnected controllers must never interrupt play. */ }
  }

  stop() {
    const actuator = this.actuator;
    this.actuator = null; this.until = 0; this.strength = 0;
    try { void actuator?.reset().catch(() => undefined); } catch { /* Device already gone. */ }
  }
}

const rumble = new ControllerRumble();
let enabled: boolean | undefined;
let installed = false;
let blurred = false;
export function isControllerVibrationEnabled() {
  if (enabled === undefined) {
    try { enabled = typeof window === 'undefined' || window.localStorage.getItem(CONTROLLER_VIBRATION_KEY) !== 'false'; }
    catch { enabled = true; }
  }
  return enabled;
}
export function setControllerVibrationEnabled(value: boolean) {
  enabled = value;
  try { window.localStorage.setItem(CONTROLLER_VIBRATION_KEY, String(value)); } catch { /* Session preference still works. */ }
  if (!value) stopControllerFeedback();
}
export function stopControllerFeedback() { rumble.stop(); }

export function triggerControllerFeedback(kind: HitFeedbackKind, scale = 1) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!installed) {
    installed = true;
    window.addEventListener('blur', () => { blurred = true; stopControllerFeedback(); });
    window.addEventListener('focus', () => { blurred = false; });
    window.addEventListener('gamepaddisconnected', stopControllerFeedback);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopControllerFeedback(); });
    addInputGestureListener(kind => { if (kind !== 'gamepad') stopControllerFeedback(); });
  }
  if (!isControllerVibrationEnabled() || blurred || document.hidden || getLastInputKind() !== 'gamepad') return;
  const active = getGamepadDebugState();
  if (!active.connected || active.index === null) return;
  try {
    const pad = navigator.getGamepads?.()[active.index];
    // Match the controller actually driving InputState, including after a disconnect.
    if (!pad?.connected || pad.id !== active.id) return;
    const actuator = pad.vibrationActuator;
    if (actuator && typeof actuator.playEffect === 'function' && typeof actuator.reset === 'function') {
      rumble.play(actuator, kind, performance.now(), scale);
    }
  } catch { /* Restricted Gamepad API or unavailable actuator. */ }
}
