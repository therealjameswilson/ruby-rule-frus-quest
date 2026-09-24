import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { presentationPanel, PANEL_COLORS } from "./presentationPanel";
import { clearDialogState, setDialogState } from "../game/state";
import {
  bindPointerPress,
  getPrimaryActionBadge,
  isTouchInputCapable,
  setTouchControl,
  swallowNextInputFrame,
  updateInputCallbacks
} from "../input/InputState";
import { retroAudio } from "./audio";
import { dialogHeading, dialogPages } from "./dialogPages";

type CompleteCallback = () => void;

export class DialogBox {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly advanceText: Phaser.GameObjects.Text;
  private pages: string[] = [];
  private speaker = "";
  private index = 0;
  private onComplete?: CompleteCallback;
  private fastForwardTimer?: Phaser.Time.TimerEvent;
  private releaseTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, options: { aboveTouchControls?: boolean } = {}) {
    this.scene = scene;
    const touch = isTouchInputCapable();
    const fontSize = 8;
    const frameHeight = 64;
    const frameY = GAME_HEIGHT - frameHeight - 4 - (touch && options.aboveTouchControls !== false ? 64 : 0);
    const speakerY = frameY + 6;
    const bodyY = frameY + 25;
    const frame = presentationPanel(scene, 8, frameY, GAME_WIDTH - 16, frameHeight, true);
    this.speakerText = scene.add.text(18, speakerY, "", {
      fontFamily: "Arial",
      fontSize: `${fontSize}px`,
      color: PALETTE.goldStamp
    }).setScrollFactor(0);
    this.bodyText = scene.add.text(18, bodyY, "", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: PANEL_COLORS.text,
      wordWrap: { width: 220, useAdvancedWrap: true },
      lineSpacing: 1
    }).setScrollFactor(0);
    this.advanceText = scene.add.text(GAME_WIDTH - 18, frameY + 54, "", {
      fontFamily: "Arial", fontSize: "6px", color: PANEL_COLORS.muted
    }).setOrigin(1, 0).setScrollFactor(0);
    bindPointerPress(frame.hitArea, {
      down: () => this.pressAdvance(),
      up: () => this.releaseAdvance(),
      cancel: () => this.releaseAdvance()
    });
    updateInputCallbacks({ fastForwardDialog: () => this.fastForward() });
    this.container = scene.add
      .container(0, 0, [...frame.objects, this.speakerText, this.bodyText, this.advanceText])
      .setDepth(900)
      .setVisible(false)
      .setScrollFactor(0);
  }

  get active() {
    return this.container.visible;
  }

  show(speaker: string, pages: string[] | string, onComplete?: CompleteCallback) {
    this.speaker = speaker;
    this.pages = dialogPages(pages);
    this.index = 0;
    this.onComplete = onComplete;
    this.container.setVisible(true);
    this.renderPage();
  }

  advance() {
    if (!this.active) return false;
    this.index += 1;
    if (this.index >= this.pages.length) {
      this.hide();
      return true;
    }
    this.renderPage();
    return true;
  }

  hide() {
    this.releaseAdvance();
    this.container.setVisible(false);
    clearDialogState();
    swallowNextInputFrame();
    const complete = this.onComplete;
    this.onComplete = undefined;
    complete?.();
  }

  private renderPage() {
    const text = this.pages[this.index] ?? "";
    this.speakerText.setText(dialogHeading(this.speaker, this.index, this.pages.length));
    this.bodyText.setText(text);
    this.advanceText.setText(isTouchInputCapable() ? "TAP TO CONTINUE" : `${getPrimaryActionBadge()} CONTINUE`);
    retroAudio.blip();
    setDialogState(this.speaker, text);
  }

  private pressAdvance() {
    if (!this.active) return;
    this.releaseTimer?.remove(false);
    setTouchControl("space", true);
    this.fastForwardTimer?.remove(false);
    this.fastForwardTimer = this.scene.time.delayedCall(460, () => this.fastForward());
  }

  private releaseAdvance() {
    this.fastForwardTimer?.remove(false);
    this.fastForwardTimer = undefined;
    this.releaseTimer?.remove(false);
    this.releaseTimer = this.scene.time.delayedCall(80, () => {
      setTouchControl("space", false);
      this.releaseTimer = undefined;
    });
  }

  private fastForward() {
    if (!this.active) return;
    this.index = this.pages.length;
    this.hide();
  }
}
