type ResumePad = { connected: boolean; axes: readonly number[]; buttons: readonly { pressed: boolean }[] };

// Require a neutral controller after showing the return shield. A held button
// from before backgrounding must never dismiss it or advance the waiting task.
export function createControllerResume() {
  let armed = false;
  return {
    begin() { armed = false; },
    poll(pads: ArrayLike<ResumePad | null>) {
      const connected = Array.from(pads).filter((pad): pad is ResumePad => Boolean(pad?.connected));
      if (!connected.length) { armed = false; return false; }
      const neutral = connected.every(pad =>
        pad.buttons.every(button => !button.pressed) && pad.axes.every(axis => Math.abs(axis) < 0.25));
      if (!armed) { armed = neutral; return false; }
      if (!connected.some(pad => pad.buttons[0]?.pressed || pad.buttons[9]?.pressed)) return false;
      armed = false;
      return true;
    }
  };
}
