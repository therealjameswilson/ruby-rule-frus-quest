import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { gameState } from "../game/state";
import { handlePauseTouch, setTouchControl, triggerDialogFastForward, type CardinalDirection, type TouchControlKey } from "./InputState";

interface ButtonSpec {
  key: TouchControlKey;
  label: string;
  x: number;
  y: number;
  hitWidth: number;
  hitHeight: number;
  visibleWidth: number;
  visibleHeight: number;
  kind: "circle" | "rect";
  hiddenUntilPressed?: boolean;
}

type ButtonState = ButtonSpec & {
  pointerId: number | null;
  text: Phaser.GameObjects.Text;
};

type TouchDebugWindow = Window & {
  rubyRuleTouchControls?: {
    enabled: boolean;
    forceVisible: boolean;
    dpadPointerId: number | null;
    dpadDirection: CardinalDirection | null;
    gamepadSuppressed: boolean;
    overlayAlpha: number;
    pressedButtons: TouchControlKey[];
    lastEvent: string;
  };
};

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function isTouchCapable() {
  return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
}

function clampToCanvas(point: Phaser.Math.Vector2) {
  point.x = Phaser.Math.Clamp(point.x, 0, GAME_WIDTH);
  point.y = Phaser.Math.Clamp(point.y, 0, GAME_HEIGHT);
  return point;
}

