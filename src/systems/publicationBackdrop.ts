import type Phaser from 'phaser';
const KEY='publication-backdrop-v1';
export function publicationBackdrop(scene:Phaser.Scene){
  if(!scene.textures.exists(KEY)) {
    const texture=scene.textures.createCanvas(KEY,768,720);
    if(!texture)return null;
    const c=texture.getContext();c.scale(3,3);
    c.fillStyle='#101925';c.fillRect(0,0,256,240);
    const halo=c.createRadialGradient(128,103,8,128,103,115);
    halo.addColorStop(0,'#3f3a32');halo.addColorStop(.55,'#202c36');halo.addColorStop(1,'#101925');
    c.fillStyle=halo;c.fillRect(0,0,256,240);
    c.strokeStyle='rgba(214,178,100,.45)';c.lineWidth=.5;c.strokeRect(3,3,250,236);
    for(const y of [40,162,191]){c.strokeStyle='rgba(214,178,100,.28)';c.beginPath();c.moveTo(20,y);c.lineTo(236,y);c.stroke();}
    for(let i=0;i<22;i++){
      const angle=i*2.39996,radius=39+(i%5)*10,x=128+Math.cos(angle)*radius,y=102+Math.sin(angle)*radius*.68;
      c.fillStyle=`rgba(230,197,124,${.12+(i%3)*.08})`;c.fillRect(x,y,.6,.6);
    }
    const shadow=c.createRadialGradient(128,154,1,128,154,47);
    shadow.addColorStop(0,'rgba(0,0,0,.38)');shadow.addColorStop(1,'rgba(0,0,0,0)');
    c.save();c.translate(0,123);c.scale(1,.2);c.fillStyle=shadow;c.fillRect(65,100,126,110);c.restore();
    texture.refresh();
  }
  return scene.add.image(128,120,KEY).setDisplaySize(256,240).setName('publication-backdrop');
}
