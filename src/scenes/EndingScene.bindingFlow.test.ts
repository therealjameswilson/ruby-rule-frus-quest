import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FRUS_ROOM_GRAPH } from "../game/constants";

const sceneSource = readFileSync(new URL("./EndingScene.ts", import.meta.url), "utf8");
const bindingSource = readFileSync(new URL("../game/buckramBinding.ts", import.meta.url), "utf8");
const uiSource = readFileSync(new URL("./UIScene.ts", import.meta.url), "utf8");

describe("EndingScene physical Buckram Gate", () => {
  it("offers a reversible return passage without changing certification or duplicating rewards", () => {
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "G1")?.exits).toEqual({ west: "DV1" });
    const leave = sceneSource.slice(sceneSource.indexOf("  private leaveBindery()"), sceneSource.indexOf("  private startPhysicalBindingLoop()"));
    expect(leave).toContain("this.published || this.leaving");
    expect(leave).toContain("this.savePhysicalBindingProgress()");
    expect(leave).toContain('transitionTo(this, "BlackVaultLairScene")');
    expect(leave).not.toContain("applyBindingPacketReward");
    expect(leave).not.toContain("resolveStandardsViolation");
    expect(leave).not.toContain("publishVolume");
    expect(sceneSource).toContain('exits: this.published ? {} : { west: "DV1" }');
    expect(sceneSource).toContain('if (this.nearBinderyReturn()) return "RETURN TO VAULT"');
  });

  it("restores publication without recertifying or awarding completion twice", () => {
    const create = sceneSource.slice(sceneSource.indexOf("  create() {"), sceneSource.indexOf("  private resetTransientState()"));
    expect(create).toContain('this.published = gameState.finalGateCertification?.status === "published"');
    expect(create).toContain('this.published ? "ending" : "explore"');
    expect(create).toContain('getPublicationOutcomeReadout().id === "published_under_appeal"');
    expect(create).toContain("this.finishBindingCeremonyPresentation()");
    expect(create).toMatch(/} else \{\s*this\.updateGateReadout\(\);\s*}/);
    expect(create).not.toContain("this.publishVolume()");
    expect(create).not.toContain("recordBindingCeremonyCompletion()");
  });

  it("hides the gameplay band during endings, but not the playable bindery", () => {
    const visibility = uiSource.slice(uiSource.indexOf("  private shouldShowQuestBand("), uiSource.indexOf("  private drawQuestBandChrome("));
    expect(visibility).toContain('gameState.mode === "ending"');
    expect(visibility).not.toContain('"EndingScene"');
  });

  it("saves the finished outcome before the ceremony instead of waiting for autosave", () => {
    const publish = sceneSource.slice(sceneSource.indexOf("  private publishVolume()"), sceneSource.indexOf("  private playBindingCeremony()"));
    const savedAt = publish.indexOf('saveGameNow("manual")');
    expect(savedAt).toBeGreaterThan(publish.indexOf("finalizeCompletionStats()"));
    expect(savedAt).toBeGreaterThan(publish.indexOf("sceneProgress.trueEndingPublicationCertified"));
    expect(savedAt).toBeLessThan(publish.indexOf("this.playBindingCeremony()"));
  });

  it("starts the physical binding loop without activating a choice prompt", () => {
    expect(sceneSource).toContain("this.startPhysicalBindingLoop()");
    expect(sceneSource).not.toContain("new ChoicePrompt");
    expect(sceneSource).toContain("new IndexRouterOverlay(this)");
    expect(sceneSource).toContain("this.handleBindingPacketAction(activePacket)");
  });

  it("makes the About-the-Series index rule a physical router at the Index Desk", () => {
    expect(sceneSource).toContain('packet.id === "index-proof-docket"');
    expect(sceneSource).toContain("aboutSeriesIndexRoutingComplete");
    expect(sceneSource).toContain('setObjective("INDEX: ROUTE TO DOC")');
    expect(sceneSource).toContain('this.toast.show(completionMessage ? "DOC 87 INDEXED"');
  });

  it("requires a live human standards seal without fabricating document repairs", () => {
    const open = sceneSource.slice(sceneSource.indexOf("  private openStandardsBoard"), sceneSource.indexOf("  private openIndexRouter"));
    expect(open).toContain("bindingCertificationEvidence(gameState.documentCandidates, gameState.standardsViolations)");
    expect(open).toContain('packet.status !== "routed"');
    expect(open).not.toContain("publishDocument");
    expect(sceneSource).not.toContain("FINAL CHECKS RECORDED");
    expect(uiSource).toContain('getString("hud.reviewRecord")');
    expect(uiSource).toContain('buckramBindingDestination(gameState.sceneProgress)');
  });

  it("renders five distinct stations around one human binding press", () => {
    expect(sceneSource).toContain('id: "front-matter-bench"');
    expect(sceneSource).toContain('id: "index-desk"');
    expect(sceneSource).toContain('id: "kellogg-press"');
    expect(sceneSource).toContain('id: "gpo-handoff"');
    expect(sceneSource).toContain('id: "public-release-terminal"');
    expect(sceneSource).toContain('"PUBLISH READY"');
    expect(sceneSource).not.toContain("addSnesProgressMural");
    expect(sceneSource).not.toContain("addSnesPublicationTeam");
  });

  it("persists packet step/status and translates every bundle into legacy completion fields", () => {
    expect(sceneSource).toContain("sceneProgress.buckramBindingStep");
    expect(sceneSource).toContain("sceneProgress.buckramBindingStatus");
    expect(sceneSource).toContain("sceneProgress.frontMatterAssemblyComplete");
    expect(sceneSource).toContain("sceneProgress.indexDocketComplete");
    expect(sceneSource).toContain("sceneProgress.kelloggFinalCertificationComplete");
    expect(sceneSource).toContain("sceneProgress.gpoSegmentAssemblyComplete");
    expect(sceneSource).toContain("sceneProgress.releaseCalendarComplete");
  });

  it("gives the intended bindery station an eight-pixel touch margin", () => {
    expect(sceneSource).toContain("findActionBindingStation(packet)");
    expect(sceneSource).toContain("intendedDistance <= maxDistance + 8");
  });

  it("keeps all 38 underlying checks in typed packet metadata", () => {
    expect(bindingSource).toContain("BUCKRAM_BINDING_CHECK_TOTAL");
    expect(bindingSource).toContain("PUBLIC_CITATION_CARD_PROMPTS");
    expect(bindingSource).toContain("KELLOGG_CERTIFICATION_PROMPTS");
  });
});
