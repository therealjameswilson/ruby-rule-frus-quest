import { describe, expect, it } from "vitest";
import { SCENE_ORDER } from "./constants";
import { resolveStartScene } from "./startScene";

describe("web startup route", () => {
  it("offers Continue on normal startup when a readable save exists", () => {
    expect(resolveStartScene(null, true)).toBe("TapToStartScene");
    expect(resolveStartScene("unknown", true)).toBe("TapToStartScene");
  });

  it("preserves the warning introduction for a new game", () => {
    expect(resolveStartScene(null, false)).toBe("WarningScene");
    expect(resolveStartScene("unknown", false)).toBe("WarningScene");
  });

  it("preserves every registered scene debug override with or without a save", () => {
    for (const scene of SCENE_ORDER) {
      expect(resolveStartScene(scene, true)).toBe(scene);
      expect(resolveStartScene(scene, false)).toBe(scene);
    }
  });
});
