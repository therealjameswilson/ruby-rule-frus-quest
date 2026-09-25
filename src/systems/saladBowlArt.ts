import Phaser from 'phaser';

/** Tiny glazed bowl and layered vegetables, cached at six-times display density. */
export function addSaladBowlArt(scene: Phaser.Scene) {
  const key='sweetgreen-salad-bowl-v2';
  if(!scene.textures.exists(key)) {
    const t=scene.textures.createCanvas(key,144,96)!;const c=t.getContext();c.scale(6,6);
    const oval=(x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
    oval(12,13,10,1.5,'rgba(27,47,28,.22)');
    const glaze=c.createLinearGradient(0,6,0,14);glaze.addColorStop(0,'#fff9e7');glaze.addColorStop(.35,'#e3e8d9');glaze.addColorStop(1,'#91a693');
    c.fillStyle=glaze;c.beginPath();c.moveTo(1,6);c.bezierCurveTo(2,16,22,16,23,6);c.closePath();c.fill();oval(12,6,11,4.5,'#fff8e4');oval(12,6,9.5,3.4,'#2d5934');
    for(let i=0;i<24;i++) {
      const a=i*2.4,r=2+(i%5)*1.3,x=12+Math.cos(a)*r,y=5.8+Math.sin(a)*r*.35;
      const leaf=c.createLinearGradient(x-1,y-1,x+1,y+2);leaf.addColorStop(0,['#a4c968','#82af50','#b3d078'][i%3]);leaf.addColorStop(1,'#42692e');
      c.fillStyle=leaf;c.beginPath();c.ellipse(x,y,1.8,.9,a,0,Math.PI*2);c.fill();c.strokeStyle='rgba(222,235,166,.4)';c.lineWidth=.15;c.beginPath();c.moveTo(x-1,y);c.lineTo(x+1,y+.2);c.stroke();
    }
    for(const [x,y] of [[7,5],[15,7],[18,5],[10,8]]){oval(x,y,1.2,.75,'#b44631');oval(x-.2,y-.2,.8,.45,'#e7894e');oval(x-.4,y-.35,.25,.12,'#f6c68a');}
    for(const [x,y] of [[10,4],[14,5],[6,7]]){c.fillStyle='#d5b676';c.fillRect(x,y,1.5,.9);c.fillStyle='#f2dc9f';c.fillRect(x,y,1.5,.25);}
    c.strokeStyle='rgba(255,255,230,.8)';c.lineWidth=.45;c.beginPath();c.ellipse(12,6,10.7,4.3,0,.15,Math.PI-.15);c.stroke();t.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return scene.add.image(55,181,key).setDisplaySize(24,16).setDepth(182).setName('sweetgreen-salad-bowl');
}
