// Mechanical import of generated pose boards. Run with Node; no image dependencies.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { inflateSync, deflateSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const sources = [
  { id: "compiler_veteran", rows: [0, 390, 760, 1120, 1536], background: "checkerboard",
    frameOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15] },
  { id: "archivist", rows: [0, 390, 770, 1130, 1536], background: "magenta" },
  { id: "declassification_coordinator", rows: [0, 408, 776, 1100, 1536], background: "light" },
  { id: "general_editor", rows: [0, 442, 804, 1120, 1536], background: "magenta" },
  { id: "reviewer", rows: [0, 410, 776, 1112, 1536], background: "magenta" }
];

function readPng(path) {
  const data = readFileSync(path), chunks = [];
  let width, height, channels;
  for (let p = 8; p < data.length;) {
    const length = data.readUInt32BE(p), type = data.toString("ascii", p + 4, p + 8);
    const chunk = data.subarray(p + 8, p + 8 + length);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4);
      if (chunk[8] !== 8 || ![2, 6].includes(chunk[9]) || chunk[12] !== 0) throw Error("Expected non-interlaced RGB/RGBA8 PNG");
      channels = chunk[9] === 6 ? 4 : 3;
    }
    if (type === "IDAT") chunks.push(chunk);
    p += length + 12;
  }
  const stride = width * channels, raw = inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(width * height * channels), rgba = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x, filter = raw[y * (stride + 1)];
    if (filter > 4) throw Error("Unknown PNG filter");
    const a = x >= channels ? pixels[i - channels] : 0, b = y ? pixels[i - stride] : 0;
    const c = y && x >= channels ? pixels[i - stride - channels] : 0;
    pixels[i] = raw[y * (stride + 1) + x + 1] + [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
  }
  for (let i = 0; i < width * height; i++) {
    rgba.set(pixels.subarray(i * channels, i * channels + 3), i * 4);
    rgba[i * 4 + 3] = channels === 4 ? pixels[i * channels + 3] : 255;
  }
  return { width, height, rgba };
}

function writePng(path, width, height, rgba) {
  const chunk = (type, bytes) => {
    const body = Buffer.concat([Buffer.from(type), bytes]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const out = Buffer.alloc(bytes.length + 12);
    out.writeUInt32BE(bytes.length); body.copy(out, 4); out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
    return out;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]));
}

function removeBackdrop({ width, height, rgba }, kind) {
  if (kind === "magenta") {
    // This reserved color also occurs in enclosed gaps between arms and torso.
    for (let i = 0; i < rgba.length; i += 4) {
      const [r, g, b] = rgba.subarray(i, i + 3);
      if (r > 100 && b > 90 && g < 80 && r > g * 2.5 && b > g * 2.5) rgba[i + 3] = 0;
    }
    return;
  }
  const seen = new Uint8Array(width * height), queue = [];
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (seen[i]) return;
    seen[i] = 1;
    const [r, g, b, a] = rgba.subarray(i * 4, i * 4 + 4);
    const background = Math.min(r, g, b) > (kind === "checkerboard" ? 175 : 205)
      && Math.max(r, g, b) - Math.min(r, g, b) < 22;
    if (a < 128 || background) { rgba[i * 4 + 3] = 0; queue.push(i); }
  };
  // Only remove edge-connected backdrop, preserving eye whites and folder pages.
  for (let x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1); }
  for (let y = 0; y < height; y++) { visit(0, y); visit(width - 1, y); }
  for (let p = 0; p < queue.length; p++) {
    const i = queue[p], x = i % width, y = Math.floor(i / width);
    visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1);
  }
}

const outputDir = resolve(root, "public/assets/art-pack/sprites/refreshed");
mkdirSync(outputDir, { recursive: true });
for (const source of sources) {
  const png = readPng(resolve(root, `assets/character-sources/${source.id}.png`));
  if (png.width !== 1024 || png.height !== 1536) throw Error(`Unexpected dimensions for ${source.id}`);
  removeBackdrop(png, source.background);
  const frames = Array.from({ length: 15 }, (_, i) => {
    const sourceFrame = source.frameOrder?.[i] ?? i;
    const row = Math.floor(sourceFrame / 4), col = sourceFrame % 4;
    const bounds = { left: 1024, top: 1536, right: 0, bottom: 0 };
    for (let y = source.rows[row]; y < source.rows[row + 1]; y++) for (let x = col * 256; x < (col + 1) * 256; x++) {
      if (!png.rgba[(y * png.width + x) * 4 + 3]) continue;
      bounds.left = Math.min(bounds.left, x); bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x); bounds.bottom = Math.max(bounds.bottom, y);
    }
    if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) throw Error(`Empty frame ${source.id}:${i}`);
    return { ...bounds, width: bounds.right - bounds.left + 1, height: bounds.bottom - bounds.top + 1 };
  });
  const scale = Math.min(40 / Math.max(...frames.map(f => f.height)), 28 / Math.max(...frames.map(f => f.width)));
  const rgba = Buffer.alloc(128 * 192 * 4);
  frames.forEach((f, i) => {
    const w = Math.round(f.width * scale), h = Math.round(f.height * scale);
    const dx = i % 4 * 32 + Math.round((32 - w) / 2), dy = Math.floor(i / 4) * 48 + 45 - h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = f.left + Math.min(f.width - 1, Math.floor((x + 0.5) * f.width / w));
      const sy = f.top + Math.min(f.height - 1, Math.floor((y + 0.5) * f.height / h));
      const from = (sy * png.width + sx) * 4, to = ((dy + y) * 128 + dx + x) * 4;
      if (png.rgba[from + 3] < 128) continue;
      png.rgba.copy(rgba, to, from, from + 3); rgba[to + 3] = 255;
    }
  });
  writePng(resolve(outputDir, `sprite_${source.id}.png`), 128, 192, rgba);
  console.log(`${source.id}: 15 poses, native 32x48 cells, scale ${scale.toFixed(4)}, blank cell 15`);
}
