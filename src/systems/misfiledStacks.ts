import type Phaser from 'phaser';

/** Original folder-stack art, drawn inside the existing obstacle footprint. */
export function addMisfiledStack(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
  const key=`misfiled-folders-${width}x${height}`;
  if(!scene.textures.exists(key)){
    const texture=scene.textures.createCanvas(key,width*4,height*4);
    if(texture){
      const c=texture.getContext();c.scale(4,4);
      c.fillStyle='rgba(11,16,21,.45)';c.fillRect(1,height-2,width-2,2);
      const count=width>40?3:1,span=width/count;
      for(let pile=0;pile<count;pile++){
        const left=pile*span+1,w=span-2;
        const layers=height>12?3:2,step=(height-2)/layers;
        for(let layer=0;layer<layers;layer++){
          const top=height-2-(layer+1)*step,shift=(layer%2?1:-.5);
          c.fillStyle='#442f26';c.fillRect(left+shift,top+1,w-.5,step+1);
          const paper=c.createLinearGradient(0,top,0,top+step);
          paper.addColorStop(0,'#f0ddaf');paper.addColorStop(1,'#b79665');
          c.fillStyle=paper;c.fillRect(left+shift,top+1,w-1,step-1);
          c.fillStyle='#e4c995';c.fillRect(left+shift,top,w-1,1.5);
          c.fillRect(left+shift+2,top-.5,5,1);
          c.fillStyle='rgba(90,61,35,.32)';
          for(let line=0;line<2;line++)c.fillRect(left+shift+1,top+step-1.2-line*.55,w-3,.2);
          c.fillStyle='#9a3343';c.fillRect(left+shift+w*.65,top+.5,1.7,step-.5);
        }
      }
      texture.refresh();
    }
  }
  if(!scene.textures.exists(key))return scene.add.rectangle(x,y,width,height,0x896746).setDepth(20);
  return scene.add.image(x,y,key).setDisplaySize(width,height).setDepth(20).setName(`misfiled-stack-${width}`);
}
