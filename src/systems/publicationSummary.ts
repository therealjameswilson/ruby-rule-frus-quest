import { retroAudio } from "./audio";
import { publicationBackdrop } from "./publicationBackdrop";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { CompletionStatsReadout } from "../game/state";
import type { TrueEndingCertificate } from "../game/trueEndingCertificate";
import type { StatutoryClockReadout } from "../game/statutoryClock";
import { bindPointerDown, swallowNextInputFrame, type InputState } from "../input/InputState";

export type PublicationSummaryPage = "volume" | "certificate" | "record" | "process" | "readers";

interface PublicationSummaryOptions {
  compiler: string;
  stats: CompletionStatsReadout;
  clock: StatutoryClockReadout;
  volumesCompleted: number;
  textureKeys: readonly string[];
  certificate?: TrueEndingCertificate;
  onTitle: () => void;
  canAct: () => boolean;
  onPageChange?: (page: PublicationSummaryPage) => void;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class PublicationSummary {
  private readonly content: Phaser.GameObjects.Container;
  private page: PublicationSummaryPage = "volume";
  private selected = 0;
  private releaseReadingMix?: () => void;
  private buttons: Phaser.GameObjects.Rectangle[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly options: PublicationSummaryOptions) {
    this.content = scene.add.container(0, 0).setDepth(4000).setScrollFactor(0);
    this.draw();
    scene.events.once("shutdown", () => this.clearReadingMix());
  }

  update(input: Readonly<InputState>) {
    if (!this.options.canAct()) return;
    if (input.navLeftJustPressed || input.navRightJustPressed) {
      this.selected = 1 - this.selected;
      this.highlightButtons();
      retroAudio.deskNavigate();
    }
    if (input.cancelJustPressed || input.bJustPressed) {
      if (this.page !== "volume") this.showPage("volume");
    } else if (input.aJustPressed || input.confirmJustPressed || input.startJustPressed) {
      this.activate(this.selected);
    }
  }

  private activate(index: number) {
    if (!this.options.canAct()) return;
    if (index === 1) {
      swallowNextInputFrame();
      this.clearReadingMix();
      this.options.onTitle();
      return;
    }
    this.showPage(this.nextPage());
  }

  private nextPage(): PublicationSummaryPage {
    if (this.page === "volume") return this.options.certificate ? "certificate" : "record";
    if (this.page === "certificate") return "record";
    if (this.page === "record") return "process";
    return this.page === "process" ? "readers" : "volume";
  }

  private showPage(page: PublicationSummaryPage) {
    swallowNextInputFrame();
    if (page === "volume") this.clearReadingMix();
    else this.releaseReadingMix ??= retroAudio.holdReadingMix();
    retroAudio.deskNavigate();
    this.page = page;
    this.selected = 0;
    this.draw();
  }

  private clearReadingMix() {
    this.releaseReadingMix?.();
    this.releaseReadingMix = undefined;
  }

  private text(x: number, y: number, value: string, size = 8, tint: string = PALETTE.creamPaper, origin = 0.5) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: "Arial", fontSize: `${size}px`, color: tint
    }).setOrigin(origin, 0.5);
    this.content.add(text);
    return text;
  }

  private draw() {
    this.content.removeAll(true);
    this.buttons = [];
    this.content.setData("page", this.page).setName("publication-summary");
    this.content.add(this.scene.add.rectangle(128, 120, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby)));
    const backdrop = publicationBackdrop(this.scene);
    if (backdrop) this.content.add(backdrop);
    if (this.page === "volume") this.drawVolume();
    else if (this.page === "certificate") this.drawCertificate();
    else if (this.page === "record") this.drawRecord();
    else if (this.page === "process") this.drawProcess();
    else this.drawReaders();

    [this.nextPage().toUpperCase(), "TITLE"].forEach((label, index) => {
      const x = index === 0 ? 67 : 189;
      const button = this.scene.add.rectangle(x, 216, 110, 44, 0x1a2b38)
        .setName(`publication-${label.toLowerCase()}`);
      this.content.add(button);
      bindPointerDown(button, () => this.activate(index));
      this.buttons.push(button);
      this.text(x, 216, label, 8, PALETTE.goldStamp);
    });
    this.highlightButtons();
    this.options.onPageChange?.(this.page);
  }

  private highlightButtons() {
    this.buttons.forEach((button, index) => button.setStrokeStyle(1,
      color(index === this.selected ? PALETTE.goldStamp : PALETTE.stoneGray)));
  }

  private drawVolume() {
    const { stats, compiler, certificate } = this.options;
    const appealed = stats.publicationOutcome.id === "published_under_appeal";
    this.text(128, 16, certificate?.title ?? "FRUS VOLUME PUBLISHED", 8, PALETTE.goldStamp);
    this.text(128, 30, `COMPILED BY ${compiler.toUpperCase()}`.slice(0, 38), 6);
    const key = this.options.textureKeys.find((candidate) => this.scene.textures.exists(candidate));
    if (key) {
      const cover = this.scene.add.image(128, 100, key).setName("published-frus-volume-hero");
      cover.texture.setFilter(key === "published-volume-v2" ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
      // The canonical completed-volume art is native 128x128. Only legacy art needs fitting.
      const scale = Math.min(1, 128 / cover.width, 128 / cover.height);
      cover.setScale(scale);
      this.content.add(cover);
    } else {
      this.content.add(this.scene.add.rectangle(128, 100, 54, 78, color(PALETTE.buckramRed))
        .setStrokeStyle(2, color(PALETTE.goldStamp)));
      this.text(128, 92, "FRUS", 8, PALETTE.goldStamp);
    }
    this.text(128, 171, certificate
      ? certificate.complete ? "COMPLETE TREATY RECORD" : "CERTIFICATION STILL OPEN"
      : appealed ? "PUBLISHED UNDER APPEAL" : "REVIEWED VOLUME PUBLISHED", 8, PALETTE.goldStamp);
    this.text(128, 184, certificate
      ? certificate.complete ? "DANN-E COULD NOT ERASE YOUR WORK." : "OPEN CHECKS REMAIN ON THE RECORD."
      : appealed
      ? `${stats.unresolvedEquities} UNRESOLVED EQUITIES ON RECORD`
      : "YOUR VOLUME IS READY FOR READERS.", 6);
  }

  private drawCertificate() {
    const certificate = this.options.certificate;
    if (!certificate) return;
    this.text(128, 16, "CERTIFICATION RECORD", 8, PALETTE.goldStamp);
    this.text(128, 31, certificate.complete ? "HUMAN REVIEW COMPLETE" : "OPEN CHECKS SHOWN BELOW", 8);
    certificate.checklist.forEach((line, index) => {
      const y = 50 + index * 15;
      this.text(12, y, line.complete ? "+" : "!", 8, line.complete ? PALETTE.terminalCyan : PALETTE.goldStamp, 0);
      this.text(26, y, line.label, 8, PALETTE.creamPaper, 0);
      this.text(240, y, line.value, 8, line.complete ? PALETTE.terminalCyan : PALETTE.goldStamp, 1);
    });
    this.text(128, 184, "SOURCE: HISTORY.STATE.GOV", 6, PALETTE.creamPaper);
  }

  private drawProcess() {
    this.text(128, 16, "FROM ARCHIVES TO READERS", 8, PALETTE.goldStamp);
    this.text(128, 31, "HOW A VOLUME TAKES SHAPE", 7);
    const stages = [
      ["1  PLAN + RESEARCH", "Set scope; trace records across archives."],
      ["2  SELECT + ANNOTATE", "Explain decisions, context, and sources."],
      ["3  REVIEW + REVISE", "Revise after both reviews; hand off to DPD."],
      ["4  CLEARANCE", "Agencies review their information."],
      ["5  EDIT + PROOF", "Show omissions; compare with originals."],
      ["6  PUBLISH", "Release the reviewed documentary record."]
    ];
    stages.forEach(([heading, detail], index) => {
      const y = 47 + index * 24;
      this.text(16, y, heading, 8, PALETTE.terminalCyan, 0);
      this.text(16, y + 10, detail, 8, PALETTE.creamPaper, 0);
    });
    this.text(128, 188, "RESEARCH ACCESS IS NOT RELEASE.", 7, PALETTE.goldStamp);
  }

  private drawReaders() {
    this.text(128, 16, "WHAT READERS CAN SEE", 8, PALETTE.goldStamp);
    this.text(128, 31, "PUBLICATION DOES NOT OPEN EVERY FILE", 7);
    const notes = [
      ["PRINTED TEXT", "Published text has been declassified.", "Its source may still contain closed material."],
      ["VISIBLE OMISSIONS", "Mark unreleased passages and their extent.", "Account for wholly withheld documents", "in chronology with headings, source notes", "and the number of pages not released."],
      ["TRACEABLE SOURCES", "Notes identify the records behind the text.", "Repository access may still be restricted."]
    ];
    let y = 49;
    for (const [heading, ...lines] of notes) {
      this.text(16, y, heading, 8, PALETTE.terminalCyan, 0);
      lines.forEach((line, index) => this.text(16, y + 12 + index * 11, line, 8, PALETTE.creamPaper, 0));
      y += 19 + lines.length * 11;
    }
    this.text(128, 188, "METHOD: HISTORY.STATE.GOV / ABOUT THE SERIES", 6, PALETTE.goldStamp);
  }

  private drawRecord() {
    const { stats, volumesCompleted, clock } = this.options;
    this.text(128, 16, "PUBLICATION RECORD", 8, PALETTE.goldStamp);
    this.text(128, 31, stats.publicationOutcome.label.toUpperCase(), 6);
    const rows = [
      ["TIME", stats.totalPlayTime],
      ["RELIABILITY", `${stats.finalReliabilityScore}/100`],
      ["DEADLINE", clock.deadlineMissed ? "MISSED" : clock.status === "published" ? "MET" : "PENDING"],
      ["DANN-E DEFEATED", String(stats.danneVariantsDefeated.total)],
      ["COVER PIECES", `${stats.volumePiecesCollected}/${stats.volumePiecesTotal}`],
      ["FIRST EDITION", stats.hiddenCollectibleFound ? "FOUND" : "NOT FOUND"],
      ["VOLUMES FINISHED", String(volumesCompleted)]
    ];
    rows.forEach(([label, value], index) => {
      this.text(16, 48 + index * 14, label, 8, PALETTE.creamPaper, 0);
      this.text(240, 48 + index * 14, value, 8, PALETTE.goldStamp, 1);
    });
    this.text(128, 152, "SKILLS PRACTICED", 6, PALETTE.terminalCyan);
    ["RESEARCH AND SOURCE NOTES", "REFERRALS AND VISIBLE REDACTIONS", "HUMAN REVIEW, PROOFING, PUBLICATION"].forEach((line, index) => {
      this.text(128, 165 + index * 10, line, 6);
    });
  }
}
