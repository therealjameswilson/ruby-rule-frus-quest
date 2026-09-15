import Phaser from "phaser";

export function createStaplerTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("pack-stapler")) return;
  const art = scene.add.graphics();
  art.fillStyle(0x101820).fillRect(2, 3, 12, 10);
  art.fillStyle(0x8f263b).fillRect(3, 4, 10, 4);
  art.fillStyle(0xdd6675).fillRect(4, 4, 8, 1);
  art.fillStyle(0xdee2dc).fillRect(3, 11, 10, 1);
  art.fillStyle(0x667983).fillRect(3, 9, 3, 2).fillRect(11, 8, 2, 3);
  art.generateTexture("pack-stapler", 16, 16);
  art.destroy();
  scene.textures.get("pack-stapler").setFilter(Phaser.Textures.FilterMode.NEAREST);
}
