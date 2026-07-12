import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const archiveSceneSource = readFileSync(new URL("./ArchiveScene.ts", import.meta.url), "utf8");

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
});
