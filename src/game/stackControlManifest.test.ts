import { describe, expect, it } from "vitest";
import { NARA_CATALOG_ITEM_LABEL, NARA_CATALOG_SOURCE_URL } from "./naraCatalog";
import {
  DOCUMENT_CART_ROUTE_ITEM_LABEL,
  fileStackControlManifest,
  STACK_CONTROL_POINT_VALUE,
  STACK_CONTROL_RECORD_COLLECTION_STEP,
  STACK_TRANSFER_MANIFEST_ITEM_LABEL
} from "./stackControlManifest";

describe("NARA stack control manifest", () => {
  it("blocks box movement until the source index is filed", () => {
    const result = fileStackControlManifest({ inventory: [], currentRecordCollectionStep: 1 });

    expect(result.ok).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.shouldFileManifest).toBe(false);
    expect(result.sourceUrl).toBe(NARA_CATALOG_SOURCE_URL);
    expect(result.message).toContain("NARA Source Index");
  });

  it("files a manifest after catalog coverage exists", () => {
    const result = fileStackControlManifest({
      inventory: [NARA_CATALOG_ITEM_LABEL],
      currentRecordCollectionStep: 1
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFileManifest).toBe(true);
    expect(result.documentPoints).toBe(STACK_CONTROL_POINT_VALUE);
    expect(result.nextRecordCollectionStep).toBe(STACK_CONTROL_RECORD_COLLECTION_STEP);
    expect(result.itemsToAward).toEqual([STACK_TRANSFER_MANIFEST_ITEM_LABEL, DOCUMENT_CART_ROUTE_ITEM_LABEL]);
  });

  it("does not farm points on repeat but recovers missing labels", () => {
    const result = fileStackControlManifest({
      naraCatalogFiled: true,
      alreadyFiled: true,
      inventory: [STACK_TRANSFER_MANIFEST_ITEM_LABEL],
      currentRecordCollectionStep: 3
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFileManifest).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.nextRecordCollectionStep).toBe(3);
    expect(result.itemsToAward).toEqual([DOCUMENT_CART_ROUTE_ITEM_LABEL]);
  });
});
