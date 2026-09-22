import { describe, expect, it } from "vitest";
import { ANNOTATION_DRAFTING_STATIONS } from "./annotationDrafting";
import { annotationPacketObjective, fileAnnotationPacket, gatherAnnotationNote, readAnnotationPacket } from "./annotationPacket";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";
import { restoredArchiveRepoWallCleared } from "./archiveSourceRoom";

describe("archive annotation packet", () => {
  it.each([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]])("collects order %s,%s,%s with one final filing", (...order) => {
    const progress: Record<string, number> = {};
    for (const [index, stationIndex] of order.entries()) {
      expect(fileAnnotationPacket(progress).ok).toBe(false);
      const result = gatherAnnotationNote(progress, ANNOTATION_DRAFTING_STATIONS[stationIndex].id);
      expect(result.ok).toBe(true);
      progress.annotationGatheredMask = result.gatheredMask;
      expect(readAnnotationPacket(progress).gathered).toHaveLength(index + 1);
    }
    expect(fileAnnotationPacket(progress).ok).toBe(true);
    expect(readAnnotationPacket(progress).complete).toBe(false);
    expect(annotationPacketObjective(progress)).toBe("FILE ANNOTATION");
  });

  it("cannot farm a note or file an incomplete packet", () => {
    const progress = { annotationGatheredMask: 2 };
    expect(gatherAnnotationNote(progress, "contextual_annotation")).toMatchObject({ ok: false, gatheredMask: 2 });
    expect(fileAnnotationPacket(progress)).toEqual({ ok: false, message: "Find SOURCE + SELECT before filing." });
    expect(annotationPacketObjective(progress)).toBe("NOTE 1/3: SOURCE");
  });

  it("preserves all old filed prefixes and carried notes", () => {
    for (let step = 0; step < 3; step++) {
      const progress = { annotationDraftingStep: step, annotationDraftingCarried: step + 1 };
      const packet = readAnnotationPacket(progress);
      expect(packet.filedCount).toBe(step);
      expect(packet.gathered).toHaveLength(step + 1);
      expect(packet.held[0].order).toBe(step + 1);
      const migrated = { ...progress, annotationGatheredMask: packet.gatheredMask, annotationDraftingCarried: 0 };
      expect(readAnnotationPacket(migrated)).toEqual(packet);
    }
  });

  it("round-trips notes and the cleared wall through the real save/restore boundary", () => {
    resetGameState();
    setSceneState("ArchiveScene", "explore", "Collect annotation packet");
    Object.assign(gameState.sceneProgress, { annotationDraftingStep: 1, annotationGatheredMask: 5, archiveRepoWallCleared: 1 });
    const packet = readAnnotationPacket(gameState.sceneProgress);
    const saved = createGameSaveData();
    resetGameState();
    expect(restoreGameSaveData(saved)).toBe("ArchiveScene");
    expect(readAnnotationPacket(gameState.sceneProgress)).toEqual(packet);
    expect(packet.heldLabel).toBe("Annotation packet 2/3");
    expect(restoredArchiveRepoWallCleared(gameState.sceneProgress)).toBe(true);
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.inventory).toEqual(saved.state.inventory);
    resetGameState();
  });

  it("recovers an old wall checkpoint only from earned annotation progress", () => {
    expect(restoredArchiveRepoWallCleared({ archiveSourceNoteStamped: 1 })).toBe(false);
    expect(restoredArchiveRepoWallCleared({ annotationDraftingCarried: 2 })).toBe(true);
    expect(restoredArchiveRepoWallCleared({ annotationDraftingStep: 1 })).toBe(true);
    expect(restoredArchiveRepoWallCleared({ annotationDraftingComplete: 1 })).toBe(true);
    expect(restoredArchiveRepoWallCleared({ archiveRepoWallCleared: 1 })).toBe(true);
    expect(restoredArchiveRepoWallCleared({})).toBe(false);
  });

  it("keeps completed legacy saves complete without granting a second filing", () => {
    const progress = { annotationDraftingComplete: 1, annotationDraftingCarried: 3 };
    expect(readAnnotationPacket(progress)).toMatchObject({ complete: true, ready: true, gatheredMask: 7, held: [], filedCount: 3 });
    expect(gatherAnnotationNote(progress, "published_provenance").ok).toBe(false);
    expect(fileAnnotationPacket(progress).ok).toBe(false);
  });

  it("does not invent progress from malformed numeric values", () => {
    expect(readAnnotationPacket({ annotationGatheredMask: NaN, annotationDraftingStep: -1, annotationDraftingCarried: Infinity }).gathered).toEqual([]);
  });
});
