import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const archiveSceneSource = readFileSync(new URL("./ArchiveScene.ts", import.meta.url), "utf8");

function methodSource(name: string, nextName: string) {
  const start = archiveSceneSource.indexOf(`private ${name}`);
  const end = archiveSceneSource.indexOf(`private ${nextName}`, start + 1);
  return archiveSceneSource.slice(start, end);
}

describe("ArchiveScene physical annotation flow", () => {
  it("keeps annotation in the room instead of reopening a choice modal", () => {
    expect(archiveSceneSource).not.toContain("ChoicePrompt");
    expect(archiveSceneSource).not.toContain("choice.show");
    expect(archiveSceneSource).toContain("collectAnnotationDraftingSlip");
    expect(archiveSceneSource).toContain("fileAnnotationDraftingSlip");
  });

  it("uses the Citation Stamp on NO REPO before revealing annotation stations", () => {
    expect(archiveSceneSource).toContain("STAMP NO REPO: use the Citation Stamp on the stone wall.");
    expect(archiveSceneSource).toContain("sourceNoteWallNeedsStamp()");
    expect(archiveSceneSource).toContain("NO REPO CLEARED - ANNOTATE");
  });

  it("persists a carried annotation slip through scene progress", () => {
    expect(archiveSceneSource).toContain("sceneProgress.annotationDraftingCarried");
    expect(archiveSceneSource).toContain("FILE NOTE BEFORE LEAVING");
  });

  it("does not mistake owning the Citation Stamp for completing provenance", () => {
    const restore = methodSource("restoreSourceNoteProgress", "enterRoom");
    expect(restore).toContain("sceneProgress.archiveSourceNoteStamped");
    expect(restore).toContain('processStamps.includes("archive")');
    expect(restore).not.toContain('hasProcessItem("citation_stamp")');
  });

  it("keeps A1 spatial instead of stacking map and terminal dashboards", () => {
    const room = methodSource("renderSourceRoom", "renderOpenNetAnnex");
    expect(room).toContain("drawCompactSourceRoomTerminal");
    expect(room).not.toContain("addSnesWorldMap");
    expect(room).not.toContain("addTerminalPanel");
    expect(archiveSceneSource).toContain('if (room.id !== "A1")');
  });

  it("opens the next chapter through the physical east exit", () => {
    const finish = methodSource("finishArchiveIfReady", "sourceRoomComplete");
    expect(finish).toContain("archiveSourceRoomComplete = 1");
    expect(finish).toContain("EXIT EAST");
    expect(finish).not.toContain('transitionTo(this, "NetworkScene")');
    expect(archiveSceneSource).toContain('direction === "east" && this.sourceRoomComplete()');
    expect(archiveSceneSource).toContain('transitionTo(this, "NetworkScene")');
  });
});
