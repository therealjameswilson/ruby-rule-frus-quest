import Phaser from "phaser";
import "./styles/pixel.css";
import { gameConfig } from "./game/config";
import { GAME_HEIGHT, GAME_WIDTH } from "./game/constants";
import { gameState, renderGameToText, setLatestMessage } from "./game/state";
import {
  bindDomPointerDown,
  getGamepadDebugState,
  initializeInput,
  updateInputCallbacks
} from "./input/InputState";
import { retroAudio, type AudioDebugState } from "./systems/audio";
import { getSaveDebugState, installAutosaveLifecycle, saveGameNow } from "./systems/save";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    rubyRuleMobileMetrics?: MobileDebugMetrics;
    rubyRuleResetPerformanceMetrics?: () => void;
    rubyRuleAudioDebug?: () => AudioDebugState;
    rubyRuleSaveDebug?: () => ReturnType<typeof getSaveDebugState>;
    rubyRuleGamepadDebug?: () => ReturnType<typeof getGamepadDebugState>;
  }
}

interface MobileDebugMetrics {
  fpsCurrent: number;
  fpsAvg1s: number;
  fpsMin10s: number;
  frameMsCurrent: number;
  frameMsP99: number;
  frameMsMax10s: number;
  frameSampleCount: number;
  frameHistogram: FrameHistogram;
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

interface FrameHistogram {
  under16: number;
  under20: number;
  under33: number;
  over33: number;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

window.render_game_to_text = renderGameToText;
window.rubyRuleAudioDebug = () => retroAudio.getDebugState();
window.rubyRuleSaveDebug = () => getSaveDebugState();
window.rubyRuleGamepadDebug = () => getGamepadDebugState();
window.advanceTime = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
window.rubyRuleMobileMetrics = {
  fpsCurrent: 0,
  fpsAvg1s: 0,
  fpsMin10s: 0,
  frameMsCurrent: 0,
  frameMsP99: 0,
  frameMsMax10s: 0,
  frameSampleCount: 0,
  frameHistogram: { under16: 0, under20: 0, under33: 0, over33: 0 },
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

const mobileDebugFrames: Array<{ time: number; fps: number; ms: number }> = [];
let phaserGame: Phaser.Game | undefined;

function resetMobilePerformanceMetrics() {
  const metrics = window.rubyRuleMobileMetrics;
  if (!metrics) return;
  mobileDebugFrames.length = 0;
  metrics.fpsCurrent = 0;
  metrics.fpsAvg1s = 0;
  metrics.fpsMin10s = 0;
  metrics.frameMsCurrent = 0;
  metrics.frameMsP99 = 0;
  metrics.frameMsMax10s = 0;
  metrics.frameSampleCount = 0;
  metrics.frameHistogram.under16 = 0;
  metrics.frameHistogram.under20 = 0;
  metrics.frameHistogram.under33 = 0;
  metrics.frameHistogram.over33 = 0;
}

window.rubyRuleResetPerformanceMetrics = resetMobilePerformanceMetrics;

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

  const performanceHud = document.createElement("pre");
  performanceHud.id = "performance-overlay";
  performanceHud.setAttribute("aria-label", "Frame performance overlay");
  document.body.appendChild(performanceHud);

  const params = new URLSearchParams(window.location.search);
  let visible = params.get("mobileDebug") === "1";
  let performanceVisible = params.get("fps") === "1" || params.get("perf") === "1";
  hud.hidden = !visible;
  performanceHud.hidden = !performanceVisible;

  const setVisible = (nextVisible: boolean) => {
    visible = nextVisible;
    hud.hidden = !visible;
  };

  const setPerformanceVisible = (nextVisible: boolean) => {
    performanceVisible = nextVisible;
    performanceHud.hidden = !performanceVisible;
  };

  const updateFrameMetrics = (time: number, fps: number, ms: number) => {
    metrics.frameMsCurrent = ms;
    metrics.fpsCurrent = fps;
    mobileDebugFrames.push({ time, fps, ms });
    while (mobileDebugFrames.length && time - mobileDebugFrames[0].time > 10000) {
      mobileDebugFrames.shift();
    }

    let fps1sTotal = 0;
    let fps1sCount = 0;
    let fpsMin10s = Number.POSITIVE_INFINITY;
    let maxMs10s = 0;
    const histogram = metrics.frameHistogram;
    histogram.under16 = 0;
    histogram.under20 = 0;
    histogram.under33 = 0;
    histogram.over33 = 0;

    for (const frame of mobileDebugFrames) {
      if (time - frame.time <= 1000) {
        fps1sTotal += frame.fps;
        fps1sCount += 1;
      }
      if (frame.fps < fpsMin10s) fpsMin10s = frame.fps;
      if (frame.ms > maxMs10s) maxMs10s = frame.ms;
      if (frame.ms <= 16.7) histogram.under16 += 1;
      else if (frame.ms <= 20) histogram.under20 += 1;
      else if (frame.ms <= 33.4) histogram.under33 += 1;
      else histogram.over33 += 1;
    }

    const sampleCount = mobileDebugFrames.length;
    const p99TailCount = Math.max(1, Math.ceil(sampleCount * 0.01));
    metrics.frameSampleCount = sampleCount;
    metrics.fpsAvg1s = fps1sCount ? fps1sTotal / fps1sCount : fps;
    metrics.fpsMin10s = Number.isFinite(fpsMin10s) ? fpsMin10s : fps;
    metrics.frameMsMax10s = maxMs10s || ms;
    if (histogram.over33 >= p99TailCount) metrics.frameMsP99 = metrics.frameMsMax10s;
    else if (histogram.over33 + histogram.under33 >= p99TailCount) metrics.frameMsP99 = 33.4;
    else if (histogram.over33 + histogram.under33 + histogram.under20 >= p99TailCount) metrics.frameMsP99 = 20;
    else metrics.frameMsP99 = 16.7;
  };

  let lastFrame = performance.now();
  const update = (time: number) => {
    const delta = Math.max(0.001, time - lastFrame);
    lastFrame = time;
    if (metrics.firstFrameMs === null) metrics.firstFrameMs = time;
    const fps = 1000 / delta;
    updateFrameMetrics(time, fps, delta);
    updateMobileCanvasMetrics();
    if (visible) {
      const histogram = metrics.frameHistogram;
      const gamepad = window.rubyRuleGamepadDebug?.();
      hud.textContent =
        `FPS now ${metrics.fpsCurrent.toFixed(1)} | 1s ${metrics.fpsAvg1s.toFixed(1)} | 10s min ${metrics.fpsMin10s.toFixed(1)}\n`
        + `FRAME ${metrics.frameMsCurrent.toFixed(2)}ms | p99 ${metrics.frameMsP99.toFixed(1)}ms | max ${metrics.frameMsMax10s.toFixed(1)}ms | samples ${metrics.frameSampleCount}\n`
        + `HIST <=16.7 ${histogram.under16} | <=20 ${histogram.under20} | <=33.4 ${histogram.under33} | >33.4 ${histogram.over33}\n`
        + `INPUT ${metrics.lastInputLatencyMs === null ? "--" : `${metrics.lastInputLatencyMs.toFixed(1)}ms`} | POINTERS ${metrics.activePointerCount}\n`
        + `GAMEPAD ${gamepad?.connected ? gamepad.id ?? "connected" : "none"} | DIR ${gamepad?.direction ?? "--"} | BTN ${gamepad?.pressedButtons.join(",") || "--"}\n`
        + `DPR ${metrics.dpr.toFixed(2)} | ZOOM ${metrics.computedZoom.toFixed(3)} ${metrics.integerZoom ? "INT" : "FRAC"} | TARGET ${metrics.integerZoomTarget}x\n`
        + `CSS ${metrics.canvasCssWidth.toFixed(1)}x${metrics.canvasCssHeight.toFixed(1)} | BUFFER ${metrics.canvasBackingWidth}x${metrics.canvasBackingHeight}\n`
        + `GUARD ${metrics.scaleGuardAdjustments} | PROOF ${metrics.pixelProofVisible ? "ON" : "OFF"}\n`
        + `FIRST FRAME ${metrics.firstFrameMs === null ? "--" : `${metrics.firstFrameMs.toFixed(1)}ms`}`;
    }
    if (performanceVisible) {
      performanceHud.textContent =
        `FPS ${Math.round(metrics.fpsAvg1s)}\n`
        + `p99 ${metrics.frameMsP99.toFixed(0)}ms\n`
        + `min ${Math.round(metrics.fpsMin10s)}`;
    }
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
  return {
    toggleMobileDebug: () => setVisible(!visible),
    togglePerformanceOverlay: () => setPerformanceVisible(!performanceVisible)
  };
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
  bindDomPointerDown(button, (event) => {
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
    bindDomPointerDown(button, async (event) => {
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

function installTapToResumeOverlay(game: Phaser.Game) {
  const overlay = document.createElement("button");
  overlay.id = "tap-resume-overlay";
  overlay.type = "button";
  overlay.textContent = "TAP TO RESUME";
  overlay.setAttribute("aria-label", "Tap to resume Ruby Rule");
  overlay.hidden = true;
  document.body.appendChild(overlay);

  let pausedSceneKey: string | null = null;

  const pauseForBackground = (reason: "visibility" | "pagehide") => {
    saveGameNow(reason);
    const sceneKey = gameState.currentScene;
    if (sceneKey && sceneKey !== "BootScene" && sceneKey !== "TapToStartScene") {
      pausedSceneKey = sceneKey;
      if (game.scene.isActive(sceneKey)) game.scene.pause(sceneKey);
    }
  };

  const showResumeOverlay = () => {
    if (!pausedSceneKey) return;
    overlay.hidden = false;
    setLatestMessage("Paused for mobile resume.");
  };

  bindDomPointerDown(overlay, async (event) => {
    event.preventDefault();
    overlay.hidden = true;
    if (pausedSceneKey && game.scene.isPaused(pausedSceneKey)) game.scene.resume(pausedSceneKey);
    pausedSceneKey = null;
    await retroAudio.unlock();
    refreshIntegerScale();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseForBackground("visibility");
      return;
    }
    showResumeOverlay();
  });
  window.addEventListener("pagehide", () => pauseForBackground("pagehide"));
  window.addEventListener("pageshow", () => {
    if (!document.hidden) showResumeOverlay();
  });
}

function calculateIntegerGameShellScale() {
  const shell = document.getElementById("game-shell");
  const bodyStyle = window.getComputedStyle(document.body);
  const paddingX = parseFloat(bodyStyle.paddingLeft || "0") + parseFloat(bodyStyle.paddingRight || "0");
  const paddingY = parseFloat(bodyStyle.paddingTop || "0") + parseFloat(bodyStyle.paddingBottom || "0");
  const availableWidth = Math.max(160, window.innerWidth - paddingX);
  const availableHeight = Math.max(160, window.innerHeight - paddingY);
  const rawScale = Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT);
  const scale = Math.max(1, Math.floor(rawScale));
  return { shell, rawScale, scale };
}

function configureIntegerGameShellScale() {
  const { shell, rawScale, scale } = calculateIntegerGameShellScale();
  if (!shell) return scale;
  shell.style.width = `${Math.max(1, Math.floor(GAME_WIDTH * scale))}px`;
  shell.style.height = `${Math.max(1, Math.floor(GAME_HEIGHT * scale))}px`;
  shell.dataset.scale = String(scale);
  shell.dataset.rawScale = rawScale.toFixed(3);
  shell.dataset.integerScale = "true";
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
  if (!shell || document.getElementById("pixel-proof-overlay")) return undefined;
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
  return () => setVisible(!visible);
}

updateViewportCssVars();
installMobileShellAffordances();
const performanceToggles = installMobileDebugHud();
initializeInput(performanceToggles);
configureIntegerGameShellScale();
window.addEventListener("resize", scheduleIntegerScaleRefresh);
window.addEventListener("orientationchange", scheduleIntegerScaleRefresh);
window.visualViewport?.addEventListener("resize", scheduleIntegerScaleRefresh);

const game = new Phaser.Game(gameConfig);
phaserGame = game;
installAutosaveLifecycle();
installTapToResumeOverlay(game);
const togglePixelProof = installPixelProofOverlay();
updateInputCallbacks({
  togglePixelProof,
  openSpriteGallery: () => {
    if (game.scene.getScene("SpriteGallery")) game.scene.start("SpriteGallery");
  }
});
installCanvasTouchLock();
refreshIntegerScale();
game.scale.on("resize", () => window.requestAnimationFrame(enforceIntegerCanvasScale));
