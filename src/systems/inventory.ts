import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import {
  gameState,
  getAdventureHudReadout,
  getAreaProgressReadout,
  getDocumentWorkflowReadout,
  getWorkflowToolReadout
} from "../game/state";

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
    this.container = scene.add
      .container(0, 0, [box, border, title, this.body])
      .setDepth(980)
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
    const hud = getAdventureHudReadout();
    this.body.setText([
      `DOCUMENT POINTS: ${gameState.documentPoints}`,
      `FRUS VOLUME PARTS: ${gameState.volumeFragments.length}/5`,
      `EQUIPPED TOOL: ${hud.equippedItem?.displayName ?? "NONE"}`,
      `CONF ${hud.confidence.meter}  CLAR ${hud.clarity.meter}`,
      "",
      "QUEST ROUTE",
      areas,
      "",
      "DOCUMENT FLOW",
      documents,
      "",
      "WORKFLOW TOOLS",
      tools
    ].join("\n"));
    this.container.setVisible(true);
  }
}
