import { worldItemImage } from './worldItemArt';
import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { TREATY_FRAGMENT_LABELS } from "../game/danneItemCatalog";
import { applyHearingReviewAction, HEARING_REVIEWS, hearingReviewObjective, readHearingReview, writeHearingReview } from "../game/hearingReview";
import type { HearingExhibitSide } from "../game/hearingReview";
import { SNES_WORKFLOW_TOOL_RELIC_ASSET } from "../game/snesAtlas";
import { addDanneItem, gameState, setLatestMessage } from "../game/state";
import type { DanneSceneInteractionAction } from "../game/danneSceneCollisions";
import type { Interactable, Position } from "../game/types";
import { retroAudio } from "./audio";
import type { FeedbackToast } from "./feedbackToast";
import { adjustReliability } from "./reliability";
import { saveGameNow } from "./save";

function color(hex: string) { return Phaser.Display.Color.HexStringToColor(hex).color; }

export class HearingReview {
  private readonly title: Phaser.GameObjects.Text;
  private readonly evidence: Phaser.GameObjects.Text;
  private readonly carry: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly filed: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly papers: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle> = [];
  private readonly selection: Phaser.GameObjects.Rectangle;
  private readonly seals: Phaser.GameObjects.Text[];
  private lastPreview = "";

