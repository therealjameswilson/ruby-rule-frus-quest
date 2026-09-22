import { CHARACTER_FRAME } from "./characters";

// Sheets leave different amounts of transparent padding below each pose.
// Anchor the lowest opaque boot pixel to the same ground line in every frame.
export function characterGroundOffset(alphaAt: (x: number, y: number) => number | null) {
  for (let y = CHARACTER_FRAME.height - 1; y >= 0; y--) {
    for (let x = 0; x < CHARACTER_FRAME.width; x++) {
      if ((alphaAt(x, y) ?? 0) > 0) return CHARACTER_FRAME.height - 1 - y;
    }
  }
  return 0;
}
