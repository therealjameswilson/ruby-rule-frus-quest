import Phaser from "phaser";
import "./styles/pixel.css";
import { gameConfig } from "./game/config";
import { GAME_HEIGHT, GAME_WIDTH } from "./game/constants";
import { renderGameToText } from "./game/state";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    rubyRuleTouchState?: Record<string, boolean>;
    rubyRuleMobileMetrics?: MobileDebugMetrics;
  }
}

interface MobileDebugMetrics {
  fpsCurrent: number;
  fpsAvg1s: number;
  fpsMin10s: number;
  lastInputLatencyMs: number | null;
  lastPointerDownAt: number | null;
  activePointerCount: number;
  dpr: number;
  canvasCssWidth: number;
  canvasCssHeight: number;
  canvasBackingWidth: number;
  canvasBackingHeight: number;
  computedZoom: number;
  integerZoomTarget: number;
  integerZoom: boolean;
  scaleGuardAdjustments: number;
  pixelProofVisible: boolean;
  firstFrameMs: number | null;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
window.rubyRuleTouchState = {};
window.rubyRuleMobileMetrics = {
  fpsCurrent: 0,
  fpsAvg1s: 0,
  fpsMin10s: 0,
  lastInputLatencyMs: null,
  lastPointerDownAt: null,
  activePointerCount: 0,
  dpr: window.devicePixelRatio || 1,
  canvasCssWidth: 0,
  canvasCssHeight: 0,
  canvasBackingWidth: 0,
  canvasBackingHeight: 0,
  computedZoom: 0,
  integerZoomTarget: 1,
  integerZoom: false,
  scaleGuardAdjustments: 0,
  pixelProofVisible: false,
  firstFrameMs: null
};

const mobileDebugFrames: Array<{ time: number; fps: number }> = [];
const mobileDebugPointers = new Set<number>();
let phaserGame: Phaser.Game | undefined;

function getGameCanvas() {
  return (
    document.querySelector<HTMLCanvasElement>("#game-shell canvas:not(#pixel-proof-overlay)")
    ?? document.querySelector<HTMLCanvasElement>("canvas:not(#pixel-proof-overlay)")
  );
}

function updateMobileCanvasMetrics() {
  const metrics = window.rubyRuleMobileMetrics!;
  const canvas = getGameCanvas();
  metrics.dpr = window.devicePixelRatio || 1;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  metrics.canvasCssWidth = rect.width;
  metrics.canvasCssHeight = rect.height;
  metrics.canvasBackingWidth = canvas.width;
  metrics.canvasBackingHeight = canvas.height;
  metrics.computedZoom = rect.width / GAME_WIDTH;
  metrics.integerZoom = Math.abs(metrics.computedZoom - Math.round(metrics.computedZoom)) < 0.001;
}

function installMobileDebugHud() {
  const metrics = window.rubyRuleMobileMetrics!;
  const hud = document.createElement("pre");
  hud.id = "mobile-debug-hud";
  hud.setAttribute("aria-label", "Mobile performance debug HUD");
  document.body.appendChild(hud);
  const params = new URLSearchParams(window.location.search);
  let visible = params.get("mobileDebug") === "1";
  hud.hidden = !visible;

  const setVisible = (nextVisible: boolean) => {
    visible = nextVisible;
    hud.hidden = !visible;
  };

  window.addEventListener("keydown", (event) => {
    if (event.key !== "F11" || event.repeat) return;
    event.preventDefault();
    setVisible(!visible);
  });

  window.addEventListener("pointerdown", (event) => {
    const pointerTime = performance.now();
    mobileDebugPointers.add(event.pointerId);
    metrics.activePointerCount = mobileDebugPointers.size;
    metrics.lastPointerDownAt = pointerTime;
    requestAnimationFrame((frameTime) => {
      metrics.lastInputLatencyMs = Math.max(0, frameTime - pointerTime);
    });
  }, { capture: true, passive: true });

  const clearPointer = (event: PointerEvent) => {
    mobileDebugPointers.delete(event.pointerId);
    metrics.activePointerCount = mobileDebugPointers.size;
  };
  window.addEventListener("pointerup", clearPointer, { capture: true, passive: true });
  window.addEventListener("pointercancel", clearPointer, { capture: true, passive: true });

  let lastFrame = performance.now();
  const update = (time: number) => {
    const delta = Math.max(0.001, time - lastFrame);
    lastFrame = time;
    if (metrics.firstFrameMs === null) metrics.firstFrameMs = time;
    const fps = 1000 / delta;
    metrics.fpsCurrent = fps;
    mobileDebugFrames.push({ time, fps });
    while (mobileDebugFrames.length && time - mobileDebugFrames[0].time > 10000) {
      mobileDebugFrames.shift();
    }
    const recent1s = mobileDebugFrames.filter((frame) => time - frame.time <= 1000);
    metrics.fpsAvg1s = recent1s.length
      ? recent1s.reduce((sum, frame) => sum + frame.fps, 0) / recent1s.length
      : fps;
    metrics.fpsMin10s = mobileDebugFrames.length
      ? Math.min(...mobileDebugFrames.map((frame) => frame.fps))
      : fps;
    updateMobileCanvasMetrics();
    if (visible) {
      hud.textContent = [
        `FPS now ${metrics.fpsCurrent.toFixed(1)} | 1s ${metrics.fpsAvg1s.toFixed(1)} | 10s min ${metrics.fpsMin10s.toFixed(1)}`,
        `INPUT ${metrics.lastInputLatencyMs === null ? "--" : `${metrics.lastInputLatencyMs.toFixed(1)}ms`} | POINTERS ${metrics.activePointerCount}`,
        `DPR ${metrics.dpr.toFixed(2)} | ZOOM ${metrics.computedZoom.toFixed(3)} ${metrics.integerZoom ? "INT" : "FRAC"} | TARGET ${metrics.integerZoomTarget}x`,
        `CSS ${metrics.canvasCssWidth.toFixed(1)}x${metrics.canvasCssHeight.toFixed(1)} | BUFFER ${metrics.canvasBackingWidth}x${metrics.canvasBackingHeight}`,
        `GUARD ${metrics.scaleGuardAdjustments} | PROOF ${metrics.pixelProofVisible ? "ON" : "OFF"}`,
        `FIRST FRAME ${metrics.firstFrameMs === null ? "--" : `${metrics.firstFrameMs.toFixed(1)}ms`}`
      ].join("\n");
    }
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const TOUCH_KEYS: Record<string, { code: string; key: string; keyCode: number; state?: string }> = {
  up: { code: "ArrowUp", key: "ArrowUp", keyCode: 38, state: "up" },
  down: { code: "ArrowDown", key: "ArrowDown", keyCode: 40, state: "down" },
  left: { code: "ArrowLeft", key: "ArrowLeft", keyCode: 37, state: "left" },
  right: { code: "ArrowRight", key: "ArrowRight", keyCode: 39, state: "right" },
  space: { code: "Space", key: " ", keyCode: 32 },
  e: { code: "KeyE", key: "e", keyCode: 69 },
  m: { code: "KeyM", key: "m", keyCode: 77 },
  r: { code: "KeyR", key: "r", keyCode: 82 },
  n: { code: "KeyN", key: "n", keyCode: 78 }
};

function sendKey(type: "keydown" | "keyup", touchKey: string) {
  const keyInfo = TOUCH_KEYS[touchKey];
  if (!keyInfo) return;
  const event = new KeyboardEvent(type, {
    key: keyInfo.key,
    code: keyInfo.code,
    bubbles: true,
    cancelable: true
  });
  Object.defineProperties(event, {
    keyCode: { get: () => keyInfo.keyCode },
    which: { get: () => keyInfo.keyCode }
  });
  window.dispatchEvent(event);
}

function setupMobileControls() {
  const controls = document.createElement("nav");
  controls.id = "mobile-controls";
  controls.setAttribute("aria-label", "Touch controls");
  controls.innerHTML = `
    <div class="mobile-dpad" aria-label="Move">
      <button type="button" class="touch-button dpad-button dpad-up" data-touch-key="up" aria-label="Move up"></button>
      <button type="button" class="touch-button dpad-button dpad-left" data-touch-key="left" aria-label="Move left"></button>
      <button type="button" class="touch-button dpad-button dpad-down" data-touch-key="down" aria-label="Move down"></button>
      <button type="button" class="touch-button dpad-button dpad-right" data-touch-key="right" aria-label="Move right"></button>
    </div>
    <div class="mobile-actions" aria-label="Actions">
      <button type="button" class="touch-button action-button action-primary" data-touch-key="space" aria-label="Act or advance dialog">A</button>
      <button type="button" class="touch-button action-button" data-touch-key="e" aria-label="Use role ability">E</button>
      <button type="button" class="touch-button utility-button" data-touch-key="m" aria-label="Inventory">M</button>
      <button type="button" class="touch-button utility-button" data-touch-key="r" aria-label="Reliability details">R</button>
      <button type="button" class="touch-button utility-button" data-touch-key="n" aria-label="Sound toggle">N</button>
    </div>
  `;
  document.body.appendChild(controls);

  const activeKeys = new Set<string>();
  const releaseTimers = new Map<string, number>();
  const endPress = (touchKey: string) => {
    const keyInfo = TOUCH_KEYS[touchKey];
    if (!keyInfo) return;
    if (keyInfo.state) window.rubyRuleTouchState![keyInfo.state] = false;
    if (!activeKeys.has(touchKey)) return;
    activeKeys.delete(touchKey);
    sendKey("keyup", touchKey);
  };

  controls.querySelectorAll<HTMLButtonElement>("[data-touch-key]").forEach((button) => {
    const touchKey = button.dataset.touchKey ?? "";
    const keyInfo = TOUCH_KEYS[touchKey];
    if (!keyInfo) return;

    const start = (event: PointerEvent) => {
      event.preventDefault();
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic or interrupted mobile pointer events can lack an active capture target.
      }
      const pendingRelease = releaseTimers.get(touchKey);
      if (pendingRelease) window.clearTimeout(pendingRelease);
      if (keyInfo.state) window.rubyRuleTouchState![keyInfo.state] = true;
      if (!activeKeys.has(touchKey)) {
        activeKeys.add(touchKey);
        sendKey("keydown", touchKey);
      }
    };
    const end = (event: PointerEvent) => {
      event.preventDefault();
      if (keyInfo.state) window.rubyRuleTouchState![keyInfo.state] = false;
      const timer = window.setTimeout(() => {
        releaseTimers.delete(touchKey);
        endPress(touchKey);
      }, keyInfo.state ? 25 : 90);
      releaseTimers.set(touchKey, timer);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("lostpointercapture", () => {
      if (keyInfo.state) window.rubyRuleTouchState![keyInfo.state] = false;
    });
  });

  const clearAll = () => {
    for (const key of Object.keys(window.rubyRuleTouchState!)) window.rubyRuleTouchState![key] = false;
    for (const touchKey of [...activeKeys]) endPress(touchKey);
  };
  window.addEventListener("blur", clearAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAll();
  });
}

function isTouchCapable() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function isIosLike() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 && navigatorWithStandalone.standalone !== undefined);
}

