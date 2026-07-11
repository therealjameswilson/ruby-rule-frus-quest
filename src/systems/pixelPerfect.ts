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

type PixelPerfectWebGlRenderer = Phaser.Renderer.WebGL.WebGLRenderer & {
  drawingBufferHeight: number;
  defaultScissor: number[];
};

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

function isWebGlRenderer(
  renderer: Phaser.Renderer.Canvas.CanvasRenderer | Phaser.Renderer.WebGL.WebGLRenderer
): renderer is Phaser.Renderer.WebGL.WebGLRenderer {
  return "gl" in renderer && typeof renderer.setProjectionMatrix === "function";
}

function resizeWebGlViewport(game: Phaser.Game, width: number, height: number) {
  const renderer = game.renderer;
  if (!isWebGlRenderer(renderer)) return;

  const webGlRenderer = renderer as PixelPerfectWebGlRenderer;
  const gl = renderer.gl;
  webGlRenderer.width = width;
  webGlRenderer.height = height;
  webGlRenderer.setProjectionMatrix(GAME_WIDTH, GAME_HEIGHT);
  gl.viewport(0, 0, width, height);
  webGlRenderer.drawingBufferHeight = gl.drawingBufferHeight;
  gl.scissor(0, Math.max(0, gl.drawingBufferHeight - height), width, height);
  webGlRenderer.defaultScissor[2] = width;
  webGlRenderer.defaultScissor[3] = height;
}

function resizeActiveCameras(game: Phaser.Game, width: number, height: number) {
  for (const scene of game.scene.getScenes(true)) {
    for (const camera of scene.cameras.cameras) {
      if (camera.width !== width || camera.height !== height) {
        camera.setViewport(camera.x, camera.y, width, height);
      }
      if (!isIntegerScale(camera.zoom) || camera.zoom !== 1) camera.setZoom(1);
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
  const canvasBackingWidth = GAME_WIDTH * deviceZoom;
  const canvasBackingHeight = GAME_HEIGHT * deviceZoom;
  const canvas = game.canvas;

  if (Math.abs(game.scale.zoom - cssZoom) > 0.001) game.scale.setZoom(cssZoom);
  canvas.style.width = `${canvasCssWidth}px`;
  canvas.style.height = `${canvasCssHeight}px`;
  if (canvas.width !== canvasBackingWidth) canvas.width = canvasBackingWidth;
  if (canvas.height !== canvasBackingHeight) canvas.height = canvasBackingHeight;
  resizeWebGlViewport(game, canvasBackingWidth, canvasBackingHeight);
  resizeActiveCameras(game, canvasBackingWidth, canvasBackingHeight);

  return {
    computedZoom: cssZoom,
    integerZoomTarget: deviceZoom,
    integerZoom: true,
    dpr,
    canvasCssWidth,
    canvasCssHeight,
    canvasBackingWidth,
    canvasBackingHeight
  };
}
