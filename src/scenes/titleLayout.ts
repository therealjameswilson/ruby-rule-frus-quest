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
  pressStartY: 203,
  controlsY: 214
} as const;

/** Outer top/bottom edges of a gold-framed plate (frame adds 8px of border). */
export function framedPlateBounds(plate: { y: number; frameHeight: number }) {
  const half = (plate.frameHeight + 8) / 2;
  return { top: plate.y - half, bottom: plate.y + half };
}
