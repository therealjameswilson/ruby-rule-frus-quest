import Phaser from "phaser";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";

export const ARCHIVE_PROPS = { key: "archive-props-v2", path: "assets/art-pack/archive-environment/props-v2.png" };
const ROOM_KEY = "nara-environment-v2";
// Alpha bounds of the original generated atlas; preserve the source RGBA file.
const PROP_FRAMES = [[71,177,646,422], [762,177,649,422], [1465,199,648,400]] as const;

/** A static, high-density room layer; authoritative obstacle footprints stay in the geometry. */
export function addArchiveEnvironment(scene: Phaser.Scene) {
  if (!scene.textures.exists(ARCHIVE_PROPS.key)) return false;
  if (!scene.textures.exists(ROOM_KEY)) {
    const texture = scene.textures.createCanvas(ROOM_KEY, 768, 720);
    if (!texture) return false;
    const c = texture.getContext();
    c.scale(3, 3);
    const rect = (x:number,y:number,w:number,h:number,fill:string) => {c.fillStyle=fill;c.fillRect(x,y,w,h);};
    const line = (x:number,y:number,xx:number,yy:number,fill:string,width=.4) => {
      c.strokeStyle=fill;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();
    };
    const gradient = (x:number,y:number,w:number,h:number,top:string,bottom:string) => {
      const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,top);g.addColorStop(1,bottom);
      c.fillStyle=g;c.fillRect(x,y,w,h);
    };
    rect(0,34,256,206,"#17242a");
    // Quiet terrazzo and thin joint lines give depth without competing with research markers.
    gradient(12,48,232,176,"#bdc6c2","#8eaaa6");
    let seed=8317;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<5500;i++) {
      const x=12+random()*232,y=48+random()*176,size=.18+random()*.48;
      rect(x,y,size,size*.7,i%3 ? "rgba(51,73,68,.12)":"rgba(243,239,210,.33)");
    }
    for(let x=12;x<=244;x+=29)line(x,48,x,224,"rgba(43,66,61,.22)");
    for(let y=48;y<=224;y+=22)line(12,y,244,y,"rgba(43,66,61,.22)");
    // Light pools model overhead fixtures; the paths remain unobstructed.
    for(const [x,y] of [[51,93],[129,93],[205,93],[129,158]]) {
      const g=c.createRadialGradient(x,y,2,x,y,43);
      g.addColorStop(0,"rgba(255,246,205,.23)");g.addColorStop(1,"rgba(255,246,205,0)");
      c.fillStyle=g;c.fillRect(12,48,232,176);
    }
    for(const x of [12,241])rect(x,48,3,176,"#5a716e");
    for(const x of [16,239])line(x,48,x,224,"#c4b680",.6);
    // Limestone walls, a dark skirting strip, and recessed brass fixtures.
    for(let y=48;y<224;y+=22)for(const x of [0,246]) {
      gradient(x,y,10,21,"#c1bca7","#737e78");
      line(x+.5,y+.5,x+9,y+.5,"#e0d9be",.65);
      rect(x+8,y,2,22,"#384c4c");
    }
    for(let x=0;x<256;x+=32) {
      gradient(x,34,31,13,"#c9c0a6","#8b9589");
      line(x+.5,35,x+30,35,"#e9dfbf",.6);
      gradient(x,225,31,15,"#85948b","#3c5558");
    }
    rect(0,46,256,2,"#455b5b");
    for(const x of [40,192]) {
      rect(x,38,24,4,"#485c58");gradient(x+1,38.5,22,2.5,"#fff8dd","#c9c8a8");
    }
    gradient(84,36,88,9,"#344c50","#20383c");
    line(84,36,172,36,"#c9b47c",.5);
    c.font="6.5px Arial";c.textAlign="center";c.textBaseline="middle";
    c.fillStyle="#efe3bd";c.fillText("NARA II STACKS",128,40.7);
    const source=scene.textures.get(ARCHIVE_PROPS.key).getSourceImage() as HTMLImageElement;
    const labels=["17","18","23","A","B","C"];
    DANNE_SCENE_GEOMETRY.NaraStacksScene.solids.forEach((r,index)=> {
      // Soft contact shadow is visual only; all opaque furniture stays inside the collider.
      c.save();c.shadowColor="rgba(13,28,30,.42)";c.shadowBlur=8;c.shadowOffsetY=3;
      rect(r.x+1,r.y+2,r.width-2,r.height-2,"#43534e");c.restore();
      const frame=PROP_FRAMES[index<6 ? index%2 : 2];
      c.drawImage(source,frame[0],frame[1],frame[2],frame[3],r.x,r.y,r.width,r.height);
      if(index<6) {
        const x=r.x+r.width/2;
        gradient(x-6,r.y+3,12,6,"#e2d3aa","#b0a37e");
        line(x-6,r.y+3,x+6,r.y+3,"#f5e5c1");
        c.font="bold 5px Arial";c.textAlign="center";c.textBaseline="middle";
        c.fillStyle="#243431";c.fillText(labels[index],x,r.y+6.1);
      }
    });
    // Inlaid dashed service lines retain the old patrol-route warning.
    for(const y of [92,152])for(let x=88;x<=168;x+=12)line(x,y,x+3,y,"#6b8079",.55);
    for(const x of [24,232])for(let y=98;y<=178;y+=12)line(x,y,x,y+3,"#6b8079",.55);
    // The exact south exit remains open, with brighter step nosings.
    rect(108,211,40,29,"#20373e");
    for(let i=0;i<5;i++) {
      gradient(109,212+i*5,38,4,"#91a59b","#435c60");
      line(109,212+i*5,147,212+i*5,"#d1bd82",.6);
    }
    texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  scene.add.image(0,0,ROOM_KEY).setOrigin(0).setDisplaySize(256,240).setDepth(-18).setName("archive-environment");
  return true;
}
