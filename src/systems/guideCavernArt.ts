import Phaser from 'phaser';
import { GUIDE_CAVERN_ROOM } from '../game/guideCavernRoom';
import { drawDungeonStoneBlock, drawDungeonWallTorch } from './dungeonWallArt';

/** Explicit visible artwork independent of the packed collision tile indices. */
export function addGuideCavernArt(scene: Phaser.Scene) {
  const key='guide-cavern-stone-v2';
  if(!scene.textures.exists(key)) {
    const t=scene.textures.createCanvas(key,896,640)!;const c=t.getContext();c.scale(4,4);
    const floor=c.createLinearGradient(0,0,0,160);floor.addColorStop(0,'#777b70');floor.addColorStop(1,'#414f4d');c.fillStyle=floor;c.fillRect(0,0,224,160);
    for(let y=16;y<144;y+=16)for(let x=16;x<208;x+=24){c.fillStyle=(x+y)%48?'rgba(214,206,169,.035)':'rgba(16,32,29,.04)';c.fillRect(x,y,24,16);c.strokeStyle='rgba(23,36,32,.28)';c.lineWidth=.4;c.strokeRect(x,y,24,16);c.strokeStyle='rgba(218,212,179,.13)';c.beginPath();c.moveTo(x+.5,y+.5);c.lineTo(x+23,y+.5);c.stroke();}
    for(let i=0;i<4000;i++){c.fillStyle=i%3?'rgba(18,30,26,.11)':'rgba(223,214,177,.12)';c.fillRect((i*73.37)%224,(i*37.91)%160,.35,.25);}
    for(const x of [56,168]){const light=c.createRadialGradient(x,22,2,x,22,82);light.addColorStop(0,'rgba(255,224,154,.27)');light.addColorStop(1,'rgba(255,224,154,0)');c.fillStyle=light;c.fillRect(0,0,224,160);}
    c.strokeStyle='#a89a6b';c.lineWidth=.5;c.strokeRect(23,24,178,115);t.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  const {x,y,columns,rows}=GUIDE_CAVERN_ROOM;
  scene.add.image(x,y,key).setOrigin(0).setDisplaySize(224,160).setDepth(-7).setName('guide-cavern-floor');
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++)if(!row||row===rows-1||!col||col===columns-1)drawDungeonStoneBlock(scene,x+col*16+8,y+row*16+8,'#c4a161',46);
  for(const col of [3,10])drawDungeonWallTorch(scene,x+col*16+8,y+8);
}
