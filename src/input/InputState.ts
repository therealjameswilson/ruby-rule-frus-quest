import Phaser from "phaser";

type AxisValue = -1 | 0 | 1;
export type CardinalDirection = "left" | "right" | "up" | "down";
export type TouchControlKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "space"
  | "b"
  | "start"
  | "select"
  | "e"
  | "m"
  | "r"
  | "n";

export interface InputState {
  dir: { x: AxisValue; y: AxisValue };
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  leftJustPressed: boolean;
  rightJustPressed: boolean;
  upJustPressed: boolean;
  downJustPressed: boolean;
  navLeftJustPressed: boolean;
  navRightJustPressed: boolean;
  a: boolean;
  aJustPressed: boolean;
  aJustReleased: boolean;
  b: boolean;
  bJustPressed: boolean;
  bJustReleased: boolean;
  start: boolean;
  startJustPressed: boolean;
  select: boolean;
  selectJustPressed: boolean;
  ability: boolean;
  abilityJustPressed: boolean;
  menu: boolean;
  menuJustPressed: boolean;
  reliability: boolean;
  reliabilityJustPressed: boolean;
  sound: boolean;
  soundJustPressed: boolean;
  fullscreen: boolean;
  fullscreenJustPressed: boolean;
  pause: boolean;
  pauseJustPressed: boolean;
  choiceAJustPressed: boolean;
  choiceBJustPressed: boolean;
  choiceCJustPressed: boolean;
  choiceDJustPressed: boolean;
  backspaceJustPressed: boolean;
  pointerPrimaryJustPressed: boolean;
  typedText: string;
}

interface InputCallbacks {
  toggleMobileDebug?: () => void;
  togglePixelProof?: () => void;
  toggleTouchOverlay?: () => void;
  openSpriteGallery?: () => void;
  fastForwardDialog?: () => void;
  handlePauseTouch?: (point: { x: number; y: number }) => boolean;
}

type InputGestureKind = "keyboard" | "pointer";
type InputGestureCallback = (kind: InputGestureKind) => void;

const emptyState: InputState = {
  dir: { x: 0, y: 0 },
  left: false,
  right: false,
  up: false,
  down: false,
  leftJustPressed: false,
  rightJustPressed: false,
  upJustPressed: false,
  downJustPressed: false,
  navLeftJustPressed: false,
  navRightJustPressed: false,
  a: false,
  aJustPressed: false,
  aJustReleased: false,
  b: false,
  bJustPressed: false,
  bJustReleased: false,
  start: false,
  startJustPressed: false,
  select: false,
  selectJustPressed: false,
  ability: false,
  abilityJustPressed: false,
  menu: false,
  menuJustPressed: false,
  reliability: false,
  reliabilityJustPressed: false,
  sound: false,
  soundJustPressed: false,
  fullscreen: false,
  fullscreenJustPressed: false,
  pause: false,
  pauseJustPressed: false,
  choiceAJustPressed: false,
  choiceBJustPressed: false,
  choiceCJustPressed: false,
  choiceDJustPressed: false,
  backspaceJustPressed: false,
  pointerPrimaryJustPressed: false,
  typedText: ""
};

let currentState: InputState = { ...emptyState, dir: { ...emptyState.dir } };
let previousState: InputState = { ...emptyState, dir: { ...emptyState.dir } };
const keyboardDown = new Set<string>();
const touchDown = new Set<TouchControlKey>();
const pendingTypedCharacters: string[] = [];
const pendingPointerStarts: Array<{ x: number; y: number }> = [];
const activePointerIds = new Set<number>();
const inputGestureCallbacks = new Set<InputGestureCallback>();
let lastDirection: CardinalDirection = "down";
let initialized = false;
let callbacks: InputCallbacks = {};

const directionKeyMap: Record<string, CardinalDirection | undefined> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down"
};

function cloneState(state: InputState): InputState {
  return { ...state, dir: { ...state.dir } };
}

function isKeyboardDown(...codes: string[]) {
  return codes.some((code) => keyboardDown.has(code));
}

function isTouchDown(...keys: TouchControlKey[]) {
  return keys.some((key) => touchDown.has(key));
}

