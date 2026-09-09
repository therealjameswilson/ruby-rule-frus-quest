import { describe, expect, it } from "vitest";
import { CROSS_REFERENCE_CATALOG, crossReferenceMatches, restoreCrossReferenceDraft } from "./crossReferenceCatalog";

describe("training cross-reference catalog", () => {
  it.each([undefined, NaN, Infinity, -1, 0, 1.5, 4])( "ignores invalid saved selection %s", value => {
    expect(restoreCrossReferenceDraft(value)).toBe(0);
  });
  it("requires both record type and date, not just a matching subject", () => {
    expect(CROSS_REFERENCE_CATALOG).toHaveLength(3);
    expect(crossReferenceMatches(1)).toBe(false);
    expect(crossReferenceMatches(2)).toBe(true);
    expect(crossReferenceMatches(3)).toBe(false);
    expect(crossReferenceMatches(0)).toBe(false);
  });
  it.each([1, 2, 3])("retains valid unfiled draft %i", value => {
    expect(restoreCrossReferenceDraft(value)).toBe(value);
  });
});
