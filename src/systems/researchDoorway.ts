import type Phaser from 'phaser';

/** Cached original oak door joinery and stone thresholds, sized for research rooms. */
export function researchDoorway(scene: Phaser.Scene, x: number, y: number, kind: 'wing' | 'outside' | 'closed') {
  const key=`research-door-${kind}-v1`;
  if(!scene.textures.exists(key)){
    const texture=scene.textures.createCanvas(key,160,112);
    if(!texture)return null;
    const c=texture.getContext();c.scale(4,4);
    c.fillStyle='rgba(10,18,22,.35)';c.fillRect(1,2,38,26);
    const frame=c.createLinearGradient(0,0,0,26);
    frame.addColorStop(0,'#b49662');frame.addColorStop(.2,'#795836');frame.addColorStop(1,'#3d3026');
    c.fillStyle=frame;c.fillRect(2,0,36,26);
    c.fillStyle='#dfc997';c.fillRect(2,0,36,.7);c.fillRect(3,1,.5,24);c.fillRect(36.5,1,.5,24);
    const recess=c.createLinearGradient(0,3,0,25);
    recess.addColorStop(0,kind==='outside'?'#729b9b':'#101e26');
    recess.addColorStop(1,kind==='outside'?'#e4e6c7':'#435553');
    c.fillStyle=recess;c.fillRect(6,3,28,22);
    if(kind==='outside'){
      // A pale stone path and planted edges suggest daylight beyond the south exit.
      c.fillStyle='#799167';c.fillRect(6,4,5,18);c.fillRect(29,4,5,18);
      c.fillStyle='#d8d9bd';c.beginPath();c.moveTo(14,4);c.lineTo(26,4);c.lineTo(31,25);c.lineTo(9,25);c.closePath();c.fill();
      c.strokeStyle='rgba(87,109,102,.25)';c.lineWidth=.35;
      for(const yy of [9,15,22]){c.beginPath();c.moveTo(10,yy);c.lineTo(30,yy);c.stroke();}
    }else{
      const shut=kind==='closed';
      for(const right of [false,true]){
        const dx=right?(shut?20.3:30):6,w=shut?13.7:4;
        const oak=c.createLinearGradient(dx,0,dx+w,0);oak.addColorStop(0,'#4b3429');oak.addColorStop(.5,'#856044');oak.addColorStop(1,'#402f28');
        c.fillStyle=oak;c.fillRect(dx,3,w,21);
        c.strokeStyle='#b29463';c.lineWidth=.35;c.strokeRect(dx+1,5,w-2,7);c.strokeRect(dx+1,14,w-2,8);
        c.fillStyle='#dac484';c.fillRect(right?dx+1:dx+w-2,12,1,2.5);
      }
    }
    const sill=c.createLinearGradient(0,24,0,28);sill.addColorStop(0,'#e0d9c2');sill.addColorStop(.5,'#aaa994');sill.addColorStop(1,'#575d59');
    c.fillStyle=sill;c.fillRect(4,24,32,4);c.fillStyle='#c9b984';c.fillRect(7,24,26,.5);
    texture.refresh();
  }
  return scene.add.image(x,y,key).setDisplaySize(40,28).setDepth(47).setName(`research-doorway-${kind}`);
}
