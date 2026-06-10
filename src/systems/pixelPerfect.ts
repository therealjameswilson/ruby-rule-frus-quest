import type Phaser from "phaser";

export function snapPixel(value: number) {
  return Math.round(value);
}

export function setPixelPosition(
  object: Phaser.GameObjects.Components.Transform,
  x: number,
  y: number
) {
  object.setPosition(snapPixel(x), snapPixel(y));
}

export function isIntegerScale(scale: number) {
  return Math.abs(scale - Math.round(scale)) < 0.001;
}
