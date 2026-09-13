import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveScene } from "./ArchiveScene";
import { NetworkScene } from "./NetworkScene";
import { ReferralVaultScene } from "./ReferralVaultScene";
import { SilentReadScene } from "./SilentReadScene";
import { gameState, resetGameState } from "../game/state";
import type { AttackBuffer } from "../systems/hitstop";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../input/InputState", () => ({ tickInput: vi.fn(), getInput: () => ({ dir: { x: 0, y: 0 } }) }));

const boards = ["sourceNoteBoard", "researchChoice", "ledgerChoice", "manifestBoard", "treatmentBoard",
  "reviewChoice", "proofBoard", "editorialBoard", "crossReferenceBoard", "chronologyBoard", "releaseScopeBoard"];
const cases = [
  [ArchiveScene, "sourceNoteBoard"], [ArchiveScene, "researchChoice"],
  [NetworkScene, "ledgerChoice"], [ReferralVaultScene, "manifestBoard"], [ReferralVaultScene, "treatmentBoard"],
  [SilentReadScene, "reviewChoice"], [SilentReadScene, "proofBoard"], [SilentReadScene, "editorialBoard"],
  [SilentReadScene, "crossReferenceBoard"], [SilentReadScene, "chronologyBoard"], [SilentReadScene, "releaseScopeBoard"]
] as const;

beforeEach(() => { resetGameState(); gameState.mode = "explore"; });

describe("chapter swing interruption", () => {
  it.each(cases)("%s clears pending swing while %s is open", (Scene, board) => {
    const scene = new Scene();
    const player = { position: { x: 128, y: 180 }, update: vi.fn() };
    Object.assign(scene, {
      ...Object.fromEntries(boards.map(name => [name, { active: name === board, updateInput: vi.fn() }])),
      player,
      toast: { update: vi.fn() }, interactionPrompt: { update: vi.fn() },
      updateDanneLurker: vi.fn(), inventory: { active: false }, reliability: { active: false }, dialog: { active: false }
    });
    const buffer = (scene as unknown as { attackBuffer: AttackBuffer }).attackBuffer;
    buffer.press(0);
    scene.update(50, 16);
    expect(buffer.consume(60, true)).toBe(false);
    expect(player.update).toHaveBeenCalledWith(16, false);
  });
});
