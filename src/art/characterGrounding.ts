import { CHARACTER_FRAME } from "./characters";

// Ignore barely visible resampling fringes when aligning the visible body.
const POSE_ALPHA_THRESHOLD = 32;

type GroundedPose = { scaleY: number; offsetY: number; offsetX: number };
// Texture identity prevents a removed/reloaded sheet from inheriting stale data.
// Weak keys also let the measurements go when the texture is released.
const poseCache = new WeakMap<object, readonly GroundedPose[]>();

export function cachedCharacterPoses(texture: object, alphaAt: (frame: number, x: number, y: number) => number | null) {
  const cached = poseCache.get(texture);
  if (cached) return cached;
  const measurements = Array.from({ length: 15 }, (_, frame) => {
    const alpha = (x: number, y: number) => alphaAt(frame, x, y);
    return { bottom: 47 - characterGroundOffset(alpha), height: characterPoseHeight(alpha), center: characterPoseCenter(alpha) };
  });
  const poses = measurements.map(pose => Object.freeze({
    ...groundedPoseTransform(pose.bottom, pose.height, measurements[0].height), offsetX: 15.5 - pose.center
  }));
  poseCache.set(texture, Object.freeze(poses));
  return poses;
}

// Sheets leave different amounts of transparent padding below each pose.
// Anchor the lowest opaque boot pixel to the same ground line in every frame.
export function characterGroundOffset(alphaAt: (x: number, y: number) => number | null) {
  for (let y = CHARACTER_FRAME.height - 1; y >= 0; y--) {
    for (let x = 0; x < CHARACTER_FRAME.width; x++) {
      if ((alphaAt(x, y) ?? 0) >= POSE_ALPHA_THRESHOLD) return CHARACTER_FRAME.height - 1 - y;
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
      if ((alphaAt(x, y) ?? 0) >= POSE_ALPHA_THRESHOLD) return bottom - y + 1;
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
    if ((alphaAt(x, y) ?? 0) >= POSE_ALPHA_THRESHOLD) { left = Math.min(left, x); right = Math.max(right, x); }
  }
  return right < 0 ? CHARACTER_FRAME.width / 2 : (left + right) / 2;
}
