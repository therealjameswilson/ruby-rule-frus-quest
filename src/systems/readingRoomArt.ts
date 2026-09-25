import Phaser from 'phaser';
import { RESEARCH_PROPS } from './researchProps';
import { drawDungeonStoneBlock, drawDungeonWallTorch } from './dungeonWallArt';

/** Visible room art follows the original walls, shelves and desk collision footprints. */
export function addReadingRoomArt(scene: Phaser.Scene) {
  const key = 'hidden-reading-room-materials-v2';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 1024, 832)!;
    const c = texture.getContext(); c.scale(4, 4); c.translate(0, -32);
    const gradient = (y: number, h: number, a: string, b: string) => {
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, a); g.addColorStop(1, b); return g;
    };
    c.fillStyle = gradient(32, 208, '#ccb994', '#887e66'); c.fillRect(0, 32, 256, 208);
    for (let y = 46; y < 226; y += 12) for (let x = 14; x < 242; x += 38) {
      c.strokeStyle = 'rgba(68,56,40,.25)'; c.lineWidth = .4; c.strokeRect(x, y, 38, 12);
    }
    for (let i = 0; i < 5500; i++) {
      c.fillStyle = i % 3 ? 'rgba(61,45,28,.08)' : 'rgba(255,240,199,.13)';
      c.fillRect(14 + (i * 73.37) % 228, 46 + (i * 37.91) % 180, .7, .2);
    }
    c.fillStyle = gradient(103, 100, '#893b48', '#4f2635'); c.fillRect(90, 103, 76, 100);
    c.strokeStyle = '#c2a16a'; c.lineWidth = .6; c.strokeRect(93, 106, 70, 94); c.strokeRect(95, 108, 66, 90);
    for (const x of [30, 174]) {
      c.fillStyle = 'rgba(23,21,19,.4)'; c.fillRect(x + 1, 52, 53, 19);
      c.fillStyle = gradient(48, 20, '#98764b', '#352c25'); c.fillRect(x, 48, 52, 20);
      for (let row = 0; row < 2; row++) for (let n = 0; n < 12; n++) {
        const bx = x + 2 + n * 4, by = 50 + row * 8;
        c.fillStyle = gradient(by, 6, n % 4 ? '#9d343a' : '#606958', n % 4 ? '#4a1726' : '#253d38'); c.fillRect(bx, by, 3.4, 6);
        c.fillStyle = '#c6a461'; c.fillRect(bx + .3, by + 1, 2.7, .35); c.fillRect(bx + .3, by + 4.5, 2.7, .35);
      }
      c.fillStyle = '#c29c64'; c.fillRect(x, 48, 52, 1); c.fillRect(x, 58, 52, .6); c.fillRect(x, 67, 52, 1);
    }
    if (scene.textures.exists(RESEARCH_PROPS.key)) {
      c.drawImage(scene.textures.get(RESEARCH_PROPS.key).getSourceImage() as HTMLImageElement, 32, 193, 880, 492, 94, 70, 68, 28);
    }
    c.fillStyle = '#372c27'; c.fillRect(117, 136, 22, 3);
    c.fillStyle = gradient(115, 21, '#bd965e', '#65482f'); c.fillRect(116, 115, 24, 21);
    c.strokeStyle = '#e1be7e'; c.lineWidth = .5; c.strokeRect(117, 116, 22, 19);
    texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  scene.add.image(0, 32, key).setOrigin(0).setDisplaySize(256, 208).setDepth(-7).setName('hidden-reading-room-floor');
  for (let x = 8; x < 256; x += 16) {
    drawDungeonStoneBlock(scene, x, 38, '#c4a161', 46);
    if (x < 112 || x >= 144) drawDungeonStoneBlock(scene, x, 234, '#c4a161', 46);
  }
  for (let y = 54; y < 226; y += 16) for (const x of [6, 250]) drawDungeonStoneBlock(scene, x, y, '#c4a161', 46);
  for (const x of [56, 200]) drawDungeonWallTorch(scene, x, 38);
}
