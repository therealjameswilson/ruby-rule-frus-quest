import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { gameState, getAreaProgressReadout, getProcessItemReadout } from "../game/state";

const COMPACT_TOOL_LINES: Record<string, string> = {
  citation_stamp: "source locks = provenance",
  red_pencil: "unsupported text = editor judgment",
  review_folder: "unresolved issues = human queue",
  clearance_token: "red vault doors = declass access",
  concurrence_slip: "referral gates = agency complete",
  proof_lens: "tiny discrepancies = silent read",
  buckram_key: "publication gate = certified"
};

export class InventoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 104, 236, 168, 0x050505, 0.97);
    const border = scene.add.rectangle(128, 104, 236, 168).setStrokeStyle(2, 0xd6a84f);
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
    const items = getProcessItemReadout()
      .map((item) => `${item.acquired ? "OK" : "--"} ${item.shortLabel}: ${COMPACT_TOOL_LINES[item.id]}`)
      .join("\n");
    const areas = getAreaProgressReadout()
      .map((area) => {
        const marker = area.active ? ">" : " ";
        const status = area.completed ? "OK" : "--";
        return `${marker}${status} ${area.displayName}: ${area.reward}`;
      })
      .join("\n");
    this.body.setText([
      `DOCUMENT POINTS: ${gameState.documentPoints}`,
      `FRUS VOLUME PARTS: ${gameState.volumeFragments.length}/5`,
      "",
      "QUEST ROUTE",
      areas,
      "",
      "FRUS TOOLBELT",
      items
    ].join("\n"));
    this.container.setVisible(true);
  }
}
