import Phaser from "phaser";
import { ART_PACK_EXTRAS, EFFECT_FRAMES, stampIndex } from "../game/artPack";

export function playPackStampOverlay(
  scene: Phaser.Scene,
  x: number,
  y: number,
  stampName: "CONFIDENTIAL" | "TOP SECRET" | "DECLASSIFIED" | "APPROVED" = "APPROVED"
) {
  const textureKey = ART_PACK_EXTRAS.stamps_text.textureKey;
  const frame = stampIndex(stampName);
  if (!scene.textures.exists(textureKey) || frame < 0) return null;
  const stamp = scene.add.image(Math.round(x), Math.round(y), textureKey, frame).setDepth(980).setScale(0.08).setAlpha(0);
  scene.tweens.add({
    targets: stamp,
    alpha: 1,
    scale: 0.13,
    angle: -8,
    duration: 110,
    ease: "Stepped",
    onComplete: () => {
      scene.tweens.add({
        targets: stamp,
        alpha: 0,
        y: stamp.y - 5,
        delay: 420,
        duration: 260,
        ease: "Stepped",
        onComplete: () => stamp.destroy()
      });
    }
  });
  return stamp;
}

export function playPackEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  effectName: keyof typeof EFFECT_FRAMES = "sparkle"
) {
  const textureKey = ART_PACK_EXTRAS.effects_stamps.textureKey;
  if (!scene.textures.exists(textureKey)) return null;
  const frame = EFFECT_FRAMES[effectName];
  const effect = scene.add.image(Math.round(x), Math.round(y), textureKey, frame).setDepth(970).setScale(0.1);
  scene.tweens.add({
    targets: effect,
    alpha: 0,
    scale: 0.16,
    duration: 280,
    ease: "Stepped",
    onComplete: () => effect.destroy()
  });
  return effect;
}