function isGamepadButtonDown(indexes: number[]) {
  if (!("getGamepads" in navigator)) return false;
  for (const pad of navigator.getGamepads()) {
    if (!pad) continue;
    if (indexes.some((index) => pad.buttons[index]?.pressed)) return true;
  }
  return false;
}

function gamepadDirectionDown(direction: CardinalDirection) {
  if (!("getGamepads" in navigator)) return false;
  for (const pad of navigator.getGamepads()) {
    if (!pad) continue;
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    const left = pad.buttons[14]?.pressed || x < -0.45;
    const right = pad.buttons[15]?.pressed || x > 0.45;
    const up = pad.buttons[12]?.pressed || y < -0.45;
    const down = pad.buttons[13]?.pressed || y > 0.45;
    if (direction === "left" && left) return true;
    if (direction === "right" && right) return true;
    if (direction === "up" && up) return true;
    if (direction === "down" && down) return true;
  }
  return false;
}

function computeAxis(left: boolean, right: boolean, up: boolean, down: boolean) {
  if (lastDirection === "left" && left) return { x: -1 as AxisValue, y: 0 as AxisValue };
  if (lastDirection === "right" && right) return { x: 1 as AxisValue, y: 0 as AxisValue };
  if (lastDirection === "up" && up) return { x: 0 as AxisValue, y: -1 as AxisValue };
  if (lastDirection === "down" && down) return { x: 0 as AxisValue, y: 1 as AxisValue };
  if (left) return { x: -1 as AxisValue, y: 0 as AxisValue };
  if (right) return { x: 1 as AxisValue, y: 0 as AxisValue };
  if (up) return { x: 0 as AxisValue, y: -1 as AxisValue };
  if (down) return { x: 0 as AxisValue, y: 1 as AxisValue };
  return { x: 0 as AxisValue, y: 0 as AxisValue };
}

function justPressed(current: boolean, previous: boolean) {
  return current && !previous;
}

function justReleased(current: boolean, previous: boolean) {
  return !current && previous;
}

function preventGameKeyDefault(event: KeyboardEvent) {
  if (
    directionKeyMap[event.code]
    || [
      "Space",
      "Enter",
      "Escape",
      "ShiftLeft",
      "ShiftRight",
      "Tab",
      "KeyE",
      "KeyM",
      "KeyN",
      "KeyR",
      "KeyF"
    ].includes(event.code)
  ) {
    event.preventDefault();
  }
}

function notifyInputGesture(kind: InputGestureKind) {
  for (const callback of [...inputGestureCallbacks]) callback(kind);
}

export function initializeInput(nextCallbacks: InputCallbacks = {}) {
  callbacks = { ...callbacks, ...nextCallbacks };
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("keydown", (event) => {
    if (!event.repeat) notifyInputGesture("keyboard");
    if (event.key === "F11" && !event.repeat) {
      event.preventDefault();
      callbacks.toggleMobileDebug?.();
      return;
    }
    if (event.key === "F8" && !event.repeat) {
      event.preventDefault();
      callbacks.togglePixelProof?.();
      return;
    }
    if (event.key === "F10" && !event.repeat) {
      event.preventDefault();
      callbacks.toggleTouchOverlay?.();
      return;
    }
    if (event.key === "F9" && !event.repeat) {
      event.preventDefault();
      callbacks.openSpriteGallery?.();
      return;
    }
    preventGameKeyDefault(event);
    if (!event.repeat && directionKeyMap[event.code]) lastDirection = directionKeyMap[event.code]!;
    keyboardDown.add(event.code);
    if (!event.repeat && /^[a-zA-Z]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      pendingTypedCharacters.push(event.key);
    }
  });

  window.addEventListener("keyup", (event) => {
    preventGameKeyDefault(event);
    keyboardDown.delete(event.code);
  });

  window.addEventListener("pointerdown", (event) => {
    notifyInputGesture("pointer");
    pendingPointerStarts.push({ x: event.clientX, y: event.clientY });
    const metrics = window.rubyRuleMobileMetrics;
    if (!metrics) return;
    const pointerTime = performance.now();
    activePointerIds.add(event.pointerId);
    metrics.activePointerCount = activePointerIds.size;
    metrics.lastPointerDownAt = pointerTime;
    requestAnimationFrame((frameTime) => {
      metrics.lastInputLatencyMs = Math.max(0, frameTime - pointerTime);
    });
  }, { capture: true, passive: true });

  const clearPointer = (event: PointerEvent) => {
    const metrics = window.rubyRuleMobileMetrics;
    activePointerIds.delete(event.pointerId);
    if (metrics) metrics.activePointerCount = activePointerIds.size;
  };
  window.addEventListener("pointerup", clearPointer, { capture: true, passive: true });
  window.addEventListener("pointercancel", clearPointer, { capture: true, passive: true });

  window.addEventListener("blur", resetInput);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetInput();
  });
}

