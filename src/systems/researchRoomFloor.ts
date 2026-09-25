import type Phaser from 'phaser';

/** Cached high-density terrazzo; furniture and collision layers remain authoritative. */
export function addResearchRoomFloor(scene: Phaser.Scene, annotation: boolean) {
  const key=annotation?'annotation-terrazzo-v1':'source-terrazzo-v1';
  if(!scene.textures.exists(key)) {
    const texture=scene.textures.createCanvas(key,768,624);
    if(!texture)return null;
    const c=texture.getContext();c.scale(3,3);
    const base=c.createLinearGradient(0,0,0,192);
    base.addColorStop(0,annotation?'#b8c2b8':'#c6beaa');
    base.addColorStop(1,annotation?'#8a9e99':'#9b9987');
    c.fillStyle=base;c.fillRect(0,0,256,192);
    let seed=9407;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<6500;i++) {
      c.fillStyle=i%3?'rgba(35,51,48,.09)':'rgba(255,248,222,.22)';
      const size=.18+random()*.45;c.fillRect(random()*256,random()*192,size,size*.65);
    }
    c.lineWidth=.35;c.strokeStyle='rgba(40,56,53,.19)';
    for(let x=16;x<256;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,192);c.stroke();}
    for(let y=16;y<192;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}
    // Low-contrast perimeter inlay and soft overhead illumination.
    c.strokeStyle='rgba(71,84,76,.4)';c.lineWidth=1.5;c.strokeRect(19,19,218,154);
    c.strokeStyle='rgba(239,220,158,.5)';c.lineWidth=.45;c.strokeRect(21,21,214,150);
    for(const x of [64,192]) {
      const light=c.createRadialGradient(x,52,1,x,52,82);
      light.addColorStop(0,'rgba(255,248,215,.25)');light.addColorStop(1,'rgba(255,248,215,0)');
      c.fillStyle=light;c.fillRect(0,0,256,192);
    }
    const shade=c.createLinearGradient(0,15,0,28);shade.addColorStop(0,'rgba(17,33,32,.2)');shade.addColorStop(1,'rgba(17,33,32,0)');
    c.fillStyle=shade;c.fillRect(16,16,224,12);
    // Continue beneath the south wall so the old tile pattern cannot leak out.
    c.fillStyle=annotation?'#536c69':'#696958';c.fillRect(0,192,256,16);
    texture.refresh();
  }
  return scene.add.image(128,136,key).setDisplaySize(256,208).setDepth(-15).setName('research-terrazzo-floor');
}
