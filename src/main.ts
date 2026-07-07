import Phaser from "phaser";
import "./styles/pixel.css";
import { gameConfig } from "./game/config";
import { GAME_HEIGHT, GAME_WIDTH } from "./game/constants";
import { gameState, renderGameToText, setLatestMessage } from "./game/state";
import {
  bindDomPointerDown,
  getGamepadDebugState,
  initializeInput,
  swallowNextInputFrame,
  updateInputCallbacks
} from "./input/InputState";
import { retroAudio, type AudioDebugState } from "./systems/audio";
import { getLanguage } from "./systems/i18n";
import { applyIntegerZoom, computeDeviceIntegerZoom } from "./systems/pixelPerfect";
import { getSaveDebugState, installAutosaveLifecycle, saveGameNow } from "./systems/save";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    rubyRuleFullStateText?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    rubyRuleMobileMetrics?: MobileDebugMetrics;
    rubyRuleResetPerformanceMetrics?: () => void;
    rubyRuleAudioDebug?: () => AudioDebugState;
    rubyRuleSaveDebug?: () => ReturnType<typeof getSaveDebugState>;
    rubyRuleGamepadDebug?: () => ReturnType<typeof getGamepadDebugState>;
    game?: Phaser.Game;
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

function renderConciseGameToText() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("text") === "full" || params.get("debugState") === "full") return renderGameToText();
  return JSON.stringify(
    {
      coordinateSystem: "origin top-left; x increases right; y increases down; logical canvas 256x240",
      scene: gameState.currentScene,
      mode: gameState.mode,
      objective: gameState.objective,
      language: getLanguage(),
      latestMessage: gameState.latestMessage,
      player: gameState.player,
      playerFacing: gameState.playerFacing,
      playerAnimationState: gameState.playerAnimationState,
      nearestInteractable: gameState.nearestInteractable,
      heldItem: gameState.heldItem,
      reliability: gameState.reliability,
      documentPoints: gameState.documentPoints,
      volumeWorkflowState: gameState.volumeWorkflowState,
      questCounters: gameState.questCounters,
      processStamps: gameState.processStamps,
      inventory: gameState.inventory,
      visibleEntities: gameState.visibleEntities.slice(0, 12),
      visibleThreats: gameState.visibleThreats.slice(0, 8),
      dialog: gameState.activeDialog,
      choice: gameState.currentChoice
        ? {
            title: gameState.currentChoice.title,
            options: gameState.currentChoice.options.map((option) => option.label)
          }
        : null,
      fullStateHint: "Add ?text=full for the complete debug state."
    },
    null,
    2
  );
}

window.render_game_to_text = renderConciseGameToText;
window.rubyRuleFullStateText = renderGameToText;
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
  metrics.dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  metrics.canvasCssWidth = rect.width;
  metrics.canvasCssHeight = rect.height;
  metrics.canvasBackingWidth = canvas.width;
  metrics.canvasBackingHeight = canvas.height;
  metrics.computedZoom = rect.width / GAME_WIDTH;
  // Crispness depends on the backing store being an integer multiple of the base
  // resolution (device-pixel integer zoom), not on the CSS zoom being integer.
  const backingPerGamePixel = canvas.width / GAME_WIDTH;
  metrics.integerZoom = Math.abs(backingPerGamePixel - Math.round(backingPerGamePixel)) < 0.001;
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

// Keyboard input is captured on `window` keydown. In a cloud browser or embedded
// iframe the page can load without keyboard focus, so the first WASD/arrow press
// goes nowhere and the player concludes movement is broken (live audit,
// 2026-06-15). Make the canvas focusable and pull focus to it on load and on
// every pointer interaction so the first key press always reaches the game
// without an extra click.
function installKeyboardFocusGuard() {
  const focusCanvas = () => {
    const canvas = getGameCanvas();
    if (canvas) {
      if (!canvas.hasAttribute("tabindex")) canvas.setAttribute("tabindex", "0");
      canvas.style.outline = "none";
      try {
        canvas.focus({ preventScroll: true });
      } catch {
        canvas.focus();
      }
    }
    try {
      window.focus();
    } catch {
      // Some embedders block programmatic window focus; the canvas focus above still helps.
    }
  };

  const waitForCanvasThenFocus = () => {
    if (getGameCanvas()) {
      focusCanvas();
      return;
    }
    window.requestAnimationFrame(waitForCanvasThenFocus);
  };
  waitForCanvasThenFocus();

  // Re-grab focus on any pointer/touch so a tap that lands on the canvas also
  // arms the keyboard, and refocus when the tab/window regains focus.
  window.addEventListener("pointerdown", focusCanvas, { capture: true, passive: true });
  window.addEventListener("touchstart", focusCanvas, { capture: true, passive: true });
  window.addEventListener("focus", focusCanvas);
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
    overlay.focus({ preventScroll: true });
    setLatestMessage("Paused for mobile resume.");
  };

  const resumeFromOverlay = async (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    overlay.hidden = true;
    if (pausedSceneKey && game.scene.isPaused(pausedSceneKey)) game.scene.resume(pausedSceneKey);
    pausedSceneKey = null;
    swallowNextInputFrame();
    await retroAudio.unlock();
    refreshIntegerScale();
  };

  bindDomPointerDown(overlay, (event) => {
    void resumeFromOverlay(event);
  });

  overlay.addEventListener("click", (event) => {
    if (overlay.hidden) return;
    void resumeFromOverlay(event);
  }, { capture: true });

  window.addEventListener("keydown", (event) => {
    if (overlay.hidden) return;
    void resumeFromOverlay(event);
  }, { capture: true });

  window.addEventListener("pointerdown", (event) => {
    if (overlay.hidden) return;
    void resumeFromOverlay(event);
  }, { capture: true });

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
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const rawScale = Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT);
  const deviceZoom = computeDeviceIntegerZoom(availableWidth, availableHeight, dpr);
  // CSS scale can be fractional on high-DPR screens; the device-pixel zoom stays integer.
  const scale = deviceZoom / dpr;
  return { shell, rawScale, scale, deviceZoom };
}