export function updateInputCallbacks(nextCallbacks: InputCallbacks) {
  callbacks = { ...callbacks, ...nextCallbacks };
}

export function triggerDialogFastForward() {
  callbacks.fastForwardDialog?.();
}

export function handlePauseTouch(point: { x: number; y: number }) {
  return callbacks.handlePauseTouch?.(point) ?? false;
}

export function addInputGestureListener(callback: InputGestureCallback) {
  inputGestureCallbacks.add(callback);
  return () => inputGestureCallbacks.delete(callback);
}

export function isTouchInputCapable() {
  return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
}

export function tickInput() {
  previousState = cloneState(currentState);

  const left = isKeyboardDown("ArrowLeft", "KeyA") || isTouchDown("left") || gamepadDirectionDown("left");
  const right = isKeyboardDown("ArrowRight", "KeyD") || isTouchDown("right") || gamepadDirectionDown("right");
  const up = isKeyboardDown("ArrowUp", "KeyW") || isTouchDown("up") || gamepadDirectionDown("up");
  const down = isKeyboardDown("ArrowDown", "KeyS") || isTouchDown("down") || gamepadDirectionDown("down");
  const dir = computeAxis(left, right, up, down);
  const navLeft = isKeyboardDown("ArrowLeft") || isTouchDown("left") || gamepadDirectionDown("left");
  const navRight = isKeyboardDown("ArrowRight") || isTouchDown("right") || gamepadDirectionDown("right");

  const a = isKeyboardDown("Space", "Enter") || isTouchDown("space") || isGamepadButtonDown([0]);
  const b = isKeyboardDown("ShiftLeft", "ShiftRight") || isTouchDown("b") || isGamepadButtonDown([1]);
  const start = isKeyboardDown("Enter") || isTouchDown("start") || isGamepadButtonDown([9]);
  const select = isKeyboardDown("Tab") || isTouchDown("select") || isGamepadButtonDown([8]);
  const ability = isKeyboardDown("KeyE") || isTouchDown("e") || isGamepadButtonDown([2]);
  const menu = isKeyboardDown("KeyM") || isTouchDown("m", "start");
  const reliability = isKeyboardDown("KeyR") || isTouchDown("r");
  const sound = isKeyboardDown("KeyN") || isTouchDown("n");
  const fullscreen = isKeyboardDown("KeyF");
  const pause = isKeyboardDown("Escape");
  const choiceA = isKeyboardDown("KeyA");
  const choiceB = isKeyboardDown("KeyB");
  const choiceC = isKeyboardDown("KeyC");
  const choiceD = isKeyboardDown("KeyD");
  const backspace = isKeyboardDown("Backspace");

  currentState = {
    dir,
    left,
    right,
    up,
    down,
    leftJustPressed: justPressed(left, previousState.left),
    rightJustPressed: justPressed(right, previousState.right),
    upJustPressed: justPressed(up, previousState.up),
    downJustPressed: justPressed(down, previousState.down),
    navLeftJustPressed: justPressed(navLeft, previousNavLeftDown),
    navRightJustPressed: justPressed(navRight, previousNavRightDown),
    a,
    aJustPressed: justPressed(a, previousState.a),
    aJustReleased: justReleased(a, previousState.a),
    b,
    bJustPressed: justPressed(b, previousState.b),
    bJustReleased: justReleased(b, previousState.b),
    start,
    startJustPressed: justPressed(start, previousState.start),
    select,
    selectJustPressed: justPressed(select, previousState.select),
    ability,
    abilityJustPressed: justPressed(ability, previousState.ability),
    menu,
    menuJustPressed: justPressed(menu, previousState.menu),
    reliability,
    reliabilityJustPressed: justPressed(reliability, previousState.reliability),
    sound,
    soundJustPressed: justPressed(sound, previousState.sound),
    fullscreen,
    fullscreenJustPressed: justPressed(fullscreen, previousState.fullscreen),
    pause,
    pauseJustPressed: justPressed(pause, previousState.pause),
    choiceAJustPressed: justPressed(choiceA, isKeyboardDownFromPrevious("choiceA")),
    choiceBJustPressed: justPressed(choiceB, isKeyboardDownFromPrevious("choiceB")),
    choiceCJustPressed: justPressed(choiceC, isKeyboardDownFromPrevious("choiceC")),
    choiceDJustPressed: justPressed(choiceD, isKeyboardDownFromPrevious("choiceD")),
    backspaceJustPressed: justPressed(backspace, previousBackspaceDown),
    pointerPrimaryJustPressed: pendingPointerStarts.length > 0,
    typedText: pendingTypedCharacters.join("")
  };
  previousChoiceDown.choiceA = choiceA;
  previousChoiceDown.choiceB = choiceB;
  previousChoiceDown.choiceC = choiceC;
  previousChoiceDown.choiceD = choiceD;
  previousBackspaceDown = backspace;
  previousNavLeftDown = navLeft;
  previousNavRightDown = navRight;
  pendingTypedCharacters.length = 0;
  pendingPointerStarts.length = 0;
}

