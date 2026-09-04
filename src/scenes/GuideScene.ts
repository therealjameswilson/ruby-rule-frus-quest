import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { danneAnimKey } from "../art/danne_anims";
import { getCharacterKeyForNpcId } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { unlockCodexEntry } from "../game/codex";
import { DANNE_VFX_ASSETS } from "../game/danneAtlas";
import { SNES_GUIDE_CAVERN_TILE_ASSET } from "../game/snesAtlas";
import {
  addProcessItem,
  addDocumentPoints,
  addInventoryItem,
  addVolumeFragment,
  gameState,
  hasProcessItem,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import {
  getGuideCavernStage,
  guideCavernActionCue,
  guideCavernObjective,
  guideCavernTargetId
} from "../game/guideCavernFlow";
import type { Interactable } from "../game/types";
import { getInput, getSecondaryActionBadge, tickInput } from "../input/InputState";
import { Player } from "../entities/Player";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import {
  InteractionAssist,
  decideInteractionFeedback,
  nearestInteractable,
  nearestInteractableHint
} from "../systems/interaction";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { FeedbackToast } from "../systems/feedbackToast";
import { InventoryOverlay } from "../systems/inventory";
import { snapPixel } from "../systems/pixelPerfect";
import { ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { saveGameNow } from "../systems/save";
import { addObjectiveText, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";
import { tryEquippedToolSwing } from "../systems/toolSwing";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type GuideCavernTileFrame = (typeof SNES_GUIDE_CAVERN_TILE_ASSET.frames)[number];
const GUIDE_EGO_BOLT_ASSET = DANNE_VFX_ASSETS[0];
const GUIDE_EGO_SEAL_BOUNDS = new Phaser.Geom.Rectangle(149, 118, 22, 28);

export class GuideScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private prompt!: InteractionPrompt;
  private toast!: FeedbackToast;
  private stampIcon!: Phaser.GameObjects.Image;
  private stampLabel!: Phaser.GameObjects.Text;
  private fragmentIcon!: Phaser.GameObjects.Image;
  private fragmentLabel!: Phaser.GameObjects.Text;
  private egoSeal!: Phaser.GameObjects.Sprite;
  private egoSealGlow!: Phaser.GameObjects.Rectangle;
  private gateGlow!: Phaser.GameObjects.Rectangle;
  private gateLabel!: Phaser.GameObjects.Text;
  private readonly interactionAssist = new InteractionAssist();
  private hasStamp = false;
  private hasCounterTraining = false;
  private hasFragment = false;
  private lastCounterSwingId = -1;
  private interactables: Interactable[] = [];

  constructor() {
    super("GuideScene");
  }

  create() {
    this.hasStamp = hasProcessItem("citation_stamp");
    this.hasFragment = gameState.volumeFragments.includes("Front Matter Fragment");
    this.hasCounterTraining = Boolean(gameState.sceneProgress.guideCitationCounterTrained) || this.hasFragment;
    const openingStage = this.currentStage();
    setSceneState("GuideScene", "explore", guideCavernObjective(openingStage));
    unlockCodexEntry("npc-archive-specialist");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-30);
    drawRoomFrame(this, "ARCHIVE CAVERN", PALETTE.goldStamp, { showLegacyHud: false });
    this.drawCaveInterior();
    this.drawArchiveLamp(86, 88);
    this.drawArchiveLamp(170, 88);
    this.drawAntagonistPlaque(58, 164, "30-YR", PALETTE.classNetRed);
    this.drawAntagonistPlaque(198, 164, "DANN-E", PALETTE.terminalCyan);
    const colleagueTexture = getCharacterKeyForNpcId("archive-colleague");
    const colleague = this.add
      .sprite(128, 104, colleagueTexture)
      .setOrigin(0.5, 0.9)
      .setDepth(104);
    colleague.play(characterAnimKey(colleagueTexture, "idle-down"));
    this.stampIcon = this.add.image(96, 132, "citation-stamp").setDepth(120);
    this.fragmentIcon = this.add.image(160, 132, "volume-fragment").setDepth(120);
    this.egoSealGlow = this.add.rectangle(160, 132, 22, 28, color(PALETTE.classNetRed), 0.62)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(122)
      .setVisible(false);
    this.egoSeal = this.add.sprite(160, 132, GUIDE_EGO_BOLT_ASSET.key, 0)
      .setScale(0.045)
      .setDepth(123)
      .setVisible(false);
    const egoSealAnim = danneAnimKey(GUIDE_EGO_BOLT_ASSET.key, "fly");
    if (this.anims.exists(egoSealAnim)) this.egoSeal.play(egoSealAnim);
    this.tweens.add({ targets: colleague, y: 103, duration: 560, yoyo: true, repeat: -1, ease: "Stepped", onUpdate: () => { colleague.y = snapPixel(colleague.y); } });
    this.tweens.add({ targets: this.stampIcon, y: 130, duration: 460, yoyo: true, repeat: -1, ease: "Stepped", onUpdate: () => { this.stampIcon.y = snapPixel(this.stampIcon.y); } });
    this.tweens.add({ targets: this.fragmentIcon, y: 130, duration: 580, yoyo: true, repeat: -1, ease: "Stepped", onUpdate: () => { this.fragmentIcon.y = snapPixel(this.fragmentIcon.y); } });
    this.tweens.add({
      targets: this.egoSealGlow,
      alpha: 0.3,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
    this.stampLabel = this.add.text(96, 148, "CITE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(121);
    this.fragmentLabel = this.add.text(160, 148, "FRAG", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(121);
    this.drawVerificationGate();

    this.player = new Player(this, 128, 160);
    this.dialog = new DialogBox(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.objectiveText = addObjectiveText(this).setVisible(false);
    this.hintText = this.add.text(128, 207, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(810);
    this.prompt = new InteractionPrompt(this);
    this.toast = new FeedbackToast(this);

    this.syncStagePresentation();
    setLatestMessage(`Archive route ready for ${gameState.playerProfile.displayName}: ${guideCavernActionCue(openingStage).toLowerCase()}.`);
    this.toast.show(guideCavernActionCue(openingStage), this.player.position, "info");
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.toast.update(delta, this.player.position);
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.toast.update(delta, this.player.position);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }

    if (input.bJustPressed && this.currentStage() === "counter") {
      const swing = tryEquippedToolSwing(this.player);
      if (swing.reason) this.toast.show(swing.reason, this.player.position, "warn");
    }
    this.player.update(delta, true);
    this.updateCitationCounterTraining();
    this.reliability.update();
    const nearest = nearestInteractable(this.player.position, this.interactables);
    // Show the prompt/ring from a little further out than the strict interact
    // radius so it is impossible to miss on approach; acting still requires the
    // strict radius (mirrors OfficeScene, live audit 2026-06-15).
    const hintTarget = nearestInteractableHint(this.player.position, this.interactables);
    const promptTarget = nearest ?? hintTarget;
    setNearestInteractable(nearest?.label ?? null);
    // The floating prompt carries the contextual action cue; keep the bottom
    // lane reserved for the persistent objective so the two never collide.
    this.hintText.setText("");
    this.prompt.update(delta, promptTarget, undefined, nearest ? undefined : hintTarget ? { badge: "!", text: "STEP CLOSER" } : undefined);
    this.toast.update(delta, this.player.position);
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) {
      bufferedInteraction.onInteract();
    } else if (input.aJustPressed && this.currentStage() === "counter") {
      this.remindCounterInput();
    } else if (input.aJustPressed) {
      const feedback = decideInteractionFeedback(nearest, hintTarget);
      if (feedback.kind === "step-closer") this.nudgeTowardTarget(feedback.target);
      else if (feedback.kind === "nothing") this.flashNoTargetHint();
    }
    this.objectiveText.setText("");
  }

  private flashNoTargetHint() {
    retroAudio.blip();
    this.toast.show("NOTHING TO INTERACT WITH", this.player.position, "warn");
    setLatestMessage("Nothing to interact with here.");
  }

  private nudgeTowardTarget(target: Interactable) {
    retroAudio.blip();
    this.toast.show(`STEP CLOSER TO ${target.label.toUpperCase()}`, this.player.position, "info");
    setLatestMessage(`Step closer to ${target.label}.`);
  }

  private talkColleague() {
    this.dialog.show("ARCHIVE COLLEAGUE", [
      "The 30-year line is a deadline, not a decision-maker.",
      "DANN-E can queue a task. It cannot own judgment.",
      "Our toolbelt: stamp, pencil, folder, token, slip, lens, and buckram key."
    ]);
  }

  private takeStamp() {
    if (this.hasStamp) {
      retroAudio.blip();
      this.toast.show("CITATION STAMP ALREADY HELD", this.player.position, "info");
      setLatestMessage("Citation Stamp already held.");
      return;
    }
    this.hasStamp = true;
    addProcessItem("citation_stamp");
    addDocumentPoints(5, "citation stamp claimed");
    retroAudio.confirm();
    this.toast.show(`${getSecondaryActionBadge()}: SWING AT RED SEAL`, this.player.position, "info");
    setLatestMessage("Citation Stamp acquired. Face the red Ego Seal and swing the stamp.");
    this.syncStagePresentation();
  }

  private updateCitationCounterTraining() {
    if (this.currentStage() !== "counter") return;
    const combat = this.player.combatReadout;
    const hitbox = this.player.activeActionHitbox;
    if (!combat.actionActive || !combat.weapon.active || combat.weapon.tool !== "citation_stamp" || !hitbox) return;
    if (combat.weapon.swingId === this.lastCounterSwingId) return;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, GUIDE_EGO_SEAL_BOUNDS)) return;
    this.lastCounterSwingId = combat.weapon.swingId;
    this.hasCounterTraining = true;
    gameState.sceneProgress.guideCitationCounterTrained = 1;
    saveGameNow();
    retroAudio.toolHit("citation_stamp");
    const burst = this.add.circle(160, 132, 7, color(PALETTE.terminalCyan), 0.38)
      .setStrokeStyle(2, color(PALETTE.creamPaper))
      .setDepth(125);
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2.4,
      duration: 220,
      ease: "Stepped",
      onComplete: () => burst.destroy()
    });
    setLatestMessage("Ego Seal returned. Use the same swing to interrupt DANN-E and return his bolts.");
    this.toast.show("EGO SEAL RETURNED - FRAGMENT OPEN", this.player.position, "info");
    this.syncStagePresentation();
  }

  private remindCounterInput() {
    retroAudio.blip();
    this.toast.show(`${getSecondaryActionBadge()}: SWING CITATION STAMP`, this.player.position, "info");
    setLatestMessage(`Press ${getSecondaryActionBadge()} while facing the red Ego Seal.`);
  }

  private takeFragment() {
    if (!this.hasStamp) {
      retroAudio.warning();
      this.toast.show("NEED CITATION STAMP", this.player.position, "warn");
      setLatestMessage("Stamp the citation trail before taking the fragment.");
      return;
    }
    if (this.hasFragment) {
      retroAudio.blip();
      this.toast.show("FRAGMENT ALREADY SECURED", this.player.position, "info");
      setLatestMessage("Front matter fragment already secured.");
      return;
    }
    this.hasFragment = true;
    addInventoryItem("FRUS Fragment: Front Matter");
    addVolumeFragment("Front Matter Fragment");
    addDocumentPoints(10, "front matter fragment secured");
    retroAudio.stamp();
    this.toast.show("FRAGMENT CITED - OPEN GATE", this.player.position, "info");
    setLatestMessage("FRUS fragment secured: the gate can open.");
    this.syncStagePresentation();
  }

  private openGate() {
    if (!this.hasFragment) {
      retroAudio.warning();
      this.toast.show("NEED CITED FRAGMENT", this.player.position, "warn");
      setLatestMessage("The Verification Gate needs a cited fragment.");
      return;
    }
    retroAudio.confirm();
    this.toast.show("CITATION ACCEPTED", this.player.position, "info");
    setLatestMessage("Citation accepted. Confidence carries forward.");
    this.time.delayedCall(450, () => transitionTo(this, "ArchiveScene"));
  }

  private syncVisibleState() {
    const stage = this.currentStage();
    const labels = ["Archive Colleague", "30-Year Line", "DANN-E Queue"];
    if (stage === "stamp") labels.push("Citation Stamp");
    else if (stage === "counter") labels.push("Ego Seal");
    else if (stage === "fragment") labels.push("FRUS Volume Fragment");
    else labels.push("Verification Gate");
    setVisibleEntities(labels);
    setVisibleThreats([
      { label: "30-Year Line", x: 58, y: 164 },
      { label: "DANN-E Queue", x: 198, y: 164 },
      ...(stage === "counter" ? [{
        label: "Ego Seal",
        x: 160,
        y: 132,
        defeatMethod: `${getSecondaryActionBadge()}: swing the Citation Stamp while facing the seal`
      }] : [])
    ]);
  }

  private syncStagePresentation() {
    const stage = this.currentStage();
    this.stampIcon.setVisible(!this.hasStamp);
    this.stampLabel.setVisible(!this.hasStamp);
    this.fragmentIcon
      .setVisible(!this.hasFragment && stage !== "counter")
      .setAlpha(stage === "fragment" ? 1 : 0.25);
    this.fragmentLabel
      .setVisible(!this.hasFragment && stage !== "counter")
      .setText(stage === "fragment" ? "FRAG" : "LOCK")
      .setColor(stage === "fragment" ? PALETTE.goldStamp : PALETTE.stoneGray);
    this.egoSealGlow.setVisible(stage === "counter");
    this.egoSeal.setVisible(stage === "counter");
    this.gateGlow.setFillStyle(color(this.hasFragment ? PALETTE.openNetGreen : PALETTE.classNetRed));
    this.gateLabel
      .setText(this.hasFragment ? "OPEN\nGATE" : "LOCKED")
      .setColor(this.hasFragment ? PALETTE.creamPaper : PALETTE.goldStamp);
    this.refreshInteractables(stage);
    setObjective(guideCavernObjective(stage));
    this.syncVisibleState();
  }

  private currentStage() {
    return getGuideCavernStage(this.hasStamp, this.hasFragment, this.hasCounterTraining);
  }

  private refreshInteractables(stage = this.currentStage()) {
    const colleague: Interactable = {
      id: "colleague",
      label: "Archive Colleague",
      x: 128,
      y: 104,
      radius: 24,
      kind: "npc",
      onInteract: () => this.talkColleague()
    };
    const targets: Partial<Record<ReturnType<typeof guideCavernTargetId>, Interactable>> = {
      stamp: { id: "stamp", label: "Citation Stamp", x: 96, y: 132, radius: 32, kind: "document", onInteract: () => this.takeStamp() },
      fragment: { id: "fragment", label: "FRUS Volume Fragment", x: 160, y: 132, radius: 32, kind: "document", onInteract: () => this.takeFragment() },
      gate: { id: "gate", label: "Verification Gate", x: 128, y: 198, radius: 32, kind: "door", onInteract: () => this.openGate() }
    };
    const target = targets[guideCavernTargetId(stage)];
    this.interactables = stage === "stamp" && target ? [colleague, target] : target ? [target] : [];
  }

  private drawCaveInterior() {
    if (this.guideCavernTileFramesReady([
      "floor_base",
      "floor_scuff",
      "floor_ruby",
      "wall_top",
      "wall_front",
      "wall_shadow",
      "threshold_gate",
      "pedestal_tile"
    ])) {
      this.add.rectangle(128, 126, 210, 156, color(PALETTE.black))
        .setStrokeStyle(3, color(PALETTE.sepiaInk))
        .setDepth(-10);
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 12; col += 1) {
          const frame: GuideCavernTileFrame = (row + col * 3) % 7 === 0
            ? "floor_ruby"
            : (row * 5 + col) % 4 === 0
              ? "floor_scuff"
              : "floor_base";
          this.drawGuideCavernTileFrame(frame, 40 + col * 16, 66 + row * 16, -8, `floor-${row}-${col}`);
        }
      }
      for (let col = 0; col < 12; col += 1) {
        const x = 40 + col * 16;
        this.drawGuideCavernTileFrame("wall_top", x, 50, -4, `north-wall-${col}`);
        this.drawGuideCavernTileFrame("wall_front", x, 202, -4, `south-wall-${col}`);
      }
      for (let row = 0; row < 8; row += 1) {
        const y = 66 + row * 16;
        this.drawGuideCavernTileFrame("wall_shadow", 24, y, -4, `west-wall-${row}`);
        this.drawGuideCavernTileFrame("wall_shadow", 232, y, -4, `east-wall-${row}`);
      }
      this.drawGuideCavernTileFrame("pedestal_tile", 96, 132, 58, "citation-pedestal");
      this.drawGuideCavernTileFrame("pedestal_tile", 160, 132, 58, "fragment-pedestal");
      this.drawGuideCavernTileFrame("threshold_gate", 120, 202, 46, "gate-left");
      this.drawGuideCavernTileFrame("threshold_gate", 136, 202, 46, "gate-right");
      return;
    }

    this.add.rectangle(128, 126, 210, 156, color(PALETTE.black)).setStrokeStyle(3, color(PALETTE.sepiaInk)).setDepth(-10);
    for (let x = 32; x <= 224; x += 16) {
      this.add.rectangle(x, 53, 10, 12, color(PALETTE.sepiaInk)).setDepth(-5);
      this.add.rectangle(x, 201, 10, 12, color(PALETTE.sepiaInk)).setDepth(-5);
    }
    for (let y = 65; y <= 193; y += 16) {
      this.add.rectangle(29, y, 12, 10, color(PALETTE.sepiaInk)).setDepth(-5);
      this.add.rectangle(227, y, 12, 10, color(PALETTE.sepiaInk)).setDepth(-5);
    }
    this.add.rectangle(128, 202, 40, 11, color(PALETTE.black)).setDepth(45);
  }

  private drawGuideCavernTileFrame(
    frame: GuideCavernTileFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ) {
    if (!this.textures.exists(SNES_GUIDE_CAVERN_TILE_ASSET.key)) return null;
    const texture = this.textures.get(SNES_GUIDE_CAVERN_TILE_ASSET.key);
    if (!texture.has(frame)) return null;
    return this.add.image(Math.round(x), Math.round(y), SNES_GUIDE_CAVERN_TILE_ASSET.key, frame)
      .setName(`guide-cavern-tile-${name}`)
      .setDepth(depth);
  }

  private guideCavernTileFramesReady(frames: readonly GuideCavernTileFrame[]) {
    if (!this.textures.exists(SNES_GUIDE_CAVERN_TILE_ASSET.key)) return false;
    const texture = this.textures.get(SNES_GUIDE_CAVERN_TILE_ASSET.key);
    return frames.every((frame) => texture.has(frame));
  }

  private drawArchiveLamp(x: number, y: number) {
    const flame = this.add.container(x, y).setDepth(80);
    flame.add([
      this.add.rectangle(0, 9, 18, 5, color(PALETTE.sepiaInk)),
      this.add.rectangle(-5, 1, 5, 11, color(PALETTE.buckramHighlight)),
      this.add.rectangle(0, -3, 7, 14, color(PALETTE.goldStamp)),
      this.add.rectangle(2, 1, 4, 8, color(PALETTE.creamPaper))
    ]);
    this.tweens.add({ targets: flame, y: y - 1, duration: 260, yoyo: true, repeat: -1, ease: "Stepped" });
  }

  private drawAntagonistPlaque(x: number, y: number, label: string, accent: string) {
    this.add.rectangle(x, y, 38, 18, color(PALETTE.black), 0.82).setStrokeStyle(1, color(accent), 0.7).setDepth(60);
    this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent,
      align: "center"
    }).setOrigin(0.5).setAlpha(0.75).setDepth(61);
  }

  private drawVerificationGate() {
    this.gateGlow = this.add.rectangle(128, 198, 54, 24, color(PALETTE.classNetRed)).setDepth(55);
    this.add.rectangle(128, 198, 54, 24, color(PALETTE.black), 0.45).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(56);
    this.gateLabel = this.add.text(128, 198, "LOCKED", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5).setDepth(57);
  }
}
