import type Phaser from 'phaser';

/** Original enamel lettering plates with brushed metal rims and recessed screws. */
export function gateCaptionTexture(scene: Phaser.Scene, width: number, locked: boolean) {
  const key = `gate-caption-v1-${width}-${locked ? 'locked' : 'open'}`;
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.createCanvas) return null;
  const texture = scene.textures.createCanvas(key, width * 4, 48);
  if (!texture) return null;
  const c = texture.getContext(); c.scale(4,4);
  const rim = c.createLinearGradient(0,0,0,12);
  rim.addColorStop(0,'#e0d2ac');rim.addColorStop(.22,'#9c8b66');rim.addColorStop(.65,'#655d4b');rim.addColorStop(1,'#c4b184');
  c.fillStyle='#121c24';c.fillRect(0,1,width,11);
  c.fillStyle=rim;c.fillRect(.5,0,width-1,11);
  const enamel=c.createLinearGradient(0,1,0,10);
  enamel.addColorStop(0,locked?'#63383c':'#344850');enamel.addColorStop(1,locked?'#321f29':'#182b33');
  c.fillStyle=enamel;c.fillRect(2,1.5,width-4,8);
  c.strokeStyle='rgba(255,241,202,.28)';c.lineWidth=.35;c.strokeRect(2,1.5,width-4,8);
  for(const x of [1,width-1]){
    c.fillStyle='#302d29';c.beginPath();c.arc(x,5.5,.6,0,Math.PI*2);c.fill();
    c.strokeStyle='#e4cfa0';c.lineWidth=.25;c.beginPath();c.moveTo(x-.3,5.2);c.lineTo(x+.3,5.8);c.stroke();
  }
  texture.refresh();return key;
}
