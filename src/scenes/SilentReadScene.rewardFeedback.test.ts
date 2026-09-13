import { beforeEach, describe, expect, it, vi } from "vitest";
import { SilentReadScene } from "./SilentReadScene";
import { SILENT_READ_REVIEW_ITEMS } from "../game/silentReadReview";
import { addSnesRewardBurst } from "../systems/snesPixelArt";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/audio", () => ({ retroAudio: { stamp: vi.fn() } }));
vi.mock("../systems/snesPixelArt", () => ({ addSnesRewardBurst: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("proofing tool reward feedback", () => {
  it.each([
    ["mechanical-fix", "red-pencil", "Red Pencil"],
    ["proof-date", "proof-lens", "Proof Lens"],
    ["public-crossref", null, null]
  ] as const)("shows %s only after advancing the stamped record", (id, texture, label) => {
    const item = SILENT_READ_REVIEW_ITEMS.find(candidate => candidate.id === id)!;
    const flag = { ...item, status: "verified" };
    const order: string[] = [];
    const reward = vi.fn(() => { order.push("reward"); return true; });
    vi.mocked(addSnesRewardBurst).mockImplementation(() => { order.push("burst"); return undefined as never; });
    const scene = Object.assign(new SilentReadScene(), {
      physicalFlags: SILENT_READ_REVIEW_ITEMS.map(candidate => candidate.id === id ? flag : candidate),
      currentRoomId: id === "mechanical-fix" ? "E1" : "S1",
      physicalPromptTargets: () => ({ strictTarget: {} }),
      pendingEditorialRepair: () => null, getActiveFlag: () => flag,
      findActionWorkstation: () => ({ id: item.destination }),
      stationFor: () => ({ id: item.destination }),
      addProcessStampMark: vi.fn(), applyFlagReward: reward,
      toast: { hide: () => order.push("hide-toast") },
      savePhysicalReviewProgress: vi.fn(), updatePhysicalVerification: vi.fn(),
      advanceAfterStamp: () => order.push("redraw")
    }) as unknown as { handlePhysicalAction(): void };
    scene.handlePhysicalAction();
    expect(flag.status).toBe("stamped");
    expect(order).toEqual(texture ? ["reward", "redraw", "hide-toast", "burst"] : ["reward", "redraw"]);
    if (texture) expect(addSnesRewardBurst).toHaveBeenCalledWith(scene, 128, 72, texture, label, expect.any(Function), 600);
    else expect(addSnesRewardBurst).not.toHaveBeenCalled();
    scene.handlePhysicalAction();
    expect(reward).toHaveBeenCalledOnce();
    expect(addSnesRewardBurst).toHaveBeenCalledTimes(texture ? 1 : 0);
  });
});