function isStandaloneDisplay() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  return Boolean(navigatorWithStandalone.standalone) || window.matchMedia("(display-mode: standalone)").matches;
}

function localStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing can reject storage writes; the affordance remains dismissible for the session.
  }
}

function updateViewportCssVars() {
  document.documentElement.style.setProperty("--ruby-rule-vh", `${window.innerHeight}px`);
  document.documentElement.style.setProperty("--ruby-rule-vw", `${window.innerWidth}px`);
}

function installCanvasTouchLock() {
  const canvas = getGameCanvas();
  if (!canvas) {
    window.requestAnimationFrame(installCanvasTouchLock);
    return;
  }
  canvas.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
}

function createDismissButton(target: HTMLElement, storageKey: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "X";
  button.setAttribute("aria-label", "Dismiss");
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    localStorageSet(storageKey, "1");
    target.hidden = true;
  });
  target.appendChild(button);
}

function installMobileShellAffordances() {
  if (!isTouchCapable()) return;

  if (isIosLike() && !isStandaloneDisplay() && localStorageGet("rubyRuleDismissedIosInstallHint") !== "1") {
    const hint = document.createElement("aside");
    hint.id = "ios-install-hint";
    hint.textContent = "ADD TO HOME SCREEN FOR BEST MOBILE PLAY";
    createDismissButton(hint, "rubyRuleDismissedIosInstallHint");
    document.body.appendChild(hint);
  }

  const fullscreenCapable = typeof document.documentElement.requestFullscreen === "function";
  if (!isIosLike() && fullscreenCapable && localStorageGet("rubyRuleDismissedFullscreenHint") !== "1") {
    const button = document.createElement("button");
    button.id = "fullscreen-affordance";
    button.type = "button";
    button.textContent = "FULL SCREEN";
    button.setAttribute("aria-label", "Request fullscreen");
    button.addEventListener("pointerdown", async (event) => {
      event.preventDefault();
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen can fail outside a trusted gesture or in restricted browser contexts.
      }
      localStorageSet("rubyRuleDismissedFullscreenHint", "1");
      button.hidden = true;
      scheduleIntegerScaleRefresh();
    });
    document.body.appendChild(button);
  }
}

