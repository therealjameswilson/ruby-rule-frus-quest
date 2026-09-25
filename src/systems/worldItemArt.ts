import Phaser from 'phaser';
import { COMBAT_TOOL_ART } from '../art/combatTools';

const SIZES: Record<string, number> = {
  manuscript:18, telegram:24, 'source-note':24, 'cross-reference':24,
  'proof-page':24, 'concurrence-slip':24, 'referral-manifest':24,
  'excision-bracket-marker':24, 'volume-fragment':24,
  'citation-stamp':24, 'red-pencil':24, 'review-folder':24,
  'clearance-token':24, 'agency-equity-seal':24, 'proof-lens':24, 'buckram-key':24
};
const TOOLS: Record<string,string> = {
  'citation-stamp':COMBAT_TOOL_ART.citation_stamp.key,
  'red-pencil':COMBAT_TOOL_ART.red_pencil.key,
  'review-folder':COMBAT_TOOL_ART.review_folder.key
};

/** One physical-object style for pickups, carried records, rewards and workstations. */
export function worldItemImage(scene: Phaser.Scene, x: number, y: number, key: string | Phaser.Textures.Texture, frame?: string | number) {
  if(typeof key!=='string'||!(key in SIZES)||frame!==undefined||!scene.textures?.createCanvas)return frame===undefined?scene.add.image(x,y,key):scene.add.image(x,y,key,frame);
  const detailed=TOOLS[key] && scene.textures.exists(TOOLS[key]) ? TOOLS[key] : worldItemTexture(scene,key);
  if(!detailed)return frame===undefined?scene.add.image(x,y,key):scene.add.image(x,y,key,frame);
  return scene.add.image(x,y,detailed).setDisplaySize(SIZES[key],SIZES[key]);
}

function worldItemTexture(scene: Phaser.Scene, id: string) {
  const key=`world-item-detail-v2-${id}`;
  if(scene.textures.exists(key))return key;
  const t=scene.textures.createCanvas(key,144,144);if(!t)return null;
  const c=t.getContext();c.scale(6,6);
  const rect=(x:number,y:number,w:number,h:number,fill:string|CanvasGradient)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);};
  const gradient=(top:string,bottom:string)=>{const g=c.createLinearGradient(3,2,20,22);g.addColorStop(0,top);g.addColorStop(.5,top);g.addColorStop(1,bottom);return g;};
  const gold=gradient('#e6cf8f','#8d6a36');
  c.lineWidth=.4;
  if(id==='proof-lens') {
    c.lineCap='round';c.strokeStyle='#382a25';c.lineWidth=3;c.beginPath();c.moveTo(15,15);c.lineTo(21,21);c.stroke();c.strokeStyle='#b99a60';c.lineWidth=.7;c.stroke();
    c.fillStyle='rgba(181,215,209,.45)';c.beginPath();c.arc(10,10,7,0,Math.PI*2);c.fill();c.strokeStyle='#514438';c.lineWidth=1.6;c.stroke();c.strokeStyle='#dbbe78';c.lineWidth=.65;c.stroke();
    c.strokeStyle='rgba(248,248,218,.9)';c.lineWidth=.6;c.beginPath();c.arc(10,10,5.5,3.3,4.6);c.stroke();
  } else if(id==='buckram-key') {
    c.strokeStyle='#6e5433';c.lineWidth=3.4;c.beginPath();c.moveTo(10,10);c.lineTo(19,19);c.stroke();c.strokeStyle='#dfbc6d';c.lineWidth=2.2;c.stroke();
    c.fillStyle=gold;c.beginPath();c.arc(7,7,5.5,0,Math.PI*2);c.fill();c.fillStyle='#6c272a';c.beginPath();c.arc(7,7,2.7,0,Math.PI*2);c.fill();rect(17,18,2,4,gold);rect(20,17,2,3,gold);
  } else if(id==='agency-equity-seal'||id==='clearance-token') {
    c.fillStyle='#57282b';c.beginPath();c.moveTo(7,13);c.lineTo(5,23);c.lineTo(10,20);c.lineTo(13,23);c.lineTo(16,13);c.fill();
    c.fillStyle=gold;c.beginPath();c.arc(12,10,8,0,Math.PI*2);c.fill();c.strokeStyle='#705537';c.lineWidth=.6;c.stroke();c.beginPath();c.arc(12,10,6.1,0,Math.PI*2);c.stroke();
    c.strokeStyle='#fff0b4';c.lineWidth=.45;c.beginPath();c.arc(12,10,7,3,5.3);c.stroke();
    c.fillStyle='#71613d';c.font='bold 5px Georgia';c.textAlign='center';c.fillText(id==='clearance-token'?'✓':'§',12,12);
  } else if(id==='volume-fragment') {
    rect(3,3,18,19,'#362a25');rect(4,2,16,18,gradient('#a63c41','#5d1f28'));
    for(let i=0;i<70;i++)rect(4+(i*1.73)%16,2+(i*2.31)%18,.23,.45,'rgba(234,169,124,.2)');
    c.strokeStyle='#c49d56';c.lineWidth=.4;c.strokeRect(5.5,3.5,13,15);c.strokeRect(6.5,4.5,11,13);
    c.fillStyle='#e9c783';c.font='bold 3px Georgia';c.textAlign='center';c.fillText('FRUS',12,10);rect(8,13,8,.3,'#d8b569');
  } else {
    rect(4,3,17,20,'rgba(26,30,26,.3)');rect(3,2,17,20,'#b0a68b');rect(2.5,1.5,17,20,gradient('#fff4d7','#d1c5a5'));
    rect(3.2,2, .35,19,'#fdf6df');rect(3.6,3,1,17,id==='concurrence-slip'?'#4a7e70':'#7d3039');
    c.fillStyle='#e9ddbd';c.beginPath();c.moveTo(15.5,1.5);c.lineTo(19.5,5.5);c.lineTo(15.5,5.5);c.closePath();c.fill();c.strokeStyle='#b3a78b';c.lineWidth=.3;c.stroke();
    rect(6,4.5,7,.7,'#645c4e');rect(6,6,9,.35,'#91816b');
    for(let row=0;row<6;row++){const end=[10,8,11,9,7,10][row];rect(6,8+row*1.35,end,.28,'#857966');for(let j=0;j<3;j++)rect(7+j*3,8+row*1.35,.6,.3,'#e8dabb');}
    c.strokeStyle=id==='concurrence-slip'?'#457369':'#923b3b';c.lineWidth=.55;c.beginPath();c.moveTo(11,18);c.bezierCurveTo(15,15,12,21,17,17);c.stroke();
    if(id==='proof-page'||id==='excision-bracket-marker'){c.strokeStyle='#ac4444';c.lineWidth=.4;c.strokeRect(5.5,10.2,11.5,3);}
    if(id==='cross-reference'){c.strokeStyle='#847255';c.lineWidth=.8;c.beginPath();c.moveTo(9,2);c.lineTo(9,5);c.quadraticCurveTo(7,7,6,5);c.lineTo(6,1.7);c.quadraticCurveTo(8,-.2,9,2);c.stroke();}
  }
  t.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);return key;
}
