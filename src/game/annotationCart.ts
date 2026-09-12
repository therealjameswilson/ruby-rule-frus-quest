import type { Position } from "./types";
import { readAnnotationPacket } from "./annotationPacket";
import { workstationFeetBlocked } from "./workstationGeometry";

export const CART_PUSH_HOLD_MS = 250;

export function annotationCartContactPush(progress: Readonly<Record<string, number>>, player: Position, direction: Position) {
  if (Math.abs(direction.x) + Math.abs(direction.y) !== 1) return false;
  const cart = readAnnotationCart(progress);
  const result = pushAnnotationCart(progress, player, direction);
  if (!result.moved || Math.sign(result.position.x - cart.position.x) !== direction.x
    || Math.sign(result.position.y - cart.position.y) !== direction.y) return false;
  const bounds = [annotationCartBounds(cart.position)];
  // Player exposes pixel-snapped feet; allow the one-pixel rounding edge,
  // without treating a position inside the cart as a valid approach.
  return !workstationFeetBlocked({ x: player.x - direction.x, y: player.y - direction.y }, bounds)
    && workstationFeetBlocked({ x: player.x + direction.x * 3, y: player.y + direction.y * 3 }, bounds);
}

export class AnnotationCartPushHold {
  private elapsed = 0;
  private x = 0;
  private y = 0;

  get pressurePixels() { return Math.min(12, Math.ceil(this.elapsed / CART_PUSH_HOLD_MS * 12)); }

  reset() { this.elapsed = 0; this.x = 0; this.y = 0; }

  update(deltaMs: number, contact: boolean, direction: Position) {
    if (!contact) { this.reset(); return false; }
    if (direction.x !== this.x || direction.y !== this.y) this.elapsed = 0;
    this.x = direction.x;
    this.y = direction.y;
    this.elapsed += Math.max(0, Math.min(50, deltaMs));
    if (this.elapsed < CART_PUSH_HOLD_MS) return false;
    this.reset();
    return true;
  }
}

export const ANNOTATION_CART = {
  start: { x: 128, y: 160 },
  bay: { x: 144, y: 112 },
  step: 16,
  radius: 30
} as const;

export function readAnnotationCart(progress: Readonly<Record<string, number>>) {
  const legacyContext = readAnnotationPacket(progress).gathered.some(note => note.id === "contextual_annotation");
  const x = progress.annotationCartX === 144 ? 144 : 128;
  const savedY = progress.annotationCartY;
  const y = [112, 128, 144, 160].includes(savedY) ? savedY : ANNOTATION_CART.start.y;
  const parked = progress.annotationCartParked === 1 || legacyContext
    || (x === ANNOTATION_CART.bay.x && y === ANNOTATION_CART.bay.y);
  return { position: parked ? { ...ANNOTATION_CART.bay } : { x, y }, parked };
}

export function annotationCartBounds(position: Position) {
  return { x: position.x - 9, y: position.y - 6, width: 18, height: 12 };
}

export function pushAnnotationCart(progress: Readonly<Record<string, number>>, player: Position, direction?: Position) {
  const cart = readAnnotationCart(progress);
  if (cart.parked) return { ...cart, moved: false, message: "Cart parked. Take its context note." };
  const dx = cart.position.x - player.x, dy = cart.position.y - player.y;
  const horizontal = direction ? direction.x !== 0 : Math.abs(dx) > Math.abs(dy);
  if (direction && (Math.abs(direction.x) + Math.abs(direction.y) !== 1
    || (horizontal ? Math.sign(dx) !== direction.x : Math.sign(dy) !== direction.y))) {
    return { ...cart, moved: false, message: "Push toward the cart." };
  }
  if (Math.hypot(dx, dy) > ANNOTATION_CART.radius || (horizontal ? Math.abs(dx) < 16 : Math.abs(dy) < 8)) {
    return { ...cart, moved: false, message: "Stand beside the cart to push it." };
  }
  // Push away from the player's feet, so the same direct action works on touch
  // without requiring a precise facing change at the collision edge.
  const position = { x: cart.position.x + (horizontal ? Math.sign(dx) * ANNOTATION_CART.step : 0),
    y: cart.position.y + (horizontal ? 0 : Math.sign(dy) * ANNOTATION_CART.step) };
  if (position.x < 128 || position.x > 144 || position.y < 112 || position.y > 160) {
    return { ...cart, moved: false, message: "Keep the cart on the marked return lane." };
  }
  const parked = position.x === ANNOTATION_CART.bay.x && position.y === ANNOTATION_CART.bay.y;
  return { position, parked, moved: true,
    message: parked ? "Cart parked. Its context note is ready to take." : "Return bay: above and right." };
}
