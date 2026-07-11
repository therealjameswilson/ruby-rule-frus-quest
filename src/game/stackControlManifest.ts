import { NARA_CATALOG_ITEM_LABEL, NARA_CATALOG_SOURCE_BASIS, NARA_CATALOG_SOURCE_URL } from "./naraCatalog";
import { RECORD_COLLECTION_PROMPTS, RECORD_COLLECTION_SOURCE_URL } from "./recordCollection";

export const STACK_TRANSFER_MANIFEST_ITEM_LABEL = "Stack Transfer Manifest";
export const DOCUMENT_CART_ROUTE_ITEM_LABEL = "Document Cart Route";
export const STACK_CONTROL_POINT_VALUE = 4;
export const STACK_CONTROL_RECORD_COLLECTION_STEP = RECORD_COLLECTION_PROMPTS.length;

export interface StackControlManifestInput {
  naraCatalogFiled?: boolean;
  alreadyFiled?: boolean;
  inventory?: readonly string[];
  currentRecordCollectionStep?: number;
}

export interface StackControlManifestResult {
  ok: boolean;
  alreadyFiled: boolean;
  documentPoints: number;
  nextRecordCollectionStep: number;
  shouldFileManifest: boolean;
  itemsToAward: readonly string[];
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

const STACK_CONTROL_SOURCE_BASIS =
  "After locating records, compilers preserve copies or notes for likely documents and context records; stack moves need a visible manifest so boxes do not become invisible gaps.";

function hasCatalogTrail(input: StackControlManifestInput) {
  return Boolean(input.naraCatalogFiled) || Boolean(input.inventory?.includes(NARA_CATALOG_ITEM_LABEL));
}

function missingAwards(inventory: readonly string[]) {
  return [STACK_TRANSFER_MANIFEST_ITEM_LABEL, DOCUMENT_CART_ROUTE_ITEM_LABEL]
    .filter((item) => !inventory.includes(item));
}

export function fileStackControlManifest(input: StackControlManifestInput = {}): StackControlManifestResult {
  const inventory = input.inventory ?? [];
  const alreadyFiled = Boolean(input.alreadyFiled);
  if (!hasCatalogTrail(input)) {
    const message = "Stack control waiting: file the NARA Source Index before moving rows 17-24.";
    return {
      ok: false,
      alreadyFiled,
      documentPoints: 0,
      nextRecordCollectionStep: input.currentRecordCollectionStep ?? 0,
      shouldFileManifest: false,
      itemsToAward: [],
      sourceUrl: NARA_CATALOG_SOURCE_URL,
      sourceBasis: NARA_CATALOG_SOURCE_BASIS,
      objective: "Need NARA Source Index: talk to the catalog desk before routing archival boxes.",
      message,
      pages: [
        message,
        NARA_CATALOG_SOURCE_BASIS,
        "A document cart without a source index can move evidence out of sight."
      ]
    };
  }

  const nextRecordCollectionStep = Math.max(
    input.currentRecordCollectionStep ?? 0,
    STACK_CONTROL_RECORD_COLLECTION_STEP
  );
  const message = alreadyFiled
    ? "Stack transfer manifest already filed: rows 17-24 remain tied to the source index."
    : "Stack transfer manifest filed: rows 17-24 can move with source and context notes visible.";

  return {
    ok: true,
    alreadyFiled,
    documentPoints: alreadyFiled ? 0 : STACK_CONTROL_POINT_VALUE,
    nextRecordCollectionStep,
    shouldFileManifest: !alreadyFiled,
    itemsToAward: missingAwards(inventory),
    sourceUrl: RECORD_COLLECTION_SOURCE_URL,
    sourceBasis: STACK_CONTROL_SOURCE_BASIS,
    objective: "Stack manifest filed. Document carts can move boxes without losing provenance.",
    message,
    pages: [
      message,
      STACK_CONTROL_SOURCE_BASIS,
      "Rows 17-24 now have a manifest, cart route, and visible context trail."
    ]
  };
}
