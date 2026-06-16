import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { unlockCodexEntry } from "../game/codex";
import { DANNE_MAP_ASSETS } from "../game/danneAtlas";
import {
  evaluateHacHearingAnswer,
  getHacHearingPrompt,
  hacHearingComplete,
  HAC_HEARING_PROMPTS
} from "../game/hacHearing";
import type {
  DanneMapSceneKey,
  DanneRectDefinition,
  DanneSceneGeometry,
  DanneSceneInteractionDefinition
} from "../game/danneSceneCollisions";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";
import {
  addDanneItem,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  getTreatyFragmentCount,
  hasDanneItem,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable, Position } from "../game/types";
import { Player } from "../entities/Player";
import { CensorshipWraith } from "../entities/enemies/CensorshipWraith";
import { DanneBoss } from "../entities/enemies/DanneBoss";
import { RedactorDrone } from "../entities/enemies/RedactorDrone";
import { MarineSecurityGuard } from "../entities/npcs/MarineSecurityGuard";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { showBossHud, setBossHp } from "../systems/bossHud";
import { drawCutsceneDebugNote, enterCutscene, exitCutscene, isCutsceneActive, playLine } from "../systems/cutscene";
import { DialogBox } from "../systems/dialog";
import { InteractionAssist, nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { snapPixel } from "../systems/pixelPerfect";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { transitionTo } from "../systems/sceneTransitions";
import { saveGameNow } from "../systems/save";
import { ChoicePrompt } from "../systems/verification";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function isCollisionDebugEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "collision";
}

function isUiDebugEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "ui";
}

function reciprocalIntegerFitScale(width: number, height: number) {
  const divisor = Math.max(1, Math.ceil(Math.max(width / GAME_WIDTH, height / GAME_HEIGHT)));
  return 1 / divisor;
}

function rectToPhaser(definition: DanneRectDefinition) {
  return new Phaser.Geom.Rectangle(definition.x, definition.y, definition.width, definition.height);
}

function polygonContains(position: Position, geometry: DanneSceneGeometry) {
  const polygon = new Phaser.Geom.Polygon(geometry.walkable.points.map((point) => new Phaser.Geom.Point(point.x, point.y)));
  return Phaser.Geom.Polygon.Contains(polygon, position.x, position.y);
}

function mapAssetFor(sceneKey: DanneMapSceneKey) {
  return DANNE_MAP_ASSETS.find((asset) => asset.sceneKey === sceneKey);
}

