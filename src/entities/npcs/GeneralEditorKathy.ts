import Phaser from "phaser";
import { unlockCodexEntry } from "../../game/codex";

export const KATHY_TEXTURE = "general-editor-kathy";
export const KATHY_ART_PATH = "assets/characters/kathy/general-editor.png";

/** Photo-based General Editor; legacy quest/save identifiers remain compatible. */
export class GeneralEditorKathy {
  readonly displayName = "General Editor Kathy";
  readonly spriteKey = KATHY_TEXTURE;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  constructor(scene: Phaser.Scene, readonly x: number, readonly y: number) {
    unlockCodexEntry("npc-junior-compiler");
    this.shadow = scene.add.ellipse(x, y + 3, 16, 4, 0x000000, 0.3).setDepth(y - 1);
    this.sprite = scene.add.image(x, y + 5, KATHY_TEXTURE)
      .setDisplaySize(40, 40).setOrigin(0.5, 1).setDepth(y).setName("general-editor-kathy");
  }
  get visualTop() { return this.sprite.getBounds().top; }
  update(_timeMs: number) { /* Keep her feet planted at the editor's desk. */ }
  setVisible(visible: boolean) { this.sprite.setVisible(visible); this.shadow.setVisible(visible); }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}
