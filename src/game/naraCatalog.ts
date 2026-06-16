export const NARA_CATALOG_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";
export const NARA_MICROFORM_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/chapter-8";
export const NARA_CATALOG_ITEM_LABEL = "NARA Source Index";
export const NARA_MICROFORM_ITEM_LABEL = "Microform Supplement Reels";
export const NARA_CATALOG_POINT_VALUE = 5;
export const NARA_CATALOG_RECORD_COLLECTION_STEP = 2;

export interface NaraCatalogInput {
  alreadyFiled?: boolean;
  inventory?: readonly string[];
  currentRecordCollectionStep?: number;
}

export interface NaraCatalogResult {
  alreadyFiled: boolean;
  documentPoints: number;
  itemsToAward: readonly string[];
  nextRecordCollectionStep: number;
  sourceUrl: string;
  microformSourceUrl: string;
  sourceBasis: string;
  microformBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

export const NARA_CATALOG_SOURCE_BASIS =
  "The FRUS stages page says compilers identify important records, search for them, and make copies or notes of likely publication candidates and records needed for context.";

export const NARA_MICROFORM_SOURCE_BASIS =
  "The FRUS history chapter describes microfiche supplements as a way to release many additional documents beyond the printed volumes.";

function missingInventoryAwards(inventory: readonly string[]) {
  return [NARA_CATALOG_ITEM_LABEL, NARA_MICROFORM_ITEM_LABEL].filter((item) => !inventory.includes(item));
}

export function logNaraCatalog(input: NaraCatalogInput = {}): NaraCatalogResult {
  const inventory = input.inventory ?? [];
  const alreadyFiled = Boolean(input.alreadyFiled);
  const itemsToAward = missingInventoryAwards(inventory);
  const nextRecordCollectionStep = Math.max(
    input.currentRecordCollectionStep ?? 0,
    NARA_CATALOG_RECORD_COLLECTION_STEP
  );
  const message = alreadyFiled
    ? "NARA catalog already filed: source index and microform supplement trail remain available."
    : "NARA catalog filed: source index and microform supplement trail added to the collection notes.";

  return {
    alreadyFiled,
    documentPoints: alreadyFiled ? 0 : NARA_CATALOG_POINT_VALUE,
    itemsToAward,
    nextRecordCollectionStep,
    sourceUrl: NARA_CATALOG_SOURCE_URL,
    microformSourceUrl: NARA_MICROFORM_SOURCE_URL,
    sourceBasis: NARA_CATALOG_SOURCE_BASIS,
    microformBasis: NARA_MICROFORM_SOURCE_BASIS,
    objective: "NARA source index filed. Use it to support selection without losing context records.",
    message,
    pages: [
      message,
      NARA_CATALOG_SOURCE_BASIS,
      NARA_MICROFORM_SOURCE_BASIS
    ]
  };
}
