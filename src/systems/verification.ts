import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import type { ChoiceOption } from "../game/types";
import { bindPointerDown, getInput } from "../input/InputState";
import { retroAudio } from "./audio";
import { choiceLayout } from "./choiceLayout";

type ChoiceCallback = (option: ChoiceOption) => void;

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class ChoicePrompt {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly sourceText: Phaser.GameObjects.Text;
  private readonly box: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly optionObjects: Phaser.GameObjects.GameObject[] = [];
  private options: ChoiceOption[] = [];
  private onChoose?: ChoiceCallback;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const dim = scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.65);
    this.box = scene.add.rectangle(128, 120, 238, 156, color(PALETTE.black), 0.98);
    this.border = scene.add.rectangle(128, 120, 238, 156).setStrokeStyle(1, color(PALETTE.terminalCyan));
    this.titleText = scene.add.text(20, 60, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      lineSpacing: 2
    });
    this.sourceText = scene.add.text(20, 96, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      lineSpacing: 2
    });
    this.container = scene.add.container(0, 0, [dim, this.box, this.border, this.titleText, this.sourceText])
      .setDepth(950).setScrollFactor(0).setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  show(title: string, options: ChoiceOption[], onChoose: ChoiceCallback) {
    this.options = options;
    this.onChoose = onChoose;
    const layout = choiceLayout(title, options);
    this.box.setPosition(128, layout.top + layout.height / 2).setSize(238, layout.height);
    this.border.setPosition(128, layout.top + layout.height / 2).setSize(238, layout.height);
    this.titleText.setFontSize(layout.fontSize).setPosition(20, layout.top + layout.questionY).setText(layout.questionText);
    this.sourceText.setPosition(20, layout.top + layout.contextY).setText(layout.contextText);
    for (const object of this.optionObjects) object.destroy();
    this.optionObjects.length = 0;

    options.forEach((option, index) => {
      const placement = layout.rows[index];
      const y = layout.top + placement.y;
      const row = this.scene.add
        .rectangle(128, y + placement.height / 2, 218, placement.height, color(index % 2 === 0 ? PALETTE.shadowNavy : PALETTE.black), 0.98);
      row.setStrokeStyle(1, color(PALETTE.stoneDark), 0.8);
      bindPointerDown(row, () => this.choose(option.key));
      const optionText = this.scene.add
        .text(25, y + 4, placement.text, {
          fontFamily: "monospace",
          fontSize: `${layout.fontSize}px`,
          color: PALETTE.creamPaper,
          lineSpacing: 2
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
    else if (input.bJustPressed || input.cancelJustPressed || input.choiceBJustPressed) this.choose("B");
    else if (input.choiceCJustPressed) this.choose("C");
    else if (input.choiceDJustPressed) this.choose("D");
  }

  hide() {
    this.container.setVisible(false);
    clearChoiceState();
  }

  private choose(key: string) {
    if (!this.active) return;
    const option = this.options.find((item) => item.key === key);
    if (!option) return;
    retroAudio.confirm();
    setLatestMessage(`Choice ${option.key}: ${option.label}`);
    const callback = this.onChoose;
    this.hide();
    callback?.(option);
  }
}
