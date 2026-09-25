import type Phaser from 'phaser';

/** Daylit garden view, walnut casing and stone sill; no third-party art. */
export function addOfficeExteriorDoor(scene: Phaser.Scene) {
  const key = 'office-exterior-door-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 104, 144);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    const rect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
    rect(0, 1, 26, 34, '#1a2830');
    const wood = c.createLinearGradient(0, 0, 26, 0);
    wood.addColorStop(0, '#b59b68'); wood.addColorStop(.15, '#725337'); wood.addColorStop(.8, '#4d3e32'); wood.addColorStop(1, '#bca379');
    rect(1, 1, 24, 32, wood); rect(2, 1.5, 22, .6, '#e9d7a8');
    rect(4, 4, 18, 27, '#a4cfa7');
    const sky = c.createLinearGradient(0, 4, 0, 21);
    sky.addColorStop(0, '#90c9dc'); sky.addColorStop(1, '#eff0c9');rect(4, 4, 18, 18, sky);
    // Distant landscape framed by the doorway, not a separate interface panel.
    c.fillStyle = '#5e8b69';c.beginPath();c.moveTo(4, 18);c.quadraticCurveTo(10, 13, 15, 18);c.quadraticCurveTo(20, 15, 22, 18);c.lineTo(22, 25);c.lineTo(4, 25);c.closePath();c.fill();
    rect(4, 23, 18, 8, '#8da55f');
    c.fillStyle='#ddd5b4';c.beginPath();c.moveTo(12, 20);c.lineTo(15, 20);c.lineTo(21, 31);c.lineTo(6, 31);c.closePath();c.fill();
    c.strokeStyle='#b4b393';c.lineWidth=.4;
    for(const y of [24,27,30]){c.beginPath();c.moveTo(8,y);c.lineTo(20,y);c.stroke();}
    rect(3, 3, 1, 29, '#352f29');rect(22, 3, 1, 29, '#d2bd8c');
    rect(1, 32, 24, 3, '#7b8580');rect(2, 32, 22, .75, '#e4dbc0');rect(2, 35, 22, .75, '#25343b');
    // Brass latch and hinges make the opening read as an office exit.
    rect(21, 18, 1, 4, '#866b34');rect(20.5, 19, 1.5, 1, '#eed694');
    for(const y of [8,25])rect(3, y, 1, 2, '#cfb572');
    texture.refresh();
  }
  return scene.add.image(40, 187, key).setDisplaySize(26, 36).setDepth(25).setName('office-exterior-door');
}
