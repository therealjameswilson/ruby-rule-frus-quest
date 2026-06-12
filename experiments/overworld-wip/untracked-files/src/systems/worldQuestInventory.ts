export type WorldQuestItemId =
  | "finding_aid"
  | "document_cart"
  | "citation_pen"
  | "redaction_lens"
  | "declassification_stamp"
  | "review_memo"
  | "bound_frus_volume";

export interface WorldQuestItemDefinition {
  id: WorldQuestItemId;
  displayName: string;
  shortLabel: string;
  use: string;
}

export const WORLD_QUEST_ITEM_REGISTRY: readonly WorldQuestItemDefinition[] = [
  {
    id: "finding_aid",
    displayName: "Finding Aid",
    shortLabel: "AID",
    use: "Opens the records route by proving box and folder control."
  },
  {
    id: "document_cart",
    displayName: "Document Cart",
    shortLabel: "CART",
    use: "Carries the assignment packet from Navy Hill into the district."
  },
  {
    id: "citation_pen",
    displayName: "Citation Pen",
    shortLabel: "CITE",
    use: "Turns a source note into a defensible provenance record."
  },
  {
    id: "redaction_lens",
    displayName: "Redaction Lens",
    shortLabel: "LENS",
    use: "Reads classification issues before applying a visible stamp."
  },
  {
    id: "declassification_stamp",
    displayName: "Declassification Stamp",
    shortLabel: "DCL",
    use: "Opens controlled routes after human declassification review."
  },
  {
    id: "review_memo",
    displayName: "Review Memo",
    shortLabel: "MEMO",
    use: "Carries human reviewer approval to the next gate."
  },
  {
    id: "bound_frus_volume",
    displayName: "Bound FRUS Volume",
    shortLabel: "VOL",
    use: "Marks final assembly after signoff at the publication lectern."
  }
] as const;

export function getWorldQuestItemDefinition(itemId: string) {
  return WORLD_QUEST_ITEM_REGISTRY.find((item) => item.id === itemId) ?? null;
}

export function worldQuestItemLabel(itemId: string) {
  return getWorldQuestItemDefinition(itemId)?.displayName ?? itemId;
}

export function hasWorldQuestItem(inventory: readonly string[], itemId: string) {
  const definition = getWorldQuestItemDefinition(itemId);
  if (!definition) return inventory.includes(itemId);
  return inventory.includes(definition.displayName) || inventory.includes(definition.id);
}

export function addWorldQuestItemToInventory(inventory: string[], itemId: string) {
  const definition = getWorldQuestItemDefinition(itemId);
  const label = definition?.displayName ?? itemId;
  if (hasWorldQuestItem(inventory, itemId)) {
    return { added: false, label, definition };
  }
  inventory.push(label);
  return { added: true, label, definition };
}

export function getWorldQuestInventoryReadout(inventory: readonly string[]) {
  return WORLD_QUEST_ITEM_REGISTRY.map((item) => ({
    ...item,
    acquired: hasWorldQuestItem(inventory, item.id)
  }));
}
