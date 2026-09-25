import Phaser from 'phaser';
import { DANNE_SCENE_GEOMETRY, type DanneMapSceneKey } from '../game/danneSceneCollisions';
import { RESEARCH_PROPS } from './researchProps';
import { ARCHIVE_PROPS } from './archiveEnvironment';

const ROOMS=['CherryBlossomGardenScene','SenateHearingChamberScene','EmbassyCableRoomScene'];
export function preloadSideRoomArt(scene: Phaser.Scene,room: DanneMapSceneKey) {
  const assets=room==='CherryBlossomGardenScene'?[{key:'research-landscape',path:'assets/research-world/landscape.png'},{key:'research-sprites',path:'assets/research-world/sprites.png'}]
    :ROOMS.includes(room)?[RESEARCH_PROPS,ARCHIVE_PROPS]:[];
  for(const art of assets)if(!scene.textures.exists(art.key))scene.load.image(art.key,art.path);
}

/** Decorative surfaces follow the existing collision rectangles, never redefine them. */
export function addSideRoomArt(scene: Phaser.Scene,room: DanneMapSceneKey) {
  if(!ROOMS.includes(room))return false;
  const garden=room==='CherryBlossomGardenScene',senate=room==='SenateHearingChamberScene';
  if(!scene.textures.exists(garden?'research-landscape':RESEARCH_PROPS.key))return false;
  const key=`side-room-materials-v2-${room}`;
  if(!scene.textures.exists(key)) {
    const t=scene.textures.createCanvas(key,1024,960)!;const c=t.getContext();c.scale(4,4);
    let seed=731;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const rect=(x:number,y:number,w:number,h:number,fill:string|CanvasGradient)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);};
    const grad=(x:number,y:number,w:number,h:number,top:string,bottom:string)=>{const g=c.createLinearGradient(x,y,x+w*.15,y+h);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;};
    const line=(x:number,y:number,xx:number,yy:number,fill:string,width=.4)=>{c.strokeStyle=fill;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};
    const ellipse=(x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
    const wood=(x:number,y:number,w:number,h:number)=>{
      rect(x+1,y+2,w,h,'rgba(12,21,22,.3)');rect(x,y,w,h,grad(x,y,w,h,'#ac8150','#453127'));
      for(let i=0;i<Math.floor(h*3);i++)line(x+.7,y+rand()*h,x+w-1,y+rand()*h,'rgba(63,40,24,.07)',.18);
      c.strokeStyle='#c5a169';c.lineWidth=.45;c.strokeRect(x+.7,y+.7,w-1.4,h-1.4);
      rect(x+1,y+h-2,w-2,2,'#463126');line(x+1,y+h-2,x+w-1,y+h-2,'#c39958',.45);
    };
    const image=(key:string,fx:number,fy:number,fw:number,fh:number,x:number,y:number,w:number,h:number)=>{if(scene.textures.exists(key))c.drawImage(scene.textures.get(key).getSourceImage() as HTMLImageElement,fx,fy,fw,fh,x,y,w,h);};
    const desk=(x:number,y:number,w:number,h:number)=>{ellipse(x+w/2,y+h,w/2,2.5,'rgba(14,24,22,.24)');image(RESEARCH_PROPS.key,32,193,880,492,x,y,w,h);};
    if(garden) {
      // Reuse the established sunny-world grass, paths and plant palette.
      const source=scene.textures.get('research-landscape').getSourceImage() as HTMLImageElement;
      c.drawImage(source,0,0,source.width,source.height*.86,0,32,256,208);
      ellipse(63,102,28,21,'rgba(35,60,31,.4)');ellipse(63,99,27,21,'#aaa887');ellipse(63,98,25,19,grad(38,79,50,38,'#437f81','#173e50'));
      for(let i=0;i<20;i++){const a=i*.71;ellipse(63+Math.cos(a)*26,99+Math.sin(a)*19,2.8,1.8,grad(0,0,4,4,'#d1c6a0','#7c826a'));}
      for(let i=0;i<18;i++)line(45+rand()*30,85+rand()*24,48+rand()*28,85+rand()*24,'rgba(200,231,207,.15)',.3);
      for(const [x,y,a] of [[54,94,.4],[70,104,-.5]]){c.save();c.translate(x,y);c.rotate(a);ellipse(0,0,3,1,'#e9aa59');ellipse(-1,0,1,.7,'#f6e7c4');c.restore();}
      // Pavilion footprint is exactly the old 54x36 solid.
      wood(102,48,54,36);rect(106,57,46,23,'#443d32');
      for(const x of [106,148]){rect(x,53,3,28,grad(x,53,3,28,'#cfb884','#655039'));line(x+.4,54,x+.4,80,'#e7d1a1');}
      c.fillStyle=grad(102,48,54,13,'#717e7a','#263c40');c.beginPath();c.moveTo(102,61);c.lineTo(112,48);c.lineTo(147,48);c.lineTo(156,61);c.closePath();c.fill();
      for(let y=51;y<61;y+=2)line(106,y,152,y,'#9aa293',.4);
      for(const x of [117,130,143])line(x,49,x-4,60,'#364b4c',.3);
      rect(105,80,48,3,'#ccb689');line(105,80,153,80,'#f0dfb3');
      const sprites=scene.textures.get('research-sprites').getSourceImage() as HTMLImageElement;const sw=sprites.width/4,sh=sprites.height/4;
      for(const r of DANNE_SCENE_GEOMETRY[room].solids.slice(2))c.drawImage(sprites,sw,sh,sw,sh,r.x,r.y,r.width,r.height);
      c.drawImage(sprites,0,sh*2,sw,sh,83,125,30,21);
      c.drawImage(sprites,sw,sh*3,sw,sh,117,149,22,16);
    } else {
      rect(0,32,256,208,senate?'#40362c':'#33444b');
      rect(12,46,232,177,grad(12,46,232,177,senate?'#8d3d45':'#819895',senate?'#592a36':'#4f6b70'));
      for(let i=0;i<9000;i++){const v=rand();rect(13+rand()*230,46+rand()*177,.22,.25,v>.65?'rgba(242,222,179,.1)':'rgba(14,31,29,.08)');}
      if(senate){c.strokeStyle='#b7955d';c.lineWidth=.7;c.strokeRect(20,51,216,165);c.strokeRect(22,53,212,161);}
      else for(let y=48;y<224;y+=24)for(let x=16;x<242;x+=28){line(x,y,x+28,y,'rgba(31,53,55,.4)',.4);line(x,y,x,y+24,'rgba(31,53,55,.4)',.4);line(x,y+.5,x+27,y+.5,'rgba(208,224,207,.2)',.25);}
      // Beveled wall rails, paneled timber and a clear open south threshold.
      for(const [x,y,w,h] of [[0,36,256,10],[0,46,12,179],[244,46,12,179],[0,225,108,15],[148,225,108,15]])wood(x,y,w,h);
      for(let x=18;x<244;x+=18){rect(x,38,1,6,'#d1b57c');}
      rect(108,223,40,17,'#253b3c');for(let y=223;y<240;y+=4){rect(109,y,38,3,grad(109,y,38,3,'#b6b79d','#52676a'));}
      const solids=DANNE_SCENE_GEOMETRY[room].solids;
      if(senate) {
        const dais=solids[0];wood(dais.x,dais.y,dais.width,dais.height);
        for(let x=34;x<226;x+=27){rect(x,49,18,11,grad(x,49,18,11,'#354e46','#1c302c'));wood(x,61,18,17);c.strokeStyle='#bea16b';c.lineWidth=.35;c.strokeRect(x+2,64,14,11);ellipse(x+9,59,1.1,.5,'#d6c094');}
        for(const r of solids.slice(1,4))desk(r.x,r.y,r.width,r.height);
        for(const r of solids.slice(4))for(let y=r.y;y<r.y+r.height;y+=10){wood(r.x,y,r.width,8);rect(r.x+2,y+2,r.width-4,3,grad(r.x,y,r.width,3,'#536250','#263a32'));}
      } else {
        for(const [i,r] of solids.slice(0,2).entries()) {
          wood(r.x,r.y,r.width,r.height);
          for(const dx of [2,28]) {
            const x=r.x+dx,y=r.y+2;rect(x,y,23,22,grad(x,y,23,22,'#c3c5b4','#52696d'));rect(x+2,y+2,19,10,'#152d32');rect(x+3,y+3,17,8,i?'#3c272e':'#254339');
            for(let j=0;j<3;j++)rect(x+5,y+4+j*2,10-j,.35,i?'#cba89c':'#93bd9c');
            rect(x+2,y+13,19,7,grad(x,y+13,19,7,'#aab5a9','#647570'));
            for(let yy=0;yy<3;yy++)for(let xx=0;xx<7;xx++)rect(x+3+xx*2.3,y+14+yy*1.7,1.6,.95,'#2c3f42');
          }
        }
        const r=solids[2];wood(r.x,r.y,r.width,r.height);rect(r.x+4,r.y+3,r.width-8,25,grad(r.x,r.y,64,34,'#a79463','#4d5146'));
        for(let i=0;i<5;i++){const x=r.x+10+i*11;ellipse(x,r.y+9,4.4,4.4,'#253d3b');ellipse(x,r.y+9,3.6,3.6,'#e1d0a6');line(x,r.y+9,x+1,r.y+6,'#7f3336',.6);}
        for(let yy=0;yy<3;yy++)for(let xx=0;xx<12;xx++)ellipse(r.x+8+xx*4.4,r.y+18+yy*3,1.3,1,'#2b3937');
        const boxes=solids[3];image(ARCHIVE_PROPS.key,1465,199,648,400,boxes.x,boxes.y,boxes.width,boxes.height);
        const door=solids[4];rect(door.x,door.y,door.width,door.height,grad(door.x,door.y,door.width,door.height,'#8da09a','#2b454d'));rect(door.x+3,door.y+3,door.width-6,door.height-6,'#1d3038');rect(door.x+5,door.y+5,door.width-10,door.height-10,grad(0,0,30,40,'#596b70','#30454d'));ellipse(door.x+27,door.y+25,1.5,1.5,'#d7b570');
        for(const [x,color] of [[40,'#70997a'],[174,'#a17673']] as const)line(x,134,128,134,color,.7);
      }
    }
    t.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  scene.add.image(0,0,key).setOrigin(0).setDisplaySize(256,240).setDepth(-18).setName('side-room-detailed-environment');
  return true;
}
