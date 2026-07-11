import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FRUS_VOLUMES, OVERWORLD_REGIONS, SCREENS } from "../assets/registry";

const sceneDir = dirname(fileURLToPath(import.meta.url));

function sceneSource(fileName: string) {
  return readFileSync(resolve(sceneDir, fileName), "utf8");
}

describe("boot payload stays lazy", () => {
  it("BootScene no longer eager-loads the bulk art registries", () => {
    const boot = sceneSource("BootScene.ts");
    // The ~75MB overworld/gameplay/frus/screens registries must not be pulled
    // into the boot preload; each scene loads only the assets it needs.
    expect(boot).not.toContain("preloadAllNewArtPack");
    expect(boot).not.toContain("ALL_NEW_ART_REGISTRIES");
    expect(boot).not.toContain("GAMEPLAY_TILED_MAPS");
  });

  it("scenes lazily preload the registry assets they consume", () => {
    expect(sceneSource("TitleScene.ts")).toContain("SCREENS");
    expect(sceneSource("WorldMapScene.ts")).toContain("OVERWORLD_REGIONS");
    expect(sceneSource("GameplayMapScene.ts")).toContain("GAMEPLAY_MAPS");
    expect(sceneSource("UIScene.ts")).toContain("FRUS_VOLUMES.ui_row_six");
  });
});

describe("FRUS volume texture contract", () => {
  // Guards renames of the four FRUS_VOLUMES keys scenes lazily load by key.
  it("keeps the referenced FRUS volume keys defined", () => {
    for (const key of ["world_standing", "pickup_microform", "ui_row_six", "reward_legendary"] as const) {
      expect(FRUS_VOLUMES[key]).toBeTruthy();
    }
  });

  it("keeps the lazily loaded screen and overworld keys defined", () => {
    expect(SCREENS.title_screen_16bit_sharp_256x240).toBeTruthy();
    expect(OVERWORLD_REGIONS.europe).toBeTruthy();
  });
});
