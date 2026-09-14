import { expect, it } from "vitest";
import { GAMEPLAY_MAPS } from "../assets/registry";
import { GAMEPLAY_MAP_SHORT_NAMES } from "./gameplayMapFlow";

it("gives every gameplay map a complete name that fits its entry card", () => {
  expect(Object.keys(GAMEPLAY_MAP_SHORT_NAMES).sort()).toEqual(Object.keys(GAMEPLAY_MAPS).sort());
  expect(new Set(Object.values(GAMEPLAY_MAP_SHORT_NAMES)).size).toBe(8);
  for (const title of Object.values(GAMEPLAY_MAP_SHORT_NAMES)) {
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(19);
    expect(title).toMatch(/^[A-Z0-9 ]+$/);
  }
  expect(GAMEPLAY_MAP_SHORT_NAMES.historian_office).toBe("HISTORIAN OFFICE");
});
