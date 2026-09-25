import type Phaser from "phaser";
import { DANNE_BOSS_HD, DANNE_BOSS_FORM_FRAMES, danneBossFormAnimation } from "../art/danneBossPresentation";
import type { DanneBoastPhase } from "../game/danneBoasts";
import { prefersReducedMotion } from "./motionPreferences";

/** Use the actual combat form for introductions, without touching combat actors. */
export function bossBoastPresentation(scene: Phaser.Scene, phase: DanneBoastPhase, touch: boolean) {
  if (phase === "defeated" || !scene.textures.exists(DANNE_BOSS_HD.key)) return null;
  const form = phase === "intro" ? "colossus" : phase;
  const height = touch ? 78 : 136;
  const centerY = 40 + height / 2;
  const frame = scene.add.rectangle(128, centerY, 180, height, 0x101e2b, 0.98)
    .setStrokeStyle(1, 0x927341, 0.9);
  const halo = scene.add.ellipse(128, touch ? 86 : 122, 78, touch ? 48 : 78, 0x91313c, 0.22);
  const floor = scene.add.ellipse(128, touch ? 114 : 168, 54, 5, 0x050a12, 0.8);
  const label = scene.add.text(128, 46, phase === "intro" ? "DANN-E" : `DANN-E / ${form.toUpperCase()}`, {
    fontFamily: "Arial", fontSize: "8px", color: "#e7c98a"
  }).setOrigin(0.5);
  const actor = scene.add.sprite(128, touch ? 84 : 114, DANNE_BOSS_HD.key, DANNE_BOSS_FORM_FRAMES[form][0])
    .setOrigin(0.5).setScale((touch ? 66 : 108) / DANNE_BOSS_HD.frameH);
  const animation = danneBossFormAnimation(form);
  if (!prefersReducedMotion() && scene.anims.exists(animation)) actor.play(animation);
  const stage = scene.add.container(0, 0, [frame, halo, floor, label, actor])
    .setDepth(1605).setScrollFactor(0);
  stage.name = "boss-boast-stage";
  return stage;
}
