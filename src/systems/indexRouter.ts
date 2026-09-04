import Phaser from "phaser";
import { ABOUT_SERIES_RULES, evaluateIndexReferenceTarget, type IndexReferenceTarget } from "../game/aboutSeries";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState } from "../game/state";
import type { InputState } from "../input/InputState";
import { bindPointerDown } from "../input/InputState";
import { retroAudio } from "./audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface IndexRouterCallbacks {
  onComplete: (message: string) => void;
  onCancel: () => void;
}

interface TargetButton {
  target: IndexReferenceTarget;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class IndexRouterOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly targetButtons: TargetButton[] = [];
  private readonly feedback: Phaser.GameObjects.Text;
  private selected: IndexReferenceTarget = "page";
  private callbacks?: IndexRouterCallbacks;

  constructor(private readonly scene: Phaser.Scene) {
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.72));
    objects.push(scene.add.rectangle(128, 120, 238, 158, color(PALETTE.black), 0.98)
      .setStrokeStyle(1, color(PALETTE.terminalCyan)));
    objects.push(scene.add.text(128, 49, "INDEX ROUTER", {
      fontFamily: "monospace", fontSize: "8px", color: PALETTE.goldStamp
    }).setOrigin(0.5, 0));
    objects.push(scene.add.text(128, 66, "ENTRY 87 SHOULD POINT TO...", {
      fontFamily: "monospace", fontSize: "8px", color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0));
    objects.push(scene.add.text(128, 84, ABOUT_SERIES_RULES.index.toUpperCase(), {
      fontFamily: "monospace", fontSize: "6px", color: PALETTE.creamPaper,
      align: "center", wordWrap: { width: 212, useAdvancedWrap: true }, lineSpacing: 1
    }).setOrigin(0.5, 0));

    this.addTarget(objects, "page", 72, "PAGE 87");
    this.addTarget(objects, "document", 184, "DOC 87");
    this.feedback = scene.add.text(128, 151, "MOVE THE ROUTER", {
      fontFamily: "monospace", fontSize: "6px", color: PALETTE.stoneGray
    }).setOrigin(0.5, 0);
    objects.push(this.feedback);
    objects.push(scene.add.text(128, 178, "LEFT/RIGHT  A CONFIRM  B BACK", {
      fontFamily: "monospace", fontSize: "6px", color: PALETTE.goldStamp
    }).setOrigin(0.5, 0));
    this.container = scene.add.container(0, 0, objects).setDepth(1600).setScrollFactor(0).setVisible(false);
    this.syncSelection();
  }

  get active() {
    return this.container.visible;
  }

  show(callbacks: IndexRouterCallbacks) {
    this.callbacks = callbacks;
    this.selected = "page";
    this.feedback.setText("MOVE THE ROUTER").setColor(PALETTE.stoneGray);
    this.syncSelection();
    this.container.setVisible(true);
    setChoiceState("INDEX ROUTER: route entry 87 to its stable reference.", [
      { key: "A", label: "LEFT: PAGE 87", value: "page" },
      { key: "B", label: "RIGHT: DOCUMENT 87", value: "document" }
    ]);
  }

  updateInput(input: Readonly<InputState>) {
    if (!this.active) return;
    if (input.navLeftJustPressed || input.navUpJustPressed) this.select("page");
    if (input.navRightJustPressed || input.navDownJustPressed) this.select("document");
    if (input.aJustPressed || input.confirmJustPressed) this.confirm();
    else if (input.bJustPressed || input.cancelJustPressed) this.cancel();
  }

  hide() {
    this.container.setVisible(false);
    clearChoiceState();
  }

  private addTarget(objects: Phaser.GameObjects.GameObject[], target: IndexReferenceTarget, x: number, label: string) {
    const box = this.scene.add.rectangle(x, 126, 96, 44, color(PALETTE.shadowNavy), 0.98);
    const text = this.scene.add.text(x, 119, label, {
      fontFamily: "monospace", fontSize: "8px", color: PALETTE.creamPaper
    }).setOrigin(0.5, 0);
    const choose = () => {
      if (!this.active) return;
      if (this.selected === target) this.confirm();
      else this.select(target);
    };
    bindPointerDown(box, choose);
    bindPointerDown(text, choose);
    this.targetButtons.push({ target, box, label: text });
    objects.push(box, text);
  }

  private select(target: IndexReferenceTarget) {
    this.selected = target;
    this.feedback.setText(target === "document" ? "DOCUMENT ROUTE SELECTED" : "PAGE ROUTE SELECTED")
      .setColor(target === "document" ? PALETTE.terminalCyan : PALETTE.classNetRed);
    this.syncSelection();
    retroAudio.blip();
  }

  private confirm() {
    const result = evaluateIndexReferenceTarget(this.selected);
    this.feedback.setText(result.message).setColor(result.ok ? PALETTE.terminalCyan : PALETTE.classNetRed);
    if (!result.ok) {
      retroAudio.warning();
      return;
    }
    const callback = this.callbacks?.onComplete;
    this.hide();
    retroAudio.confirm();
    callback?.(result.message);
  }

  private cancel() {
    const callback = this.callbacks?.onCancel;
    this.hide();
    callback?.();
  }

  private syncSelection() {
    for (const button of this.targetButtons) {
      const selected = button.target === this.selected;
      const accent = button.target === "document" ? PALETTE.terminalCyan : PALETTE.classNetRed;
      button.box
        .setFillStyle(color(selected ? PALETTE.deepRuby : PALETTE.shadowNavy), 0.98)
        .setStrokeStyle(selected ? 2 : 1, color(selected ? accent : PALETTE.stoneDark));
      button.label.setColor(selected ? PALETTE.goldStamp : PALETTE.creamPaper);
    }
  }
}
