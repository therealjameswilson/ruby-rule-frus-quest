import { describe, expect, it } from "vitest";
import {
  logNaraCatalog,
  NARA_CATALOG_ITEM_LABEL,
  NARA_CATALOG_POINT_VALUE,
  NARA_CATALOG_RECORD_COLLECTION_STEP,
  NARA_CATALOG_SOURCE_URL,
  NARA_MICROFORM_ITEM_LABEL,
  NARA_MICROFORM_SOURCE_URL
} from "./naraCatalog";

describe("NARA catalog desk interaction", () => {
  it("files a one-time source index and microform trail", () => {
    const result = logNaraCatalog({ alreadyFiled: false, inventory: [], currentRecordCollectionStep: 0 });

    expect(result.alreadyFiled).toBe(false);
    expect(result.documentPoints).toBe(NARA_CATALOG_POINT_VALUE);
    expect(result.itemsToAward).toEqual([NARA_CATALOG_ITEM_LABEL, NARA_MICROFORM_ITEM_LABEL]);
    expect(result.nextRecordCollectionStep).toBe(NARA_CATALOG_RECORD_COLLECTION_STEP);
    expect(result.sourceUrl).toBe(NARA_CATALOG_SOURCE_URL);
    expect(result.microformSourceUrl).toBe(NARA_MICROFORM_SOURCE_URL);
    expect(result.sourceBasis).toContain("copies or notes");
    expect(result.microformBasis).toContain("microfiche supplements");
  });

  it("does not farm points or rewind collection progress on repeat catalog filing", () => {
    const result = logNaraCatalog({
      alreadyFiled: true,
      inventory: [NARA_CATALOG_ITEM_LABEL, NARA_MICROFORM_ITEM_LABEL],
      currentRecordCollectionStep: 3
    });

    expect(result.documentPoints).toBe(0);
    expect(result.itemsToAward).toEqual([]);
    expect(result.nextRecordCollectionStep).toBe(3);
    expect(result.message).toContain("already filed");
  });

  it("recovers missing catalog inventory awards for older saves without re-awarding points", () => {
    const result = logNaraCatalog({
      alreadyFiled: true,
      inventory: [NARA_CATALOG_ITEM_LABEL],
      currentRecordCollectionStep: 1
    });

    expect(result.documentPoints).toBe(0);
    expect(result.itemsToAward).toEqual([NARA_MICROFORM_ITEM_LABEL]);
    expect(result.nextRecordCollectionStep).toBe(NARA_CATALOG_RECORD_COLLECTION_STEP);
  });
});