  constructor(scene: Phaser.Scene, private readonly toast: FeedbackToast, private readonly playerPosition: () => Position) {
    scene.add.rectangle(128, 62, 224, 44, color(PALETTE.black)).setDepth(600).setName("hearing-evidence-panel");
    this.title = scene.add.text(24, 42, "", { fontFamily: "monospace", fontSize: "8px", color: PALETTE.goldStamp })
      .setDepth(601).setName("hearing-evidence-title");
    this.evidence = scene.add.text(24, 55, "", { fontFamily: "monospace", fontSize: "8px", color: PALETTE.creamPaper, lineSpacing: 2 })
      .setDepth(601).setName("hearing-evidence-text");
    const key = SNES_WORKFLOW_TOOL_RELIC_ASSET.key;
    for (const [x, frame] of [[64, "source_note_card"], [192, "proof_pages"]] as const) {
      scene.add.ellipse(x, 125, 20, 4, color(PALETTE.black), 0.45).setDepth(105);
      this.papers.push(typeof scene.textures.createCanvas === 'function'
        ? worldItemImage(scene,x,110,frame==='proof_pages'?'proof-page':'source-note').setDisplaySize(18,24).setDepth(110)
        : scene.textures.exists(key)
        ? scene.add.image(x, 110, key, frame).setDepth(110)
        : scene.add.rectangle(x, 110, 14, 22, color(PALETTE.creamPaper)).setDepth(110));
    }
    this.carry = typeof scene.textures.createCanvas === 'function'
      ? worldItemImage(scene,0,0,'source-note').setDisplaySize(10,12)
      : scene.textures.exists(key)
      ? scene.add.image(0, 0, key, "source_note_card").setScale(0.5)
      : scene.add.rectangle(0, 0, 8, 12, color(PALETTE.creamPaper));
    this.carry.setName("hearing-carried-exhibit").setVisible(false);
    this.filed = typeof scene.textures.createCanvas === 'function'
      ? worldItemImage(scene,128,137,'proof-page').setDisplaySize(18,24)
      : scene.textures.exists(key)
      ? scene.add.image(128, 137, key, "proof_pages")
      : scene.add.rectangle(128, 137, 14, 22, color(PALETTE.creamPaper));
    this.filed.setDepth(140).setName("hearing-filed-exhibit").setVisible(false);
    this.selection = scene.add.rectangle(0, 0, 24, 34)
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(100).setVisible(false).setName("hearing-target-outline");
    this.seals = [112, 144].map((x, i) => scene.add.text(x, 158, `${i + 1}`, {
      fontFamily: "monospace", fontSize: "8px", color: PALETTE.stoneGray, backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(160).setName(`hearing-seal-${i}`));
    this.update(null);
  }

  get objective() {
    return hearingReviewObjective(readHearingReview(gameState.sceneProgress), gameState.inventory.includes(TREATY_FRAGMENT_LABELS[1]));
  }

  syncTargets(targets: Interactable[]) {
    const state = readHearingReview(gameState.sceneProgress), review = HEARING_REVIEWS[state.step];
    const claimed = gameState.inventory.includes(TREATY_FRAGMENT_LABELS[1]);
    // Claimed papers leave no invisible pickup zones behind.
    if (state.complete) {
      for (let i = targets.length - 1; i >= 0; i--) {
        if (targets[i].id.startsWith("senate-exhibit-") || (claimed && targets[i].id === "senate-witness-table")) targets.splice(i, 1);
      }
    }
    for (const target of targets) {
      if (target.id === "senate-witness-table") target.label = state.complete
        ? "Treaty Fragment II"
        : state.placed ? "Sign Review" : state.carried ? "File Exhibit" : "Review Request";
      for (const side of ["left", "right"] as const) {
        if (target.id === `senate-exhibit-${side}`) target.label = review
          ? state.placed ? "Sign at Desk" : state.carried === side ? "Bring to Desk" : state.carried ? "Swap Exhibit" : "Take Exhibit"
          : "Filed Exhibits";
      }
    }
  }

  handle(action: DanneSceneInteractionAction) {
    if (action !== "witness-table" && action !== "hearing-exhibit-left" && action !== "hearing-exhibit-right") return false;
    const state = readHearingReview(gameState.sceneProgress);
    if (state.complete) {
      const added = action === "witness-table" && addDanneItem("treaty-fragments", 1);
      const message = added ? "TREATY FRAGMENT II" : "REVIEW ALREADY FILED";
      this.toast.show(message, this.playerPosition(), "info");
      setLatestMessage(message);
      if (added) { retroAudio.danneItemPickup("Treaty Fragment II"); saveGameNow("manual"); }
      return true;
    }
    const result = applyHearingReviewAction(state, action === "witness-table" ? "witness" : action === "hearing-exhibit-left" ? "left" : "right");
    this.toast.show(result.message, this.playerPosition(), result.event === "rejected" ? "warn" : "info");
    setLatestMessage(result.message);
    if (result.state !== state) {
      writeHearingReview(gameState.sceneProgress, result.state);
      if (result.event === "completed") adjustReliability(6, "Evidence-backed process review filed");
      retroAudio.confirm();
      saveGameNow("manual");
    } else retroAudio.blip();
    return true;
  }

  update(nearest: Interactable | null) {
    const state = readHearingReview(gameState.sceneProgress), review = HEARING_REVIEWS[state.step];
    const nearestId = nearest?.id;
    const side: HearingExhibitSide | null = nearestId === "senate-exhibit-left" ? "left" : nearestId === "senate-exhibit-right" ? "right" : null;
    const exhibit = side && review ? review[side] : state.carried && review ? review[state.carried] : null;
    const title = state.complete ? "PRACTICE REVIEW FILED" : exhibit ? exhibit.label.toUpperCase() : `PRACTICE REVIEW ${state.step + 1}/2`;
    const text = state.complete ? gameState.inventory.includes(TREATY_FRAGMENT_LABELS[1])
      ? "The gaps remain visible.\nExit south to the Office." : "The gaps remain visible.\nClaim the fragment at the desk."
      : exhibit ? exhibit.evidence : review.request;
    const signature = `${title}|${text}`;
    if (signature !== this.lastPreview) {
      this.title.setText(title); this.evidence.setText(text); this.lastPreview = signature;
    }
    const position = this.playerPosition();
    this.carry.setVisible(Boolean(state.carried) && !state.placed)
      .setPosition(Math.round(position.x + 12), Math.round(position.y - 14)).setDepth(Math.round(position.y) + 1);
    this.papers.forEach((paper, i) => paper.setVisible(!state.complete && state.carried !== (i === 0 ? "left" : "right")));
    this.filed.setVisible(state.placed || (state.complete && !gameState.inventory.includes(TREATY_FRAGMENT_LABELS[1])));
    this.selection.setVisible(Boolean(nearest));
    if (nearest) this.selection.setPosition(nearest.x, nearest.y).setSize(24, side ? 34 : 24);
    this.seals.forEach((seal, i) => seal.setText(i < state.step ? "+" : `${i + 1}`)
      .setColor(i < state.step ? PALETTE.terminalCyan : PALETTE.stoneGray));
  }
}