function configureIntegerGameShellScale() {
  const { shell, rawScale, scale, deviceZoom } = calculateIntegerGameShellScale();
  if (!shell) return scale;
  shell.style.width = `${Math.max(1, GAME_WIDTH * scale)}px`;
  shell.style.height = `${Math.max(1, GAME_HEIGHT * scale)}px`;
  shell.dataset.scale = String(scale);
  shell.dataset.rawScale = rawScale.toFixed(3);
  shell.dataset.integerScale = "true";
  window.rubyRuleMobileMetrics!.integerZoomTarget = deviceZoom;
  return scale;
}

function enforceIntegerCanvasScale() {
  configureIntegerGameShellScale();
  if (!phaserGame) return;
  const beforeAdjustments = window.rubyRuleMobileMetrics!.scaleGuardAdjustments;
  const result = applyIntegerZoom(phaserGame);
  const metrics = window.rubyRuleMobileMetrics!;
  metrics.computedZoom = result.computedZoom;
  metrics.integerZoomTarget = result.integerZoomTarget;
  metrics.integerZoom = result.integerZoom;
  metrics.dpr = result.dpr;
  metrics.canvasCssWidth = result.canvasCssWidth;
  metrics.canvasCssHeight = result.canvasCssHeight;
  metrics.canvasBackingWidth = result.canvasBackingWidth;
  metrics.canvasBackingHeight = result.canvasBackingHeight;
  const canvas = getGameCanvas();
  const rect = canvas?.getBoundingClientRect();
  if (
    rect
    && (
      Math.abs(rect.width - result.canvasCssWidth) > 0.001
      || Math.abs(rect.height - result.canvasCssHeight) > 0.001
    )
  ) {
    metrics.scaleGuardAdjustments = beforeAdjustments + 1;
  }
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

  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? "#f8f0d8" : "#0f0f0f";
      context.fillRect(x, y, 1, 1);
    }
  }

  context.fillStyle = "#68c0c0";
  context.fillRect(0, 0, 16, 1);
  context.fillRect(0, 0, 1, 16);
  context.fillStyle = "#b82030";
  context.fillRect(0, 0, 1, 1);
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

let bootLoaderPoll: number | undefined;

function hasActivePlayableScene() {
  if (!phaserGame) return false;
  return phaserGame.scene.getScenes(true).some((scene) => scene.scene.key !== "BootScene");
}

function hideBootLoader() {
  const loader = document.getElementById("boot-loader");
  if (!loader || loader.hidden) return;
  if (!hasActivePlayableScene()) return;
  if (bootLoaderPoll !== undefined) {
    window.clearInterval(bootLoaderPoll);
    bootLoaderPoll = undefined;
  }
  loader.classList.add("is-hiding");
  window.setTimeout(() => {
    loader.hidden = true;
  }, 360);
}

const game = new Phaser.Game(gameConfig);
window.game = game;
phaserGame = game;

game.events.once(Phaser.Core.Events.READY, () => {
  const dismissOnNextScene = () => {
    game.scene.getScenes(true).forEach((scene) => {
      if (scene.scene.key !== "BootScene") hideBootLoader();
    });
  };
  game.scene.scenes.forEach((scene) => {
    scene.events.once(Phaser.Scenes.Events.CREATE, dismissOnNextScene);
  });
  // Direct ?scene= deep links can create the target scene before READY fires,
  // which means the CREATE listener above may miss the event and leave the DOM
  // loader covering the playable canvas. Hide it after the first ready paint as
  // a safety net while keeping the 8s failure fallback below.
  window.requestAnimationFrame(() => window.requestAnimationFrame(hideBootLoader));
  window.setTimeout(hideBootLoader, 1200);
});
bootLoaderPoll = window.setInterval(hideBootLoader, 500);
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
installKeyboardFocusGuard();
refreshIntegerScale();
game.scale.on("resize", () => window.requestAnimationFrame(enforceIntegerCanvasScale));
