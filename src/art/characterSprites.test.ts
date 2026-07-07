import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { FRAMES } from "./character_anims";
import {
  ART_PACK_FOOT_OFFSET_Y,
  ART_PACK_LABEL_OFFSET_Y,
  ART_PACK_SPRITE_ORIGIN_Y,
  CHARACTER_FRAME,
  CHARACTER_KEYS,
  getCharacterKeyForNpcId,
  getCharacterKeyForProcessRole,
  getCharacterKeyForProductionColleague
} from "./characters";

// The native art-pack sheets are 128x192 RGBA, sliced into 32x48 cells.
// That is a fixed 4x4 grid (16 cells), of which 15 are used. Any animation
// frame index >= 16 would read past the sheet and render a corrupt/blank
// sprite, which is the failure mode this suite guards against.
const SHEET_WIDTH = 128;
const SHEET_HEIGHT = 192;
const COLUMNS = SHEET_WIDTH / CHARACTER_FRAME.width;
const ROWS = SHEET_HEIGHT / CHARACTER_FRAME.height;
const FRAME_COUNT = COLUMNS * ROWS;

describe("character sprite frame layout", () => {
  it("slices the native sheet into a clean 4x4 grid", () => {
    expect(CHARACTER_FRAME).toEqual({ width: 32, height: 48 });
    expect(COLUMNS).toBe(4);
    expect(ROWS).toBe(4);
    expect(FRAME_COUNT).toBe(16);
  });

  it("keeps every animation frame index inside the sheet bounds", () => {
    const indices = [
      ...Object.values(FRAMES.idle),
      ...Object.values(FRAMES.walk).flat(),
      ...Object.values(FRAMES.action)
    ];
    for (const index of indices) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(FRAME_COUNT);
    }
  });

  it("maps directions and action poses to the intended 4x4 sheet cells", () => {
    expect(FRAMES).toEqual({
      idle: { down: 0, up: 1, left: 2, right: 3 },
      walk: { down: [4, 5], up: [6, 7], left: [8, 9], right: [10, 11] },
      action: { interact: 12, reading: 13, approval: 14 }
    });
    expect(new Set([
      ...Object.values(FRAMES.idle),
      ...Object.values(FRAMES.walk).flat(),
      ...Object.values(FRAMES.action)
    ])).toHaveLength(15);
  });
});

describe("art-pack ground shadow anchoring", () => {
  // The 32x48 sprite is drawn at scale 1 with origin (0.5, 0.9), so the origin
  // sits 90% down the sprite and the feet are only height*(1-origin) ≈ 5px below
  // the world origin. The shadow offset must equal that, or the shadow drops
  // below the feet and leaves a standalone black oval drifting under the sprite
  // (the live Office Hub "orphan shadow near JR" defect).
  it("places the foot offset at the sprite's feet", () => {
    const expectedFeet = Math.round(CHARACTER_FRAME.height * (1 - ART_PACK_SPRITE_ORIGIN_Y));
    expect(ART_PACK_FOOT_OFFSET_Y).toBe(expectedFeet);
    expect(ART_PACK_FOOT_OFFSET_Y).toBe(5);
  });

  it("keeps the foot offset within the sprite's lower body, not below it", () => {
    // Guards against the regression where the offset was set to 19 (past the feet).
    expect(ART_PACK_FOOT_OFFSET_Y).toBeLessThan(CHARACTER_FRAME.height * (1 - ART_PACK_SPRITE_ORIGIN_Y) + 2);
  });

  it("keeps the name label just below the feet", () => {
    expect(ART_PACK_LABEL_OFFSET_Y).toBeGreaterThan(ART_PACK_FOOT_OFFSET_Y);
  });
});

describe("character key selection", () => {
  it("maps process roles to real character keys", () => {
    for (const roleId of [
      "compiler",
      "editor",
      "declass_reviewer",
      "source_note_specialist",
      "proofreader"
    ]) {
      expect(CHARACTER_KEYS).toContain(getCharacterKeyForProcessRole(roleId));
    }
  });

  it("maps every known NPC id to a real character key", () => {
    for (const npcId of ["elena", "marcus", "priya", "archive-colleague", "unknown"]) {
      expect(CHARACTER_KEYS).toContain(getCharacterKeyForNpcId(npcId));
    }
  });

  it("maps every production colleague id to a real character key", () => {
    for (const id of [
      "compiler",
      "editor",
      "declass_coordinator",
      "review_specialist",
      "reviewer"
    ]) {
      expect(CHARACTER_KEYS).toContain(getCharacterKeyForProductionColleague(id));
    }
  });
});