function calculateIntegerGameShellScale() {
  const shell = document.getElementById("game-shell");
  const controls = document.getElementById("mobile-controls");
  const controlsVisible = !!controls && window.getComputedStyle(controls).display !== "none";
  const isLandscape = window.innerWidth > window.innerHeight;
  const bodyStyle = window.getComputedStyle(document.body);
  const bodyGap = parseFloat(bodyStyle.gap || "0") || 0;
  const paddingX = parseFloat(bodyStyle.paddingLeft || "0") + parseFloat(bodyStyle.paddingRight || "0");
  const paddingY = parseFloat(bodyStyle.paddingTop || "0") + parseFloat(bodyStyle.paddingBottom || "0");
  const reservedWidth = controlsVisible && isLandscape ? controls!.offsetWidth + bodyGap : 0;
  const reservedHeight = controlsVisible && !isLandscape ? controls!.offsetHeight + bodyGap : 0;
  const availableWidth = Math.max(160, window.innerWidth - reservedWidth - paddingX);
  const availableHeight = Math.max(160, window.innerHeight - reservedHeight - paddingY);
  const rawScale = Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT);
  const scale = Math.max(1, Math.floor(rawScale));
  return { shell, controlsVisible, rawScale, scale };
}

function configureIntegerGameShellScale() {
  const { shell, controlsVisible, rawScale, scale } = calculateIntegerGameShellScale();
  if (!shell) return scale;
  shell.style.width = `${Math.max(1, Math.floor(GAME_WIDTH * scale))}px`;
  shell.style.height = `${Math.max(1, Math.floor(GAME_HEIGHT * scale))}px`;
  shell.dataset.scale = String(scale);
  shell.dataset.rawScale = rawScale.toFixed(3);
  shell.dataset.integerScale = "true";
  shell.dataset.mobileControls = controlsVisible ? "true" : "false";
  window.rubyRuleMobileMetrics!.integerZoomTarget = scale;
  return scale;
}

