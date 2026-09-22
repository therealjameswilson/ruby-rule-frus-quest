import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { DANNE_INTRO } from "../game/danneIntro";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";
import { bindPointerDown, getInput, isTouchInputCapable, swallowNextInputFrame, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class DanneIntroScene extends Phaser.Scene {
  private page = 0;
  private leaving = false;
  private readyAt = 0;
  private heading!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  private boast!: Phaser.GameObjects.Text;
  private copy!: Phaser.GameObjects.Text;
  private nextLabel!: Phaser.GameObjects.Text;
  private backButton!: Phaser.GameObjects.Rectangle;
  private backLabel!: Phaser.GameObjects.Text;

  constructor() { super("DanneIntroScene"); }

  create() {
    this.page = 0;
    this.leaving = false;
    this.readyAt = this.time.now + 250;
    swallowNextInputFrame();
    setSceneState("DanneIntroScene", "title", "Meet DANN-E before starting your volume.");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    retroAudio.startMusic("CharacterCreateScene");
    this.add.rectangle(128, 120, 240, 228, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp));
    const text = (x: number, y: number, value: string, ink: string = PALETTE.creamPaper) => this.add.text(x, y, value, {
      fontFamily: "monospace", fontSize: "8px", color: ink, lineSpacing: 2
    });
    text(128, 12, "DANN-E'S CAMPAIGN", PALETTE.goldStamp).setOrigin(0.5, 0);
    this.counter = text(128, 24, "", PALETTE.terminalCyan).setOrigin(0.5, 0);
    if (this.textures.exists("danne-boss-combat")) {
      this.add.sprite(128, 61, "danne-boss-combat").setDisplaySize(42, 52);
    }
    // Original, restrained ego-bolt trails keep the villain's threat visible.
    for (const [x, direction] of [[34, 1], [222, -1]]) {
      const bolt = this.add.rectangle(x, 62, 7, 3, color(PALETTE.classNetRed));
      this.add.rectangle(x - direction * 7, 62, 4, 1, color(PALETTE.goldStamp));
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.tweens.add({ targets: bolt, x: x + direction * 24, duration: 1000, yoyo: true, repeat: -1 });
      }
    }
    this.boast = text(128, 88, "", PALETTE.terminalCyan).setOrigin(0.5, 0);
    this.heading = text(128, 104, "", PALETTE.goldStamp).setOrigin(0.5, 0);
    this.copy = text(20, 121, "").setName("danne-intro-copy");
    text(128, 178, isTouchInputCapable() ? "YOUR PACE. TAP NEXT OR SKIP." : "Z/ENTER: NEXT   ESC: SKIP", PALETTE.stoneLight).setOrigin(0.5, 0);
    const button = (x: number, width: number, label: string, action: () => void) => {
      const box = this.add.rectangle(x, 211, width, 44, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp));
      const caption = text(x, 211, label).setOrigin(0.5);
      bindPointerDown(box, action);
      return { box, caption };
    };
    const back = button(36, 44, "BACK", () => this.back());
    this.backButton = back.box; this.backLabel = back.caption;
    this.nextLabel = button(121, 114, "NEXT", () => this.next()).caption;
    button(213, 58, "SKIP", () => this.finish());
    this.renderPage();
  }

  update() {
    tickInput();
    if (this.leaving || this.time.now < this.readyAt) return;
    const input = getInput();
    if (input.cancelJustPressed || input.bJustPressed) this.finish();
    else if (input.navLeftJustPressed) this.back();
    else if (input.aJustPressed || input.confirmJustPressed || input.startJustPressed || input.navRightJustPressed) this.next();
  }

  private renderPage() {
    const card = DANNE_INTRO[this.page];
    this.counter.setText(`${this.page + 1} / ${DANNE_INTRO.length}`);
    this.heading.setText(card.phase);
    this.boast.setText(card.boast);
    this.copy.setText(card.lines.join("\n"));
    this.nextLabel.setText(this.page === DANNE_INTRO.length - 1 ? "BEGIN QUEST" : "NEXT");
    this.backButton.setVisible(this.page > 0);
    this.backLabel.setVisible(this.page > 0);
    setLatestMessage(`${card.phase} ${card.boast} ${card.lines.join(" ")}`);
    setVisibleEntities(["DANN-E", "ego bolts", `Intro ${this.page + 1}/${DANNE_INTRO.length}`, ...(this.page ? ["Back"] : []), this.nextLabel.text, "Skip intro"]);
  }

  private back() {
    if (this.leaving || this.time.now < this.readyAt || this.page === 0) return;
    this.page--; this.readyAt = this.time.now + 180; this.renderPage();
  }

  private next() {
    if (this.leaving || this.time.now < this.readyAt) return;
    if (this.page === DANNE_INTRO.length - 1) { this.finish(); return; }
    this.page++; this.readyAt = this.time.now + 180; this.renderPage();
  }

  private finish() {
    if (this.leaving || this.time.now < this.readyAt) return;
    this.leaving = true;
    swallowNextInputFrame();
    transitionTo(this, "OfficeScene");
  }
}
