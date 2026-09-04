import Phaser from "phaser";
import { characterAnimKey } from "../../art/character_anims";
import { ART_PACK_FOOT_OFFSET_Y, ART_PACK_LABEL_OFFSET_Y, ART_PACK_SPRITE_ORIGIN_Y, getCharacterKeyForNpcId } from "../../art/characters";
import { CHARACTERS, PALETTE } from "../../game/constants";
import type { CharacterId } from "../../game/types";
import { getSnesNpcTextureKey } from "../../game/snesAtlas";
import { setPixelPosition, snapPixel } from "../../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class HistorianNPC {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
  readonly id: CharacterId;
  readonly textureKey: string;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, id: CharacterId, x: number, y: number) {
    const character = CHARACTERS[id];
    this.id = id;
    const artPackTexture = getCharacterKeyForNpcId(id);
    const usesArtPackTexture = scene.textures.exists(artPackTexture);
    const snesTexture = getSnesNpcTextureKey(id);
    const usesSnesTexture = !usesArtPackTexture && scene.textures.exists(snesTexture);
    this.textureKey = usesArtPackTexture ? artPackTexture : usesSnesTexture ? snesTexture : id;
    const shadowOffsetY = usesArtPackTexture ? ART_PACK_FOOT_OFFSET_Y : usesSnesTexture ? 14 : 8;
    this.shadow = scene.add
      .ellipse(snapPixel(x), snapPixel(y + shadowOffsetY), usesArtPackTexture || usesSnesTexture ? 18 : 12, 4, color(PALETTE.black), 0.3)
      .setDepth(snapPixel(y - 1));
    this.sprite = scene.add
      .sprite(snapPixel(x), snapPixel(y), this.textureKey, usesArtPackTexture ? 0 : undefined)
      .setOrigin(0.5, usesArtPackTexture ? ART_PACK_SPRITE_ORIGIN_Y : 0.5)
      .setDepth(snapPixel(y));
    if (usesArtPackTexture) {
      const animKey = characterAnimKey(artPackTexture, "idle-down");
      if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    }
    this.label = scene.add
      .text(snapPixel(x), snapPixel(y + (usesArtPackTexture ? ART_PACK_LABEL_OFFSET_Y : usesSnesTexture ? 18 : 12)), character.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        backgroundColor: PALETTE.black
      })
      .setOrigin(0.5, 0)
      .setDepth(snapPixel(y + 1));
    const delay = id.charCodeAt(0) * 45;
    scene.tweens.add({
      targets: [this.sprite, this.label],
      y: "-=1",
      duration: 520,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Stepped",
      onUpdate: () => {
        setPixelPosition(this.sprite, this.sprite.x, this.sprite.y);
        setPixelPosition(this.label, this.label.x, this.label.y);
        setPixelPosition(this.shadow, this.shadow.x, this.shadow.y);
      }
    });
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  destroy() {
    this.shadow.destroy();
    this.sprite.destroy();
    this.label.destroy();
  }
}