function enforceIntegerCanvasScale() {
  const scale = configureIntegerGameShellScale();
  const canvas = getGameCanvas();
  if (!canvas) return;
  const targetWidth = GAME_WIDTH * scale;
  const targetHeight = GAME_HEIGHT * scale;
  const rect = canvas.getBoundingClientRect();
  const zoomDrift = Math.max(
    Math.abs(rect.width / GAME_WIDTH - scale),
    Math.abs(rect.height / GAME_HEIGHT - scale)
  );
  if (zoomDrift > 0.001) {
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
    window.rubyRuleMobileMetrics!.scaleGuardAdjustments += 1;
  }
  updateMobileCanvasMetrics();
}

function refreshIntegerScale() {
  updateViewportCssVars();
  configureIntegerGameShellScale();
  phaserGame?.scale.refresh();
  window.requestAnimationFrame(enforceIntegerCanvasScale);
}

let resizeRefreshTimer: number | undefined;
function scheduleIntegerScaleRefresh() {
  updateViewportCssVars();
  if (resizeRefreshTimer !== undefined) window.clearTimeout(resizeRefreshTimer);
  resizeRefreshTimer = window.setTimeout(() => {
    resizeRefreshTimer = undefined;
    refreshIntegerScale();
  }, 100);
}

function drawPixelProof(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? "#f8f0d8" : "#0f0f0f";
      context.fillRect(8 + x, 38 + y, 1, 1);
    }
  }

  context.fillStyle = "#68c0c0";
  for (let i = 0; i < 80; i += 1) {
    context.fillRect(54 + i, 38 + i, 1, 1);
  }

  context.fillStyle = "#d6a23a";
  for (let x = 150; x < 206; x += 2) context.fillRect(x, 38, 1, 32);
  for (let y = 38; y < 70; y += 2) context.fillRect(150, y, 56, 1);

  context.fillStyle = "#b82030";
  context.fillRect(7, 37, 200, 1);
  context.fillRect(7, 117, 200, 1);
  context.fillRect(7, 37, 1, 81);
  context.fillRect(206, 37, 1, 81);
}

