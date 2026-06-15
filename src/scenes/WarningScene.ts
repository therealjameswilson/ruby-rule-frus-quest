import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { DANNE_WARNING_SCREEN_ASSET } from "../game/danneAtlas";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";
import { getSkipWarningPreference } from "../game/warningSettings";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function getIntegerFitScale(width: number, height: number) {
  const upScale = Math.floor(Math.min(GAME_WIDTH / width, GAME_HEIGHT / height));
  if (upScale >= 1) return upScale;
  let divisor = Math.ceil(Math.max(width / GAME_WIDTH, height / GAME_HEIGHT));
  while (divisor < 64 && (width / divisor > GAME_WIDTH || height / divisor > GAME_HEIGHT)) {
    divisor += 1;
  }
  while (divisor < 64 && (width % divisor !== 0 || height % divisor !== 0)) {
    divisor += 1;
  }
  return 1 / divisor;
}

export class WarningScene extends Phaser.Scene {
  private inputReadyAt = 0;
  private started = false;

  constructor() {
    super("WarningScene");
  }

  create() {
    setSceneState("WarningScene", "title", "DANN-E warning screen before title.");
    setLatestMessage("Beware DANN-E. Press A to begin.");
    setVisibleEntities([DANNE_WARNING_SCREEN_ASSET.key, "PRESS A TO BEGIN"]);
    if (getSkipWarningPreference()) {
      this.scene.start("TitleScene");
      return;
    }

    this.inputReadyAt = this.time.now + 1500;
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black));
    this.drawWarningCard();
    // The warning card art already carries a "PRESS A TO BEGIN" banner. The scene
    // used to draw a second prompt text on top, which produced the duplicate
    // prompt reported in QA, so it is no longer drawn here.
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.time.delayedCall(8000, () => void this.begin(false));
  }

  update() {
    if (this.started) return;
    tickInput();
    const input = getInput();
    const heldStart = input.a || input.start;
    const pressedStart = input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed;
    if ((this.time.now < this.inputReadyAt && heldStart) || (this.time.now >= this.inputReadyAt && pressedStart)) {
      void this.begin(true);
    }
  }

  private drawWarningCard() {
    const texture = this.textures.get(DANNE_WARNING_SCREEN_ASSET.key);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const width = source.width ?? GAME_WIDTH;
    const height = source.height ?? GAME_HEIGHT;
    const scale = getIntegerFitScale(width, height);
    this.add.image(Math.round(GAME_WIDTH / 2), Math.round(GAME_HEIGHT / 2), DANNE_WARNING_SCREEN_ASSET.key)
      .setOrigin(0.5)
      .setScale(scale);
  }

  private async begin(fromGesture: boolean) {
    if (this.started) return;
    this.started = true;
    if (fromGesture) {
      await retroAudio.unlock();
      retroAudio.confirm();
    }
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("TitleScene");
    });
  }
}
