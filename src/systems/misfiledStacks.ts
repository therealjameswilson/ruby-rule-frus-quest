import type Phaser from 'phaser';

/** Original folder-stack art, drawn inside the existing obstacle footprint. */
export function addMisfiledStack(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
  const key=`misfiled-folders-${width}x${height}`;
  if(!scene.textures.exists(key)){
    const texture=scene.textures.createCanvas(key,width*8,height*8);
    if(texture){
      const c=texture.getContext();c.scale(8,8);
      c.fillStyle='rgba(11,16,21,.45)';c.fillRect(1,height-2,width-2,2);
      const count=width>40?3:1,span=width/count;
      for(let pile=0;pile<count;pile++){
        const left=pile*span+1,w=span-2;
        const layers=height>12?3:2,step=(height-2)/layers;
        for(let layer=0;layer<layers;layer++){
          const top=height-2-(layer+1)*step,shift=(layer%2?1:-.5);
          const px=left+shift,pw=w-1,depth=Math.max(1.4,step*.42);
          // Cast shadow and irregular page block give each bundle its own weight.
          c.fillStyle='rgba(24,19,17,.55)';c.fillRect(px+.35,top+depth,pw,step-depth+1);
          const paper=c.createLinearGradient(0,top+depth,0,top+step);
          paper.addColorStop(0,'#f4e7c5');paper.addColorStop(.5,'#d8c49d');paper.addColorStop(1,'#9b7954');
          c.fillStyle=paper;c.fillRect(px+.45,top+depth,pw-.7,step-depth);
          for(let line=0;line<4;line++){
            c.fillStyle=line%2?'rgba(255,246,213,.7)':'rgba(94,69,45,.48)';
            c.fillRect(px+.7+(line%2)*.3,top+depth+(step-depth)*line/4,pw-1.4,.13);
          }
          const cover=c.createLinearGradient(px,top,px+pw,top+depth);
          cover.addColorStop(0,layer%2?'#b28b54':'#c8a66d');
          cover.addColorStop(.35,'#ebd6a6');cover.addColorStop(1,'#b08b53');
          c.fillStyle=cover;c.beginPath();c.moveTo(px+.6,top);c.lineTo(px+pw-.8,top);
          c.lineTo(px+pw,top+depth);c.lineTo(px,top+depth);c.closePath();c.fill();
          c.fillStyle='#d3b47d';c.fillRect(px+2+(layer%2)*4,top-.45,5,.7);
          c.strokeStyle='rgba(255,244,208,.7)';c.lineWidth=.18;c.beginPath();c.moveTo(px+.7,top+.25);c.lineTo(px+pw-.9,top+.25);c.stroke();
          c.fillStyle='#866339';c.fillRect(px,top+depth-.2,pw,.28);
          // A tied bundle, with an inset routing slip instead of a uniform red stripe.
          c.fillStyle='#793b3c';c.fillRect(px+pw*.69,top+.1,.65,step-.2);
          c.fillStyle='#bf7470';c.fillRect(px+pw*.69+.1,top+.2,.18,depth-.2);
          c.fillStyle='#f5e9c9';c.fillRect(px+pw*.16,top+.45,pw*.35,Math.max(.7,depth-.7));
          c.fillStyle='#73614b';
          for(let line=0;line<2;line++)c.fillRect(px+pw*.19,top+.7+line*.35,pw*(line?.18:.24),.12);

        }
      }
      texture.refresh();
    }
  }
  if(!scene.textures.exists(key))return scene.add.rectangle(x,y,width,height,0x896746).setDepth(20);
  return scene.add.image(x,y,key).setDisplaySize(width,height).setDepth(20).setName(`misfiled-stack-${width}`);
}
