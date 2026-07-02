/**
 * Vertical layout of the framed plates on the title screen. Each plate is
 * given as a center y plus the full height of its ornate gold frame
 * (interior + 8px of border). Kept Phaser-free so the no-collision invariant
 * between the map, title, and relic shelf can be unit-tested without a canvas.
 */
export const TITLE_LAYOUT = {
  topFilmstripY: 42,
  bottomFilmstripY: 218,
  map: { y: 82, frameHeight: 80 },
  titlePlate: { y: 145, frameHeight: 26 },
  relicShelf: { y: 180, frameHeight: 26 },
  artPackStartY: 190,
  pressStartY: 203,
  controlsY: 214
} as const;

/** Outer top/bottom edges of a gold-framed plate (frame adds 8px of border). */
export function framedPlateBounds(plate: { y: number; frameHeight: number }) {
  const half = (plate.frameHeight + 8) / 2;
  return { top: plate.y - half, bottom: plate.y + half };
}

export interface TitleAdvanceInput {
  a: boolean;
  start: boolean;
  aJustPressed: boolean;
  startJustPressed: boolean;
  pointerPrimaryJustPressed: boolean;
}

// Whether the title should advance to character creation this frame. Accepts a
// fresh A/start/pointer rising edge always, plus a *held* A/start once the brief
// input-ready grace has elapsed. The held branch is what lets a key that was
// already down when the warning handed off (no rising edge on the title) still
// carry the player straight into the game without a pointer click (live audit,
// 2026-06-15). Kept Phaser-free so it can be unit-tested without a scene.
export function shouldStartTitle(input: TitleAdvanceInput, inputReady: boolean): boolean {
  if (input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed) return true;
  return inputReady && (input.a || input.start);
}
