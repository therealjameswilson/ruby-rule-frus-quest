import { describe, expect, it } from "vitest";
import { FRAMES } from "./character_anims";
import {
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
