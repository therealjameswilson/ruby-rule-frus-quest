import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import type { ChoiceOption } from "../game/types";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { choiceLayout } from "./choiceLayout";

type ChoiceCallback = (option: ChoiceOption) => void;

export const CHOICE_PROMPT_OPEN_EVENT = "ruby-rule-choice-prompt-open";

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
  private selectedIndex = 0;
  private readonly rows: Phaser.GameObjects.Rectangle[] = [];
  private onChoose?: ChoiceCallback;
  private onCancel?: () => void;
  private readonly settleMs: number;
  private readyAt = 0;
  private inputArmed = true;

  constructor(scene: Phaser.Scene, options: { settleMs?: number } = {}) {
    this.scene = scene;
    this.settleMs = Math.max(0, options.settleMs ?? 0);
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

  show(title: string, options: ChoiceOption[], onChoose: ChoiceCallback, contextFontSize: 6 | 8 = 6, onCancel?: () => void) {
    this.readyAt = this.scene.time.now + this.settleMs;
    this.inputArmed = this.settleMs === 0;
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.options = options;
    this.selectedIndex = 0;
    this.rows.length = 0;
    this.onChoose = onChoose;
    this.onCancel = onCancel;
    const layout = choiceLayout(title, options, contextFontSize);
    this.box.setPosition(128, layout.top + layout.height / 2).setSize(238, layout.height);
    this.border.setPosition(128, layout.top + layout.height / 2).setSize(238, layout.height);
    this.titleText.setFontSize(layout.fontSize).setPosition(20, layout.top + layout.questionY).setText(layout.questionText);
    this.sourceText.setFontSize(layout.contextFontSize).setPosition(20, layout.top + layout.contextY).setText(layout.contextText);
    for (const object of this.optionObjects) object.destroy();
    this.optionObjects.length = 0;

    options.forEach((option, index) => {
      const placement = layout.rows[index];
      const y = layout.top + placement.y;
      const row = this.scene.add
        .rectangle(128, y + placement.height / 2, 218, placement.height, color(index % 2 === 0 ? PALETTE.shadowNavy : PALETTE.black), 0.98);
      row.setStrokeStyle(1, color(PALETTE.stoneDark), 0.8);
      this.rows.push(row);
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

    this.refreshSelection();
    this.container.setVisible(true);
    setChoiceState(title, options);
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (!this.inputArmed) {
      // A combat press must be released before it can become a menu choice.
      const pressed = input.a || input.b || input.aJustPressed || input.bJustPressed
        || input.confirmJustPressed || input.cancelJustPressed || input.choiceAJustPressed
        || input.choiceBJustPressed || input.choiceCJustPressed || input.choiceDJustPressed;
      if (this.scene.time.now >= this.readyAt && !pressed) this.inputArmed = true;
      return;
    }
    if (this.onCancel && (input.pauseJustPressed || input.menuJustPressed)) {
      const cancel = this.onCancel;
      this.hide();
      swallowNextInputFrame();
      cancel();
      return;
    }
    if (input.navDownJustPressed || input.navUpJustPressed) {
      const step = input.navDownJustPressed ? 1 : -1;
      this.selectedIndex = (this.selectedIndex + step + this.options.length) % this.options.length;
      this.refreshSelection();
    }
    if (input.choiceAJustPressed) this.choose("A");
    else if (input.aJustPressed || input.confirmJustPressed) this.choose(this.options[this.selectedIndex]?.key ?? "A");
    else if (input.bJustPressed || input.cancelJustPressed || input.choiceBJustPressed) this.choose("B");
    else if (input.choiceCJustPressed) this.choose("C");
    else if (input.choiceDJustPressed) this.choose("D");
  }

  hide() {
    this.container.setVisible(false);
    clearChoiceState();
  }

  private refreshSelection() {
    this.rows.forEach((row, index) => row.setStrokeStyle(1,
      color(index === this.selectedIndex ? PALETTE.goldStamp : PALETTE.stoneDark),
      index === this.selectedIndex ? 1 : 0.8));
  }

  private choose(key: string) {
    if (!this.active || !this.inputArmed || this.scene.time.now < this.readyAt) return;
    const option = this.options.find((item) => item.key === key);
    if (!option) return;
    retroAudio.confirm();
    setLatestMessage(`Choice ${option.key}: ${option.label}`);
    const callback = this.onChoose;
    this.hide();
    callback?.(option);
  }
}
