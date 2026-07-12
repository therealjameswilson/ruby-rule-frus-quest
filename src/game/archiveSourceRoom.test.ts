import { describe, expect, it } from "vitest";
import {
  archiveSourceRoomDocumentProgressKey,
  archiveSourceRoomPacketComplete,
  restoredArchiveSourceRoomDocumentIds,
  visibleArchiveSourceRoomDocuments
} from "./archiveSourceRoom";

describe("Archive A1 source-room progression", () => {
  it("shows one source task before unsealing the supporting documents", () => {
    expect(visibleArchiveSourceRoomDocuments(false).map((document) => document.id)).toEqual(["source-note"]);
    expect(visibleArchiveSourceRoomDocuments(true).map((document) => document.id)).toEqual([
      "source-note",
      "telegram",
      "cross-reference"
    ]);
  });

  it("requires the stamped source note, annotation, and all three documents", () => {
    const allDocuments = new Set(["source-note", "telegram", "cross-reference"]);
    expect(archiveSourceRoomPacketComplete({
      sourceNoteStamped: false,
      annotationComplete: true,
      collectedDocumentIds: allDocuments
    })).toBe(false);
    expect(archiveSourceRoomPacketComplete({
      sourceNoteStamped: true,
      annotationComplete: false,
      collectedDocumentIds: allDocuments
    })).toBe(false);
    expect(archiveSourceRoomPacketComplete({
      sourceNoteStamped: true,
      annotationComplete: true,
      collectedDocumentIds: new Set(["source-note", "telegram"])
    })).toBe(false);
    expect(archiveSourceRoomPacketComplete({
      sourceNoteStamped: true,
      annotationComplete: true,
      collectedDocumentIds: allDocuments
    })).toBe(true);
  });

  it("restores collected documents from stable scene-progress keys", () => {
    expect(archiveSourceRoomDocumentProgressKey("telegram")).toBe("archiveTelegramCollected");
    expect(restoredArchiveSourceRoomDocumentIds({
      archiveSourceNoteCollected: 1,
      archiveTelegramCollected: 0,
      archiveCrossReferenceCollected: 1
    })).toEqual(["source-note", "cross-reference"]);
  });
});
