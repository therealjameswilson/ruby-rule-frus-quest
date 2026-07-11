import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { CHARACTER_KEYS, type CharacterKey } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";
import { getInput, tickInput } from "../input/InputState";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

const CYCLE = [
  { label: "IDLE", suffix: "idle-down" },
  { label: "WALK", suffix: "walk-down" },
  { label: "USE", suffix: "interact" },
  { label: "READ", suffix: "reading" },
  { label: "OK", suffix: "approval" }
] as const;

function shortName(key: CharacterKey) {
  return key
    .replace("declassification_", "declass_")
    .replace("coordinator", "coord")
    .replace("statechat_terminal", "statechat")
    .replace(/_/g, "\n")
    .toUpperCase();
}

export class SpriteGallery extends Phaser.Scene {
  private sprites: Array<{ key: CharacterKey; sprite: Phaser.GameObjects.Sprite }> = [];
  private cycleIndex = 0;
  private cycleText!: Phaser.GameObjects.Text;

  constructor() {
    super("SpriteGallery");
  }

  create() {
    setSceneState("SpriteGallery", "debug", "Visual QA: verify all 16-bit character sheets.");
    setVisibleEntities(CHARACTER_KEYS.map((key) => `${key} 32x48 gallery sample`));
    this.cameras.main.setBackgroundColor(PALETTE.black);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy));
    this.drawDither();
    this.add.rectangle(128, 13, 238, 18, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 8, "16-BIT CHARACTER GALLERY", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.cycleText = this.add.text(128, 25, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);

    CHARACTER_KEYS.forEach((key, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 27 + column * 50;
      const y = row === 0 ? 86 : 174;
      this.add.ellipse(x, y + 1, 20, 5, color(PALETTE.black), 0.86);
      const sprite = this.add.sprite(x, y, key).setOrigin(0.5, 0.9).setScale(1);
      this.sprites.push({ key, sprite });
      this.add.text(x, y + 8, shortName(key), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        align: "center",
        lineSpacing: -1
      }).setOrigin(0.5, 0);
    });

    this.add.text(128, 231, "F9 OPENS THIS QA SCENE  |  ?scene=SpriteGallery", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.playCycle();
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.advanceCycle() });
  }

  update() {
    tickInput();
    if (getInput().pauseJustPressed) this.scene.start("TitleScene");
  }

  private advanceCycle() {
    this.cycleIndex = (this.cycleIndex + 1) % CYCLE.length;
    this.playCycle();
  }

  private playCycle() {
    const cycle = CYCLE[this.cycleIndex];
    this.cycleText.setText(`ANIM: ${cycle.label}`);
    setLatestMessage(`Sprite gallery cycling ${cycle.label.toLowerCase()} animations.`);
    for (const entry of this.sprites) {
      const animKey = characterAnimKey(entry.key, cycle.suffix);
      if (this.anims.exists(animKey)) entry.sprite.play(animKey, true);
      else entry.sprite.setFrame(0);
    }
  }

  private drawDither() {
    const graphics = this.add.graphics();
    graphics.fillStyle(color(PALETTE.black), 0.26);
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 0 : 4; x < GAME_WIDTH; x += 8) {
        graphics.fillRect(x, y, 2, 2);
      }
    }
  }
}
