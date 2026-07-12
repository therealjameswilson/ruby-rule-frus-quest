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
  private readonly sourceText: Phaser.GameObjects.Text;
  private readonly optionObjects: Phaser.GameObjects.GameObject[] = [];
  private options: ChoiceOption[] = [];
  private onChoose?: ChoiceCallback;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 132, 238, 156, color(PALETTE.black), 0.98);
    const border = scene.add.rectangle(128, 132, 238, 156).setStrokeStyle(2, color(PALETTE.terminalCyan));
    this.titleText = scene.add.text(18, 60, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      wordWrap: { width: 220, useAdvancedWrap: true },
      lineSpacing: 2
    });
    this.sourceText = scene.add.text(18, 96, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      wordWrap: { width: 220, useAdvancedWrap: true },
      lineSpacing: 1
    });
    this.container = scene.add.container(0, 0, [box, border, this.titleText, this.sourceText]).setDepth(950).setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  show(title: string, options: ChoiceOption[], onChoose: ChoiceCallback) {
    this.options = options;
    this.onChoose = onChoose;
    const copy = formatChoiceCopy(title);
    this.titleText.setText(copy.question);
    this.sourceText.setText(copy.source);
    for (const object of this.optionObjects) object.destroy();
    this.optionObjects.length = 0;

    options.forEach((option, index) => {
      const row = this.scene.add
        .rectangle(128, 129 + index * 18, 218, 15, color(index % 2 === 0 ? PALETTE.shadowNavy : PALETTE.black), 0.98);
      row.setStrokeStyle(1, color(PALETTE.stoneDark), 0.8);
      bindPointerDown(row, () => this.choose(option.key));
      const optionText = this.scene.add
        .text(23, 125 + index * 18, `[ ${option.key} ] ${compactLine(option.label, 32)}`, {
          fontFamily: "monospace",
          fontSize: "7px",
          color: PALETTE.creamPaper,
          wordWrap: { width: 210, useAdvancedWrap: true }
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
    const option = this.options.find((item) => item.key === key);
    if (!option) return;
    retroAudio.confirm();
    setLatestMessage(`Choice ${option.key}: ${option.label}`);
    const callback = this.onChoose;
    this.hide();
    callback?.(option);
  }
}

function formatChoiceCopy(title: string) {
  const [questionPart, sourcePart = ""] = title.split(/\n\s*\n/);
  const question = compactLine(questionPart.replace(/\s*\n\s*/g, " - "), 118);
  const source = sourcePart
    ? `SOURCE: ${compactLine(sourcePart.replace(/\s*\n\s*/g, " "), 128)}`
    : "";
  return { question, source };
}

function compactLine(value: string, maxChars: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, Math.max(0, maxChars - 3));
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 18 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}