export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly buttons: ButtonState[];
  private enabled = false;
  private forceVisible = false;
  private dpadPointerId: number | null = null;
  private dpadOrigin = new Phaser.Math.Vector2();
  private dpadCurrent = new Phaser.Math.Vector2();
  private dpadDirection: CardinalDirection | null = null;
  private dialogPointerId: number | null = null;
  private dialogFastForwardTimer?: Phaser.Time.TimerEvent;
  private dialogReleaseTimer?: Phaser.Time.TimerEvent;
  private lastEvent = "idle";
  private gamepadSuppressed = false;
  private overlayAlpha = 1;
  private overlayFade?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(20000).setScrollFactor(0);
    this.buttons = this.createButtons();
    this.installPointerEvents();
    this.setEnabled(isTouchCapable());
  }

  setForceVisible(forceVisible: boolean) {
    this.forceVisible = forceVisible;
    this.setEnabled(!this.gamepadSuppressed && (isTouchCapable() || this.forceVisible));
  }

  get isForceVisible() {
    return this.forceVisible;
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) {
      this.redraw();
      return;
    }
    this.enabled = enabled;
    if (!enabled) this.releaseAll();
    this.graphics.setVisible(enabled);
    for (const button of this.buttons) button.text.setVisible(enabled && !button.hiddenUntilPressed);
    this.redraw();
  }

  setGamepadSuppressed(suppressed: boolean) {
    if (this.gamepadSuppressed === suppressed) return;
    this.gamepadSuppressed = suppressed;
    this.overlayFade?.stop();
    this.overlayFade = undefined;
    if (suppressed) {
      this.releaseAll();
      this.fadeOverlay(0, () => this.setEnabled(false));
    } else {
      this.overlayAlpha = 0;
      this.setEnabled(isTouchCapable() || this.forceVisible);
      this.fadeOverlay(1);
    }
    this.updateDebug();
  }

  refreshForScene(activeSceneKey: string | null) {
    const hiddenScene =
      activeSceneKey === "TapToStartScene"
      || activeSceneKey === "RenderDebugScene"
      || activeSceneKey === "DanneGallery"
      || activeSceneKey === "SpriteGallery";
    const shouldShow = !hiddenScene && !this.gamepadSuppressed && (isTouchCapable() || this.forceVisible);
    if (shouldShow && !this.overlayFade && this.overlayAlpha <= 0) this.overlayAlpha = 1;
    this.setEnabled(shouldShow);
  }

  destroy() {
    this.releaseAll();
    this.overlayFade?.stop();
    this.removePointerEvents();
    this.graphics.destroy();
    for (const button of this.buttons) button.text.destroy();
  }

  private createButtons() {
    const specs: ButtonSpec[] = [
      {
        key: "space",
        label: "A",
        x: GAME_WIDTH - 31,
        y: GAME_HEIGHT - 35,
        hitWidth: 58,
        hitHeight: 58,
        visibleWidth: 34,
        visibleHeight: 34,
        kind: "circle"
      },
      {
        key: "b",
        label: "B",
        x: GAME_WIDTH - 82,
        y: GAME_HEIGHT - 24,
        hitWidth: 48,
        hitHeight: 48,
        visibleWidth: 28,
        visibleHeight: 28,
        kind: "circle"
      },
      {
        key: "start",
        label: "START",
        x: GAME_WIDTH - 32,
        y: 16,
        hitWidth: 54,
        hitHeight: 28,
        visibleWidth: 42,
        visibleHeight: 14,
        kind: "rect"
      },
      {
        key: "select",
        label: "SEL",
        x: GAME_WIDTH / 2,
        y: 17,
        hitWidth: 50,
        hitHeight: 26,
        visibleWidth: 34,
        visibleHeight: 12,
        kind: "rect",
        hiddenUntilPressed: true
      }
    ];
    return specs.map((spec) => ({
      ...spec,
      pointerId: null,
      text: this.scene.add
        .text(spec.x, spec.y - 4, spec.label, {
          fontFamily: "monospace",
          fontSize: spec.key === "space" ? "18px" : spec.key === "b" ? "11px" : "5px",
          color: PALETTE.creamPaper,
          align: "center"
        })
        .setOrigin(0.5)
        .setDepth(20001)
        .setScrollFactor(0)
    }));
  }

  private installPointerEvents() {
    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    this.scene.input.on("pointercancel", this.handlePointerUp, this);
    const canvas = this.scene.game.canvas;
    canvas.addEventListener("pointerdown", this.handleDomPointerDown, { passive: false });
    window.addEventListener("pointermove", this.handleDomPointerMove, { passive: false });
    window.addEventListener("pointerup", this.handleDomPointerUp, { passive: false });
    window.addEventListener("pointercancel", this.handleDomPointerUp, { passive: false });
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  private removePointerEvents() {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    this.scene.input.off("pointercancel", this.handlePointerUp, this);
    const canvas = this.scene.game.canvas;
    canvas.removeEventListener("pointerdown", this.handleDomPointerDown);
    window.removeEventListener("pointermove", this.handleDomPointerMove);
    window.removeEventListener("pointerup", this.handleDomPointerUp);
    window.removeEventListener("pointercancel", this.handleDomPointerUp);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    this.pressAt(pointer.id, this.pointerPoint(pointer), "phaser-down");
  }

  private readonly handleDomPointerDown = (event: PointerEvent) => {
    if (!this.enabled) return;
    const consumed = this.pressAt(event.pointerId, this.domPointerPoint(event), "dom-down");
    if (!consumed) return;
    event.preventDefault();
    try {
      this.scene.game.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic test events and older mobile browsers do not support capture.
    }
  };

  private readonly handleDomPointerMove = (event: PointerEvent) => {
    if (!this.enabled || event.pointerId !== this.dpadPointerId) return;
    event.preventDefault();
    this.moveDpad(event.pointerId, this.domPointerPoint(event), "dom-move");
  };

  private readonly handleDomPointerUp = (event: PointerEvent) => {
    const wasControlPointer = this.isControlPointer(event.pointerId);
    if (wasControlPointer) event.preventDefault();
    this.releasePointer(event.pointerId, "dom-up");
  };

  private pressAt(pointerId: number, point: Phaser.Math.Vector2, eventName: string) {
    this.lastEvent = eventName;
    const button = this.findButtonAt(point.x, point.y);
    if (button) {
      this.pressButton(button, pointerId);
      this.redraw();
      return true;
    }
    if (gameState.mode === "dialog") {
      if (this.isDialogPoint(point) && this.dialogPointerId === null) {
        this.pressDialog(pointerId);
        this.redraw();
        return true;
      }
      this.updateDebug();
      return false;
    }
    if (gameState.mode === "pause") {
      if (handlePauseTouch({ x: point.x, y: point.y })) {
        this.redraw();
        return true;
      }
      this.updateDebug();
      return false;
    }
    if (point.x <= GAME_WIDTH / 3 && this.dpadPointerId === null) {
      this.dpadPointerId = pointerId;
      this.dpadOrigin.copy(point);
      this.dpadCurrent.copy(point);
      this.redraw();
      return true;
    }
    this.updateDebug();
    return false;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.enabled || pointer.id !== this.dpadPointerId) return;
    this.moveDpad(pointer.id, this.pointerPoint(pointer), "phaser-move");
  }

  private moveDpad(pointerId: number, point: Phaser.Math.Vector2, eventName: string) {
    if (pointerId !== this.dpadPointerId) return;
    this.lastEvent = eventName;
    this.dpadCurrent.copy(point);
    this.updateDpadDirection();
    this.redraw();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    this.releasePointer(pointer.id, "phaser-up");
  }

  private releasePointer(pointerId: number, eventName: string) {
    this.lastEvent = eventName;
    if (pointerId === this.dialogPointerId) this.releaseDialog();
    if (pointerId === this.dpadPointerId) this.releaseDpad();
    for (const button of this.buttons) {
      if (button.pointerId === pointerId) this.releaseButton(button);
    }
    this.redraw();
  }

  private pointerPoint(pointer: Phaser.Input.Pointer) {
    return clampToCanvas(new Phaser.Math.Vector2(Math.round(pointer.x), Math.round(pointer.y)));
  }

  private domPointerPoint(event: PointerEvent) {
    const rect = this.scene.game.canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? GAME_WIDTH / rect.width : 1;
    const scaleY = rect.height > 0 ? GAME_HEIGHT / rect.height : 1;
    return clampToCanvas(new Phaser.Math.Vector2(
      Math.round((event.clientX - rect.left) * scaleX),
      Math.round((event.clientY - rect.top) * scaleY)
    ));
  }

  private isControlPointer(pointerId: number) {
    return pointerId === this.dpadPointerId || this.buttons.some((button) => button.pointerId === pointerId);
  }

  private findButtonAt(x: number, y: number) {
    return this.buttons.find((button) =>
      Math.abs(x - button.x) <= button.hitWidth / 2
      && Math.abs(y - button.y) <= button.hitHeight / 2
    );
  }

  private pressButton(button: ButtonState, pointerId: number) {
    if (button.pointerId !== null) return;
    button.pointerId = pointerId;
    setTouchControl(button.key, true);
    this.hapticPress();
    this.redraw();
  }

  private releaseButton(button: ButtonState) {
    button.pointerId = null;
    setTouchControl(button.key, false);
  }

  private releaseDpad() {
    this.dpadPointerId = null;
    if (this.dpadDirection) setTouchControl(this.dpadDirection, false);
    this.dpadDirection = null;
  }

  private releaseAll() {
    this.releaseDialog();
    this.releaseDpad();
    for (const button of this.buttons) this.releaseButton(button);
    this.updateDebug();
  }

  private isDialogPoint(point: Phaser.Math.Vector2) {
    return point.y >= GAME_HEIGHT - 70;
  }

  private pressDialog(pointerId: number) {
    this.dialogReleaseTimer?.remove(false);
    this.dialogPointerId = pointerId;
    setTouchControl("space", true);
    this.dialogFastForwardTimer?.remove(false);
    this.dialogFastForwardTimer = this.scene.time.delayedCall(460, () => {
      if (this.dialogPointerId === pointerId) triggerDialogFastForward();
    });
  }

  private releaseDialog() {
    if (this.dialogPointerId === null) return;
    this.dialogPointerId = null;
    this.dialogFastForwardTimer?.remove(false);
    this.dialogFastForwardTimer = undefined;
    this.dialogReleaseTimer?.remove(false);
    this.dialogReleaseTimer = this.scene.time.delayedCall(80, () => {
      setTouchControl("space", false);
      this.dialogReleaseTimer = undefined;
    });
  }

  private updateDpadDirection() {
    const dx = this.dpadCurrent.x - this.dpadOrigin.x;
    const dy = this.dpadCurrent.y - this.dpadOrigin.y;
    let nextDirection: CardinalDirection | null = null;
    if (Math.hypot(dx, dy) >= 12) {
      nextDirection = Math.abs(dx) > Math.abs(dy)
        ? dx < 0 ? "left" : "right"
        : dy < 0 ? "up" : "down";
    }
    if (nextDirection === this.dpadDirection) return;
    if (this.dpadDirection) setTouchControl(this.dpadDirection, false);
    this.dpadDirection = nextDirection;
    if (this.dpadDirection) setTouchControl(this.dpadDirection, true);
  }

  private hapticPress() {
    const vibrator = navigator.vibrate?.bind(navigator);
    if (vibrator) vibrator(8);
  }

  private redraw() {
    this.graphics.clear();
    this.graphics.setAlpha(this.overlayAlpha);
    this.updateDebug();
    if (!this.enabled) return;
    if (gameState.mode === "pause") {
      for (const button of this.buttons) button.text.setVisible(false);
      return;
    }
    this.drawButtons();
    this.drawDpad();
  }

  private updateDebug() {
    const debugWindow = window as TouchDebugWindow;
    debugWindow.rubyRuleTouchControls = {
      enabled: this.enabled,
      forceVisible: this.forceVisible,
      dpadPointerId: this.dpadPointerId,
      dpadDirection: this.dpadDirection,
      gamepadSuppressed: this.gamepadSuppressed,
      overlayAlpha: Number(this.overlayAlpha.toFixed(2)),
      pressedButtons: this.buttons.filter((button) => button.pointerId !== null).map((button) => button.key),
      lastEvent: this.lastEvent
    };
  }

  private fadeOverlay(targetAlpha: number, onComplete?: () => void) {
    const tweenState = { alpha: this.overlayAlpha };
    this.overlayFade = this.scene.tweens.add({
      targets: tweenState,
      alpha: targetAlpha,
      duration: 200,
      ease: "Linear",
      onUpdate: () => {
        this.overlayAlpha = Phaser.Math.Clamp(tweenState.alpha, 0, 1);
        this.redraw();
      },
      onComplete: () => {
        this.overlayAlpha = targetAlpha;
        this.overlayFade = undefined;
        this.redraw();
        onComplete?.();
      }
    });
  }

  private drawButtons() {
    for (const button of this.buttons) {
      const pressed = button.pointerId !== null;
      const visible = !button.hiddenUntilPressed || pressed;
      button.text.setVisible(visible);
      if (!visible) continue;
      const alpha = pressed ? 0.75 : 0.35;
      const scale = pressed ? 0.9 : 1;
      const width = Math.round(button.visibleWidth * scale);
      const height = Math.round(button.visibleHeight * scale);
      this.graphics.lineStyle(2, color(pressed ? PALETTE.terminalCyan : PALETTE.goldStamp), alpha);
      this.graphics.fillStyle(color(PALETTE.black), alpha);
      if (button.kind === "circle") {
        this.graphics.fillCircle(button.x, button.y, Math.round(Math.min(width, height) / 2));
        this.graphics.strokeCircle(button.x, button.y, Math.round(Math.min(width, height) / 2));
      } else {
        this.graphics.fillRect(Math.round(button.x - width / 2), Math.round(button.y - height / 2), width, height);
        this.graphics.strokeRect(Math.round(button.x - width / 2), Math.round(button.y - height / 2), width, height);
      }
      button.text.setAlpha((pressed ? 0.9 : 0.48) * this.overlayAlpha);
      button.text.setPosition(button.x, button.y - (button.kind === "circle" ? 4 : 2));
    }
  }

  private drawDpad() {
    if (this.dpadPointerId === null) return;
    const maxDistance = 28;
    const dx = Phaser.Math.Clamp(this.dpadCurrent.x - this.dpadOrigin.x, -maxDistance, maxDistance);
    const dy = Phaser.Math.Clamp(this.dpadCurrent.y - this.dpadOrigin.y, -maxDistance, maxDistance);
    const currentX = Math.round(this.dpadOrigin.x + dx);
    const currentY = Math.round(this.dpadOrigin.y + dy);
    this.graphics.lineStyle(1, color(PALETTE.goldStamp), 0.42);
    this.graphics.strokeCircle(this.dpadOrigin.x, this.dpadOrigin.y, 22);
    this.graphics.fillStyle(color(PALETTE.terminalCyan), 0.68);
    this.graphics.fillCircle(currentX, currentY, 6);
    if (!this.dpadDirection) return;
    this.graphics.lineStyle(2, color(PALETTE.terminalCyan), 0.72);
    this.graphics.beginPath();
    this.graphics.moveTo(this.dpadOrigin.x, this.dpadOrigin.y);
    this.graphics.lineTo(currentX, currentY);
    this.graphics.strokePath();
  }
}
