import type Phaser from "phaser";

/** Quiet editorial rooms: cached woven carpet with an oak perimeter. */
export function addEditorialRoomFloor(scene: Phaser.Scene, proof: boolean) {
  const key = proof ? "proof-carpet-v1" : "editor-carpet-v1";
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 768, 624);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(3, 3);
    c.fillStyle = "#524333"; c.fillRect(0, 0, 256, 208);
    const base = c.createLinearGradient(0, 12, 0, 192);
    base.addColorStop(0, proof ? "#697a80" : "#795958");
    base.addColorStop(1, proof ? "#3a505c" : "#4c353e");
    c.fillStyle = base; c.fillRect(18, 18, 220, 174);
    // Fine fibers avoid the high-contrast checkerboard of the old room tiles.
    let seed = 3421;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 14000; i++) {
      c.fillStyle = i % 2 ? "rgba(240,230,207,.1)" : "rgba(12,21,30,.16)";
      c.fillRect(18 + random() * 220, 18 + random() * 174, 0.2 + random() * 0.55, 0.2);
    }
    c.strokeStyle = "rgba(221,195,136,.4)"; c.lineWidth = 0.7;
    c.strokeRect(22, 22, 212, 166);
    c.strokeStyle = "rgba(16,22,27,.28)"; c.lineWidth = 1;
    c.strokeRect(24, 24, 208, 162);
    for (const x of [16, 240]) {
      c.strokeStyle = "rgba(226,182,115,.2)"; c.lineWidth = 0.35;
      for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(x + j * 0.6, 16); c.lineTo(x + j * 0.6, 192); c.stroke(); }
    }
    for (const x of [60, 196]) {
      const light = c.createRadialGradient(x, 55, 0, x, 55, 85);
      light.addColorStop(0, "rgba(255,236,194,.14)"); light.addColorStop(1, "rgba(255,236,194,0)");
      c.fillStyle = light; c.fillRect(18, 18, 220, 174);
    }
    const shade = c.createLinearGradient(0, 18, 0, 33);
    shade.addColorStop(0, "rgba(5,12,22,.35)"); shade.addColorStop(1, "rgba(5,12,22,0)");
    c.fillStyle = shade; c.fillRect(18, 18, 220, 15);
    texture.refresh();
  }
  return scene.add.image(128, 136, key).setDisplaySize(256, 208).setDepth(2).setName("editorial-carpet-floor");
}
