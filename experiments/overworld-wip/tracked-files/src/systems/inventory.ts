import Phaser from "phaser";
import { ART_PACK_EXTRAS, ITEM_ICON_FRAMES } from "../game/artPack";
import { PALETTE } from "../game/constants";
import { gameState, getAreaProgressReadout, getDocumentWorkflowReadout, getWorkflowToolReadout } from "../game/state";
import { getWorldQuestInventoryReadout } from "./worldQuestInventory";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

const COMPACT_TOOL_LINES: Record<string, string> = {
  citation_stamp: "source locks = provenance",
  source_note_card: "repository trail = source note",
  cross_reference_thread: "published status = x-ref",
  referral_manifest: "agency equities = referral queue",
  excision_bracket_marker: "withheld text = visible bracket",
  red_pencil: "unsupported text = editor judgment",
  proof_lens: "tiny discrepancies = silent read",
  buckram_key: "publication gate = certified"
};

export class InventoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;
  private readonly iconStrip: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 104, 236, 168, color(PALETTE.black));
    const border = scene.add.rectangle(128, 104, 236, 168).setStrokeStyle(2, color(PALETTE.goldStamp));
    const title = scene.add.text(16, 25, "MANUSCRIPT INVENTORY", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    });
    this.body = scene.add.text(16, 42, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 224, useAdvancedWrap: true },
      lineSpacing: 1
    });
    if (scene.textures.exists(ART_PACK_EXTRAS.items_collectibles.textureKey)) {
      const frames = [
        ITEM_ICON_FRAMES.citation_stamp,
        ITEM_ICON_FRAMES.red_pencil,
        ITEM_ICON_FRAMES.review_folder,
        ITEM_ICON_FRAMES.clearance_token,
        ITEM_ICON_FRAMES.concurrence_slip,
        ITEM_ICON_FRAMES.proof_lens,
        ITEM_ICON_FRAMES.buckram_key
      ];
      frames.forEach((frame, index) => {
        this.iconStrip.push(scene.add.image(32 + index * 25, 192, ART_PACK_EXTRAS.items_collectibles.textureKey, frame).setScale(0.07));
      });
    }
    this.container = scene.add
      .container(0, 0, [box, border, title, this.body, ...this.iconStrip])
      .setDepth(980)
      .setScrollFactor(0)
      .setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  toggle() {
    if (this.active) {
      this.container.setVisible(false);
      return;
    }
    const tools = getWorkflowToolReadout()
      .map((tool) => `${tool.acquired ? "OK" : "--"} ${tool.shortLabel}: ${COMPACT_TOOL_LINES[tool.id]}`)
      .join("\n");
    const areas = getAreaProgressReadout()
      .map((area) => {
        const marker = area.active ? ">" : " ";
        const status = area.completed ? "OK" : "--";
        return `${marker}${status} ${area.displayName}: ${area.reward}`;
      })
      .join("\n");
    const documents = getDocumentWorkflowReadout()
      .filter((document) => document.selected || document.state !== "found")
      .slice(0, 5)
      .map((document) => `${document.selected ? "OK" : "--"} ${document.id.replace(/_001|_047|_412/g, "").toUpperCase()}: ${document.state}`)
      .join("\n") || "-- NO DOCUMENTS ROUTED";
    const worldQuestItems = getWorldQuestInventoryReadout(gameState.inventory);
    this.iconStrip.forEach((icon, index) => {
      icon.setAlpha(worldQuestItems[index]?.acquired ? 1 : 0.32);
    });
    const ownedWorldTools = worldQuestItems.filter((item) => item.acquired).map((item) => item.shortLabel).join(" ");
    const nextWorldTool = worldQuestItems.find((item) => !item.acquired)?.displayName ?? "COMPLETE";
    this.body.setText([
      `DOCUMENT POINTS: ${gameState.documentPoints}`,
      `FRUS VOLUME PARTS: ${gameState.volumeFragments.length}/5`,
      "",
      "QUEST ROUTE",
      areas,
      "",
      "DOCUMENT FLOW",
      documents,
      "",
      "OVERWORLD TOOLS",
      ownedWorldTools ? `OK ${ownedWorldTools}` : "-- NONE",
      `NEXT ${nextWorldTool}`,
      "",
      "WORKFLOW TOOLS",
      tools
    ].join("\n"));
    this.container.setVisible(true);
  }
}
