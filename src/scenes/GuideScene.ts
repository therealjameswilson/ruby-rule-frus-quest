import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { getCharacterKeyForNpcId } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { unlockCodexEntry } from "../game/codex";
import { SNES_GUIDE_CAVERN_TILE_ASSET } from "../game/snesAtlas";
import {
  addProcessItem,
  addDocumentPoints,
  addInventoryItem,
  addVolumeFragment,
  getProcessItemDefinition,
  gameState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
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
import { addObjectiveText, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type GuideCavernTileFrame = (typeof SNES_GUIDE_CAVERN_TILE_ASSET.frames)[number];

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
  private fragmentIcon!: Phaser.GameObjects.Image;
  private gateGlow!: Phaser.GameObjects.Rectangle;
  private readonly interactionAssist = new InteractionAssist();
  private hasStamp = false;
  private hasFragment = false;
  private interactables: Interactable[] = [];

  constructor() {
    super("GuideScene");
  }

  create() {
    setSceneState("GuideScene", "explore", "Archive Cavern: claim the Citation Stamp.");
    unlockCodexEntry("npc-archive-specialist");
    retroAudio.startMusic("ArchiveScene");
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-30);
    drawRoomFrame(this, "ARCHIVE CAVERN", PALETTE.goldStamp);
    this.drawCaveInterior();
    this.drawArchiveLamp(86, 88);
    this.drawArchiveLamp(170, 88);
    this.drawAntagonistPlaque(58, 164, "30-YEAR\nLINE", PALETTE.classNetRed);
    this.drawAntagonistPlaque(198, 164, "DANN-E\nQUEUE", PALETTE.terminalCyan);
    const colleagueTexture = getCharacterKeyForNpcId("archive-colleague");
    const colleague = this.add
      .sprite(128, 104, colleagueTexture)
      .setOrigin(0.5, 0.9)
      .setDepth(104);
    colleague.play(characterAnimKey(colleagueTexture, "idle-down"));
    this.stampIcon = this.add.image(96, 132, "citation-stamp").setDepth(120);
    this.fragmentIcon = this.add.image(160, 132, "volume-fragment").setDepth(120);
    this.tweens.add({ targets: colleague, y: 103, duration: 560, yoyo: true, repeat: -1, ease: "Stepped", onUpdate: () => { colleague.y = snapPixel(colleague.y); } });
    this.tweens.add({ targets: this.stampIcon, y: 130, duration: 460, yoyo: true, repeat: -1, ease: "Stepped", onUpdate: () => { this.stampIcon.y = snapPixel(this.stampIcon.y); } });
    this.tweens.add({ targets: this.fragmentIcon, y: 130, duration: 580, yoyo: true, repeat: -1, ease: "Stepped", onUpdate: () => { this.fragmentIcon.y = snapPixel(this.fragmentIcon.y); } });
    this.add.text(96, 148, "CITE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(121);
    this.add.text(160, 148, "FRAG", {
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
    this.objectiveText = addObjectiveText(this);
    this.hintText = this.add.text(128, 207, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(810);
    this.prompt = new InteractionPrompt(this);
    this.toast = new FeedbackToast(this);

    this.interactables = [
      { id: "colleague", label: "Archive Colleague", x: 128, y: 104, radius: 28, kind: "npc", onInteract: () => this.talkColleague() },
      { id: "stamp", label: "Citation Stamp", x: 96, y: 132, radius: 30, kind: "document", onInteract: () => this.takeStamp() },
      { id: "fragment", label: "FRUS Volume Fragment", x: 160, y: 132, radius: 30, kind: "document", onInteract: () => this.takeFragment() },
      { id: "gate", label: "Verification Gate", x: 128, y: 198, radius: 30, kind: "door", onInteract: () => this.openGate() }
    ];
    this.syncVisibleState();
    this.dialog.show("ARCHIVE COLLEAGUE", [
      `Good to compare notes, ${gameState.playerProfile.displayName}.`,
      "Same rank, same burden: make the volume reliable.",
      "Take the citation stamp. Find the fragments. Let no delay decide for us."
    ], () => setObjective("Archive Cavern: take the Citation Stamp."));
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
      this.dialog.show("PAUSED", "Your colleague waits.");
      return;
    }

    this.player.update(delta, true);
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
    } else if (input.aJustPressed) {
      const feedback = decideInteractionFeedback(nearest, hintTarget);
      if (feedback.kind === "step-closer") this.nudgeTowardTarget(feedback.target);
      else if (feedback.kind === "nothing") this.flashNoTargetHint();
    }
    this.objectiveText.setText(gameState.objective);
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
      this.dialog.show("CITATION STAMP", "Already in your folder.");
      return;
    }
    this.hasStamp = true;
    this.stampIcon.setVisible(false);
    addProcessItem("citation_stamp");
    addDocumentPoints(5, "citation stamp claimed");
    retroAudio.confirm();
    setObjective("Archive Cavern: claim the first FRUS volume fragment.");
    const pickupDialog = getProcessItemDefinition("citation_stamp")?.pickupDialog;
    this.dialog.show("CITATION STAMP", pickupDialog ? [...pickupDialog] : "A source note is not magic. It is a claim you can defend.");
    this.syncVisibleState();
  }

  private takeFragment() {
    if (!this.hasStamp) {
      this.dialog.show("FRUS FRAGMENT", "Stamp the citation trail before taking the fragment.");
      return;
    }
    if (this.hasFragment) {
      this.dialog.show("FRUS FRAGMENT", "Front matter fragment secured.");
      return;
    }
    this.hasFragment = true;
    this.fragmentIcon.setVisible(false);
    addInventoryItem("FRUS Fragment: Front Matter");
    addVolumeFragment("Front Matter Fragment");
    addDocumentPoints(10, "front matter fragment secured");
    retroAudio.stamp();
    setObjective("Archive Cavern: open the Verification Gate.");
    this.gateGlow.setFillStyle(color(PALETTE.openNetGreen));
    this.dialog.show("FRUS FRAGMENT", "The ruby cover gains its title plate because the chain is visible.");
    this.syncVisibleState();
  }

  private openGate() {
    if (!this.hasFragment) {
      this.dialog.show("VERIFICATION GATE", "The gate opens for a cited fragment, not a hunch.");
      return;
    }
    this.dialog.show("VERIFICATION GATE", [
      "Citation accepted.",
      "Confidence carries forward."
    ], () => transitionTo(this, "ArchiveScene"));
  }

  private syncVisibleState() {
    const labels = ["Archive Colleague", "Verification Gate", "30-Year Line", "DANN-E Queue"];
    if (!this.hasStamp) labels.push("Citation Stamp");
    if (!this.hasFragment) labels.push("FRUS Volume Fragment");
    setVisibleEntities(labels);
    setVisibleThreats([
      { label: "30-Year Line", x: 58, y: 164 },
      { label: "DANN-E Queue", x: 198, y: 164 }
    ]);
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
    this.add.rectangle(x, y, 50, 26, color(PALETTE.black)).setStrokeStyle(2, color(accent)).setDepth(60);
    this.add.text(x, y - 7, label, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: accent,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(61);
  }

  private drawVerificationGate() {
    this.gateGlow = this.add.rectangle(128, 198, 54, 24, color(PALETTE.classNetRed)).setDepth(55);
    this.add.rectangle(128, 198, 54, 24, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(56);
    this.add.text(128, 190, "VERIFY\nGATE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(57);
  }
}
