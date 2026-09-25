import Phaser from "phaser";
import { FRUS_VOLUMES, publicAssetPath } from "../assets/registry";
import { DANNE_ITEM_CATALOG } from "../game/danneItemCatalog";

export const TOOL_ART_KEY = "frus-tools-v2";
export const INVENTORY_ART = [
  { key: TOOL_ART_KEY, path: publicAssetPath("presentation/frus-tools-v2.png") },
  ...DANNE_ITEM_CATALOG.map(({ key, path }) => ({ key, path })),
  { key: "ui_row_six", path: publicAssetPath(FRUS_VOLUMES.ui_row_six) }
];

/** Scene-owned loading never changes pause state or reopens a closed menu. */
export class InventoryArtLoader {
  status: "idle" | "loading" | "ready" | "error" = "idle";
  constructor(private readonly scene: Phaser.Scene, private readonly changed: () => void) {}

  private complete = () => {
    this.status = INVENTORY_ART.every(asset => this.scene.textures.exists(asset.key)) ? "ready" : "error";
    this.changed();
  };

  load() {
    if (this.status === "loading") return;
    const missing = INVENTORY_ART.filter(asset => !this.scene.textures.exists(asset.key));
    if (!missing.length) { this.status = "ready"; return; }
    this.status = "loading";
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, this.complete);
    for (const asset of missing) this.scene.load.image(asset.key, asset.path);
    if (!this.scene.load.isLoading()) this.scene.load.start();
  }

  destroy() {
    this.scene.load.off(Phaser.Loader.Events.COMPLETE, this.complete);
  }
}