export abstract class DanneMapScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private hintText!: Phaser.GameObjects.Text;
  private readonly geometry: DanneSceneGeometry;
  private solids: Phaser.Geom.Rectangle[] = [];
  private interactables: Interactable[] = [];
  private readonly interactionAssist = new InteractionAssist();
  private redactorDrones: RedactorDrone[] = [];
  private censorshipWraiths: CensorshipWraith[] = [];
  private danneBoss?: DanneBoss;
  private marineGuard?: MarineSecurityGuard;
  private marineDoorCleared = false;
  private lastGoodPosition: Position;

  protected constructor(sceneKey: DanneMapSceneKey) {
    super(sceneKey);
    this.geometry = DANNE_SCENE_GEOMETRY[sceneKey];
    this.lastGoodPosition = { ...this.geometry.spawn };
  }

  create() {
    setSceneState(this.geometry.sceneKey, "explore", this.geometry.objective);
    setLatestMessage(`${this.geometry.displayName} loaded.`);
    setVisibleEntities([...this.geometry.visibleEntities]);
    setVisibleThreats([]);
    this.applyDebugGrants();
    retroAudio.startMusic(this.geometry.sceneKey);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-100);
    this.drawMapBackground();
    this.drawInteractionMarkers();
    if (isCollisionDebugEnabled()) this.drawCollisionDebug();
    this.drawLocationCard();

    this.solids = this.geometry.solids.map(rectToPhaser);
    this.player = new Player(this, this.geometry.spawn.x, this.geometry.spawn.y);
    this.lastGoodPosition = this.player.position;
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(900);
    this.interactables = this.geometry.interactions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      x: definition.x,
      y: definition.y,
      radius: definition.radius,
      kind: definition.kind,
      onInteract: () => this.handleInteraction(definition)
    }));
    this.createDanneEntities();
    this.unlockCodexForScene();
    this.syncDanneReadout(this.time.now);
    this.installUiDebugHooks();
    this.installBossDebugStart();
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
    if (isUiDebugEnabled() && input.bJustPressed) this.showBossHudDebug();
    if (input.bJustPressed) this.useDanneItemAction();
    this.updateDanneEntities(this.time.now, delta, !this.dialog.active && !this.inventory.active && !this.reliability.active);

    if (isCutsceneActive(this)) {
      if (input.aJustPressed) exitCutscene(this);
      this.player.update(delta, false);
      this.reliability.update();
      this.syncDanneReadout(this.time.now);
      return;
    }

    if (this.danneBoss?.inputLocked) {
      this.player.update(delta, false);
      this.reliability.update();
      this.syncDanneReadout(this.time.now);
      return;
    }

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.choice.active) {
      this.choice.updateInput();
      this.player.update(delta, false);
      this.reliability.update();
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show(this.geometry.displayName.toUpperCase(), "The route is paused.");
      return;
    }

    this.lastGoodPosition = this.player.position;
    this.player.update(delta, true, {
      bounds: { left: 16, right: GAME_WIDTH - 16, top: 38, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    if (!polygonContains(this.player.position, this.geometry)) {
      this.player.setPosition(this.lastGoodPosition.x, this.lastGoodPosition.y);
    }
    const nearest = nearestInteractable(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.hintText.setText(nearest ? `A: ${nearest.label.toUpperCase()}` : "");
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) bufferedInteraction.onInteract();
    if (!this.danneBoss?.isActive) setObjective(this.geometry.objective);
    this.reliability.update();
    this.syncDanneReadout(this.time.now);
  }

  private drawMapBackground() {
    const asset = mapAssetFor(this.geometry.sceneKey);
    if (!asset || !this.textures.exists(asset.key)) {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 20, GAME_HEIGHT - 36, color(PALETTE.deepRuby))
        .setStrokeStyle(2, color(PALETTE.goldStamp))
        .setDepth(-20);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.geometry.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "10px",
        color: PALETTE.creamPaper
      }).setOrigin(0.5).setDepth(-10);
      return;
    }

    const texture = this.textures.get(asset.key);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const width = source.width ?? GAME_WIDTH;
    const height = source.height ?? GAME_HEIGHT;
    const scale = reciprocalIntegerFitScale(width, height);
    this.add.image(snapPixel(GAME_WIDTH / 2), snapPixel(GAME_HEIGHT / 2), asset.key)
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(-20);
  }

  private drawInteractionMarkers() {
    for (const interaction of this.geometry.interactions) {
      this.add.ellipse(interaction.x + 1, interaction.y + 2, 15, 7, color(PALETTE.black), 0.55).setDepth(interaction.y - 4);
      this.add.rectangle(interaction.x, interaction.y, 13, 13, color(PALETTE.black), 0.82)
        .setStrokeStyle(1, color(interaction.accent))
        .setDepth(interaction.y);
      this.add.rectangle(interaction.x, interaction.y - 3, 7, 3, color(interaction.accent)).setDepth(interaction.y + 1);
      this.add.rectangle(interaction.x + 3, interaction.y - 5, 2, 2, color(PALETTE.creamPaper)).setDepth(interaction.y + 2);
    }
  }

  private drawLocationCard() {
    const container = this.add.container(0, 0).setDepth(1200);
    const shadow = this.add.rectangle(130, 56, 168, 28, color(PALETTE.black), 0.82);
    const card = this.add.rectangle(128, 54, 168, 28, color(PALETTE.deepRuby), 0.94)
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    const label = this.add.text(128, 47, this.geometry.displayName.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0);
    const sub = this.add.text(128, 59, "DANN-E EXPANSION ROUTE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    container.add([shadow, card, label, sub]);
    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 1300,
      duration: 350,
      onComplete: () => container.destroy()
    });
  }

  private drawCollisionDebug() {
    const graphics = this.add.graphics().setDepth(1100);
    graphics.lineStyle(1, color(PALETTE.openNetGreen), 0.95);
    const points = this.geometry.walkable.points;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }
    graphics.lineStyle(1, color(PALETTE.classNetRed), 0.9);
    for (const solid of this.geometry.solids) {
      graphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
      this.add.text(solid.x + 1, solid.y + 1, solid.label.toUpperCase().slice(0, 12), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.classNetRed,
        backgroundColor: PALETTE.black
      }).setDepth(1101);
    }
    for (const route of this.geometry.patrolRoutes ?? []) {
      graphics.lineStyle(1, color(PALETTE.terminalCyan), 0.9);
      for (let index = 0; index < route.points.length - 1; index += 1) {
        const a = route.points[index];
        const b = route.points[index + 1];
        graphics.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  private handleInteraction(definition: DanneSceneInteractionDefinition) {
    if (definition.action === "return-office") {
      transitionTo(this, this.geometry.exitTarget);
      return;
    }
    if (definition.action === "save-point") {
      const saved = saveGameNow("manual");
      retroAudio.confirm();
      this.dialog.show("SAVE POINT", saved ? "Record saved at the garden register." : "Save unavailable in this browser session.");
      return;
    }
    if (definition.action === "garden-historian") {
      gameState.sceneProgress.cherryHistorianTalked = 1;
      retroAudio.confirm();
      this.dialog.show("HISTORIAN", [
        "The pen is a tool, not a verdict.",
        "Check the provenance trail first, then open the chest."
      ]);
      setLatestMessage("Historian cleared the Ruby Pen chest.");
      return;
    }
    if (definition.action === "ruby-pen-chest") {
      if (!gameState.sceneProgress.cherryHistorianTalked) {
        this.dialog.show("RUBY PEN CHEST", "A note on the latch says: talk through the provenance rule first.");
        setLatestMessage("Ruby Pen chest needs the Historian conversation.");
        retroAudio.warning();
        return;
      }
      const added = addDanneItem("ruby-pen");
      if (added) retroAudio.danneItemPickup("Ruby Pen");
      else retroAudio.confirm();
      this.dialog.show("RUBY PEN", added ? [
        "Ruby Pen acquired.",
        "Equip it in the inventory and press B for a red-ink trail."
      ] : "Ruby Pen is already in the case.");
      return;
    }
    if (definition.action === "boss-trigger") {
      if (gameState.sceneProgress.blackVaultBossCleared) {
        this.dialog.show("DANN-E CORE", [
          "The vault core is quiet.",
          "Human review has broken the automated queue."
        ]);
        return;
      }
      this.startDanneBoss();
      return;
    }
    if (definition.action === "witness-table") {
      this.showHacHearingChoice();
      return;
    }
    if (definition.action === "nara-stacks-note") {
      this.dialog.show("STACK CONTROL NOTE", [
        "Four redactor-drone patrol routes cross the stack aisle.",
        "File the stack manifest before moving boxes through the route."
      ]);
      return;
    }
    if (definition.action === "treaty-fragment-nara") {
      const added = addDanneItem("treaty-fragments", 0);
      if (added) retroAudio.danneItemPickup("Treaty Fragment I");
      else retroAudio.confirm();
      this.dialog.show("TREATY FRAGMENT I", added
        ? "Fragment I was filed behind the drone patrol route."
        : "Fragment I is already in the treaty folder.");
      return;
    }
    if (definition.action === "treaty-fragment-vault") {
      if (!gameState.sceneProgress.blackVaultBossCleared) {
        this.dialog.show("TREATY FRAGMENT III", [
          "The final fragment is sealed by DANN-E.",
          "Defeat the vault core through human review before filing it."
        ]);
        setLatestMessage("Treaty Fragment III is locked behind the DANN-E boss.");
        retroAudio.warning();
        return;
      }
      const added = addDanneItem("treaty-fragments", 2);
      if (added) retroAudio.danneItemPickup("Treaty Fragment III");
      else retroAudio.confirm();
      this.dialog.show("TREATY FRAGMENT III", added
        ? "Fragment III drops from the cleared vault core."
        : "Fragment III is already filed.");
      return;
    }
    if (definition.action === "cipher-machine") {
      this.dialog.show("FAKE CABLE", [
        "ROUTINE CABLE: punctuation survives transmission.",
        "Archivist note: verify the station slug before citation."
      ]);
      return;
    }
    if (definition.action === "marine-guard") {
      if (this.hasMasterDeclassKey()) {
        this.marineDoorCleared = true;
        this.dialog.show("MARINE GUARD", this.marineGuard?.clearedDialog() ?? "Clearance verified.");
        setLatestMessage("Marine guard verified Master Declass Key.");
        return;
      }
      this.dialog.show("MARINE GUARD", this.marineGuard?.blockedDialog() ?? "Classified door remains closed.");
      setLatestMessage("Marine guard blocks classified door.");
    }
  }

  private showHacHearingChoice() {
    if (gameState.sceneProgress.senateHacReviewComplete) {
      this.dialog.show("WITNESS TABLE", [
        "The HAC process review is already entered.",
        "Question, answer, source, and date remain separate.",
        "Treaty Fragment II is filed from the hearing record."
      ]);
      return;
    }

    const step = gameState.sceneProgress.senateHacReviewStep ?? 0;
    const prompt = getHacHearingPrompt(step);
    setObjective(`Senate Hearing: answer HAC review ${step + 1}/${HAC_HEARING_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateHacHearingAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        adjustReliability(-3, "HAC hearing correction");
        this.reliability.update();
        this.dialog.show("HAC REVIEW", [
          result.message,
          "Try again. The hearing record must show the process honestly."
        ], () => this.showHacHearingChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.senateHacReviewStep = nextStep;
      setLatestMessage(`HAC hearing check ${nextStep}/${HAC_HEARING_PROMPTS.length}: ${result.prompt.id}.`);
      if (!hacHearingComplete(nextStep)) {
        this.dialog.show("HAC REVIEW", [
          result.message,
          "The committee has another process question."
        ], () => this.showHacHearingChoice());
        return;
      }

      gameState.sceneProgress.senateHacReviewComplete = 1;
      const added = addDanneItem("treaty-fragments", 1);
      if (added) retroAudio.danneItemPickup("Treaty Fragment II");
      else retroAudio.confirm();
      setLatestMessage("HAC process review complete: oversight, 30-year sample, and annual findings filed.");
      adjustReliability(6, "HAC process monitoring answered cleanly");
      this.reliability.update();
      this.dialog.show("WITNESS TABLE", [
        result.message,
        "HAC process review entered: compilation, declassification, 30-year sampling, annual findings, and Kellogg standards are visible.",
        added ? "Treaty Fragment II is filed from the hearing record." : "Treaty Fragment II is already filed."
      ]);
    });
  }

  private installUiDebugHooks() {
    if (!isUiDebugEnabled()) return;
    drawCutsceneDebugNote(this);
    this.time.delayedCall(700, () => {
      this.showBossHudDebug();
      void this.showCutsceneDebug();
    });
    const keyboard = this.input.keyboard;
    const showCutscene = () => void this.showCutsceneDebug();
    const exit = () => void exitCutscene(this);
    const showHud = () => this.showBossHudDebug();
    keyboard?.on("keydown-H", showCutscene);
    keyboard?.on("keydown-J", exit);
    keyboard?.on("keydown-B", showHud);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off("keydown-H", showCutscene);
      keyboard?.off("keydown-J", exit);
      keyboard?.off("keydown-B", showHud);
    });
  }

  private async showCutsceneDebug() {
    await enterCutscene(this);
    playLine(this, "Test. DANN-E interrupts the record, but the file holds.", "danne-portrait-historian");
  }

  private showBossHudDebug() {
    showBossHud(this, "danne", 1000, 3);
    setBossHp(750, 0);
  }

  private createDanneEntities() {
    if (this.geometry.sceneKey === "NaraStacksScene") {
      this.redactorDrones = (this.geometry.patrolRoutes ?? []).map((route) => {
        const [start, ...rest] = route.points;
        return new RedactorDrone(this, start.x, start.y, [start, ...rest]);
      });
    }
    if (this.geometry.sceneKey === "BlackVaultLairScene") {
      this.censorshipWraiths = [
        new CensorshipWraith(this, 82, 184, [{ x: 82, y: 184 }, { x: 110, y: 148 }, { x: 74, y: 126 }]),
        new CensorshipWraith(this, 174, 184, [{ x: 174, y: 184 }, { x: 146, y: 148 }, { x: 184, y: 126 }])
      ];
    }
    if (this.geometry.sceneKey === "EmbassyCableRoomScene") {
      this.marineGuard = new MarineSecurityGuard(this, 202, 156);
    }
  }

  private unlockCodexForScene() {
    if (this.geometry.sceneKey === "CherryBlossomGardenScene") unlockCodexEntry("npc-historian");
    if (this.geometry.sceneKey === "SenateHearingChamberScene") unlockCodexEntry("npc-senator");
    if (this.geometry.sceneKey === "NaraStacksScene") unlockCodexEntry("npc-senior-archivist");
  }

  private startDanneBoss() {
    if (this.geometry.sceneKey !== "BlackVaultLairScene") return;
    if (this.danneBoss?.isActive) {
      this.dialog.show("DANN-E CORE", "DANN-E is already occupying the queue.");
      return;
    }
    for (const wraith of this.censorshipWraiths) wraith.destroy();
    this.censorshipWraiths = [];
    const quickFight = this.isBossQuickDebugEnabled();
    this.danneBoss = new DanneBoss(this, {
      player: this.player,
      secretAscendant: getTreatyFragmentCount() >= 3,
      quickFight,
      onPhaseChange: (phase) => {
        gameState.sceneProgress.blackVaultBossPhase = phase === "defeated" ? 99 : this.phaseProgressNumber(phase);
        setObjective(this.objectiveForBossPhase(phase));
      },
      onDefeated: (trueEnding) => {
        setLatestMessage(trueEnding ? "DANN-E defeated with complete treaty record." : "DANN-E defeated.");
        transitionTo(this, trueEnding ? "TrueEndingScene" : "EndingScene");
      },
      onBadEnding: () => {
        transitionTo(this, "BadEndingScene");
      }
    });
    gameState.sceneProgress.blackVaultBossStarted = 1;
    setObjective("Black Vault Lair: defeat DANN-E with human-reviewed tools.");
    retroAudio.startMusic("DanneBoss", { forceRestart: true });
    this.danneBoss.start();
  }

  private updateDanneEntities(timeMs: number, deltaMs: number, canAct: boolean) {
    for (const drone of this.redactorDrones) drone.update(timeMs, deltaMs, this.player, canAct);
    for (const wraith of this.censorshipWraiths) wraith.update(timeMs, deltaMs, this.player, canAct);
    this.danneBoss?.update(timeMs, deltaMs, canAct);
    this.marineGuard?.update(timeMs);
    this.syncDanneReadout(timeMs);
  }

  private syncDanneReadout(timeMs: number) {
    const visible = [...this.geometry.visibleEntities];
    if (this.redactorDrones.length) visible.push(...this.redactorDrones.map((_drone, index) => `Redactor Drone ${index + 1}`));
    if (this.censorshipWraiths.length) visible.push(...this.censorshipWraiths.map((_wraith, index) => `Censorship Wraith ${index + 1}`));
    if (this.danneBoss?.isActive) visible.push(`DANN-E Boss (${this.danneBoss.currentPhase})`);
    if (this.marineGuard) visible.push(this.marineDoorCleared ? "Marine Security Guard (cleared)" : "Marine Security Guard (blocking)");
    setVisibleEntities(visible);
    setVisibleThreats([
      ...this.redactorDrones.map((drone, index) => ({
        label: `Redactor Drone ${index + 1}`,
        x: drone.position.x,
        y: drone.position.y,
        spriteKey: drone.spriteKey,
        behavior: "patrol + stamp drop",
        defeatMethod: "Use the Ruby Pen or keep clear of black-bar stamps while routing the manifest.",
        status: drone.status(timeMs)
      })),
      ...this.censorshipWraiths.map((wraith, index) => ({
        label: `Censorship Wraith ${index + 1}`,
        x: wraith.position.x,
        y: wraith.position.y,
        spriteKey: wraith.spriteKey,
        behavior: "slow float + ink sweep",
        defeatMethod: "Keep distance, strike during the ink-sweep pause, and preserve visible review notes.",
        status: wraith.status(timeMs)
      })),
      ...(this.danneBoss?.isActive ? [this.danneBoss.readout()] : [])
    ]);
  }

  private objectiveForBossPhase(phase: string) {
    if (phase === "colossus") return "Black Vault Lair: dodge ego bolts and strike DANN-E with the Ruby Pen.";
    if (phase === "swarm") return "Black Vault Lair: survive the mini-DANN-E queue and keep reviewing.";
    if (phase === "cloud") return "Black Vault Lair: cloud form takes half damage; keep pressure on the record.";
    if (phase === "ascendant") return "Black Vault Lair: complete treaty record unlocked the secret Ascendant phase.";
    if (phase === "defeated") return "Black Vault Lair: DANN-E defeated; route to publication.";
    return this.geometry.objective;
  }

  private phaseProgressNumber(phase: string) {
    if (phase === "colossus") return 1;
    if (phase === "swarm") return 2;
    if (phase === "cloud") return 3;
    if (phase === "ascendant") return 4;
    return 0;
  }

  private isBossQuickDebugEnabled() {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("bossQuick") === "1" || params.get("boss") === "quick";
  }

  private installBossDebugStart() {
    if (this.geometry.sceneKey !== "BlackVaultLairScene") return;
    if (!this.isBossQuickDebugEnabled()) return;
    this.time.delayedCall(450, () => this.startDanneBoss());
  }

  private applyDebugGrants() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const give = params.get("give") ?? "";
    const grants = new Set(give.split(",").map((part) => part.trim()).filter(Boolean));
    if (grants.has("declass-key") || grants.has("master-declass-key")) addDanneItem("master-declass-key");
    if (grants.has("ruby-pen")) addDanneItem("ruby-pen");
    if (grants.has("publication") || grants.has("buckram-gate")) {
      (["rule", "archive", "network", "referral", "proof"] as const).forEach((stampId) => awardProcessStamp(stampId));
      addProcessItem("buckram_key");
      ["Cover Fragment I", "Cover Fragment II", "Cover Fragment III", "Cover Fragment IV", "Cover Fragment V"].forEach((fragment) => {
        addVolumeFragment(fragment);
      });
    }
    if (grants.has("fragments")) {
      addDanneItem("treaty-fragments", 0);
      addDanneItem("treaty-fragments", 1);
      addDanneItem("treaty-fragments", 2);
    }
    if (params.get("boss") === "defeated" || params.get("bossCleared") === "1") {
      gameState.sceneProgress.blackVaultBossCleared = 1;
    }
  }

  private hasMasterDeclassKey() {
    return hasDanneItem("master-declass-key");
  }

  private useDanneItemAction() {
    if (gameState.equippedDanneItem !== "ruby-pen" || !hasDanneItem("ruby-pen")) return;
    this.player.startAction();
    const hitbox = this.player.getFacingActionHitbox();
    const trail = this.add.rectangle(
      Math.round(hitbox.centerX),
      Math.round(hitbox.centerY),
      Math.max(6, Math.round(hitbox.width)),
      Math.max(4, Math.round(hitbox.height)),
      color(PALETTE.buckramHighlight),
      0.82
    ).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(Math.round(this.player.position.y + 2));
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 220,
      onComplete: () => trail.destroy()
    });
    setLatestMessage("Ruby Pen: +5 attack red-ink trail.");
    retroAudio.confirm();
  }
}
