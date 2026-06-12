import Phaser from "phaser";
import { ART_PACK_EXTRAS, ART_PACK_IMAGES, portraitIndex } from "../game/artPack";
import { PALETTE } from "../game/constants";
import { clearDialogState, setDialogState } from "../game/state";
import { addPackNineSliceFrame } from "./artPackUi";
import { retroAudio } from "./audio";

type CompleteCallback = () => void;

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class DialogBox {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly portrait: Phaser.GameObjects.Image | null;
  private readonly continueArrow: Phaser.GameObjects.Image | null;
  private pages: string[] = [];
  private speaker = "";
  private index = 0;
  private onComplete?: CompleteCallback;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const packFrame = addPackNineSliceFrame(scene, 128, 204, 244, 64, "dialogue_box_frame");
    const box = packFrame ?? scene.add.rectangle(128, 204, 244, 64, color(PALETTE.black));
    const border = packFrame ? null : scene.add.rectangle(128, 204, 244, 64).setStrokeStyle(2, color(PALETTE.creamPaper));
    const initialPortraitTexture = scene.textures.exists(ART_PACK_EXTRAS.portraits_cast.textureKey)
      ? ART_PACK_EXTRAS.portraits_cast.textureKey
      : scene.textures.exists(ART_PACK_IMAGES.dann_e_boss_portrait.textureKey)
        ? ART_PACK_IMAGES.dann_e_boss_portrait.textureKey
        : null;
    this.portrait = initialPortraitTexture
      ? scene.add.image(35, 204, initialPortraitTexture, initialPortraitTexture === ART_PACK_EXTRAS.portraits_cast.textureKey ? 0 : undefined).setScale(0.105).setVisible(false)
      : null;
    this.continueArrow = scene.textures.exists(ART_PACK_EXTRAS.ui_kit.textureKey) && scene.textures.get(ART_PACK_EXTRAS.ui_kit.textureKey).has("continue_arrow_down")
      ? scene.add.image(232, 226, ART_PACK_EXTRAS.ui_kit.textureKey, "continue_arrow_down").setScale(0.1).setVisible(false)
      : null;
    this.speakerText = scene.add.text(14, 176, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    });
    this.bodyText = scene.add.text(14, 188, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 226, useAdvancedWrap: true },
      lineSpacing: 2
    });
    this.container = scene.add
      .container(0, 0, [box, ...(border ? [border] : []), ...(this.portrait ? [this.portrait] : []), this.speakerText, this.bodyText, ...(this.continueArrow ? [this.continueArrow] : [])])
      .setDepth(900)
      .setScrollFactor(0)
      .setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  show(speaker: string, pages: string[] | string, onComplete?: CompleteCallback) {
    this.speaker = speaker;
    this.pages = Array.isArray(pages) ? pages : [pages];
    this.index = 0;
    this.onComplete = onComplete;
    this.container.setVisible(true);
    this.renderPage();
  }

  advance() {
    if (!this.active) return false;
    this.index += 1;
    if (this.index >= this.pages.length) {
      this.hide();
      return true;
    }
    this.renderPage();
    return true;
  }

  hide() {
    this.container.setVisible(false);
    clearDialogState();
    const complete = this.onComplete;
    this.onComplete = undefined;
    complete?.();
  }

  private renderPage() {
    const text = this.pages[this.index] ?? "";
    this.renderPortrait();
    this.speakerText.setText(`${this.speaker}:`);
    this.bodyText.setText(text);
    this.continueArrow?.setVisible(this.index < this.pages.length - 1);
    retroAudio.blip();
    setDialogState(this.speaker, text);
  }

  private renderPortrait() {
    if (!this.portrait) return;
    const normalized = this.speaker.toLowerCase();
    if (normalized.includes("dann-e") && this.scene.textures.exists(ART_PACK_IMAGES.dann_e_boss_portrait.textureKey)) {
      this.portrait
        .setTexture(ART_PACK_IMAGES.dann_e_boss_portrait.textureKey)
        .setScale(0.052)
        .setVisible(true);
      this.speakerText.setX(64);
      this.bodyText.setX(64);
      this.bodyText.setWordWrapWidth(172);
      return;
    }
    const frame = portraitIndex(this.speaker);
    if (frame >= 0 && this.scene.textures.exists(ART_PACK_EXTRAS.portraits_cast.textureKey)) {
      this.portrait
        .setTexture(ART_PACK_EXTRAS.portraits_cast.textureKey, frame)
        .setScale(0.105)
        .setVisible(true);
      this.speakerText.setX(64);
      this.bodyText.setX(64);
      this.bodyText.setWordWrapWidth(172);
      return;
    }
    this.portrait.setVisible(false);
    this.speakerText.setX(14);
    this.bodyText.setX(14);
    this.bodyText.setWordWrapWidth(226);
  }
}
