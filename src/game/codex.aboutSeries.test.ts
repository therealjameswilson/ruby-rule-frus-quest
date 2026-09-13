import { describe, expect, it } from "vitest";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { getCodexEntries } from "./codex";

describe("Series Handbook codex entry", () => {
  it("is always available and opens the official About the Series page", () => {
    const handbook = getCodexEntries("Items").find((entry) => entry.id === "item-series-handbook");
    expect(handbook).toMatchObject({
      displayName: "Series Handbook",
      unlocked: true,
      sourceUrl: ABOUT_SERIES_SOURCE.url
    });
    expect(handbook?.lore).toMatch(/original text/i);
    expect(handbook?.lore).toMatch(/document numbers/i);
    expect(handbook?.lore).toMatch(/30 years/i);
  });
});
