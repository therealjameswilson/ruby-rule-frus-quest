import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { REFERRAL_EQUITY_PACKETS } from "../game/referralVaultReview";
import { changeManifestRoute, firstManifestMismatch, initialReferralManifest, REFERRAL_MANIFEST_LABELS, REFERRAL_MANIFEST_TITLE, type ReferralManifest } from "../game/referralManifest";
import { bindPointerDown, getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
export const MANIFEST_BOARD_LAYOUT = { rowY: [88, 118, 148], rowHeight: 28, fileY: 178 } as const;

export class ReferralManifestBoard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly rows: Phaser.GameObjects.Rectangle[] = [];
  private readonly routes: Phaser.GameObjects.Text[] = [];
  private readonly fileButton: Phaser.GameObjects.Rectangle;
  private readonly feedback: Phaser.GameObjects.Text;
  private manifest = initialReferralManifest();
  private selected = 0;
  private onChange?: (manifest: ReferralManifest) => void;
  private onApprove?: (manifest: ReferralManifest) => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setName("referral-manifest-board")
      .setDepth(950).setScrollFactor(0).setVisible(false);
    this.container.add([
      scene.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.65),
      scene.add.rectangle(128, 125, 238, 182, color(PALETTE.black), 0.98)
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
    ]);
    this.text(20, 43, "REVIEW MANIFEST", PALETTE.terminalCyan);
    this.text(20, 57, "STATECHAT DRAFT / TRAINING", PALETTE.goldStamp);
    this.text(24, 69, "DOCUMENT", PALETTE.creamPaper, 6);
    this.text(177, 69, "AGENCY", PALETTE.creamPaper, 6);
    const close = scene.add.rectangle(230, 50, 30, 30, color(PALETTE.black), 0);
    bindPointerDown(close, () => this.hide());
    this.container.add(close);
    this.text(226, 46, "X", PALETTE.creamPaper);

    for (const [index, packet] of REFERRAL_EQUITY_PACKETS.entries()) {
      const y = MANIFEST_BOARD_LAYOUT.rowY[index];
      const row = scene.add.rectangle(128, y, 218, MANIFEST_BOARD_LAYOUT.rowHeight, color(PALETTE.shadowNavy));
      bindPointerDown(row, () => {
        if (!this.active) return;
        this.selected = index;
        this.refresh();
      });
      this.rows.push(row);
      this.container.add(row);
      this.text(25, y - 4, REFERRAL_MANIFEST_LABELS[packet.id], PALETTE.creamPaper);
      this.routes.push(this.text(166, y - 4, "", PALETTE.goldStamp));
      for (const delta of [-1, 1] as const) {
        const arrow = scene.add.rectangle(delta < 0 ? 172 : 210, y, 32, MANIFEST_BOARD_LAYOUT.rowHeight, color(PALETTE.black), 0);
        bindPointerDown(arrow, () => this.changeRoute(index, delta));
        this.container.add(arrow);
      }
    }
    this.fileButton = scene.add.rectangle(128, MANIFEST_BOARD_LAYOUT.fileY, 120, 22, color(PALETTE.shadowNavy));
    bindPointerDown(this.fileButton, () => this.submit());
    this.container.add(this.fileButton);
    this.text(89, MANIFEST_BOARD_LAYOUT.fileY - 4, "FILE MANIFEST", PALETTE.creamPaper);
    this.feedback = this.text(20, 196, "", PALETTE.goldStamp);
  }

  get active() { return this.container.visible; }

  show(manifest: ReferralManifest, onChange: (manifest: ReferralManifest) => void, onApprove: (manifest: ReferralManifest) => void) {
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.manifest = { ...manifest };
    this.onChange = onChange;
    this.onApprove = onApprove;
    this.selected = 0;
    this.feedback.setText("ROUTING ONLY\nNOT RELEASE APPROVAL");
    this.container.setVisible(true);
    this.refresh();
    swallowNextInputFrame();
  }

  updateInput() {
    if (!this.active) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed || input.pauseJustPressed) {
      this.hide();
      return;
    }
    if (input.navUpJustPressed || input.navDownJustPressed) {
      this.selected = (this.selected + (input.navUpJustPressed ? 3 : 1)) % 4;
      this.refresh();
    } else if (this.selected < 3 && (input.navLeftJustPressed || input.navRightJustPressed)) {
      this.changeRoute(this.selected, input.navLeftJustPressed ? -1 : 1);
    } else if (input.aJustPressed || input.confirmJustPressed) {
      if (this.selected === 3) this.submit();
      else this.changeRoute(this.selected, 1);
    }
  }

  hide() {
    if (!this.active) return;
    this.container.setVisible(false);
    clearChoiceState();
    swallowNextInputFrame();
  }

  private changeRoute(index: number, delta: -1 | 1) {
    if (!this.active) return;
    const packet = REFERRAL_EQUITY_PACKETS[index];
    this.selected = index;
    this.manifest = changeManifestRoute(this.manifest, packet.id, delta);
    this.onChange?.({ ...this.manifest });
    this.feedback.setText("DRAFT EDITED\nNOT YET FILED");
    retroAudio.blip();
    this.refresh();
  }

  private submit() {
    if (!this.active) return;
    const mismatch = firstManifestMismatch(this.manifest);
    if (mismatch) {
      this.selected = REFERRAL_EQUITY_PACKETS.findIndex(packet => packet.id === mismatch.id);
      this.feedback.setText(`${REFERRAL_MANIFEST_LABELS[mismatch.id]} -> ${mismatch.agency}\nDRAFT KEPT - REVISE`);
      setLatestMessage(`${mismatch.label} has ${mismatch.agency} equity in this training batch. Correct the draft route before filing.`);
      retroAudio.warning();
      this.refresh();
      return;
    }
    const manifest = { ...this.manifest };
    this.hide();
    this.onApprove?.(manifest);
  }

  private refresh() {
    for (const [index, packet] of REFERRAL_EQUITY_PACKETS.entries()) {
      this.rows[index].setFillStyle(color(index === this.selected ? PALETTE.deepRuby : PALETTE.black))
        .setStrokeStyle(1, color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneDark));
      this.routes[index].setText(`< ${this.manifest[packet.id]} >`);
    }
    this.fileButton.setStrokeStyle(1, color(this.selected === 3 ? PALETTE.goldStamp : PALETTE.stoneDark));
    setChoiceState(REFERRAL_MANIFEST_TITLE, REFERRAL_EQUITY_PACKETS.map((packet, index) => ({
      key: (["A", "B", "C"] as const)[index], label: `${REFERRAL_MANIFEST_LABELS[packet.id]} -> ${this.manifest[packet.id]}`, value: this.manifest[packet.id]
    })));
  }

  private text(x: number, y: number, value: string, ink: string, size = 8) {
    const text = this.scene.add.text(x, y, value, { fontFamily: "monospace", fontSize: `${size}px`, color: ink, lineSpacing: 2 });
    this.container.add(text);
    return text;
  }
}
