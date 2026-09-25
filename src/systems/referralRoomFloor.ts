import type Phaser from 'phaser';

/** Original, low-contrast stone and wool surfaces for the three referral rooms. */
export function addReferralRoomFloor(scene: Phaser.Scene, room: 'R1' | 'R2' | 'R3') {
  const key = `referral-floor-${room}-v1`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 1024, 832);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    c.fillStyle = '#37352f'; c.fillRect(0, 0, 256, 208);
    const stone = c.createLinearGradient(0, 16, 0, 192);
    stone.addColorStop(0, '#968d77'); stone.addColorStop(1, '#655f50');
    c.fillStyle = stone; c.fillRect(16, 16, 224, 176);
    c.lineWidth = .4; c.strokeStyle = 'rgba(37,35,32,.23)';
    for (let y = 16; y < 192; y += 32) {
      c.beginPath(); c.moveTo(16, y); c.lineTo(240, y); c.stroke();
      for (let x = 16 + ((y - 16) % 64 ? 24 : 0); x < 240; x += 48) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y + 32, 192)); c.stroke();
      }
    }
    // The center chambers have inset wool: broad shapes leave the stations legible.
    if (room !== 'R1') {
      const x = room === 'R2' ? 32 : 104, width = room === 'R2' ? 192 : 48;
      const carpet = c.createLinearGradient(0, 24, 0, 184);
      carpet.addColorStop(0, room === 'R2' ? '#785655' : '#566965');
      carpet.addColorStop(1, room === 'R2' ? '#4f383e' : '#344b49');
      c.fillStyle = carpet; c.fillRect(x, 24, width, 160);
      c.strokeStyle = 'rgba(219,189,129,.45)'; c.lineWidth = .6;
      c.strokeRect(x + 3, 27, width - 6, 154);
    }
    let seed = 2399;
    for (let i = 0; i < 12000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const x = 16 + seed / 4294967296 * 224;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const y = 16 + seed / 4294967296 * 176;
      c.fillStyle = i % 2 ? 'rgba(243,226,190,.08)' : 'rgba(30,27,29,.09)';
      c.fillRect(x, y, .35, .2);
    }
    c.strokeStyle = 'rgba(225,201,151,.45)'; c.lineWidth = .65; c.strokeRect(21, 21, 214, 166);
    const shadow = c.createLinearGradient(0, 16, 0, 36);
    shadow.addColorStop(0, 'rgba(20,22,27,.4)'); shadow.addColorStop(1, 'rgba(20,22,27,0)');
    c.fillStyle = shadow; c.fillRect(16, 16, 224, 20);
    texture.refresh();
  }
  return scene.add.image(128, 136, key).setDisplaySize(256, 208).setDepth(-12).setName('referral-detailed-floor');
}
