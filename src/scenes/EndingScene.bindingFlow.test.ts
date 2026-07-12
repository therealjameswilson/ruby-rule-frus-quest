import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sceneSource = readFileSync(new URL("./EndingScene.ts", import.meta.url), "utf8");
const bindingSource = readFileSync(new URL("../game/buckramBinding.ts", import.meta.url), "utf8");

describe("EndingScene physical Buckram Gate", () => {
  it("starts the physical binding loop without activating a choice prompt", () => {
    expect(sceneSource).toContain("this.startPhysicalBindingLoop()");
    expect(sceneSource).not.toContain("new ChoicePrompt");
    expect(sceneSource).toContain("this.handleBindingPacketAction(activePacket)");
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
