import type { Position } from "./types";
import { readAnnotationPacket } from "./annotationPacket";

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

export function pushAnnotationCart(progress: Readonly<Record<string, number>>, player: Position) {
  const cart = readAnnotationCart(progress);
  if (cart.parked) return { ...cart, moved: false, message: "Cart parked. Take its context note." };
  const dx = cart.position.x - player.x, dy = cart.position.y - player.y;
  const horizontal = Math.abs(dx) > Math.abs(dy);
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
