import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const archiveSceneSource = readFileSync(new URL("./ArchiveScene.ts", import.meta.url), "utf8");

function methodSource(name: string, nextName: string) {
  const start = archiveSceneSource.indexOf(`private ${name}`);
  const end = archiveSceneSource.indexOf(`private ${nextName}`, start + 1);
  return archiveSceneSource.slice(start, end);
}

describe("ArchiveScene physical annotation flow", () => {
  it("keeps note gathering spatial, with a single coverage decision at filing", () => {
    const collect = methodSource("collectAnnotationDraftingNote", "fileAnnotationDraftingNotes");
    expect(collect).not.toContain("reviewResearchDecision");
    const file = methodSource("fileAnnotationDraftingNotes", "reviewResearchDecision");
    expect(file).toContain("nextArchiveResearchReview()");
    expect(file).toContain("this.reviewResearchDecision(review");
    expect(archiveSceneSource.includes("gatherAnnotationNote")).toBe(true);
    expect(archiveSceneSource.includes("fileAnnotationPacket")).toBe(true);
  });

  it("earns standards at the source table and lets old saves repair missing reviews", () => {
    const action = methodSource("handleSourceNoteAction", "sourceNoteWallNeedsStamp");
    expect(action).toContain('this.reviewResearchDecision("standards"');
    const documents = methodSource("addDocumentInteractables", "addRoomEnemy");
    expect(documents).toContain('id: "research-review"');
    expect(documents).toContain("this.finishMissingResearchReview()");
    const complete = methodSource("sourceRoomComplete", "sourceRoomDocumentCount");
    expect(complete).toContain("!nextArchiveResearchReview()");
  });

  it("freezes movement and DANN-E while considering a research decision", () => {
    const update = archiveSceneSource.slice(archiveSceneSource.indexOf("  update("));
    const choice = update.slice(update.indexOf("if (this.researchChoice.active)"), update.indexOf("if (input.menuJustPressed)"));
    expect(choice).toContain("this.updateDanneLurker(delta, false)");
    expect(choice).toContain("this.player.update(delta, false)");
    expect(choice).toContain("this.researchChoice.updateInput()");
    expect(choice).toContain("return;");
  });

  it("uses the Citation Stamp on NO REPO before revealing annotation stations", () => {
    expect(archiveSceneSource).toContain("STAMP NO REPO: use the Citation Stamp on the stone wall.");
    expect(archiveSceneSource).toContain("sourceNoteWallNeedsStamp()");
    expect(archiveSceneSource).toContain("NO REPO CLEARED - ANNOTATE");
  });

  it("saves discoveries immediately and keeps the packet in the room until filed", () => {
    const collect = methodSource("collectAnnotationDraftingNote", "fileAnnotationDraftingNotes");
    expect(collect.includes("sceneProgress.annotationGatheredMask = result.gatheredMask")).toBe(true);
    expect(collect.includes("saveGameNow()")).toBe(true);
    expect(archiveSceneSource.includes("FILE PACKET BEFORE LEAVING")).toBe(true);
  });

  it("does not mistake owning the Citation Stamp for completing provenance", () => {
    const restore = methodSource("restoreSourceNoteProgress", "enterRoom");
    expect(restore).toContain("restoredArchiveSourceNoteStatus(");
    expect(restore).toContain("sceneProgress: gameState.sceneProgress");
    expect(restore).toContain('processStamps.includes("archive")');
    expect(restore).not.toContain('hasProcessItem("citation_stamp")');
  });

  it("gates the Citation Stamp behind the About-the-Series first footnote", () => {
    const inspect = methodSource("inspectSourceNoteProvenance", "reviewFirstFootnote");
    expect(inspect).toContain("this.reviewFirstFootnote(result.nextStep)");
    const review = methodSource("reviewFirstFootnote", "completeSourceNoteVerification");
    expect(review).toContain("evaluateSourceNoteProvenanceAnswer");
    expect(review).toContain("FIRST FOOTNOTE INCOMPLETE");
    expect(review).toContain("aboutSeriesFirstFootnoteComplete = 1");
    expect(review).toContain("sourceNoteProvenanceComplete = 1");
    expect(review).toContain("saveGameNow()");
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
    expect(archiveSceneSource).toContain('exits: { west: "O1", east: "N1", south: "B1" }');
    expect(archiveSceneSource).toContain('direction === "east" && !this.sourceRoomComplete()');
    expect(archiveSceneSource).toContain('if (target === "N1")');
    expect(archiveSceneSource).toContain('transitionTo(this, "NetworkScene", { chapterFrom: "A1", chapterTo: "N1" })');
  });

  it("uses one distant target cue and removes it when the action is reachable", () => {
    const cue = methodSource("drawSourceNoteRouteCue", "handleAnnotationDraftingAction");
    expect(cue).not.toContain("this.add.text");
    expect(cue).not.toContain(".setAngle(");
    expect(archiveSceneSource).not.toContain("noRepoStampCue");
    const reachable = methodSource("hideReachableSourceNoteCue", "clearSourceNoteRouteCue");
    expect(reachable).toContain("distance > radius");
    expect(reachable).toContain("this.clearSourceNoteRouteCue()");
    const prompt = methodSource("updateSourceNoteInteractionPrompt", "warnIfSourceNoteHintOnly");
    expect(prompt).toContain("if (this.toast.visible)");
    expect(prompt).toContain("this.interactionPrompt.update(delta, null)");
  });
});
