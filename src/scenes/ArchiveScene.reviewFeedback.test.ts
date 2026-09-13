import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveScene } from "./ArchiveScene";
import { addProcessItem, gameState, resetGameState, setLatestMessage } from "../game/state";
import type { ChoiceOption } from "../game/types";
import { saveGameNow } from "../systems/save";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: { warning: vi.fn() } }));

beforeEach(() => {
  resetGameState(); vi.clearAllMocks(); addProcessItem("citation_stamp");
  Object.assign(gameState.sceneProgress, { sourceNoteProvenanceComplete: 1, annotationGatheredMask: 7 });
});

describe("Archive review handoff feedback", () => {
  it.each([true, false])("preserves completion feedback only after approval: %s", approve => {
    let choose: (option: ChoiceOption) => void = () => { throw Error("No choice opened"); };
    const toast = { show: vi.fn() };
    const scene = Object.assign(new ArchiveScene(), {
      researchChoice: { active: false, show: (_title: string, _options: ChoiceOption[], callback: typeof choose) => { choose = callback; } },
      interactionPrompt: { update: vi.fn() }, clearSourceNoteRouteCue: vi.fn(),
      resumeArchiveReview: vi.fn(), player: { position: { x: 128, y: 154 } }, toast
    }) as unknown as { reviewResearchDecision(id: "coverage", onApprove: () => void): void };
    const complete = vi.fn(() => {
      toast.show("DOCUMENTS UNSEALED", { x: 128, y: 154 }, "info");
      setLatestMessage("Annotation filed. The documents are ready to collect.");
    });
    scene.reviewResearchDecision("coverage", complete);
    choose({ key: "A", label: "choice", value: approve ? "coverage" : "single_folder" });
    expect(complete).toHaveBeenCalledTimes(approve ? 1 : 0);
    expect(toast.show).toHaveBeenLastCalledWith(approve ? "DOCUMENTS UNSEALED" : "MAP REPOSITORIES + ACCESS GAPS", { x: 128, y: 154 }, approve ? "info" : "warn");
    expect(gameState.latestMessage).toBe(approve ? "Annotation filed. The documents are ready to collect." : "Map the other relevant repositories and access gaps. Try again.");
    expect(saveGameNow).toHaveBeenCalledOnce();
  });
});
