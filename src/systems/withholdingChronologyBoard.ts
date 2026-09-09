import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { WITHHOLDING_CHRONOLOGY_TITLE, WITHHOLDING_EVIDENCE, restoreWithholdingSlot,
  shiftWithholdingSlot, validateWithholdingEntry, withholdingSequence, type WithholdingSlot } from "../game/withholdingChronology";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
export const WITHHOLDING_BOARD_LAYOUT = { cardX: [52, 128, 204], cardY: 135, cardWidth: 68,
  cardHeight: 34, buttonY: 168, feedbackY: 191 } as const;

export interface ChronologyBoardCase {
  title: string;
  heading: string;
  evidence: readonly [string, string, string, string, string];
  initialMessage: string;
  restore: (value: number | undefined) => WithholdingSlot;
  shift: (slot: WithholdingSlot, direction: -1 | 1) => WithholdingSlot;
  sequence: (slot: WithholdingSlot) => ReadonlyArray<{ id: string; label: string; date: string; time: string }>;
  validate: (slot: number) => { ok: boolean; message: string };
}

export class ChronologyBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly cards: Phaser.GameObjects.Rectangle[] = [];
  private readonly words: Phaser.GameObjects.Text[] = [];
  private readonly fileButton: Phaser.GameObjects.Rectangle;
  private readonly feedback: Phaser.GameObjects.Text;
  private slot: WithholdingSlot = 0;
  private selected: "sequence" | "file" = "sequence";
  private onChange?: (slot: WithholdingSlot) => void;
  private onApprove?: (slot: WithholdingSlot) => void;

  constructor(private readonly scene: Phaser.Scene, private readonly task: ChronologyBoardCase) {
    this.container = scene.add.container(0, 0).setName("withholding-chronology-board")
      .setDepth(950).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.65),
      scene.add.rectangle(128, 125, 238, 182, color(PALETTE.black), 0.98)
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.text(20, 43, task.heading, PALETTE.terminalCyan);
    this.text(20, 56, "FICTIONAL TRAINING CASE", PALETTE.goldStamp, 6);
    this.text(20, 67, task.evidence[0], PALETTE.creamPaper);
    this.text(20, 78, task.evidence[1], PALETTE.creamPaper);
    this.text(20, 89, task.evidence[2], PALETTE.creamPaper);
    this.text(20, 100, task.evidence[3], PALETTE.goldStamp);
    this.text(20, 112, task.evidence[4], PALETTE.terminalCyan, 6);
    for (const x of WITHHOLDING_BOARD_LAYOUT.cardX) {
      const card = scene.add.rectangle(x, WITHHOLDING_BOARD_LAYOUT.cardY,
        WITHHOLDING_BOARD_LAYOUT.cardWidth, WITHHOLDING_BOARD_LAYOUT.cardHeight, color(PALETTE.shadowNavy));
      this.cards.push(card);
      this.container.add(card);
      this.words.push(this.text(x, 121, "", PALETTE.creamPaper).setOrigin(0.5, 0));
    }
    for (const direction of [-1, 1] as const) {
      const x = direction < 0 ? 34 : 173;
      const button = scene.add.rectangle(x, WITHHOLDING_BOARD_LAYOUT.buttonY, 28, 26, color(PALETTE.shadowNavy))
        .setStrokeStyle(1, color(PALETTE.goldStamp)).setName(`withholding-shift-${direction < 0 ? "left" : "right"}`);
      this.bindAction(button, () => this.shift(direction));
      this.container.add(button);
      this.text(x - 3, 164, direction < 0 ? "<" : ">", PALETTE.goldStamp);
    }
    this.fileButton = scene.add.rectangle(104, WITHHOLDING_BOARD_LAYOUT.buttonY, 80, 26, color(PALETTE.deepRuby)).setName("withholding-file");
    this.bindAction(this.fileButton, () => this.submit());
    this.container.add(this.fileButton);
    this.text(74, 164, "FILE ENTRY", PALETTE.creamPaper);
    const close = scene.add.rectangle(228, 54, 44, 44, color(PALETTE.black), 0).setName("withholding-close");
    bindPointerDown(close, () => this.hide());
    this.container.add(close);
    this.text(226, 46, "X", PALETTE.creamPaper);
    this.feedback = this.text(20, WITHHOLDING_BOARD_LAYOUT.feedbackY, "", PALETTE.goldStamp);
  }

  get active() { return this.container.visible; }

  show(slot: number | undefined, onChange: (slot: WithholdingSlot) => void, onApprove: (slot: WithholdingSlot) => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.slot = this.task.restore(slot);
    this.onChange = onChange;
    this.onApprove = onApprove;
    this.selected = "sequence";
    this.feedback.setText(slot === undefined || !this.slot ? this.task.initialMessage : "DRAFT KEPT - NOT FILED");
    this.container.setVisible(true);
    this.refresh();
    swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed || input.pauseJustPressed) { this.hide(); return; }
    if (input.navLeftJustPressed || input.navRightJustPressed) this.shift(input.navLeftJustPressed ? -1 : 1);
    else if (input.navUpJustPressed || input.navDownJustPressed) {
      this.selected = this.selected === "sequence" ? "file" : "sequence";
      this.refresh();
    } else if (input.aJustPressed || input.confirmJustPressed) {
      if (this.selected === "file") this.submit();
      else this.shift(1);
    }
  }

  hide() {
    if (!this.active) return;
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
  }

  private shift(direction: -1 | 1) {
    if (!this.active) return;
    this.selected = "sequence";
    const next = this.task.shift(this.slot, direction);
    if (next !== this.slot) {
      this.slot = next;
      this.onChange?.(next);
      retroAudio.blip();
    }
    this.feedback.setText(this.slot ? "DRAFT EDITED - NOT FILED" : this.task.initialMessage);
    this.refresh();
  }

  private submit() {
    if (!this.active) return;
    const result = this.task.validate(this.slot);
    if (!result.ok) {
      this.feedback.setText(result.message);
      setLatestMessage(result.message.replace("\n", "; "));
      retroAudio.warning();
      return;
    }
    this.hide();
    this.onApprove?.(this.slot);
  }

  private refresh() {
    const records = this.task.sequence(this.slot);
    for (let index = 0; index < 3; index++) {
      const record = records[index];
      const withheld = record?.id === "memcon";
      this.cards[index].setFillStyle(color(withheld ? PALETTE.deepRuby : PALETTE.shadowNavy))
        .setStrokeStyle(1, color(withheld && this.selected === "sequence" ? PALETTE.goldStamp : PALETTE.stoneGray));
      this.words[index].setText(record ? `${record.label}\n${record.date}\n${record.time}` : "ENTRY\nMISSING")
        .setColor(withheld ? PALETTE.goldStamp : PALETTE.creamPaper);
    }
    this.fileButton.setStrokeStyle(1, color(this.selected === "file" ? PALETTE.goldStamp : PALETTE.stoneGray));
    setChoiceState(this.task.title, records.map((record, index) => ({
      key: (["A", "B", "C"] as const)[index], label: `${record.label} ${record.date} ${record.time}`, value: record.id
    })));
  }

  private text(x: number, y: number, value: string, ink: string, size = 8) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: `${size}px`, color: ink, lineSpacing: 2 });
    this.container.add(text);
    return text;
  }

  private bindAction(button: Phaser.GameObjects.Rectangle, callback: () => void) {
    const width = Math.max(44, button.width);
    // Phaser preserves an existing hit area, so install the generous target first.
    button.setInteractive({ hitArea: new Phaser.Geom.Rectangle((button.width - width) / 2,
      (button.height - 44) / 2, width, 44), hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true });
    bindPointerDown(button, callback);
  }
}

export class WithholdingChronologyBoard extends ChronologyBoard {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      title: WITHHOLDING_CHRONOLOGY_TITLE, heading: "WITHHOLDING LEDGER",
      evidence: [WITHHOLDING_EVIDENCE.heading, WITHHOLDING_EVIDENCE.drafted,
        WITHHOLDING_EVIDENCE.sourceNote, WITHHOLDING_EVIDENCE.pages, WITHHOLDING_EVIDENCE.clock],
      initialMessage: "WITHHELD ENTRY MISSING", restore: restoreWithholdingSlot,
      shift: shiftWithholdingSlot, sequence: withholdingSequence, validate: validateWithholdingEntry
    });
  }
}
