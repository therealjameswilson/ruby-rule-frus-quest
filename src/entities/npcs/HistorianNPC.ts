import Phaser from "phaser";
import { characterAnimKey } from "../../art/character_anims";
import { ART_PACK_FOOT_OFFSET_Y, ART_PACK_LABEL_OFFSET_Y, ART_PACK_SPRITE_ORIGIN_Y, getCharacterKeyForNpcId, heroCharacterKey, characterTextureDensity } from "../../art/characters";
import { CHARACTERS, PALETTE } from "../../game/constants";
import type { CharacterId } from "../../game/types";
import { getSnesNpcTextureKey } from "../../game/snesAtlas";
import { snapPixel } from "../../systems/pixelPerfect";
import { detailedNpcSprite } from '../../art/npcSprites';

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
    const candidate = detailedNpcSprite(id);
    const detailedNpc = candidate && scene.textures.exists(candidate.key) ? candidate : undefined;
    const baseTexture = getCharacterKeyForNpcId(id);
    const detailedTexture = heroCharacterKey(baseTexture);
    const artPackTexture = scene.textures.exists(detailedTexture) ? detailedTexture : baseTexture;
    const usesArtPackTexture = scene.textures.exists(artPackTexture);
    const snesTexture = getSnesNpcTextureKey(id);
    const usesSnesTexture = !usesArtPackTexture && scene.textures.exists(snesTexture);
    this.textureKey = detailedNpc?.key ?? (usesArtPackTexture ? artPackTexture : usesSnesTexture ? snesTexture : id);
    const groundedArt = Boolean(detailedNpc) || usesArtPackTexture;
    const shadowOffsetY = groundedArt ? ART_PACK_FOOT_OFFSET_Y : usesSnesTexture ? 14 : 8;
    this.shadow = scene.add
      .ellipse(snapPixel(x), snapPixel(y + shadowOffsetY), groundedArt || usesSnesTexture ? 18 : 12, 4, color(PALETTE.black), 0.3)
      .setDepth(snapPixel(y - 1));
    this.sprite = scene.add
      .sprite(snapPixel(x), snapPixel(y), this.textureKey, !detailedNpc && usesArtPackTexture ? 0 : undefined)
      .setName(`historian-${id}`)
      .setOrigin(detailedNpc?.centerX ?? 0.5, detailedNpc ? detailedNpc.soleY - ART_PACK_FOOT_OFFSET_Y / 48 : usesArtPackTexture ? ART_PACK_SPRITE_ORIGIN_Y : 0.5)
      .setDepth(snapPixel(y));
    if (detailedNpc) {
      this.sprite.setDisplaySize(32, 48);
    } else if (usesArtPackTexture) {
      this.sprite.setScale(1 / characterTextureDensity(artPackTexture));
      const animKey = characterAnimKey(artPackTexture, "idle-down");
      if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    }
    this.label = scene.add
      .text(snapPixel(x), snapPixel(y + (groundedArt ? ART_PACK_LABEL_OFFSET_Y : usesSnesTexture ? 18 : 12)), character.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        backgroundColor: PALETTE.black
      })
      .setOrigin(0.5, 0)
      .setDepth(snapPixel(y + 1));
    // Idle poses keep feet planted; moving the whole sprite detached it from its shadow.
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
