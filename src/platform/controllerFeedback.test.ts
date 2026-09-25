import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const input = vi.hoisted(() => ({ kind: 'gamepad', listener: (_: string) => {}, active: { connected: true, index: 1, id: 'active pad' } }));
vi.mock('../input/InputState', () => ({
  getLastInputKind: () => input.kind,
  getGamepadDebugState: () => input.active,
  addInputGestureListener: (listener: (kind: string) => void) => { input.listener = listener; }
}));
const actuator = () => ({ playEffect: vi.fn().mockResolvedValue('complete'), reset: vi.fn().mockResolvedValue('complete') });

describe('controller combat feedback', () => {
  beforeEach(() => {
    vi.resetModules(); input.kind = 'gamepad';
    const store = new Map<string,string>();
    vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: { getItem: (k: string) => store.get(k), setItem: (k: string,v: string) => store.set(k,v) } }));
    vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('uses only the controller driving gameplay, never an idle connected pad', async () => {
    const first = actuator(), active = actuator();
    vi.stubGlobal('navigator', { getGamepads: () => [{ id: 'idle', connected: true, vibrationActuator: first }, { id: 'active pad', connected: true, vibrationActuator: active }] });
    const { triggerControllerFeedback } = await import('./controllerFeedback');
    triggerControllerFeedback('boss-hit');
    expect(first.playEffect).not.toHaveBeenCalled();
    expect(active.playEffect).toHaveBeenCalledWith('dual-rumble', expect.objectContaining({ duration: 65, strongMagnitude: .08 }));
    input.kind = 'keyboard'; triggerControllerFeedback('player-hurt');
    expect(active.playEffect).toHaveBeenCalledTimes(1);
  });
  it('gives damage priority over overlapping hit pulses and permits later hits', async () => {
    const { ControllerRumble } = await import('./controllerFeedback');
    const rumble = new ControllerRumble(), motor = actuator();
    rumble.play(motor, 'boss-hit', 0);
    rumble.play(motor, 'player-hurt-heavy', 10);
    rumble.play(motor, 'boss-hit', 30);
    expect(motor.playEffect).toHaveBeenCalledTimes(2);
    rumble.play(motor, 'boss-hit', 200);
    expect(motor.playEffect).toHaveBeenCalledTimes(3);
  });
  it.each(['blur', 'gamepaddisconnected', 'visibilitychange', 'pointer'])('stops on %s', async event => {
    const motor = actuator();
    vi.stubGlobal('navigator', { getGamepads: () => [null, { id: 'active pad', connected: true, vibrationActuator: motor }] });
    const { triggerControllerFeedback } = await import('./controllerFeedback');
    triggerControllerFeedback('player-hurt');
    if (event === 'pointer') input.listener('pointer');
    else if (event === 'visibilitychange') { Object.assign(document, { hidden: true }); document.dispatchEvent(new Event(event)); }
    else window.dispatchEvent(new Event(event));
    expect(motor.reset).toHaveBeenCalledTimes(1);
  });
  it('persists opt-out, stops immediately, and reloads it before feedback', async () => {
    const motor = actuator();
    vi.stubGlobal('navigator', { getGamepads: () => [null, { id: 'active pad', connected: true, vibrationActuator: motor }] });
    let api = await import('./controllerFeedback');
    api.triggerControllerFeedback('player-hurt'); api.setControllerVibrationEnabled(false);
    expect(motor.reset).toHaveBeenCalledTimes(1);
    vi.resetModules(); api = await import('./controllerFeedback');
    expect(api.isControllerVibrationEnabled()).toBe(false);
    api.triggerControllerFeedback('player-hurt');
    expect(motor.playEffect).toHaveBeenCalledTimes(1);
  });
  it('handles rejected/throwing motors, missing capability and hidden pages', async () => {
    const api = await import('./controllerFeedback'), rumble = new api.ControllerRumble();
    const motor = actuator(); motor.playEffect.mockRejectedValue(new Error('Disconnected')); motor.reset.mockRejectedValue(new Error('Disconnected'));
    rumble.play(motor, 'player-hurt', 0); rumble.stop();
    motor.playEffect.mockImplementation(() => { throw Error('Unsupported'); });
    expect(() => rumble.play(motor, 'boss-hit', 200)).not.toThrow();
    vi.stubGlobal('navigator', { getGamepads: () => [null, { id: 'active pad', connected: true }] });
    expect(() => api.triggerControllerFeedback('boss-hit')).not.toThrow();
    Object.assign(document, { hidden: true });
    vi.stubGlobal('navigator', { getGamepads: vi.fn(() => { throw Error('Should not poll'); }) });
    api.triggerControllerFeedback('boss-hit');
    expect(navigator.getGamepads).not.toHaveBeenCalled();
    await Promise.resolve();
  });
});
