import Phaser from "phaser";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";

export const VAULT_STONE = { key: "vault-slate-v2", path: "assets/art-pack/danne-pack/environments/vault-slate-v2.png" };
const ROOM_KEY = "vault-environment-v2";

/** Bake static materials once. Every raised obstacle uses the gameplay collider footprint. */
export function addVaultEnvironment(scene: Phaser.Scene) {
  if (!scene.textures.exists(VAULT_STONE.key)) return false;
  if (!scene.textures.exists(ROOM_KEY)) {
    const texture = scene.textures.createCanvas(ROOM_KEY, 768, 720);
    if (!texture) return false;
    const c = texture.getContext();
    c.scale(3, 3);
    const rect = (x: number, y: number, w: number, h: number, fill: string) => {
      c.fillStyle = fill; c.fillRect(x, y, w, h);
    };
    const line = (x: number, y: number, xx: number, yy: number, stroke: string, width = 0.5) => {
      c.strokeStyle = stroke; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke();
    };
    const bevel = (x: number, y: number, w: number, h: number, top: string, bottom: string) => {
      const gradient = c.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
      c.fillStyle = gradient; c.fillRect(x, y, w, h);
      line(x + .4, y + .4, x + w - .4, y + .4, "#bda576", .7);
      line(x + .4, y + .4, x + .4, y + h, "#7c827f", .5);
      line(x, y + h, x + w, y + h, "#080c13", 1);
    };
    rect(0, 34, 256, 206, "#0a101c");
    const source = scene.textures.get(VAULT_STONE.key).getSourceImage() as HTMLImageElement;
    c.drawImage(source, 8, 46, 240, 182);
    // Quiet central aisle stays readable underneath paper volleys and telegraphs.
    rect(104, 104, 48, 108, "rgba(21,33,47,0.2)");
    for (const x of [13, 243]) line(x, 49, x, 223, "#a28b60", .65);
    for (const y of [49, 223]) line(13, y, 243, y, "#a28b60", .65);
    for (let x = 8; x < 248; x += 24) {
      bevel(x, 36, 23, 10, "#4c5660", "#171d2b");
      bevel(x, 228, 23, 10, "#37434f", "#111725");
    }
    for (let y = 48; y < 226; y += 22) {
      bevel(0, y, 9, 21, "#465361", "#141b29");
      bevel(247, y, 9, 21, "#465361", "#141b29");
    }
    for (const r of DANNE_SCENE_GEOMETRY.BlackVaultLairScene.solids) {
      const { x, y, width: w, height: h } = r;
      if (r.label.includes("fissure")) {
        // Recessed channels have an unbroken lip precisely on the collision boundary.
        bevel(x, y, w, h, "#74584b", "#261821");
        rect(x + 2, y + 2, w - 4, h - 4, "#100d17");
        const glow = c.createLinearGradient(x + 2, y, x + w - 2, y);
        glow.addColorStop(0, "#3c1724"); glow.addColorStop(.5, "#ab4639"); glow.addColorStop(1, "#291321");
        c.fillStyle = glow; c.fillRect(x + 5, y + 4, w - 10, h - 8);
        for (let dy = 8; dy < h - 6; dy += 11) {
          line(x + 7, y + dy, x + w - 8, y + dy + 3, "#ec9b66", .7);
          bevel(x + 2, y + dy + 4, w - 4, 3, "#4b4549", "#171923");
        }
      } else if (r.label.includes("altar")) {
        bevel(x, y, w, h, "#7a7271", "#221c2d");
        bevel(x + 3, y + 3, w - 6, h - 9, "#343e50", "#111724");
        rect(x + 7, y + 7, w - 14, h - 19, "#422231");
        for (let dx = 10; dx < w - 8; dx += 8) {
          line(x + dx, y + 8, x + dx, y + h - 15, "#a48157", .5);
        }
        bevel(x + 18, y + 13, w - 36, h - 25, "#606879", "#182332");
        rect(x + 23, y + 18, w - 46, 5, "#b63f45");
        line(x + 24, y + 19, x + w - 24, y + 19, "#f0b6a0", .8);
        for (let dx = 7; dx < w - 5; dx += 8) rect(x + dx, y + h - 5, 3, 1, "#baa171");
      } else {
        // Layered fractured stones fill, but never expand, the blocked footprint.
        bevel(x, y, w, h, "#626878", "#181d2b");
        for (let i = 0; i < 4; i++) {
          const yy = y + 2 + i * 6;
          bevel(x + 1 + i % 2, yy, w - 3, 5, i % 2 ? "#6b727d" : "#424b5e", "#232936");
          line(x + 4 + i % 3, yy, x + 9 + i % 3, yy + 5, "#101725", .6);
        }
      }
    }
    // Brass threshold gives the real south exit a clear visual destination.
    rect(108, 211, 40, 29, "#101823");
    for (let i = 0; i < 5; i++) bevel(110, 213 + i * 5, 36, 4, "#a99671", "#494447");
    texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  scene.add.image(0, 0, ROOM_KEY).setOrigin(0).setDisplaySize(256, 240).setDepth(-18).setName("vault-environment");
  return true;
}
