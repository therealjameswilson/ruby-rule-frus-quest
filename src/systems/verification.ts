import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import type { ChoiceOption } from "../game/types";
import { bindPointerDown, getInput } from "../input/InputState";
import { retroAudio } from "./audio";

type ChoiceCallback = (option: ChoiceOption) => void;

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class ChoicePrompt {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly optionObjects: Phaser.GameObjects.GameObject[] = [];
  private options: ChoiceOption[] = [];
  private onChoose?: ChoiceCallback;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 132, 238, 126, color(PALETTE.black));
    const border = scene.add.rectangle(128, 132, 238, 126).setStrokeStyle(2, color(PALETTE.terminalCyan));
    this.titleText = scene.add.text(16, 76, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      wordWrap: { width: 224, useAdvancedWrap: true },
      lineSpacing: 2
    });
    this.container = scene.add.container(0, 0, [box, border, this.titleText]).setDepth(950).setVisible(false);
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
        .rectangle(128, 120 + index * 18, 216, 15, color(PALETTE.black));
      bindPointerDown(row, () => this.choose(option.key));
      const optionText = this.scene.add
        .text(22, 116 + index * 18, `[ ${option.key} ] ${option.label}`, {
          fontFamily: "monospace",
          fontSize: "8px",
          color: PALETTE.creamPaper,
          wordWrap: { width: 212, useAdvancedWrap: true }
        });
      bindPointerDown(optionText, () => this.choose(option.key));
      this.optionObjects.push(row, optionText);
      this.container.add([row, optionText]);
    });

    this.container.setVisible(true);
    setChoiceState(title, options);
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.aJustPressed || input.confirmJustPressed || input.choiceAJustPressed) this.choose("A");
    else if (input.choiceBJustPressed) this.choose("B");
    else if (input.choiceCJustPressed) this.choose("C");
    else if (input.choiceDJustPressed) this.choose("D");
  }

  hide() {
    this.container.setVisible(false);
    clearChoiceState();
  }

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
