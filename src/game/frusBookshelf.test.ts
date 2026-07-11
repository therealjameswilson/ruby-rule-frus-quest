import { describe, expect, it } from "vitest";
import {
  browseFrusBookshelf,
  FRUS_BOOKSHELF_FRAGMENT,
  FRUS_BOOKSHELF_POINT_VALUE,
  FRUS_BOOKSHELF_SOURCE_URL
} from "./frusBookshelf";

describe("FRUS bookshelf public-record interaction", () => {
  it("awards a one-time public-record fragment and document points", () => {
    const result = browseFrusBookshelf({ alreadyBrowsed: false, currentFragments: [] });

    expect(result.alreadyBrowsed).toBe(false);
    expect(result.documentPoints).toBe(FRUS_BOOKSHELF_POINT_VALUE);
    expect(result.fragmentLabel).toBe(FRUS_BOOKSHELF_FRAGMENT);
    expect(result.shouldAwardFragment).toBe(true);
    expect(result.visibleShelfCount).toBe(1);
    expect(result.sourceUrl).toBe(FRUS_BOOKSHELF_SOURCE_URL);
    expect(result.sourceBasis).toContain("official documentary record");
    expect(result.pages.join(" ")).toContain("White House");
  });

  it("does not farm points after the shelf has been browsed", () => {
    const result = browseFrusBookshelf({
      alreadyBrowsed: true,
      currentFragments: [FRUS_BOOKSHELF_FRAGMENT]
    });

    expect(result.documentPoints).toBe(0);
    expect(result.shouldAwardFragment).toBe(false);
    expect(result.visibleShelfCount).toBe(1);
    expect(result.message).toContain("reviewed");
  });

  it("can recover the fragment if an older save has the browse flag but lacks the fragment", () => {
    const result = browseFrusBookshelf({
      alreadyBrowsed: true,
      currentFragments: ["Front Matter Fragment"]
    });

    expect(result.documentPoints).toBe(0);
    expect(result.shouldAwardFragment).toBe(true);
    expect(result.visibleShelfCount).toBe(2);
  });
});
