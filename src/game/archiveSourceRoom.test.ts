import { describe, expect, it } from "vitest";
import {
  archiveSourceRoomDocumentProgressKey,
  archiveSourceRoomObjective,
  archiveSourceRoomPacketComplete,
  restoredArchiveSourceNoteStatus,
  restoredArchiveSourceRoomDocumentIds,
  visibleArchiveSourceRoomDocuments
} from "./archiveSourceRoom";
import { clampQuestBandText, QUEST_BAND_LAYOUT } from "../scenes/questBandLayout";

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

  it("keeps an actionable, untruncated target at every source-room stage", () => {
    const base: Parameters<typeof archiveSourceRoomObjective>[0] = {
      sourceNoteStatus: "inactive", provenanceStep: 0, wallNeedsStamp: false,
      annotationStep: 0, annotationCarried: false, annotationComplete: false,
      collectedDocumentIds: new Set(), complete: false
    };
    const stages: Array<[Partial<typeof base>, string]> = [
      [{}, "TAKE SOURCE NOTE"],
      [{ sourceNoteStatus: "carried" }, "CITE SOURCE AT TABLE"],
      ...[0, 1, 2, 3].map((provenanceStep): [Partial<typeof base>, string] => [
        { sourceNoteStatus: "routed", provenanceStep }, provenanceStep === 3 ? "CHECK FULL CITATION" : ["VERIFY REPOSITORY", "VERIFY COLLECTION", "VERIFY FOLDER"][provenanceStep]
      ]),
      [{ sourceNoteStatus: "routed", provenanceProgress: { sourceNoteProvenanceMask: 6 } }, "VERIFY REPOSITORY"],
      [{ sourceNoteStatus: "routed", provenanceProgress: { sourceNoteProvenanceMask: 5 } }, "VERIFY COLLECTION"],
      [{ sourceNoteStatus: "verified" }, "REVIEW SOURCE NOTE"],
      [{ sourceNoteStatus: "verified", standardsReviewed: true }, "FILE VERIFIED SOURCE"],
      [{ sourceNoteStatus: "stamped", wallNeedsStamp: true }, "STAMP CITATION WALL"],
      ...["SOURCE", "CONTEXT", "SELECT"].map((label, annotationStep): [Partial<typeof base>, string] => [
        { sourceNoteStatus: "stamped", annotationStep }, `TAKE ${label}`
      ]),
      [{ sourceNoteStatus: "stamped", annotationCarried: true }, "FILE ANNOTATION"],
      [{ sourceNoteStatus: "stamped", annotationProgress: {} }, "NOTE 0/3: SOURCE"],
      [{ sourceNoteStatus: "stamped", annotationProgress: { annotationGatheredMask: 6 } }, "NOTE 2/3: SOURCE"],
      [{ sourceNoteStatus: "stamped", annotationProgress: { annotationGatheredMask: 7 } }, "FILE ANNOTATION"],
      [{ sourceNoteStatus: "stamped", annotationComplete: true }, "ADD TELEGRAM TO FILE"],
      [{ sourceNoteStatus: "stamped", annotationComplete: true, collectedDocumentIds: new Set(["telegram"]) }, "ADD CROSS-REFERENCE"],
      [{ complete: true }, "EXIT EAST - NETWORK"]
    ];
    for (const [input, expected] of stages) {
      const objective = archiveSourceRoomObjective({ ...base, ...input });
      expect(objective).toBe(expected);
      expect(clampQuestBandText(objective, QUEST_BAND_LAYOUT.objective.maxChars)).toBe(objective);
    }
  });

  it("recovers saves made while carrying, just after routing, or before routing was recorded", () => {
    const base = { sceneProgress: {}, heldItem: null, hasArchiveStamp: false, sourceNoteCollected: false };
    expect(restoredArchiveSourceNoteStatus(base)).toBe("inactive");
    expect(restoredArchiveSourceNoteStatus({ ...base, heldItem: "Source Note 47" })).toBe("carried");
    expect(restoredArchiveSourceNoteStatus({ ...base, sourceNoteCollected: true })).toBe("carried");
    expect(restoredArchiveSourceNoteStatus({
      ...base, sourceNoteCollected: true,
      sceneProgress: { archiveSourceNoteRouted: 1, sourceNoteProvenanceStep: 0 }
    })).toBe("routed");
    expect(restoredArchiveSourceNoteStatus({ ...base, sceneProgress: { sourceNoteProvenanceStep: 1 } })).toBe("routed");
    expect(restoredArchiveSourceNoteStatus({ ...base, sceneProgress: { sourceNoteProvenanceComplete: 1 } })).toBe("verified");
    expect(restoredArchiveSourceNoteStatus({ ...base, sceneProgress: { archiveSourceNoteStamped: 1 } })).toBe("stamped");
    expect(restoredArchiveSourceNoteStatus({ ...base, hasArchiveStamp: true })).toBe("stamped");
  });
});
