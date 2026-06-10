import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearDialogState, setDialogState } from "../game/state";
import { retroAudio } from "./audio";

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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 204, 244, 64, 0x050505, 0.96);
    const border = scene.add.rectangle(128, 204, 244, 64).setStrokeStyle(2, 0xf2e4c8);
    this.speakerText = scene.add.text(14, 176, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    });
    this.bodyText = scene.add.text(14, 188, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 226, useAdvancedWrap: true },
      lineSpacing: 2
    });
    this.container = scene.add
      .container(0, 0, [box, border, this.speakerText, this.bodyText])
      .setDepth(900)
      .setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  show(speaker: string, pages: string[] | string, onComplete?: CompleteCallback) {
    this.speaker = speaker;
    this.pages = Array.isArray(pages) ? pages : [pages];
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
    this.container.setVisible(false);
    clearDialogState();
    const complete = this.onComplete;
    this.onComplete = undefined;
    complete?.();
  }

  private renderPage() {
    const text = this.pages[this.index] ?? "";
    this.speakerText.setText(`${this.speaker}:`);
    this.bodyText.setText(text);
    retroAudio.blip();
    setDialogState(this.speaker, text);
  }
}
