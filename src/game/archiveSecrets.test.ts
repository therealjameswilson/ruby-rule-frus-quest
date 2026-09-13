import { describe, expect, it } from "vitest";
import { ARCHIVE_SECRET_IDS, hasArchiveSecret, recordArchiveSecret } from "./archiveSecrets";

describe("saved Archive secrets", () => {
  it.each(ARCHIVE_SECRET_IDS)("awards %s discovery and treasure only once across a save round trip", room => {
    const progress: Record<string, number> = {};
    expect(recordArchiveSecret(progress, room, "revealed")).toBe(true);
    expect(hasArchiveSecret(progress, room, "collected")).toBe(false);
    expect(recordArchiveSecret(progress, room, "collected")).toBe(true);
    const restored = JSON.parse(JSON.stringify(progress)) as Record<string, number>;
    expect(recordArchiveSecret(restored, room, "revealed")).toBe(false);
    expect(recordArchiveSecret(restored, room, "collected")).toBe(false);
  });

  it("restores a legacy collected reward as discovered without claiming the other secret", () => {
    const progress: Record<string, number> = {};
    recordArchiveSecret(progress, "D2", "collected");
    expect(hasArchiveSecret(progress, "D2", "revealed")).toBe(true);
    expect(hasArchiveSecret(progress, "C3", "revealed")).toBe(false);
  });
});
