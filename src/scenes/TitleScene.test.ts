import { describe, expect, it } from "vitest";
import { GAME_HEIGHT } from "../game/constants";
import { TITLE_LAYOUT, framedPlateBounds } from "./titleLayout";

describe("TitleScene layout", () => {
  it("keeps the map, title plate, and relic shelf from overlapping", () => {
    const map = framedPlateBounds(TITLE_LAYOUT.map);
    const title = framedPlateBounds(TITLE_LAYOUT.titlePlate);
    const relics = framedPlateBounds(TITLE_LAYOUT.relicShelf);

    // top-to-bottom stacking order with no vertical collisions
    expect(map.bottom).toBeLessThanOrEqual(title.top);
    expect(title.bottom).toBeLessThanOrEqual(relics.top);
    expect(relics.bottom).toBeLessThanOrEqual(TITLE_LAYOUT.pressStartY);
  });

  it("keeps every framed plate inside the filmstrip borders", () => {
    for (const plate of [TITLE_LAYOUT.map, TITLE_LAYOUT.titlePlate, TITLE_LAYOUT.relicShelf]) {
      const { top, bottom } = framedPlateBounds(plate);
      expect(top).toBeGreaterThanOrEqual(TITLE_LAYOUT.topFilmstripY - 8);
      expect(bottom).toBeLessThanOrEqual(TITLE_LAYOUT.bottomFilmstripY);
    }
  });

  it("keeps the controls line on screen", () => {
    expect(TITLE_LAYOUT.controlsY).toBeLessThan(GAME_HEIGHT);
    expect(TITLE_LAYOUT.pressStartY).toBeLessThan(TITLE_LAYOUT.controlsY);
  });
});
