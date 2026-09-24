import type Phaser from "phaser";
import { RENDER_DENSITY, configureLogicalCameras } from "./renderDensity";
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
  physicalPixelsX: number;
  physicalPixelsY: number;
  canvasDeviceLeft: number;
  canvasDeviceTop: number;
  originAligned: boolean;
  viewportScale: number;
}

export interface PixelViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  dpr: number;
}

export function normalizeDevicePixelRatio(dpr: number) {
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
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
  const safeDpr = normalizeDevicePixelRatio(dpr);
  const deviceW = viewW * safeDpr;
  const deviceH = viewH * safeDpr;
  return Math.max(1, Math.floor(Math.min(deviceW / GAME_WIDTH, deviceH / GAME_HEIGHT)));
}

export function computeIntegerCanvasLayout(viewport: PixelViewport) {
  const dpr = normalizeDevicePixelRatio(viewport.dpr);
  const deviceZoom = computeDeviceIntegerZoom(viewport.width, viewport.height, dpr);
  const cssZoom = deviceZoom / dpr;
  const width = GAME_WIDTH * cssZoom;
  const height = GAME_HEIGHT * cssZoom;
  const center = (start: number, available: number, size: number) => {
    const minimum = Math.ceil(start * dpr);
    const maximum = Math.max(minimum, Math.floor((start + available - size) * dpr + 1e-8));
    return Math.max(minimum, Math.min(maximum, Math.round((start + (available - size) / 2) * dpr))) / dpr;
  };
  return { dpr, deviceZoom, cssZoom, width, height,
    x: center(viewport.x, viewport.width, width), y: center(viewport.y, viewport.height, height) };
}

/** Fit the high-density surface to the safe viewport without cropping the world. */
export function computePresentationLayout(viewport: PixelViewport) {
  const dpr = normalizeDevicePixelRatio(viewport.dpr);
  const availableWidth = Math.max(1, viewport.width);
  const availableHeight = Math.max(1, viewport.height);
  const cssZoom = Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT);
  const width = GAME_WIDTH * cssZoom;
  const height = GAME_HEIGHT * cssZoom;
  return { dpr, cssZoom, deviceZoom: cssZoom * dpr, width, height,
    x: viewport.x + (availableWidth - width) / 2,
    y: viewport.y + (availableHeight - height) / 2 };
}

function getViewport(): PixelViewport {
  const bodyStyle = window.getComputedStyle(document.body);
  const paddingX = parseFloat(bodyStyle.paddingLeft || "0") + parseFloat(bodyStyle.paddingRight || "0");
  const paddingY = parseFloat(bodyStyle.paddingTop || "0") + parseFloat(bodyStyle.paddingBottom || "0");
  const viewport = window.visualViewport;
  return {
    x: (viewport?.offsetLeft ?? 0) + parseFloat(bodyStyle.paddingLeft || "0"),
    y: (viewport?.offsetTop ?? 0) + parseFloat(bodyStyle.paddingTop || "0"),
    width: Math.max(1, (viewport?.width ?? window.innerWidth) - paddingX),
    height: Math.max(1, (viewport?.height ?? window.innerHeight) - paddingY),
    dpr: normalizeDevicePixelRatio(window.devicePixelRatio)
  };
}

export function configureIntegerGameShellScale() {
  const layout = computePresentationLayout(getViewport());
  const shell = document.getElementById("game-shell");
  if (shell) {
    shell.style.width = `${layout.width}px`;
    shell.style.height = `${layout.height}px`;
    shell.style.left = "0";
    shell.style.top = "0";
    // Position in the compositor: layout-only offsets can round to CSS pixels
    // before a fractional DPR is applied, softening even integer-sized texels.
    shell.style.transform = `translate3d(${layout.x}px, ${layout.y}px, 0)`;
    shell.dataset.scale = String(layout.cssZoom);
    shell.dataset.deviceScale = String(layout.deviceZoom);
  }
  return layout;
}

export function measurePixelScale(
  rect: { x: number; y: number; width: number; height: number },
  rawDpr: number,
  target: number,
  viewportScale = 1
) {
  const dpr = normalizeDevicePixelRatio(rawDpr);
  const effectiveDpr = dpr * viewportScale;
  const physicalPixelsX = rect.width / GAME_WIDTH * effectiveDpr;
  const physicalPixelsY = rect.height / GAME_HEIGHT * effectiveDpr;
  const canvasDeviceLeft = rect.x * effectiveDpr;
  const canvasDeviceTop = rect.y * effectiveDpr;
  // CSS layout can quantize positions to 1/64 CSS px. Never tolerate half a device pixel.
  const positionTolerance = Math.min(0.1, effectiveDpr / 64 + 1e-6);
  const aligned = (position: number) => Math.abs(position - Math.round(position)) <= positionTolerance;
  const originAligned = aligned(canvasDeviceLeft) && aligned(canvasDeviceTop);
  return { computedZoom: rect.width / GAME_WIDTH, dpr, physicalPixelsX, physicalPixelsY,
    canvasDeviceLeft, canvasDeviceTop, originAligned, viewportScale,
    integerZoom: target >= 1 && isIntegerScale(target) && originAligned
      && Math.abs(physicalPixelsX - target) < 0.001 && Math.abs(physicalPixelsY - target) < 0.001 };
}

export function applyIntegerZoom(game: Phaser.Game): IntegerZoomMetrics {
  const { cssZoom, deviceZoom, dpr } = configureIntegerGameShellScale();
  const canvas = game.canvas;

  game.scale.getParentBounds();
  const displayZoom = cssZoom / RENDER_DENSITY;
  if (Math.abs(game.scale.zoom - displayZoom) > 0.001) game.scale.setZoom(displayZoom);
  // Keep the painted surface native-sized; fractional CSS widths may be rounded
  // before rasterization. Scale the compositor layer instead of its layout box.
  canvas.style.width = `${GAME_WIDTH}px`;
  canvas.style.height = `${GAME_HEIGHT}px`;
  canvas.style.transformOrigin = "0 0";
  canvas.style.transform = `scale(${cssZoom})`;
  canvas.style.margin = "0";
  canvas.style.imageRendering = "auto";
  // Render at higher density while cameras retain the 256x240 world.
  configureLogicalCameras(game);
  // Refresh pointer mapping after CSS positioning, without resizing the logical world.
  game.scale.updateBounds();
  const rect = canvas.getBoundingClientRect();
  game.scale.displayScale.set(GAME_WIDTH * RENDER_DENSITY / rect.width, GAME_HEIGHT * RENDER_DENSITY / rect.height);

  return {
    ...measurePixelScale(rect, dpr, deviceZoom, window.visualViewport?.scale ?? 1),
    integerZoomTarget: deviceZoom,
    canvasCssWidth: rect.width,
    canvasCssHeight: rect.height,
    canvasBackingWidth: canvas.width,
    canvasBackingHeight: canvas.height
  };
}
