import { describe, expect, it } from "vitest";
import { DANNE_SCENE_GEOMETRY, danneMapExplorationObjective } from "./danneSceneCollisions";
import { TREATY_FRAGMENT_LABELS } from "./danneItemCatalog";

describe("optional treaty-record route cues", () => {
  it("names the collectible before discovery and the real exit afterwards", () => {
    expect(danneMapExplorationObjective("NaraStacksScene", [])).toBe("FIND FRAGMENT I");
    expect(danneMapExplorationObjective("NaraStacksScene", [TREATY_FRAGMENT_LABELS[0]])).toBe("SOUTH TO ARCHIVE");
    expect(danneMapExplorationObjective("SenateHearingChamberScene", [])).toBe("OPTIONAL: HEARING RECORD");
    expect(danneMapExplorationObjective("SenateHearingChamberScene", [TREATY_FRAGMENT_LABELS[1]])).toBe("SOUTH TO OFFICE");
  });

  it("does not confuse one fragment with the other", () => {
    expect(danneMapExplorationObjective("NaraStacksScene", [TREATY_FRAGMENT_LABELS[1]])).toBe("FIND FRAGMENT I");
    expect(danneMapExplorationObjective("SenateHearingChamberScene", [TREATY_FRAGMENT_LABELS[0]])).toBe("OPTIONAL: HEARING RECORD");
  });

  it("does not change objectives for the other expansion rooms", () => {
    for (const scene of ["CherryBlossomGardenScene", "EmbassyCableRoomScene", "BlackVaultLairScene"] as const) {
      expect(danneMapExplorationObjective(scene, TREATY_FRAGMENT_LABELS)).toBe(DANNE_SCENE_GEOMETRY[scene].objective);
    }
  });
});
