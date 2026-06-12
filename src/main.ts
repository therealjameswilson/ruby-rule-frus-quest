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
  integerZoom: boolean;
  firstFrameMs: number | null;
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
  integerZoom: false,
  firstFrameMs: null
};

const mobileDebugFrames: Array<{ time: number; fps: number }> = [];
const mobileDebugPointers = new Set<number>();

function updateMobileCanvasMetrics() {
  const metrics = window.rubyRuleMobileMetrics!;
  const canvas = document.querySelector("canvas");
  metrics.dpr = window.devicePixelRatio || 1;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  metrics.canvasCssWidth = Math.round(rect.width);
  metrics.canvasCssHeight = Math.round(rect.height);
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
        `DPR ${metrics.dpr.toFixed(2)} | ZOOM ${metrics.computedZoom.toFixed(3)} ${metrics.integerZoom ? "INT" : "FRAC"}`,
        `CSS ${metrics.canvasCssWidth}x${metrics.canvasCssHeight} | BUFFER ${metrics.canvasBackingWidth}x${metrics.canvasBackingHeight}`,
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

function configureIntegerGameShellScale() {
  const shell = document.getElementById("game-shell");
  if (!shell) return;
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
  const scale = rawScale >= 2 ? Math.floor(rawScale) : rawScale;
  shell.style.width = `${Math.max(1, Math.floor(GAME_WIDTH * scale))}px`;
  shell.style.height = `${Math.max(1, Math.floor(GAME_HEIGHT * scale))}px`;
  shell.dataset.scale = scale.toFixed(3);
  shell.dataset.integerScale = Number.isInteger(scale) ? "true" : "false";
  shell.dataset.mobileControls = controlsVisible ? "true" : "false";
}

setupMobileControls();
installMobileDebugHud();
configureIntegerGameShellScale();
window.addEventListener("resize", configureIntegerGameShellScale);
window.addEventListener("orientationchange", configureIntegerGameShellScale);

const game = new Phaser.Game(gameConfig);

window.addEventListener("keydown", (event) => {
  if (event.key !== "F9" || event.repeat) return;
  event.preventDefault();
  if (!game.scene.getScene("SpriteGallery")) return;
  game.scene.start("SpriteGallery");
});