function installPixelProofOverlay() {
  const shell = document.getElementById("game-shell");
  if (!shell || document.getElementById("pixel-proof-overlay")) return;
  const proof = document.createElement("canvas");
  proof.id = "pixel-proof-overlay";
  proof.width = GAME_WIDTH;
  proof.height = GAME_HEIGHT;
  proof.setAttribute("aria-label", "Pixel proof checkerboard and diagonal overlay");
  drawPixelProof(proof);
  shell.appendChild(proof);

  const params = new URLSearchParams(window.location.search);
  let visible = params.get("pixelProof") === "1";
  const setVisible = (nextVisible: boolean) => {
    visible = nextVisible;
    proof.hidden = !visible;
    window.rubyRuleMobileMetrics!.pixelProofVisible = visible;
  };
  setVisible(visible);

  window.addEventListener("keydown", (event) => {
    if (event.key !== "F8" || event.repeat) return;
    event.preventDefault();
    setVisible(!visible);
  });
}

setupMobileControls();
updateViewportCssVars();
installMobileShellAffordances();
installMobileDebugHud();
configureIntegerGameShellScale();
window.addEventListener("resize", scheduleIntegerScaleRefresh);
window.addEventListener("orientationchange", scheduleIntegerScaleRefresh);
window.visualViewport?.addEventListener("resize", scheduleIntegerScaleRefresh);

const game = new Phaser.Game(gameConfig);
phaserGame = game;
installPixelProofOverlay();
installCanvasTouchLock();
refreshIntegerScale();
game.scale.on("resize", () => window.requestAnimationFrame(enforceIntegerCanvasScale));

window.addEventListener("keydown", (event) => {
  if (event.key !== "F9" || event.repeat) return;
  event.preventDefault();
  if (!game.scene.getScene("SpriteGallery")) return;
  game.scene.start("SpriteGallery");
});
