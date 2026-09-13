import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const archiveSceneSource = readFileSync(new URL("./ArchiveScene.ts", import.meta.url), "utf8");

function methodSource(name: string, nextName: string) {
  const start = archiveSceneSource.indexOf(`private ${name}`);
  const end = archiveSceneSource.indexOf(`private ${nextName}`, start + 1);
  return archiveSceneSource.slice(start, end);
}

describe("ArchiveScene physical annotation flow", () => {
  it("gives moving route markers one owner and clears them on room exit", () => {
    const track = methodSource("trackSourceNoteRouteCue", "drawSourceNoteRouteCue");
    expect(track).toContain("this.sourceNoteRouteCueObjects.push(object)");
    expect(track).not.toContain("this.track(object)");
    const clear = methodSource("clearSourceNoteRouteCue", "trackSourceNoteRouteCue");
    expect(clear).toContain("object.destroy()");
    expect(clear).toContain("this.sourceNoteRouteCueObjects = []");
    const room = methodSource("clearRoom", "");
    expect(room).toContain("this.clearSourceNoteRouteCue()");
  });
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

  it("checks actual swings before the source-workflow early return", () => {
    const update = archiveSceneSource.slice(archiveSceneSource.indexOf("  update("), archiveSceneSource.indexOf("private restoreSourceNoteProgress"));
    expect(update.indexOf("this.updateRepoWallToolHit()")).toBeGreaterThan(update.indexOf("tryEquippedToolSwing(this.player)"));
    expect(update.indexOf("this.updateRepoWallToolHit()")).toBeLessThan(update.indexOf('if (this.currentRoomId === "A1"'));
    const hit = methodSource("updateRepoWallToolHit", "wallReadyForProcess");
    expect(hit).toContain("this.player.activeActionHitbox");
    expect(hit).toContain("this.player.combatReadout.weapon.tool");
    expect(hit).toContain("this.lastRepoWallSwing === this.player.actionId");
    expect(hit).toContain("this.lastRepoWallSwing = this.player.actionId");
    expect(hit).toContain("wall.isCleared");
    expect(hit).toContain("this.clearEnemy(definition, wall");
  });

  it("keeps interaction accessible without bypassing the equipped swing or active hit", () => {
    const action = methodSource("handleSourceNoteAction", "sourceNoteWallNeedsStamp");
    expect(action).toContain("this.startRepoWallSwing(wall)");
    expect(action).not.toContain("this.player.startAction");
    expect(action).not.toContain("this.handleEnemyInteract");
    const start = methodSource("startRepoWallSwing", "updateRepoWallToolHit");
    expect(start).toContain("this.player.faceTowards(wall.position)");
    expect(start).toContain("tryEquippedToolSwing(this.player)");
    expect(start).not.toContain("clearEnemy");
  });

  it("saves discoveries immediately and keeps the packet in the room until filed", () => {
    const collect = methodSource("collectAnnotationDraftingNote", "fileAnnotationDraftingNotes");
    expect(collect.includes("sceneProgress.annotationGatheredMask = result.gatheredMask")).toBe(true);
    expect(collect.includes("saveGameNow()")).toBe(true);
    expect(archiveSceneSource.includes("FILE PACKET BEFORE LEAVING")).toBe(true);
  });

  it("does not send a complete carried packet back into the stacks", () => {
    const hint = methodSource("sourceNoteActionHint", "isNearSourceNoteActionTarget");
    expect(hint).toContain('})) : packet.ready ? [] : [{');
    expect(hint).toContain('this.currentRoomId === "A1" && (packet.held.length || packet.ready)');
    expect(hint).toContain('id: "annotation-research-table"');
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
    expect(inspect).toContain("sourceNoteProvenanceMask = result.foundMask");
    expect(inspect).not.toContain("completeSourceNoteVerification(");
    expect(inspect).not.toContain("sourceNoteProvenanceComplete = 1");
    const action = methodSource("handleSourceNoteAction", "sourceNoteWallNeedsStamp");
    expect(action).toContain('readSourceNoteTrail(gameState.sceneProgress).ready && target.id === "source-note-research-table"');
    expect(action).toContain("this.reviewFirstFootnote()");
    const review = methodSource("reviewFirstFootnote", "completeSourceNoteVerification");
    expect(review).toContain("!readSourceNoteTrail(gameState.sceneProgress).ready");
    expect(review).toContain("this.sourceNoteBoard.show");
    expect(review).toContain("sourceNote47ReadershipCorrected = 1");
    expect(review).toContain("aboutSeriesFirstFootnoteComplete = 1");
    expect(review).toContain("sourceNoteProvenanceComplete = 1");
    expect(review).toContain("saveGameNow()");
    const complete = methodSource("completeSourceNoteVerification", "drawRoutedSourceNote");
    expect(complete).toContain("fileSourceNote47Metadata()");
    expect(complete).toContain('this.sourceNoteStatus === "verified"');
    const update = archiveSceneSource.slice(archiveSceneSource.indexOf("if (this.sourceNoteBoard.active)"), archiveSceneSource.indexOf("if (this.researchChoice.active)"));
    expect(update).toContain("this.player.update(delta, false)");
    expect(update).toContain("this.updateDanneLurker(delta, false)");
  });

  it("keeps A1 spatial instead of stacking map and terminal dashboards", () => {
    const room = methodSource("renderSourceRoom", "renderOpenNetAnnex");
    expect(room).toContain("drawCompactSourceRoomTerminal");
    expect(room).not.toContain("addSnesWorldMap");
    expect(room).not.toContain("addTerminalPanel");
    expect(archiveSceneSource.includes('if (room.id !== "A1" && room.id !== "AS" && room.id !== "B1" && room.id !== "B2" && room.roomType !== "secret")')).toBe(true);
    const sourceRoom = methodSource("renderSourceRoom", "renderArchiveA1Tilemap");
    expect(sourceRoom).not.toContain("drawAnnotationDraftingStations");
    const stacks = methodSource("renderAnnotationStacks()", "enterAnnotationStacks");
    expect(stacks).toContain("drawAnnotationDraftingStations");
    expect(stacks).toContain("restoreAnnotationSlipIcon");
    expect(stacks).not.toContain("drawResearchTable");
  });

  it("keeps secret treasure rooms free of explanatory posters and duplicate bottom prompts", () => {
    const secret = methodSource("renderSecretRoom", "renderRewardRoom");
    expect(secret).toContain("addSnesTreasurePedestal");
    expect(secret).not.toContain("addTerminalPanel");
    expect(archiveSceneSource).toContain('ARCHIVE_ROOMS[this.currentRoomId].roomType !== "secret" && nearest');
  });

  it("gives the proof chamber an interactive specialist instead of implementation notes", () => {
    const room = methodSource("renderProofChamber", "renderHintRoom");
    expect(room).not.toContain("addTerminalPanel");
    expect(room).toContain('new HistorianNPC(this, "elena"');
    expect(room).toContain("this.roomCleanups.push(() => specialist.destroy())");
    const review = methodSource("resolveAmbiguousWithSpecialist", "useGoldenRuleGate");
    expect(review.indexOf("if (!this.ambiguousSplit)")).toBeLessThan(review.indexOf("this.specialistDecisionMade = true"));
    const gate = methodSource("useGoldenRuleGate", "consumeArchiveReturnSpawn");
    expect(gate).toContain('this.currentRoomId === "B2" && !this.specialistDecisionMade');
  });

  it("gives the player time to move after leaving the meaning review", () => {
    const resume = methodSource("resumeMeaningReview", "useGoldenRuleGate");
    expect(resume).toContain("this.time.now + 600");
    expect(archiveSceneSource).toContain("this.time.now >= this.reviewResumeUntil");
    expect(archiveSceneSource).toContain("Math.max(this.wallContactCooldown, this.reviewResumeUntil)");
  });

  it("files the referral tray without a modal and retires the completed interaction", () => {
    const render = methodSource("renderStacksRoom", "renderProofChamber");
    expect(render).toContain("if (this.referralManifestDelivered && this.agencyTimerResolved) return;");
    const file = methodSource("deliverReferralManifest", "splitAmbiguousFlag");
    expect(file).not.toContain("this.dialog.show");
    expect(file).toContain('item.id !== "stacks-manifest"');
    expect(file).toContain('this.toast.show("FILED - ROUTES OPEN"');
    expect(file).toContain("if (this.referralManifestDelivered && this.agencyTimerResolved) return;");
  });

  it("leaves the hint-room north doorway free of the duplicate wall-map collision box", () => {
    const hint = methodSource("renderHintRoom", "renderPuzzleRoom");
    expect(hint).toContain("addSnesMapTablet");
    expect(hint).not.toContain("this.drawWallMap(");
    expect(hint).not.toContain("addTerminalPanel");
    expect(hint).toContain('new HistorianNPC(this, "marcus"');
    expect(hint).toContain('this.dialog.show("ARCHIVIST", clue)');
    expect(hint).toContain("this.roomCleanups.push(() => archivist.destroy())");
  });

  it("opens the next chapter through the physical east exit", () => {
    const finish = methodSource("finishArchiveIfReady", "sourceRoomComplete");
    expect(finish).toContain("archiveSourceRoomComplete = 1");
    expect(finish).toContain("EXIT EAST");
    expect(finish).not.toContain('transitionTo(this, "NetworkScene")');
    expect(archiveSceneSource.includes('exits: { north: "AS", west: "O1", east: "N1", south: "B1" }')).toBe(true);
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
