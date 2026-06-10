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
  }
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
window.rubyRuleTouchState = {};

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
configureIntegerGameShellScale();
window.addEventListener("resize", configureIntegerGameShellScale);
window.addEventListener("orientationchange", configureIntegerGameShellScale);

new Phaser.Game(gameConfig);
