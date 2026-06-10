import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import type { ChoiceOption } from "../game/types";
import { retroAudio } from "./audio";

type ChoiceCallback = (option: ChoiceOption) => void;

export class ChoicePrompt {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly optionObjects: Phaser.GameObjects.GameObject[] = [];
  private options: ChoiceOption[] = [];
  private onChoose?: ChoiceCallback;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 132, 238, 126, 0x050505, 0.97);
    const border = scene.add.rectangle(128, 132, 238, 126).setStrokeStyle(2, 0x45f3ff);
    this.titleText = scene.add.text(16, 76, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      wordWrap: { width: 224, useAdvancedWrap: true },
      lineSpacing: 2
    });
    this.container = scene.add.container(0, 0, [box, border, this.titleText]).setDepth(950).setVisible(false);

    const keyboard = scene.input.keyboard;
    keyboard?.on("keydown-A", this.chooseA, this);
    keyboard?.on("keydown-B", this.chooseB, this);
    keyboard?.on("keydown-C", this.chooseC, this);
    keyboard?.on("keydown-D", this.chooseD, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off("keydown-A", this.chooseA, this);
      keyboard?.off("keydown-B", this.chooseB, this);
      keyboard?.off("keydown-C", this.chooseC, this);
      keyboard?.off("keydown-D", this.chooseD, this);
    });
  }

  get active() {
    return this.container.visible;
  }

  show(title: string, options: ChoiceOption[], onChoose: ChoiceCallback) {
    this.options = options;
    this.onChoose = onChoose;
    this.titleText.setText(title);
    for (const object of this.optionObjects) object.destroy();
    this.optionObjects.length = 0;

    options.forEach((option, index) => {
      const row = this.scene.add
        .rectangle(128, 120 + index * 18, 216, 15, 0x050505, 0.01)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.choose(option.key));
      const optionText = this.scene.add
        .text(22, 116 + index * 18, `[ ${option.key} ] ${option.label}`, {
          fontFamily: "monospace",
          fontSize: "8px",
          color: PALETTE.creamPaper,
          wordWrap: { width: 212, useAdvancedWrap: true }
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.choose(option.key));
      this.optionObjects.push(row, optionText);
      this.container.add([row, optionText]);
    });

    this.container.setVisible(true);
    setChoiceState(title, options);
  }

  hide() {
    this.container.setVisible(false);
    clearChoiceState();
  }

  private chooseA() { this.choose("A"); }
  private chooseB() { this.choose("B"); }
  private chooseC() { this.choose("C"); }
  private chooseD() { this.choose("D"); }

  private choose(key: string) {
    const option = this.options.find((item) => item.key === key);
    if (!option) return;
    retroAudio.confirm();
    setLatestMessage(`Choice ${option.key}: ${option.label}`);
    const callback = this.onChoose;
    this.hide();
    callback?.(option);
  }
}
