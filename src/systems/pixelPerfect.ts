import type Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";

export interface IntegerZoomMetrics {
  computedZoom: number;
  integerZoomTarget: number;
  integerZoom: boolean;
  dpr: number;
  canvasCssWidth: number;
  canvasCssHeight: number;
  canvasBackingWidth: number;
  canvasBackingHeight: number;
}

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

export function computeIntegerZoom(viewW: number, viewH: number) {
  return Math.max(1, Math.floor(Math.min(viewW / GAME_WIDTH, viewH / GAME_HEIGHT)));
}

// Integer zoom measured in *device* pixels rather than CSS pixels. On high-DPR
// phones (iPhone dpr=3) the CSS viewport is small, so a CSS-integer zoom locks to
// 1x and the game renders tiny. Snapping to an integer number of physical device
// pixels lets the canvas fill far more of the screen while still mapping every
// game pixel to a whole number of device pixels, so SNES art stays crisp. On
// dpr=1 desktops this is identical to computeIntegerZoom.
export function computeDeviceIntegerZoom(viewW: number, viewH: number, dpr: number) {
  const safeDpr = Math.max(1, dpr);
  const deviceW = viewW * safeDpr;
  const deviceH = viewH * safeDpr;
  return Math.max(1, Math.floor(Math.min(deviceW / GAME_WIDTH, deviceH / GAME_HEIGHT)));
}

function getViewportSize() {
  const bodyStyle = window.getComputedStyle(document.body);
  const paddingX = parseFloat(bodyStyle.paddingLeft || "0") + parseFloat(bodyStyle.paddingRight || "0");
  const paddingY = parseFloat(bodyStyle.paddingTop || "0") + parseFloat(bodyStyle.paddingBottom || "0");
  const viewport = window.visualViewport;
  return {
    width: Math.max(160, (viewport?.width ?? window.innerWidth) - paddingX),
    height: Math.max(160, (viewport?.height ?? window.innerHeight) - paddingY)
  };
}

function roundActiveCameras(game: Phaser.Game) {
  for (const scene of game.scene.getScenes(true)) {
    for (const camera of scene.cameras.cameras) {
      camera.roundPixels = true;
    }
  }
}

export function applyIntegerZoom(game: Phaser.Game): IntegerZoomMetrics {
  const { width, height } = getViewportSize();
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const deviceZoom = computeDeviceIntegerZoom(width, height, dpr);
  // CSS zoom may be fractional (e.g. 4/3 on an iPhone), but the backing store is
  // an exact integer multiple of the base resolution, so each game pixel still
  // maps to `deviceZoom` physical pixels and stays crisp.
  const cssZoom = deviceZoom / dpr;
  const canvasCssWidth = GAME_WIDTH * cssZoom;
  const canvasCssHeight = GAME_HEIGHT * cssZoom;
  const canvas = game.canvas;

  if (Math.abs(game.scale.zoom - cssZoom) > 0.001) game.scale.setZoom(cssZoom);
  canvas.style.width = `${canvasCssWidth}px`;
  canvas.style.height = `${canvasCssHeight}px`;
  // Phaser owns the logical drawing buffer and camera viewports. Resizing either
  // after WebGL initialization clears the buffer and moves the 256x240 camera
  // into physical-pixel space. CSS nearest-neighbor scaling still maps each
  // logical pixel to exactly `deviceZoom` physical pixels.
  roundActiveCameras(game);

  return {
    computedZoom: cssZoom,
    integerZoomTarget: deviceZoom,
    integerZoom: isIntegerScale(cssZoom * dpr),
    dpr,
    canvasCssWidth,
    canvasCssHeight,
    canvasBackingWidth: canvas.width,
    canvasBackingHeight: canvas.height
  };
}
