import Phaser from 'phaser';
import { INTERIOR_TILES } from '../game/networkN1Tilemap';
import { packedTileGid } from '../game/packedTileIndex';

/** Four-times-density masonry, shared by every room and cached by accent/variation. */
export function drawDungeonStoneBlock(scene: Phaser.Scene, x: number, y: number, accent: string, depth = 40) {
  const variant = Math.abs(Math.round(x / 16) + Math.round(y / 16) * 3) % 4;
  const key = `dungeon-masonry-v2-${accent}-${variant}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 64, 64)!;
    const c = texture.getContext(); c.scale(4, 4);
    c.fillStyle = '#1c272b'; c.fillRect(0, 0, 16, 16);
    const brick = (bx: number, by: number, w: number, h: number, i: number) => {
      const g = c.createLinearGradient(bx, by, bx + w * .35, by + h);
      g.addColorStop(0, ['#a1aba7', '#9aa8a5', '#a4aaa2', '#96a3a1'][(i + variant) % 4]);
      g.addColorStop(.25, '#7d8b88'); g.addColorStop(1, '#526461');
      c.fillStyle = g; c.fillRect(bx, by, w, h);
      c.strokeStyle = '#b9c0b3'; c.lineWidth = .3;
      c.beginPath(); c.moveTo(bx + .3, by + h - .4); c.lineTo(bx + .3, by + .3); c.lineTo(bx + w - .4, by + .3); c.stroke();
      c.strokeStyle = '#394b49'; c.lineWidth = .5;
      c.beginPath(); c.moveTo(bx + w - .3, by + .6); c.lineTo(bx + w - .3, by + h - .3); c.lineTo(bx + .5, by + h - .3); c.stroke();
      for (let j = 0; j < 35; j++) {
        const px = bx + .7 + ((j * 17 + variant * 13 + i * 7) % 83) / 83 * (w - 1.4);
        const py = by + .7 + ((j * 29 + i * 19) % 79) / 79 * (h - 1.4);
        c.fillStyle = j % 3 ? 'rgba(23,43,41,.16)' : 'rgba(229,225,200,.24)';
        c.fillRect(px, py, .25 + (j % 2) * .2, .2);
      }
      c.strokeStyle = 'rgba(43,59,55,.28)'; c.lineWidth = .18;
      c.beginPath(); c.moveTo(bx + w * .35, by + 1); c.lineTo(bx + w * .42, by + h * .5); c.lineTo(bx + w * .68, by + h * .65); c.stroke();
    };
    brick(.5,.5,15,7,0); brick(.5,8,7,7.5,1); brick(8,8,7.5,7.5,2);
    // Small bronze room-color stud; masonry remains the dominant material.
    c.fillStyle='#30423e';c.fillRect(11.1,2,3.3,2.4);
    c.fillStyle='#b49d68';c.fillRect(11.2,2.1,3,2);
    c.fillStyle=accent;c.fillRect(11.7,2.6,2,1);
    c.fillStyle='#efe1ba';c.fillRect(11.3,2.2,2.7,.2);
    texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return scene.add.image(Math.round(x), Math.round(y), key).setDisplaySize(16,16).setDepth(depth).setName('crisp-dungeon-wall');
}

export function drawDungeonWallTorch(scene: Phaser.Scene, x: number, y: number) {
  const key='dungeon-brass-sconce-v2';
  if(!scene.textures.exists(key)) {
    const t=scene.textures.createCanvas(key,64,64)!;const c=t.getContext();c.scale(4,4);
    const halo=c.createRadialGradient(8,6,1,8,6,7);halo.addColorStop(0,'rgba(255,212,127,.25)');halo.addColorStop(1,'rgba(255,194,95,0)');c.fillStyle=halo;c.fillRect(0,0,16,16);
    const brass=c.createLinearGradient(5,0,11,0);brass.addColorStop(0,'#514332');brass.addColorStop(.4,'#d6b97b');brass.addColorStop(1,'#796444');
    c.fillStyle='#25302d';c.fillRect(6,7,4,8);c.fillStyle=brass;c.fillRect(6.5,7.5,3,6.5);c.fillRect(4,8,8,2);
    c.fillStyle='#f1d791';c.beginPath();c.moveTo(8,1);c.bezierCurveTo(9,4,12,5,10,8);c.bezierCurveTo(6,11,4,6,8,1);c.fill();
    c.fillStyle='#fff4d1';c.beginPath();c.ellipse(8,6.5,1.2,2.3,0,0,Math.PI*2);c.fill();
    c.fillStyle='#f0d096';c.fillRect(4.5,8.2,7,.4);t.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return scene.add.image(Math.round(x),Math.round(y),key).setDisplaySize(16,16).setDepth(47).setName('crisp-dungeon-wall-torch');
}

export function drawCrispInteriorWalls(scene: Phaser.Scene, tiles: readonly (readonly number[])[], x: number, y: number, accent: string, track: (object: Phaser.GameObjects.Image) => void) {
  const wallTiles=[INTERIOR_TILES.wallPanel,INTERIOR_TILES.wallMetal,INTERIOR_TILES.wallBrick,INTERIOR_TILES.wallBlue].map(packedTileGid);
  tiles.forEach((row,ty)=>row.forEach((tile,tx)=>{if(wallTiles.includes(tile))track(drawDungeonStoneBlock(scene,x+tx*16+8,y+ty*16+8,accent,46));}));
}
