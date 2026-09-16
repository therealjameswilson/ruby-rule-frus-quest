import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { createDanneScrollFrame } from "../game/danneUiSlices";
import { clearDialogState, setDialogState } from "../game/state";
import {
  bindPointerPress,
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
    const frameHeight = 60;
    const frameY = GAME_HEIGHT - frameHeight - 4 - (touch && options.aboveTouchControls ? 64 : 0);
    const speakerY = frameY + 10;
    const bodyY = frameY + 24;
    const frame = createDanneScrollFrame(scene, 6, frameY, GAME_WIDTH - 12, frameHeight);
    this.speakerText = scene.add.text(34, speakerY, "", {
      fontFamily: "monospace",
      fontSize: `${fontSize}px`,
      color: PALETTE.goldStamp
    }).setScrollFactor(0);
    this.bodyText = scene.add.text(34, bodyY, "", {
      fontFamily: "monospace",
      fontSize: `${fontSize}px`,
      color: PALETTE.creamPaper,
      wordWrap: { width: 188, useAdvancedWrap: true },
      lineSpacing: 0
    }).setScrollFactor(0);
    bindPointerPress(frame.hitArea, {
      down: () => this.pressAdvance(),
      up: () => this.releaseAdvance(),
      cancel: () => this.releaseAdvance()
    });
    updateInputCallbacks({ fastForwardDialog: () => this.fastForward() });
    this.container = scene.add
      .container(0, 0, [...frame.objects, this.speakerText, this.bodyText])
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
