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

// Align both the crown and the planted boot across differently padded poses.
// This changes rendering only; feet collision and movement remain unchanged.
export function characterPoseHeight(alphaAt: (x: number, y: number) => number | null) {
  const bottom = CHARACTER_FRAME.height - 1 - characterGroundOffset(alphaAt);
  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x < CHARACTER_FRAME.width; x++) {
      if ((alphaAt(x, y) ?? 0) > 0) return bottom - y + 1;
    }
  }
  return CHARACTER_FRAME.height;
}

export function groundedPoseTransform(bottom: number, height: number, referenceHeight: number) {
  const scaleY = referenceHeight / height;
  return { scaleY, offsetY: 4 + (43 - bottom) * scaleY };
}

export function characterPoseCenter(alphaAt: (x: number, y: number) => number | null) {
  let left: number = CHARACTER_FRAME.width, right = -1;
  for (let y = 0; y < CHARACTER_FRAME.height; y++) for (let x = 0; x < CHARACTER_FRAME.width; x++) {
    if ((alphaAt(x, y) ?? 0) > 0) { left = Math.min(left, x); right = Math.max(right, x); }
  }
  return right < 0 ? CHARACTER_FRAME.width / 2 : (left + right) / 2;
}
