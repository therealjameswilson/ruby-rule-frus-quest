import Phaser from "phaser";
import { SECRET_READING_ROOM_ASSETS } from "../assets/registry";
import { readChapterArrival } from "../game/chapterTravel";
import { registerDanneAnims } from "../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { blackVaultApproachTargets, blackVaultReturnRoute, blackVaultObjective, reviewCacheRefill } from "../game/blackVaultApproach";
import { BlackVaultObjects } from "../systems/blackVaultObjects";
import { nextArchiveResearchReview } from "../game/archiveResearchReview";
import { unlockCodexEntry } from "../game/codex";
import {
  DANNE_BOSS_SPRITE_ASSET,
  DANNE_IMAGE_ASSETS,
  DANNE_MAP_ASSETS,
  DANNE_RUNTIME_SPRITE_ASSETS,
  DANNE_VFX_ASSETS
} from "../game/danneAtlas";
import { HearingReview } from "../systems/hearingReview";
import { NaraStackRecords, naraFragmentCollected } from "../systems/naraStackRecords";
import type {
  DanneMapSceneKey,
  DanneRectDefinition,
  DanneSceneGeometry,
  DanneSceneInteractionDefinition
} from "../game/danneSceneCollisions";
import { DANNE_SCENE_GEOMETRY, danneMapExplorationObjective, danneMapInteractionAvailable } from "../game/danneSceneCollisions";
import {
  addDanneItem,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  equipProcessItem,
  gameState,
  getBlackVaultClimaxReadiness,
  getTreatyFragmentCount,
  getVisitedRoomIds,
  hasDanneItem,
  hasProcessItem,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import {
  HIDDEN_READING_ROOM_DISCOVERED_FLAG,
  HIDDEN_READING_ROOM_SCENE,
  hiddenReadingRoomDiscovered,
  hiddenFirstEditionFound,
  canRevealReadingPassage,
  insideReadingPassage,
  readingPassageLabel,
  readingPassageSolids
} from "../game/secretReadingRoom";
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
import { FeedbackToast } from "../systems/feedbackToast";
import {
  decideInteractionFeedback,
  InteractionAssist,
  nearestInteractable,
  nearestInteractableHint
} from "../systems/interaction";
import { applyHitShake } from "../systems/combatFeedback";
import { AttackBuffer, HitstopController } from "../systems/hitstop";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { snapPixel } from "../systems/pixelPerfect";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { recoverDanneBossPressure } from "../systems/dannePressure";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { transitionTo } from "../systems/sceneTransitions";
import { saveGameNow } from "../systems/save";
import {
  addSnesBlackVaultTileRoom,
  addSnesCherryBlossomGardenTileRoom,
  addSnesEmbassyCableRoomTileRoom,
  addSnesNaraStacksTileRoom,
  addSnesSenateHearingChamberTileRoom
} from "../systems/snesPixelArt";
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
  private prompt!: InteractionPrompt;
  private cacheToast!: FeedbackToast;
  private readonly geometry: DanneSceneGeometry;
  private solids: Phaser.Geom.Rectangle[] = [];
  private interactables: Interactable[] = [];
  private readonly interactionAssist = new InteractionAssist();
  private readonly hitstop = new HitstopController();
  private readonly attackBuffer = new AttackBuffer();
  private redactorDrones: RedactorDrone[] = [];
  private stackRecords?: NaraStackRecords;
  private vaultObjects?: BlackVaultObjects;
  private censorshipWraiths: CensorshipWraith[] = [];
  private danneBoss?: DanneBoss;
  private marineGuard?: MarineSecurityGuard;
  private readonly cacheMarkers: Phaser.GameObjects.GameObject[] = [];
  private readonly interactionMarkerObjects: Phaser.GameObjects.GameObject[] = [];
  private marineDoorCleared = false;
  private lastGoodPosition: Position;
  private passageMarkerObjects: Phaser.GameObjects.GameObject[] = [];
  private passageBusyUntil = 0;
  private leavingReadingPassage = false;
  private collisionDebug?: Phaser.GameObjects.Container;
  private hearing?: HearingReview;

  protected constructor(sceneKey: DanneMapSceneKey) {
    super(sceneKey);
    this.geometry = DANNE_SCENE_GEOMETRY[sceneKey];
    this.lastGoodPosition = { ...this.geometry.spawn };
  }

  preload() {
    if (this.geometry.sceneKey === "NaraStacksScene") {
      const asset = SECRET_READING_ROOM_ASSETS.tilesetNative;
      if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.path);
    }
    const mapAsset = mapAssetFor(this.geometry.sceneKey);
    if (mapAsset && !this.textures.exists(mapAsset.key)) this.load.image(mapAsset.key, mapAsset.path);
    for (const asset of DANNE_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key) && asset.key !== mapAsset?.key) this.load.image(asset.key, asset.path);
    }
    for (const asset of DANNE_RUNTIME_SPRITE_ASSETS) {
      if (!this.textures.exists(asset.key)) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameW,
          frameHeight: asset.frameH
        });
      }
    }
    if (!this.textures.exists(DANNE_BOSS_SPRITE_ASSET.key)) {
      this.load.spritesheet(DANNE_BOSS_SPRITE_ASSET.key, DANNE_BOSS_SPRITE_ASSET.path, {
        frameWidth: DANNE_BOSS_SPRITE_ASSET.frameW,
        frameHeight: DANNE_BOSS_SPRITE_ASSET.frameH
      });
    }
    for (const asset of DANNE_VFX_ASSETS) {
      if (!this.textures.exists(asset.key)) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameW,
          frameHeight: asset.frameH
        });
      }
    }
  }

  create(data?: unknown) {
    const arrival = readChapterArrival(data, this.geometry.sceneKey, gameState.currentScene);
    this.passageMarkerObjects = [];
    this.passageBusyUntil = 0;
    this.leavingReadingPassage = false;
    this.collisionDebug = undefined;
    this.hearing = undefined;
    this.stackRecords = undefined;
    this.vaultObjects = undefined;
    this.interactionAssist.clear();
    this.attackBuffer.clear();
    this.hitstop.reset();
    registerDanneAnims(this);
    setSceneState(this.geometry.sceneKey, "explore", danneMapExplorationObjective(this.geometry.sceneKey, gameState.inventory));
    setLatestMessage(`${this.geometry.displayName} loaded.`);
    setVisibleEntities([...this.geometry.visibleEntities]);
    setVisibleThreats([]);
    this.applyDebugGrants();
    if (this.geometry.sceneKey === "BlackVaultLairScene") {
      recoverDanneBossPressure();
      gameState.sceneProgress.blackVaultClimaxRequired = 1;
      if (hasProcessItem("red_pencil")) equipProcessItem("red_pencil");
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.danneBoss?.destroy();
      this.danneBoss = undefined;
      this.redactorDrones = [];
      this.censorshipWraiths = [];
      this.marineGuard = undefined;
      this.cacheToast.destroy();
    });
    retroAudio.startMusic(this.geometry.sceneKey);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-100);
    this.drawMapBackground();
    this.drawSnesTileRoomLayer();
    this.interactionMarkerObjects.length = 0;
    this.cacheMarkers.length = 0;
    this.drawInteractionMarkers();
    if (isCollisionDebugEnabled()) this.drawCollisionDebug();
    if (this.geometry.sceneKey !== "SenateHearingChamberScene" && this.geometry.sceneKey !== "NaraStacksScene") this.drawLocationCard();

    this.solids = (this.geometry.sceneKey === "NaraStacksScene"
      ? readingPassageSolids(this.geometry.solids, hiddenReadingRoomDiscovered(gameState))
      : this.geometry.solids).map(rectToPhaser);
    this.player = new Player(this, arrival?.x ?? this.geometry.spawn.x, arrival?.y ?? this.geometry.spawn.y);
    if (arrival) {
      this.player.setPosition(arrival.x, arrival.y);
      this.player.faceTowards({ x: arrival.x, y: arrival.y + 16 });
      this.passageBusyUntil = this.time.now + 350;
    }
    this.lastGoodPosition = this.player.position;
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(900);
    this.prompt = new InteractionPrompt(this, 930);
    this.cacheToast = new FeedbackToast(this);
    if (this.geometry.sceneKey === "BlackVaultLairScene") this.vaultObjects = new BlackVaultObjects(this);
    this.interactables = this.geometry.interactions
      .filter((definition) => danneMapInteractionAvailable(definition.action, Boolean(gameState.sceneProgress.blackVaultBossCleared)))
      .map((definition) => ({
        id: definition.id,
        label: this.geometry.sceneKey === "BlackVaultLairScene" && definition.action === "return-office"
          ? blackVaultReturnRoute(Boolean(gameState.sceneProgress.blackVaultEnteredFromSilentRead), Boolean(nextArchiveResearchReview())).label
          : definition.action === "hidden-reading-room-passage"
            ? readingPassageLabel(hiddenReadingRoomDiscovered(gameState), hasProcessItem("review_folder"))
            : definition.label,
        x: definition.x,
        y: definition.y,
        radius: definition.radius,
        kind: definition.action === "hidden-reading-room-passage" && !hiddenReadingRoomDiscovered(gameState)
          ? "document" : definition.kind,
        onInteract: () => this.handleInteraction(definition)
      }));
    this.createDanneEntities();
    this.syncBlackVaultTraversal();
    this.syncReadingRoomTraversal();
    if (this.geometry.sceneKey === "NaraStacksScene") {
      this.stackRecords = new NaraStackRecords(this, this.cacheToast, () => this.player.position);
      this.stackRecords.syncTargets(this.interactables);
    }
    if (this.geometry.sceneKey === "SenateHearingChamberScene") {
      this.hearing = new HearingReview(this, this.cacheToast, () => this.player.position);
      this.hearing.syncTargets(this.interactables);
      setObjective(this.hearing.objective);
      setRoomTraversalState({ currentRoomId: "DH1", roomTitle: "Senate Hearing Chamber", roomType: "puzzle",
        visitedRoomIds: [...new Set([...getVisitedRoomIds(["DH1"]), "DH1"])], exits: { south: "O1" } });
    }
    if (this.geometry.sceneKey === "BlackVaultLairScene") {
      const readiness = getBlackVaultClimaxReadiness();
      setObjective(gameState.sceneProgress.blackVaultBossCleared
        ? "CORE TO THE BINDERY"
        : readiness.ready
          ? this.blackVaultApproachObjective()
          : `Black Vault locked: ${readiness.missingSummary.slice(0, 2).join(", ")}.`);
    }
    this.unlockCodexForScene();
    this.syncDanneReadout(this.time.now);
    this.installUiDebugHooks();
    this.installBossDebugStart();
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    this.cacheToast.update(delta, this.geometry.sceneKey === "BlackVaultLairScene" ? { x: 128, y: 88 } : this.player.position);
    if (this.leavingReadingPassage || this.time.now < this.passageBusyUntil) {
      this.attackBuffer.clear();
      this.updateDanneEntities(this.time.now, delta, false);
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
    const bossDecisionActive = Boolean(this.danneBoss?.inputLocked);
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (isUiDebugEnabled() && input.bJustPressed) this.showBossHudDebug();
    const frozen = this.hitstop.isFrozen(this.time.now);
    const canAct = gameState.mode === "explore" && !this.dialog.active && !this.choice.active
      && !this.inventory.active && !this.reliability.active && !bossDecisionActive && !isCutsceneActive(this);
    if (!canAct) this.attackBuffer.clear();
    this.player.setCombatPaused(!canAct || frozen);
    if (!canAct) this.vaultObjects?.update(null, false, Boolean(this.danneBoss?.isActive));
    if (!frozen) {
      this.updateDanneEntities(this.time.now, delta, canAct);
      this.restoreSafePlayerPosition();
    }

    if (isCutsceneActive(this)) {
      this.attackBuffer.clear();
      if (input.aJustPressed || input.confirmJustPressed) {
        if (this.danneBoss?.phaseDialogueActive) this.danneBoss.advanceBoast();
        else void exitCutscene(this);
      }
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.reliability.update();
      this.syncDanneReadout(this.time.now);
      return;
    }

    if (bossDecisionActive || this.danneBoss?.inputLocked) {
      this.attackBuffer.clear();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.reliability.update();
      this.syncDanneReadout(this.time.now);
      return;
    }

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
    if (this.choice.active) {
      this.choice.updateInput();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.reliability.update();
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
    if (input.pauseJustPressed) {
      this.attackBuffer.clear();
      this.inventory.toggle();
      this.player.setCombatPaused(true);
      return;
    }

    if (input.abilityJustPressed) activateRoleAbility(this);
    if (input.bJustPressed) this.attackBuffer.press(this.time.now);

    // Hitstop: hold actors on the impact frame for a few frames so a clean
    // sword hit crunches. The camera shake / boss flash tweens run on Phaser's
    // own systems and keep playing; only gameplay logic is held here.
    if (frozen) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.reliability.update();
      this.syncDanneReadout(this.time.now);
      return;
    }

    if (this.isPlayerPositionWalkable(this.player.position)) {
      this.lastGoodPosition = this.player.position;
    } else {
      this.player.setPosition(this.lastGoodPosition.x, this.lastGoodPosition.y);
    }
    this.player.update(delta, true, {
      bounds: { left: 16, right: GAME_WIDTH - 16, top: 38, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    if (!this.isPlayerPositionWalkable(this.player.position)) {
      this.player.setPosition(this.lastGoodPosition.x, this.lastGoodPosition.y);
    } else {
      this.lastGoodPosition = this.player.position;
    }
    if (this.attackBuffer.consume(this.time.now, this.player.combatReadout.weapon.canSwing)) this.useDanneItemAction();
    this.resolvePlayerMeleeHits(this.time.now);
    this.resolveReadingPassage();
    if (this.geometry.sceneKey === "NaraStacksScene" && hiddenReadingRoomDiscovered(gameState)
      && this.time.now >= this.passageBusyUntil && insideReadingPassage(this.player.position)) {
      this.enterReadingPassage();
      return;
    }
    const bossActive = Boolean(this.danneBoss?.isActive);
    if (bossActive && this.danneBoss) {
      setObjective(this.danneBoss.combatObjective);
    }
    this.hearing?.syncTargets(this.interactables);
    this.stackRecords?.syncTargets(this.interactables);
    this.vaultObjects?.syncTargets(this.interactables);
    const targets = this.geometry.sceneKey === "BlackVaultLairScene"
      ? blackVaultApproachTargets(this.player.position, this.interactables, Boolean(gameState.sceneProgress.blackVaultReliabilityCacheUsed))
      : this.interactables;
    const nearest = bossActive ? null : nearestInteractable(this.player.position, targets);
    const hintTarget = bossActive ? null : nearestInteractableHint(this.player.position, targets);
    const promptTarget = nearest ?? hintTarget;
    setNearestInteractable(nearest?.label ?? null);
    this.hintText.setText(nearest && this.geometry.sceneKey !== "BlackVaultLairScene" && !this.hearing && !this.stackRecords ? `A: ${nearest.label.toUpperCase()}` : "");
    this.prompt.update(delta, this.hearing || this.stackRecords || this.vaultObjects ? null : promptTarget, undefined, nearest ? undefined : hintTarget ? { badge: "!", text: "STEP CLOSER" } : undefined);
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) bufferedInteraction.onInteract();
    else if (input.aJustPressed) {
      const feedback = decideInteractionFeedback(nearest, hintTarget);
      if (feedback.kind === "step-closer") {
        retroAudio.blip();
        setLatestMessage(`Step closer to ${feedback.target.label}.`);
      } else if (feedback.kind === "nothing") {
        retroAudio.blip();
        setLatestMessage("Nothing to interact with here.");
      }
    }
    if (!this.danneBoss?.isActive) {
      if (this.geometry.sceneKey === "BlackVaultLairScene") {
        const readiness = getBlackVaultClimaxReadiness();
        setObjective(gameState.sceneProgress.blackVaultBossCleared
          ? "CORE TO THE BINDERY"
          : readiness.ready
            ? this.blackVaultApproachObjective()
            : `Black Vault locked: ${readiness.missingSummary.slice(0, 2).join(", ")}.`);
      } else if (gameState.mode === "explore") {
        const nearUnclaimedSecret = this.geometry.sceneKey === "NaraStacksScene"
          && hiddenReadingRoomDiscovered(gameState) && !hiddenFirstEditionFound(gameState)
          && Math.hypot(this.player.position.x - 204, this.player.position.y - 68) < 40;
        setObjective(this.hearing?.objective ?? (nearUnclaimedSecret ? "ENTER READING ROOM" : danneMapExplorationObjective(this.geometry.sceneKey, gameState.inventory)));
      }
    }
    this.hearing?.update(nearest);
    this.stackRecords?.syncTargets(this.interactables);
    this.stackRecords?.update(nearest);
    this.vaultObjects?.update(nearest, gameState.mode === "explore", Boolean(this.danneBoss?.isActive));
    this.reliability.update();
    this.syncDanneReadout(this.time.now);
  }

  private isPlayerPositionWalkable(position: Position) {
    if (!polygonContains(position, this.geometry)) return false;
    const footBox = new Phaser.Geom.Rectangle(position.x - 8, position.y - 3, 16, 8);
    return !this.solids.some((solid) => Phaser.Geom.Intersects.RectangleToRectangle(footBox, solid));
  }

  private restoreSafePlayerPosition() {
    if (this.isPlayerPositionWalkable(this.player.position)) return;
    this.player.setPosition(this.lastGoodPosition.x, this.lastGoodPosition.y);
  }

  private drawMapBackground() {
    // The playable vault already has its own room art and matching collision.
    // Do not expose a strip of the concept map beneath its HUD.
    if (this.geometry.sceneKey === "BlackVaultLairScene") return;
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

  private drawSnesTileRoomLayer() {
    if (this.geometry.sceneKey === "CherryBlossomGardenScene") {
      addSnesCherryBlossomGardenTileRoom(this, { depth: -18 });
    }
    if (this.geometry.sceneKey === "BlackVaultLairScene") {
      addSnesBlackVaultTileRoom(this, { depth: -18, combatReady: true });
    }
    if (this.geometry.sceneKey === "SenateHearingChamberScene") {
      addSnesSenateHearingChamberTileRoom(this, { depth: -18 });
    }
    if (this.geometry.sceneKey === "NaraStacksScene") {
      addSnesNaraStacksTileRoom(this, { depth: -18 });
    }
    if (this.geometry.sceneKey === "EmbassyCableRoomScene") {
      addSnesEmbassyCableRoomTileRoom(this, { depth: -18 });
    }
  }

  private drawInteractionMarkers() {
    if (this.geometry.sceneKey === "BlackVaultLairScene") return;
    for (const interaction of this.geometry.interactions) {
      if (!danneMapInteractionAvailable(interaction.action, Boolean(gameState.sceneProgress.blackVaultBossCleared))) continue;
      if (interaction.action === "reliability-cache" && gameState.sceneProgress.blackVaultReliabilityCacheUsed) continue;
      if (interaction.action === "hearing-exhibit-left" || interaction.action === "hearing-exhibit-right" || interaction.action === "witness-table") continue;
      if (interaction.action === "hidden-reading-room-passage") {
        this.drawHiddenPassageSeam(interaction);
        continue;
      }
      if (this.geometry.sceneKey === "NaraStacksScene") continue;
      const markerStart = this.interactionMarkerObjects.length;
      this.interactionMarkerObjects.push(this.add.ellipse(interaction.x + 1, interaction.y + 2, 15, 7, color(PALETTE.black), 0.55).setDepth(interaction.y - 4));
      this.interactionMarkerObjects.push(this.add.rectangle(interaction.x, interaction.y, 13, 13, color(PALETTE.black), 0.82)
        .setStrokeStyle(1, color(interaction.accent))
        .setDepth(interaction.y));
      this.interactionMarkerObjects.push(this.add.rectangle(interaction.x, interaction.y - 3, 7, 3, color(interaction.accent)).setDepth(interaction.y + 1));
      this.interactionMarkerObjects.push(this.add.rectangle(interaction.x + 3, interaction.y - 5, 2, 2, color(PALETTE.creamPaper)).setDepth(interaction.y + 2));
      if (interaction.action === "reliability-cache") this.cacheMarkers.push(...this.interactionMarkerObjects.slice(markerStart));
    }
  }

  private blackVaultApproachObjective() {
    return blackVaultObjective(Boolean(gameState.sceneProgress.blackVaultReliabilityCacheUsed), gameState.reliability);
  }

  private drawHiddenPassageSeam(interaction: DanneSceneInteractionDefinition) {
    for (const object of this.passageMarkerObjects) object.destroy();
    this.passageMarkerObjects = [];
    const discovered = hiddenReadingRoomDiscovered(gameState);
    if (discovered) {
      const asset = SECRET_READING_ROOM_ASSETS.tilesetNative;
      const frame = "reading-passage-door";
      if (this.textures.exists(asset.key)) {
        const texture = this.textures.get(asset.key);
        // Tile 11 is the same native doorway used by the reading-room threshold.
        if (!texture.has(frame)) texture.add(frame, 0, (11 % asset.columns) * asset.tileSize,
          Math.floor(11 / asset.columns) * asset.tileSize, asset.tileSize, asset.tileSize);
        for (const x of [interaction.x - 8, interaction.x + 8]) {
          for (const y of [interaction.y - 8, interaction.y + 8]) {
            this.passageMarkerObjects.push(this.add.image(x, y, asset.key, frame).setDepth(70)
              .setName("nara-reading-passage-open"));
          }
        }
      } else {
        this.passageMarkerObjects.push(this.add.rectangle(interaction.x, interaction.y, 32, 32, color(PALETTE.black))
          .setDepth(70).setName("nara-reading-passage-open"));
      }
      for (const x of [interaction.x - 17, interaction.x + 17]) {
        this.passageMarkerObjects.push(this.add.rectangle(x, interaction.y, 2, 32, color(PALETTE.goldStamp)).setDepth(71));
      }
      for (const y of [interaction.y + 7, interaction.y + 11, interaction.y + 15]) {
        this.passageMarkerObjects.push(this.add.rectangle(interaction.x, y, 28, 1, color(PALETTE.stoneLight)).setDepth(71));
      }
      return;
    }
    const accent = PALETTE.stoneLight;
    const alpha = 0.42;
    this.passageMarkerObjects.push(this.add.rectangle(interaction.x, interaction.y - 4, 18, 3, color(PALETTE.black), 0.45)
      .setDepth(interaction.y + 1)
      .setName("nara-hidden-reading-room-shadow"));
    this.passageMarkerObjects.push(this.add.rectangle(interaction.x - 7, interaction.y - 8, 2, 9, color(accent), alpha)
      .setDepth(interaction.y + 2)
      .setName("nara-hidden-reading-room-seam"));
    this.passageMarkerObjects.push(this.add.rectangle(interaction.x, interaction.y - 5, 7, 2, color(accent), alpha)
      .setDepth(interaction.y + 2)
      .setName("nara-hidden-reading-room-seam"));
    this.passageMarkerObjects.push(this.add.rectangle(interaction.x + 6, interaction.y - 2, 2, 7, color(accent), alpha)
      .setDepth(interaction.y + 2)
      .setName("nara-hidden-reading-room-seam"));
  }

  private drawLocationCard() {
    const container = this.add.container(0, 0).setDepth(1200);
    const title = this.geometry.displayName === "Cherry Blossom Garden"
      ? "CHERRY GARDEN"
      : this.geometry.displayName.toUpperCase();
    const wideTitle = title.length > 20;
    const cardWidth = wideTitle ? 214 : 168;
    const titleFontSize = wideTitle ? "6px" : "8px";
    const shadow = this.add.rectangle(130, 56, cardWidth, 28, color(PALETTE.black), 0.82);
    const card = this.add.rectangle(128, 54, cardWidth, 28, color(PALETTE.deepRuby), 0.94)
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    const label = this.add.text(128, wideTitle ? 49 : 47, title, {
      fontFamily: "monospace",
      fontSize: titleFontSize,
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
    this.collisionDebug?.destroy();
    this.collisionDebug = this.add.container(0, 0).setDepth(1100);
    const graphics = this.add.graphics().setDepth(1100);
    this.collisionDebug.add(graphics);
    graphics.lineStyle(1, color(PALETTE.openNetGreen), 0.95);
    const points = this.geometry.walkable.points;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }
    graphics.lineStyle(1, color(PALETTE.classNetRed), 0.9);
    const solids = this.geometry.sceneKey === "NaraStacksScene"
      ? readingPassageSolids(this.geometry.solids, hiddenReadingRoomDiscovered(gameState))
      : this.geometry.solids;
    for (const solid of solids) {
      graphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
      this.collisionDebug.add(this.add.text(solid.x + 1, solid.y + 1, solid.label.toUpperCase().slice(0, 12), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.classNetRed,
        backgroundColor: PALETTE.black
      }).setDepth(1101));
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
    if (this.hearing?.handle(definition.action)) return;
    if (definition.action === "return-office") {
      const returnTarget = this.geometry.sceneKey === "BlackVaultLairScene"
        ? blackVaultReturnRoute(Boolean(gameState.sceneProgress.blackVaultEnteredFromSilentRead), Boolean(nextArchiveResearchReview())).sceneKey
        : this.geometry.exitTarget;
      transitionTo(this, returnTarget);
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
          "Human review has broken the automated queue. Carry the cleared record to the bindery."
        ], () => transitionTo(this, "EndingScene"));
        return;
      }
      const readiness = getBlackVaultClimaxReadiness();
      if (!readiness.ready) {
        const missing = readiness.missingSummary.slice(0, 3).join(", ");
        this.dialog.show("BLACK VAULT SEAL", [
          `The final review packet is incomplete: ${missing}.`,
          nextArchiveResearchReview()
            ? "Use the south exit. Complete the missing review at the Archive Research Table."
            : "Return with the proofed record, Buckram Key, and Red Pencil."
        ]);
        setObjective(`Black Vault locked: ${missing}.`);
        retroAudio.warning();
        return;
      }
      this.startDanneBoss();
      return;
    }
    if (definition.action === "nara-stacks-note") {
      this.stackRecords?.handle(definition.action);
      return;
    }
    if (definition.action === "treaty-fragment-nara") {
      this.stackRecords?.handle(definition.action);
      return;
    }
    if (definition.action === "hidden-reading-room-passage") {
      if (hiddenReadingRoomDiscovered(gameState)) {
        this.enterReadingPassage();
        return;
      }
      if (!hasProcessItem("review_folder")) {
        retroAudio.warning();
        this.cacheToast.show("NEEDS REVIEW FOLDER", this.player.position, "info");
        setLatestMessage("Hidden reading-room seam needs Review Folder.");
        return;
      }
      if (!this.player.combatReadout.weapon.canSwing) return;
      equipProcessItem("review_folder");
      this.player.faceTowards(definition);
      this.player.startAction("review_folder");
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
    if (definition.action === "reliability-cache") {
      if (gameState.sceneProgress.blackVaultReliabilityCacheUsed) {
        this.dialog.show("HUMAN REVIEW CACHE", "The review cache is spent. Its confidence is already logged.");
        setLatestMessage("Human review cache already used.");
        retroAudio.confirm();
        return;
      }
      if (reviewCacheRefill(gameState.reliability) === 0) {
        this.cacheToast.show("RELIABILITY FULL", { x: 128, y: 88 }, "info");
        setLatestMessage("Reliability is full. The review cache remains available.");
        retroAudio.blip();
        return;
      }
      gameState.sceneProgress.blackVaultReliabilityCacheUsed = 1;
      adjustReliability(reviewCacheRefill(gameState.reliability), "human review cache restored confidence");
      this.reliability.update();
      for (const marker of this.cacheMarkers) {
        (marker as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(false);
      }
      this.interactionAssist.clear();
      this.cacheToast.show("REVIEW RESTORED", { x: 128, y: 88 }, "info");
      retroAudio.confirm();
      setObjective(this.blackVaultApproachObjective());
      saveGameNow("manual");
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
        return new RedactorDrone(this, start.x, start.y, [start, ...rest], () => this.solids);
      });
    }
    if (this.geometry.sceneKey === "BlackVaultLairScene" && !gameState.sceneProgress.blackVaultBossCleared) {
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
    if (this.geometry.sceneKey === "NaraStacksScene") unlockCodexEntry("npc-archive-specialist");
  }

  private startDanneBoss() {
    if (this.geometry.sceneKey !== "BlackVaultLairScene") return;
    if (this.danneBoss?.isActive) {
      this.dialog.show("DANN-E CORE", "DANN-E is already occupying the queue.");
      return;
    }
    const readiness = getBlackVaultClimaxReadiness();
    if (!readiness.ready) {
      const missing = readiness.missingSummary.slice(0, 3).join(", ");
      setLatestMessage(`Black Vault final review locked: ${missing}.`);
      setObjective(`Black Vault locked: ${missing}.`);
      retroAudio.warning();
      return;
    }
    equipProcessItem("red_pencil");
    this.cacheToast.hide();
    this.vaultObjects?.update(null, false, true);
    for (const wraith of this.censorshipWraiths) wraith.destroy();
    this.censorshipWraiths = [];
    for (const marker of this.interactionMarkerObjects) {
      (marker as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(false);
    }
    const quickFight = this.isBossQuickDebugEnabled();
    this.danneBoss = new DanneBoss(this, {
      player: this.player,
      secretAscendant: getTreatyFragmentCount() >= 2,
      quickFight,
      onPhaseChange: (phase) => {
        gameState.sceneProgress.blackVaultBossPhase = phase === "defeated" ? 99 : this.phaseProgressNumber(phase);
        setObjective(this.objectiveForBossPhase(phase));
      },
      onDefeated: (completeTreatyRecord) => {
        this.syncBlackVaultTraversal();
        setLatestMessage(completeTreatyRecord
          ? "DANN-E defeated; complete treaty record routed to the bindery."
          : "DANN-E defeated; cleared record routed to the bindery.");
        transitionTo(this, "EndingScene");
      },
      onBadEnding: () => {
        transitionTo(this, "BadEndingScene");
      },
      onRetreat: () => {
        this.scene.restart();
      },
      onPlayerHit: (heavy) => {
        this.hitstop.freezeFor(this.time.now, heavy ? "sword-hit-heavy" : "sword-hit");
      }
    });
    gameState.sceneProgress.blackVaultBossStarted = 1;
    setObjective("DANN-E FINAL REVIEW");
    retroAudio.startMusic("DanneBoss", { forceRestart: true });
    this.danneBoss.start();
  }

  // Connect the player's active sword/Ruby-Pen hitbox to overworld enemies so
  // they flinch, take knockback, and can be defeated (the boss already had this
  // via checkPlayerActionHit; the drones/wraiths were previously unhittable).
  private resolvePlayerMeleeHits(timeMs: number) {
    const hitbox = this.player.activeActionHitbox;
    if (!hitbox) return;
    const source = this.player.position;
    let connected = false;
    let defeated = false;
    const strike = (enemy: RedactorDrone | CensorshipWraith) => {
      if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, enemy.bodyBounds())) return;
      const result = enemy.tryPlayerHit(timeMs, 1, source, 11);
      if (result === "miss") return;
      connected = true;
      if (result === "kill") defeated = true;
    };
    for (const drone of this.redactorDrones) strike(drone);
    for (const wraith of this.censorshipWraiths) strike(wraith);
    if (!connected) return;
    this.redactorDrones = this.redactorDrones.filter((drone) => !drone.isDead);
    this.censorshipWraiths = this.censorshipWraiths.filter((wraith) => !wraith.isDead);
    applyHitShake(this, "boss-hit");
    if (defeated) {
      retroAudio.confirm();
      setLatestMessage("Human review cleared the automated block.");
    } else {
      retroAudio.bossHit();
    }
  }

  private resolveReadingPassage() {
    if (this.geometry.sceneKey !== "NaraStacksScene" || hiddenReadingRoomDiscovered(gameState)) return;
    const hitbox = this.player.activeActionHitbox;
    if (!hitbox || !canRevealReadingPassage(false, hasProcessItem("review_folder"), this.player.combatReadout.weapon.tool, hitbox)) return;
    gameState.sceneProgress[HIDDEN_READING_ROOM_DISCOVERED_FLAG] = 1;
    this.solids = readingPassageSolids(this.geometry.solids, true).map(rectToPhaser);
    const definition = this.geometry.interactions.find((item) => item.action === "hidden-reading-room-passage");
    if (definition) this.drawHiddenPassageSeam(definition);
    if (isCollisionDebugEnabled()) this.drawCollisionDebug();
    const interaction = this.interactables.find((item) => item.id === definition?.id);
    if (interaction) {
      interaction.label = readingPassageLabel(true, true);
      interaction.kind = "door";
    }
    this.passageBusyUntil = this.time.now + 360;
    this.cacheToast.show("HIDDEN PASSAGE OPEN", this.player.position, "info");
    retroAudio.toolHit("review_folder");
    setLatestMessage("The shelf register reveals a hidden reading room.");
    this.syncReadingRoomTraversal();
    saveGameNow("manual");
  }

  private enterReadingPassage() {
    if (this.leavingReadingPassage || this.time.now < this.passageBusyUntil) return;
    this.leavingReadingPassage = true;
    saveGameNow("manual");
    transitionTo(this, HIDDEN_READING_ROOM_SCENE, { chapterFrom: "DN1", chapterTo: "DN2" });
  }

  private syncReadingRoomTraversal() {
    if (this.geometry.sceneKey !== "NaraStacksScene") return;
    const opened = hiddenReadingRoomDiscovered(gameState);
    setRoomTraversalState({
      currentRoomId: "DN1", roomTitle: "NARA Stacks", roomType: "puzzle",
      visitedRoomIds: [...new Set([...getVisitedRoomIds(["DN1", "DN2"] as const), "DN1"])],
      exits: opened ? { north: "DN2", south: "A1" } : { south: "A1" }
    });
  }

  private updateDanneEntities(timeMs: number, deltaMs: number, canAct: boolean) {
    for (const drone of this.redactorDrones) drone.update(timeMs, deltaMs, this.player, canAct);
    for (const wraith of this.censorshipWraiths) wraith.update(timeMs, deltaMs, this.player, canAct);
    this.danneBoss?.update(timeMs, deltaMs, canAct);
    this.marineGuard?.update(timeMs);
    this.syncDanneReadout(timeMs);
  }

  private syncDanneReadout(timeMs: number) {
    const visible = this.geometry.visibleEntities.filter((label) => this.geometry.sceneKey !== "NaraStacksScene"
      || label !== "Treaty Fragment I" || !naraFragmentCollected()).map((label) => label === "Faint Wall Seam"
      ? readingPassageLabel(hiddenReadingRoomDiscovered(gameState), hasProcessItem("review_folder")) : label);
    if (this.vaultObjects) {
      for (const label of ["DANN-E Core Trigger", "Human Review Cache", "Treaty Fragment III"]) {
        const index = visible.indexOf(label);
        if (index >= 0) visible.splice(index, 1);
      }
      visible.push(...this.vaultObjects.visibleLabels());
    }
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
        defeatMethod: "Strike with the equipped review tool, or leave the marked floor before the stamp lands. Shelves block sight.",
        status: drone.status(timeMs),
        ...drone.healthReadout,
        telegraph: drone.telegraph
      })),
      ...this.censorshipWraiths.map((wraith, index) => ({
        label: `Censorship Wraith ${index + 1}`,
        x: wraith.position.x,
        y: wraith.position.y,
        spriteKey: wraith.spriteKey,
        behavior: "slow float + ink sweep",
        defeatMethod: "Keep distance, strike during the ink-sweep pause, and preserve visible review notes.",
        status: wraith.status(timeMs),
        ...wraith.healthReadout,
        telegraph: wraith.telegraph
      })),
      ...(this.danneBoss?.isActive ? [this.danneBoss.readout()] : [])
    ]);
  }

  private objectiveForBossPhase(phase: string) {
    if (phase === "colossus") return "RETURN EGO BOLTS";
    if (phase === "swarm") return "PENCIL CLEARS MINIS";
    if (phase === "cloud") return "REFUTE THE CLOUD";
    if (phase === "ascendant") return "RETURN EGO BOLTS";
    if (phase === "defeated") return "TO THE BINDERY";
    return "DANN-E FINAL REVIEW";
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
    if (grants.has("review-folder") || grants.has("review_folder")) addProcessItem("review_folder");
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
      gameState.sceneProgress.blackVaultWestOpen = 1;
      gameState.sceneProgress.blackVaultNorthOpen = 1;
    }
  }

  private hasMasterDeclassKey() {
    return hasDanneItem("master-declass-key");
  }

  private useDanneItemAction() {
    const usingRubyPen = gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen");
    if (!this.player.startAction(gameState.equippedProcessItem)) {
      setLatestMessage("Equipped review tool is cooling down.");
      return;
    }
    if (!usingRubyPen) {
      const tool = gameState.equippedProcessItem?.replace(/_/g, " ").toUpperCase() ?? "FRUS TOOL";
      setLatestMessage(`${tool}: review strike active.`);
      return;
    }
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

  private syncBlackVaultTraversal() {
    if (this.geometry.sceneKey !== "BlackVaultLairScene") return;
    const cleared = Boolean(gameState.sceneProgress.blackVaultBossCleared);
    setRoomTraversalState({
      currentRoomId: "DV1",
      roomTitle: "Black Vault Lair",
      roomType: "boss",
      visitedRoomIds: ["DV1"],
      revealedRoomIds: ["DV1", ...(cleared ? ["G1"] : [])],
      exits: { south: "S1", east: "G1" },
      lockedExits: cleared ? {} : { east: "Defeat DANN-E's final review" },
      requiredItems: { east: "buckram_key" }
    });
  }
}