const previousChoiceDown = {
  choiceA: false,
  choiceB: false,
  choiceC: false,
  choiceD: false
};
let previousBackspaceDown = false;
let previousNavLeftDown = false;
let previousNavRightDown = false;

function isKeyboardDownFromPrevious(key: keyof typeof previousChoiceDown) {
  return previousChoiceDown[key];
}

export function getInput(): Readonly<InputState> {
  return currentState;
}

export function setTouchControl(key: TouchControlKey, pressed: boolean) {
  if (pressed) {
    touchDown.add(key);
    if (key === "left" || key === "right" || key === "up" || key === "down") lastDirection = key;
  } else {
    touchDown.delete(key);
  }
}

export function bindPointerDown<T extends Phaser.GameObjects.GameObject>(
  object: T,
  callback: () => void
) {
  object.setInteractive({ useHandCursor: true });
  object.on("pointerdown", callback);
  return object;
}

export function bindPointerPress<T extends Phaser.GameObjects.GameObject>(
  object: T,
  handlers: {
    down?: (pointer: Phaser.Input.Pointer) => void;
    up?: (pointer: Phaser.Input.Pointer) => void;
    cancel?: (pointer: Phaser.Input.Pointer) => void;
  }
) {
  object.setInteractive({ useHandCursor: true });
  if (handlers.down) object.on("pointerdown", handlers.down);
  if (handlers.up) object.on("pointerup", handlers.up);
  if (handlers.cancel) {
    object.on("pointerout", handlers.cancel);
    object.on("pointerupoutside", handlers.cancel);
  }
  return object;
}

export function bindDomPointerDown(element: HTMLElement, callback: (event: PointerEvent) => void) {
  element.addEventListener("pointerdown", callback);
}

export function resetInput() {
  keyboardDown.clear();
  touchDown.clear();
  pendingTypedCharacters.length = 0;
  pendingPointerStarts.length = 0;
  activePointerIds.clear();
  currentState = { ...emptyState, dir: { ...emptyState.dir } };
  previousState = { ...emptyState, dir: { ...emptyState.dir } };
  previousChoiceDown.choiceA = false;
  previousChoiceDown.choiceB = false;
  previousChoiceDown.choiceC = false;
  previousChoiceDown.choiceD = false;
  previousBackspaceDown = false;
  previousNavLeftDown = false;
  previousNavRightDown = false;
  if (window.rubyRuleMobileMetrics) window.rubyRuleMobileMetrics.activePointerCount = 0;
}
