export type DanneItemTier = "legendary" | "key" | "collectible";
export type DanneItemId = "ruby-pen" | "master-declass-key" | "treaty-fragments";

export interface DanneItemCatalogEntry {
  id: DanneItemId;
  key: string;
  path: string;
  displayName: string;
  tier: DanneItemTier;
  description: string;
}

export const TREATY_FRAGMENT_LABELS = ["Treaty Fragment I", "Treaty Fragment II", "Treaty Fragment III"] as const;

export const DANNE_ITEM_CATALOG: readonly DanneItemCatalogEntry[] = [
  {
    id: "ruby-pen",
    key: "danne-item-ruby-pen",
    path: "assets/art-pack/danne-pack/items/15_item_ruby_pen.png",
    displayName: "Ruby Pen",
    tier: "legendary",
    description: "Legendary red-ink tool for decisive editorial action."
  },
  {
    id: "master-declass-key",
    key: "danne-item-master-declass-key",
    path: "assets/art-pack/danne-pack/items/16_item_declass_key.png",
    displayName: "Master Declass Key",
    tier: "key",
    description: "Key item for approved declassification locks."
  },
  {
    id: "treaty-fragments",
    key: "danne-item-treaty-fragments",
    path: "assets/art-pack/danne-pack/items/17_item_treaty_fragments.png",
    displayName: "Treaty Fragments",
    tier: "collectible",
    description: "Three-part record set for the true ending branch."
  }
];
