import Phaser from "phaser";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import { addGamepadConnectionListener, updateInputCallbacks } from "../input/InputState";
import { TouchControls } from "../input/TouchControls";

export class UIScene extends Phaser.Scene {
  private controls!: TouchControls;
  private gamepadToastBg?: Phaser.GameObjects.Rectangle;
  private gamepadToastText?: Phaser.GameObjects.Text;
  private gamepadToastTimer?: Phaser.Time.TimerEvent;
  private gamepadToastTween?: Phaser.Tweens.Tween;
  private removeGamepadListener?: () => void;

  constructor() {
    super("UIScene");
  }

  create() {
    this.controls = new TouchControls(this);
    this.createGamepadToast();
    this.removeGamepadListener = addGamepadConnectionListener((connected) => {
      this.controls.setGamepadSuppressed(connected);
      this.showGamepadToast(connected ? "CONTROLLER CONNECTED" : "TOUCH CONTROLS READY");
    });
    updateInputCallbacks({
      toggleTouchOverlay: () => {
        this.controls.setForceVisible(!this.controls.isForceVisible);
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeGamepadListener?.();
      this.gamepadToastTimer?.remove(false);
      this.gamepadToastTween?.stop();
    });
    this.scene.bringToTop();
  }

  update() {
    this.controls.refreshForScene(this.activeGameplaySceneKey());
    this.scene.bringToTop();
  }

  private activeGameplaySceneKey() {
    const activeScenes = this.scene.manager.getScenes(true)
      .filter((scene) => scene.scene.key !== this.scene.key);
    return activeScenes.at(-1)?.scene.key ?? null;
  }

  private createGamepadToast() {
    this.gamepadToastBg = this.add
      .rectangle(GAME_WIDTH / 2, 26, 150, 18, color(PALETTE.black), 0.85)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.9)
      .setDepth(21000)
      .setScrollFactor(0)
      .setVisible(false);
    this.gamepadToastText = this.add
      .text(GAME_WIDTH / 2, 26, "", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(21001)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private showGamepadToast(message: string) {
    if (!this.gamepadToastBg || !this.gamepadToastText) return;
    this.gamepadToastTimer?.remove(false);
    this.gamepadToastTween?.stop();
    this.gamepadToastText.setText(message);
    this.gamepadToastBg.setVisible(true).setAlpha(1);
    this.gamepadToastText.setVisible(true).setAlpha(1);
    this.gamepadToastTimer = this.time.delayedCall(1100, () => {
      this.gamepadToastTween = this.tweens.add({
        targets: [this.gamepadToastBg, this.gamepadToastText],
        alpha: 0,
        duration: 200,
        ease: "Linear",
        onComplete: () => {
          this.gamepadToastBg?.setVisible(false);
          this.gamepadToastText?.setVisible(false);
        }
      });
    });
  }
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}