// Decode a PNG to RGBA without any image dependency so the test can inspect the
// real shipped art and catch frames that are empty or only stray pixels.
function decodePng(path: string): { width: number; height: number; rgba: Uint8Array } {
  const data = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat: Buffer[] = [];
  while (pos < data.length) {
    const len = data.readUInt32BE(pos);
    const type = data.toString("ascii", pos + 4, pos + 8);
    const chunk = data.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      colorType = chunk.readUInt8(9);
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  let p = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[p];
    p += 1;
    for (let i = 0; i < stride; i += 1) {
      const value = raw[p + i];
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= channels && y > 0 ? out[(y - 1) * stride + i - channels] : 0;
      let recon = value;
      if (filter === 1) recon = value + a;
      else if (filter === 2) recon = value + b;
      else if (filter === 3) recon = value + ((a + b) >> 1);
      else if (filter === 4) recon = value + paeth(a, b, c);
      out[y * stride + i] = recon & 0xff;
    }
    p += stride;
  }
  // Normalise to RGBA so callers can always read alpha at index +3.
  if (channels === 4) return { width, height, rgba: new Uint8Array(out) };
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const base = i * channels;
    rgba[i * 4] = out[base];
    rgba[i * 4 + 1] = out[channels >= 3 ? base + 1 : base];
    rgba[i * 4 + 2] = out[channels >= 3 ? base + 2 : base];
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

function frameBounds(
  png: { width: number; rgba: Uint8Array },
  frameIndex: number
): { opaque: number; minY: number; maxY: number } {
  const col = frameIndex % COLUMNS;
  const row = Math.floor(frameIndex / COLUMNS);
  const x0 = col * CHARACTER_FRAME.width;
  const y0 = row * CHARACTER_FRAME.height;
  let opaque = 0;
  let minY: number = CHARACTER_FRAME.height;
  let maxY = -1;
  for (let yy = 0; yy < CHARACTER_FRAME.height; yy += 1) {
    for (let xx = 0; xx < CHARACTER_FRAME.width; xx += 1) {
      const idx = ((y0 + yy) * png.width + (x0 + xx)) * 4 + 3;
      if (png.rgba[idx] > 40) {
        opaque += 1;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
  }
  return { opaque, minY, maxY };
}

// Largest run of fully-transparent rows sitting *between* two opaque rows of a
// frame. The misassembled native art splits the body with such a band, and when
// the lower segment is drawn at origin (0.5, 0.9) it detaches onto the shadow
// line as the floating Office Hub fragment. A gap > 1 here means the rendered
// sprite would show a detached piece.
function largestInteriorRowGap(
  png: { width: number; rgba: Uint8Array },
  frameIndex: number
): number {
  const col = frameIndex % COLUMNS;
  const row = Math.floor(frameIndex / COLUMNS);
  const x0 = col * CHARACTER_FRAME.width;
  const y0 = row * CHARACTER_FRAME.height;
  const rowHasBody: number[] = [];
  for (let yy = 0; yy < CHARACTER_FRAME.height; yy += 1) {
    let present = false;
    for (let xx = 0; xx < CHARACTER_FRAME.width; xx += 1) {
      if (png.rgba[((y0 + yy) * png.width + (x0 + xx)) * 4 + 3] > 40) {
        present = true;
        break;
      }
    }
    if (present) rowHasBody.push(yy);
  }
  let largest = 0;
  for (let i = 1; i < rowHasBody.length; i += 1) {
    largest = Math.max(largest, rowHasBody[i] - rowHasBody[i - 1] - 1);
  }
  return largest;
}

describe("native sprite sheet frame content", () => {
  const spriteDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../public/assets/art-pack/sprites/native"
  );
  const sheetFiles = readdirSync(spriteDir).filter((file) => file.endsWith(".png"));
  // Every cell an animation actually plays: idle, walk, and the action poses.
  const referencedFrames = Array.from(
    new Set([
      ...Object.values(FRAMES.idle),
      ...Object.values(FRAMES.walk).flat(),
      ...Object.values(FRAMES.action)
    ])
  ).sort((a, b) => a - b);

  it("ships one sheet per character key", () => {
    expect(sheetFiles.length).toBe(CHARACTER_KEYS.length);
  });

  for (const file of sheetFiles) {
    it(`renders every referenced frame in ${file} as a complete body, not a fragment`, () => {
      const png = decodePng(resolve(spriteDir, file));
      expect(png.width).toBe(SHEET_WIDTH);
      expect(png.height).toBe(SHEET_HEIGHT);
      for (const frame of referencedFrames) {
        const { opaque, minY, maxY } = frameBounds(png, frame);
        const coveredHeight = maxY - minY + 1;
        // A real pose fills a substantial, tall region. The Office Hub stray
        // fragments were ~5px tall strips of a few dozen pixels clinging to the
        // top edge; require enough body so such slivers can never be played.
        expect(opaque, `frame ${frame} of ${file} is nearly empty`).toBeGreaterThan(120);
        expect(coveredHeight, `frame ${frame} of ${file} is a thin sliver`).toBeGreaterThan(20);
        // The body must be one contiguous piece. A transparent band between two
        // opaque rows detaches the feet onto the shadow line — the exact Office
        // Hub fragment near the Junior Compiler.
        expect(
          largestInteriorRowGap(png, frame),
          `frame ${frame} of ${file} is split by a transparent band (detached fragment)`
        ).toBeLessThanOrEqual(1);
      }
    });
  }
});
