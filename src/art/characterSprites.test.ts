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

  it("uses each of the 15 defined frames exactly once with no gaps", () => {
    const indices = [
      ...Object.values(FRAMES.idle),
      ...Object.values(FRAMES.walk).flat(),
      ...Object.values(FRAMES.action)
    ].sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
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
