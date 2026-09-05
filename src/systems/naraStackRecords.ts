import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { DANNE_SCENE_GEOMETRY, type DanneSceneInteractionAction } from "../game/danneSceneCollisions";
import { TREATY_FRAGMENT_LABELS } from "../game/danneItemCatalog";
import { SNES_WORKFLOW_TOOL_RELIC_ASSET } from "../game/snesAtlas";
import { addDanneItem, gameState, setLatestMessage, setNearestInteractable } from "../game/state";
import type { Interactable, Position } from "../game/types";
import { retroAudio } from "./audio";
import type { FeedbackToast } from "./feedbackToast";
import { saveGameNow } from "./save";

function color(hex: string) { return Phaser.Display.Color.HexStringToColor(hex).color; }
export function naraFragmentCollected() { return gameState.inventory.includes(TREATY_FRAGMENT_LABELS[0]); }

export class NaraStackRecords {
  private readonly fragment: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly fragmentFrame: Phaser.GameObjects.Rectangle;
  private readonly selection: Phaser.GameObjects.Rectangle;
  private readonly badge: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly toast: FeedbackToast, private readonly playerPosition: () => Position) {
    const key = SNES_WORKFLOW_TOOL_RELIC_ASSET.key;
    const definitions = DANNE_SCENE_GEOMETRY.NaraStacksScene.interactions;
    const note = definitions.find((item) => item.action === "nara-stacks-note")!;
    const fragment = definitions.find((item) => item.action === "treaty-fragment-nara")!;
    scene.add.rectangle(note.x, note.y, 20, 18, color(PALETTE.black))
      .setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(note.y - 3).setName("nara-stack-note-station");
    const paper = (x: number, y: number) => scene.textures.exists(key)
      ? scene.add.image(x, y, key, "source_note_card").setScale(0.5)
      : scene.add.rectangle(x, y, 8, 12, color(PALETTE.creamPaper));
    paper(note.x, note.y).setDepth(note.y - 2).setName("nara-stack-note-paper");
    this.fragmentFrame = scene.add.rectangle(fragment.x, fragment.y, 14, 18, color(PALETTE.black))
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(fragment.y - 1).setName("nara-treaty-fragment-frame");
    this.fragment = paper(fragment.x, fragment.y).setDepth(fragment.y).setName("nara-treaty-fragment");
    this.selection = scene.add.rectangle(0, 0, 22, 22).setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(35).setVisible(false).setName("nara-target-outline");
    this.badge = scene.add.text(0, 0, "A", { fontFamily: "monospace", fontSize: "8px", color: PALETTE.goldStamp, backgroundColor: PALETTE.black })
      .setOrigin(0.5).setDepth(600).setVisible(false).setName("nara-target-badge");
    this.update(null);
  }

  syncTargets(targets: Interactable[]) {
    if (!naraFragmentCollected()) return;
    const index = targets.findIndex((target) => target.id === "nara-treaty-fragment");
    if (index >= 0) targets.splice(index, 1);
  }

  handle(action: DanneSceneInteractionAction) {
    if (action === "nara-stacks-note") {
      const first = !gameState.sceneProgress.naraStackNotePage;
      const message = first ? "DODGE THE STAMP MARKS" : "NE SHELF: REVIEW FOLDER";
      gameState.sceneProgress.naraStackNotePage = first ? 1 : 0;
      this.toast.show(message, this.playerPosition(), "info");
      setLatestMessage(message);
      retroAudio.blip();
      return true;
    }
    if (action !== "treaty-fragment-nara") return false;
    const added = addDanneItem("treaty-fragments", 0);
    if (added) {
      this.toast.show("TREATY FRAGMENT I", this.playerPosition(), "info");
      setLatestMessage("Treaty Fragment I recovered. Return south to the Archive.");
      retroAudio.danneItemPickup("Treaty Fragment I");
      saveGameNow("manual");
      setNearestInteractable(null);
    }
    this.update(null);
    return true;
  }

  update(nearest: Interactable | null) {
    this.fragment.setVisible(!naraFragmentCollected());
    this.fragmentFrame.setVisible(!naraFragmentCollected());
    const target = nearest?.id === "nara-treaty-fragment" && naraFragmentCollected() ? null : nearest;
    this.selection.setVisible(Boolean(target));
    this.badge.setVisible(Boolean(target) && !this.toast.visible);
    if (target) {
      this.selection.setPosition(target.x, target.y);
      this.badge.setPosition(Math.round(target.x + 14), Math.min(214, Math.round(target.y - 10)));
    }
  }
}
