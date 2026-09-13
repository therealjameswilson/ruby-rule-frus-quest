import { describe, expect, it } from "vitest";
import { archiveOptionalObjective } from "./archiveOptionalObjective";
import { recordArchiveSecret } from "./archiveSecrets";

describe("optional Archive directions", () => {
  it("directs the player through the earned well route and back", () => {
    const progress: Record<string, number> = {};
    expect(archiveOptionalObjective("B1", progress)).toBe("TRAY: FILE SLIP");
    progress["archiveWall_pending-manifest"] = 1;
    expect(archiveOptionalObjective("B1", progress)).toBe("TRAY: FILE SLIP");
    progress["archiveWall_wait-timer"] = 1;
    expect(archiveOptionalObjective("B1", progress)).toBe("SOUTH: CRACK");
    expect(archiveOptionalObjective("C1", progress)).toBe("STAMP THE CRACK");
    expect(archiveOptionalObjective("D1", progress)).toBe("NORTH: CRACK");
    recordArchiveSecret(progress, "D2", "revealed");
    expect(archiveOptionalObjective("C1", progress)).toBe("WELL: SOUTH/EAST");
    expect(archiveOptionalObjective("D1", progress)).toBe("EAST: WELL");
    expect(archiveOptionalObjective("D2", progress)).toBe("TAKE WELL REWARD");
    recordArchiveSecret(progress, "D2", "collected");
    expect(archiveOptionalObjective("D2", progress)).toBe("WEST: RETURN");
  });

  it("fits compact HUDs and leaves unrelated chapter objectives alone", () => {
    for (const progress of [{}, { "archiveWall_pending-manifest": 1, "archiveWall_wait-timer": 1,
      archiveSecretD2_revealed: 1, archiveSecretD2_collected: 1, archiveSecretC3_collected: 1 }] as Record<string, number>[]) {
      for (const room of ["B1", "B2", "C1", "D1", "D2", "C3"]) {
        expect(archiveOptionalObjective(room, progress)?.length).toBeLessThanOrEqual(16);
      }
    }
    expect(archiveOptionalObjective("A1", {})).toBeNull();
    expect(archiveOptionalObjective("AS", {})).toBeNull();
  });

  it("guides examination, specialist review and recording without skipping review", () => {
    const progress: Record<string, number> = {};
    expect(archiveOptionalObjective("B2", progress)).toBe("EXAMINE FLAG");
    progress["archiveWall_danne-queue"] = 1;
    expect(archiveOptionalObjective("B2", progress)).toBe("EXAMINE FLAG");
    progress.archiveAmbiguousSplit = 1;
    expect(archiveOptionalObjective("B2", progress)).toBe("ASK SPECIALIST");
    progress["archiveWall_ambiguous-flag"] = 1;
    progress["archiveWall_danne-queue"] = 0;
    expect(archiveOptionalObjective("B2", progress)).toBe("SOUTH: RECORD IT");
    progress["archiveWall_danne-queue"] = 1;
    expect(archiveOptionalObjective("B2", progress)).toBe("EAST: HINT ROOM");
  });
});
