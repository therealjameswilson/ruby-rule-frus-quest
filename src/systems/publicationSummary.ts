import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { CompletionStatsReadout } from "../game/state";
import { bindPointerDown, swallowNextInputFrame, type InputState } from "../input/InputState";

interface PublicationSummaryOptions {
  compiler: string;
  stats: CompletionStatsReadout;
  volumesCompleted: number;
  textureKeys: readonly string[];
  onTitle: () => void;
  canAct: () => boolean;
  onPageChange?: (page: "volume" | "record") => void;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class PublicationSummary {
  private readonly content: Phaser.GameObjects.Container;
  private page: "volume" | "record" = "volume";
  private selected = 0;
  private buttons: Phaser.GameObjects.Rectangle[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly options: PublicationSummaryOptions) {
    this.content = scene.add.container(0, 0).setDepth(4000).setScrollFactor(0);
    this.draw();
  }

  update(input: Readonly<InputState>) {
    if (!this.options.canAct()) return;
    if (input.navLeftJustPressed || input.navRightJustPressed) {
      this.selected = 1 - this.selected;
      this.highlightButtons();
    }
    if (input.cancelJustPressed || input.bJustPressed) {
      if (this.page === "record") this.activate(0);
    } else if (input.aJustPressed || input.startJustPressed) {
      this.activate(this.selected);
    }
  }

  private activate(index: number) {
    if (!this.options.canAct()) return;
    swallowNextInputFrame();
    if (index === 1) {
      this.options.onTitle();
      return;
    }
    this.page = this.page === "volume" ? "record" : "volume";
    this.selected = 0;
    this.draw();
  }

  private text(x: number, y: number, value: string, size = 8, tint: string = PALETTE.creamPaper, origin = 0.5) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: "monospace", fontSize: `${size}px`, color: tint
    }).setOrigin(origin, 0.5);
    this.content.add(text);
    return text;
  }

  private draw() {
    this.content.removeAll(true);
    this.buttons = [];
    this.content.setData("page", this.page).setName("publication-summary");
    this.content.add(this.scene.add.rectangle(128, 120, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby)));
    if (this.page === "volume") this.drawVolume();
    else this.drawRecord();

    [this.page === "volume" ? "RECORD" : "VOLUME", "TITLE"].forEach((label, index) => {
      const x = index === 0 ? 67 : 189;
      const button = this.scene.add.rectangle(x, 216, 110, 44, color(PALETTE.black))
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
    const { stats, compiler } = this.options;
    const appealed = stats.publicationOutcome.id === "published_under_appeal";
    this.text(128, 16, "FRUS VOLUME PUBLISHED", 8, PALETTE.goldStamp);
    this.text(128, 30, `COMPILED BY ${compiler.toUpperCase()}`.slice(0, 38), 6);
    const key = this.options.textureKeys.find((candidate) => this.scene.textures.exists(candidate));
    if (key) {
      const cover = this.scene.add.image(128, 100, key).setName("published-frus-volume-hero");
      cover.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      // The canonical completed-volume art is native 128x128. Only legacy art needs fitting.
      const scale = Math.min(1, 128 / cover.width, 128 / cover.height);
      cover.setScale(scale);
      this.content.add(cover);
    } else {
      this.content.add(this.scene.add.rectangle(128, 100, 54, 78, color(PALETTE.buckramRed))
        .setStrokeStyle(2, color(PALETTE.goldStamp)));
      this.text(128, 92, "FRUS", 8, PALETTE.goldStamp);
    }
    this.text(128, 171, appealed ? "PUBLISHED UNDER APPEAL" : "PUBLISHED CLEAN", 8, PALETTE.goldStamp);
    this.text(128, 184, appealed
      ? `${stats.unresolvedEquities} UNRESOLVED EQUITIES ON RECORD`
      : "THE RECORD IS NOW PUBLIC.", 6);
  }

  private drawRecord() {
    const { stats, volumesCompleted } = this.options;
    this.text(128, 16, "PUBLICATION RECORD", 8, PALETTE.goldStamp);
    this.text(128, 31, stats.publicationOutcome.label.toUpperCase(), 6);
    const rows = [
      ["TIME", stats.totalPlayTime],
      ["RELIABILITY", `${stats.finalReliabilityScore}/100`],
      ["DANN-E DEFEATED", String(stats.danneVariantsDefeated.total)],
      ["COVER PIECES", `${stats.volumePiecesCollected}/${stats.volumePiecesTotal}`],
      ["FIRST EDITION", stats.hiddenCollectibleFound ? "FOUND" : "NOT FOUND"],
      ["VOLUMES FINISHED", String(volumesCompleted)]
    ];
    rows.forEach(([label, value], index) => {
      this.text(16, 50 + index * 16, label, 8, PALETTE.creamPaper, 0);
      this.text(240, 50 + index * 16, value, 8, PALETTE.goldStamp, 1);
    });
    this.text(128, 152, "SKILLS PRACTICED", 6, PALETTE.terminalCyan);
    ["RESEARCH AND SOURCE NOTES", "REFERRALS AND VISIBLE REDACTIONS", "HUMAN REVIEW, PROOFING, PUBLICATION"].forEach((line, index) => {
      this.text(128, 165 + index * 10, line, 6);
    });
  }
}
