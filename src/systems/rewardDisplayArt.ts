import type Phaser from 'phaser';

/** Original museum-style display materials, cached once for each accent. */
export function rewardDisplayTexture(scene: Phaser.Scene, kind: 'pedestal' | 'reward', accent: string) {
  if (!scene.textures.createCanvas) return null;
  const key = `reward-display-${kind}-${accent.replace('#', '')}-v1`;
  if (scene.textures.exists(key)) return key;
  const width = kind === 'pedestal' ? 64 : 72, height = 44;
  const texture = scene.textures.createCanvas(key, width * 4, height * 4);
  if (!texture) return null;
  const c = texture.getContext(); c.scale(4, 4);
  const rect = (x: number, y: number, w: number, h: number, fill: string) => {c.fillStyle = fill; c.fillRect(x,y,w,h);};
  if (kind === 'pedestal') {
    const wood = c.createLinearGradient(0, 22, 0, 40);
    wood.addColorStop(0,'#80583d'); wood.addColorStop(.35,'#503a30'); wood.addColorStop(1,'#2d2a2a');
    c.fillStyle=wood;c.fillRect(4,24,56,15);
    rect(2,22,60,3,'#b08b5a');rect(3,23,58,.6,'#e3c690');
    rect(3,38,58,3,'#263239');rect(5,38,54,.7,'#9d855e');
    for(let i=0;i<8;i++)rect(7,27+i*1.3,50,.2,'rgba(212,174,113,.12)');
    // Angled brass lid and recessed velvet bed behind the item.
    const bed=c.createLinearGradient(0,4,0,24);bed.addColorStop(0,'#1b3039');bed.addColorStop(1,'#101b25');
    c.fillStyle=bed;c.fillRect(10,4,44,20);
    c.strokeStyle='#b39460';c.lineWidth=.8;c.strokeRect(9.5,3.5,45,21);
    c.strokeStyle='#e1c998';c.lineWidth=.35;c.strokeRect(11,5,42,17);
    rect(12,20,40,2,'#4a2833');rect(12,20,40,.4,'#785253');
    rect(9,2,46,2,'#9b8055');rect(10,2,44,.5,'#e2cf9d');
    const reflection=c.createLinearGradient(12,6,32,20);reflection.addColorStop(0,'rgba(194,223,215,.15)');reflection.addColorStop(1,'rgba(194,223,215,0)');
    c.fillStyle=reflection;c.beginPath();c.moveTo(12,6);c.lineTo(30,6);c.lineTo(17,18);c.lineTo(12,18);c.closePath();c.fill();
    rect(7,26,1,10,'#ac9364');rect(56,26,1,10,'#ac9364');
    rect(24,28,16,5,accent);rect(25,28.5,14,.5,'rgba(255,244,209,.5)');
  } else {
    const panel=c.createLinearGradient(0,0,0,44);panel.addColorStop(0,'#344650');panel.addColorStop(.5,'#172b36');panel.addColorStop(1,'#101d2b');
    c.fillStyle=panel;c.fillRect(1,1,70,42);
    c.strokeStyle='#ac8f5b';c.lineWidth=.75;c.strokeRect(1.5,1.5,69,41);
    c.strokeStyle='rgba(228,211,164,.5)';c.lineWidth=.35;c.strokeRect(3,3,66,38);
    const glow=c.createRadialGradient(36,16,0,36,16,23);glow.addColorStop(0,'rgba(222,190,113,.2)');glow.addColorStop(1,'rgba(222,190,113,0)');
    c.fillStyle=glow;c.fillRect(4,4,64,29);
    rect(8,31,56,.4,'rgba(219,190,131,.45)');
    for(const x of [5,65])for(const y of [5,36]){rect(x,y,2,2,accent);rect(x+.5,y+.5,1,1,'#efe0b3');}
  }
  texture.refresh();return key;
}
