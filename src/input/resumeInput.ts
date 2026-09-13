// Keep the resume shield through pointer-up: hiding on pointer-down lets the
// following touchstart be retargeted to Phaser controls underneath it.
export function installResumeInput(isWaiting: () => boolean, resume: (event: Event) => void) {
  let pointerId: number | null = null;
  let consumeCompatibilityEvents = false;
  const heldKeys = new Set<string>();
  const capture = { capture: true };
  const consume = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const down = (event: PointerEvent) => {
    if (!isWaiting()) { consumeCompatibilityEvents = false; return; }
    consume(event);
    pointerId ??= event.pointerId;
    consumeCompatibilityEvents = true;
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    consume(event);
    pointerId = null;
    if (isWaiting()) resume(event);
  };
  const cancel = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    consume(event);
    pointerId = null;
  };
  const keydown = (event: KeyboardEvent) => {
    if (heldKeys.has(event.code)) { consume(event); return; }
    if (!isWaiting()) { consumeCompatibilityEvents = false; return; }
    consume(event);
    heldKeys.add(event.code);
    pointerId = null;
    resume(event);
  };
  const keyup = (event: KeyboardEvent) => {
    if (heldKeys.delete(event.code)) consume(event);
  };
  const compatibility = (event: Event) => {
    if (isWaiting() || consumeCompatibilityEvents) consume(event);
  };
  const click = (event: MouseEvent) => {
    if (!isWaiting()) { compatibility(event); return; }
    consume(event);
    // Assistive activation may send click without pointer events.
    pointerId = null;
    resume(event);
  };
  window.addEventListener("pointerdown", down, capture);
  window.addEventListener("pointerup", up, capture);
  window.addEventListener("pointercancel", cancel, capture);
  window.addEventListener("keydown", keydown, capture);
  window.addEventListener("keyup", keyup, capture);
  window.addEventListener("click", click, capture);
  for (const type of ["touchstart", "touchend", "mousedown", "mouseup"]) {
    window.addEventListener(type, compatibility, { capture: true, passive: false });
  }
  return () => {
    window.removeEventListener("pointerdown", down, capture);
    window.removeEventListener("pointerup", up, capture);
    window.removeEventListener("pointercancel", cancel, capture);
    window.removeEventListener("keydown", keydown, capture);
    window.removeEventListener("keyup", keyup, capture);
    window.removeEventListener("click", click, capture);
    for (const type of ["touchstart", "touchend", "mousedown", "mouseup"]) {
      window.removeEventListener(type, compatibility, capture);
    }
  };
}
