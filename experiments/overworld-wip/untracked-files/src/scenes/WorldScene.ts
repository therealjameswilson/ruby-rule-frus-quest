import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import {
  awardProcessStamp,
  gameState,
  patchOverworldState,
  setGameMode,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setOverworldState,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import {
  defaultOverworldState,
  screenBounds,
  WORLD_HUD_HEIGHT,
  WORLD_SCREEN_HEIGHT,
  WORLD_SCREEN_WIDTH,
  WORLD_TILE_SIZE
} from "../game/world";
import type {
  FrusOverworldState,
  SpawnPointKey,
  WorldDoorDefinition,
  WorldInteriorDefinition,
  WorldNpcDefinition,
  WorldNpcRegistryDefinition,
  WorldObjectDefinition,
  WorldScreenDefinition,
  WorldScreensDefinition
} from "../game/world";
import { Player } from "../entities/Player";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { facingInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { PauseMapOverlay } from "../systems/PauseMapOverlay";
import { playPackEffect, playPackStampOverlay } from "../systems/artPackEffects";
import { adjustReliability } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { CameraController, CAMERA_TRANSITION_COMPLETE } from "../systems/CameraController";
import type { CameraTransitionMode } from "../systems/CameraController";
import { ScreenManager } from "../systems/ScreenManager";
import type { LoadedScreen } from "../systems/ScreenManager";
import { transitionTo } from "../systems/sceneTransitions";
import {
  addWorldQuestItemToInventory,
  hasWorldQuestItem,
  worldQuestItemLabel
} from "../systems/worldQuestInventory";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type DialogueData = {
  npcs?: Record<string, string[]>;
};

export class WorldScene extends Phaser.Scene {
  private world!: WorldScreensDefinition;
  private worldState!: FrusOverworldState;
  private dialogueData: DialogueData = {};
  private screenManager!: ScreenManager;
  private cameraController!: CameraController;
  private loadedScreen!: LoadedScreen;
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private pauseMap!: PauseMapOverlay;
  private hintText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private hudTitle!: Phaser.GameObjects.Text;
  private hudMeta!: Phaser.GameObjects.Text;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private modeKey!: Phaser.Input.Keyboard.Key;
  private regionTitleCard: Phaser.GameObjects.Container | null = null;
  private minimapCells = new Map<string, Phaser.GameObjects.Rectangle>();
  private interactables: Interactable[] = [];

  constructor() {
    super("WorldScene");
  }

  create() {
    const rawWorld = this.cache.json.get("worldScreens") as WorldScreensDefinition;
    const npcRegistry = this.cache.json.get("npcs") as WorldNpcRegistryDefinition[] | undefined;
    const interiors = this.cache.json.get("interiors") as WorldInteriorDefinition | undefined;
    this.dialogueData = (this.cache.json.get("dialogue") as DialogueData | undefined) ?? {};
    this.world = this.withInteriorScreens(this.withNpcRegistry(rawWorld, npcRegistry ?? []), interiors);
    const cached = gameState.overworld;
    this.worldState = cached?.currentScreenId ? cached : defaultOverworldState(this.world);
    this.worldState.questFlags = { ...this.world.questFlags, ...this.worldState.questFlags };
    this.worldState.visitedScreenIds = this.worldState.visitedScreenIds?.length
      ? [...this.worldState.visitedScreenIds]
      : [this.worldState.currentScreenId];
    this.worldState.discoveredRegionNames = this.worldState.discoveredRegionNames?.length
      ? [...this.worldState.discoveredRegionNames]
      : [this.worldState.currentRegion];
    this.worldState.debugRevealMap = this.debugRevealMapEnabled();
    this.worldState.pauseMapOpen = false;
    setSceneState("WorldScene", "explore", "Overworld: travel east to White House and talk to the General Editor.");
    setOverworldState(this.worldState);
    gameState.sceneProgress.office ??= 0;
    retroAudio.startMusic("OfficeScene");
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setRoundPixels(true);

    this.screenManager = new ScreenManager(this, this.world);
    this.screenManager.restoreVisited(this.worldState.visitedScreenIds);
    this.cameraController = new CameraController(this, this.initialCameraMode());
    this.loadedScreen = this.screenManager.loadScreen(this.worldState.currentScreenId);
    this.cameraController.configureForScreen(this.loadedScreen.screen, this.loadedScreen.solids);
    this.player = new Player(this, this.worldState.player.x, this.worldState.player.y);
    this.dialog = new DialogBox(this);
    this.inventory = new InventoryOverlay(this);
    this.pauseMap = new PauseMapOverlay(this, this.world);
    this.debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.modeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.input.keyboard!.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB]);
    this.events.on(CAMERA_TRANSITION_COMPLETE, () => this.syncWorldReadout());
    this.createFixedHud();
    this.rebuildInteractables();
    this.updateOfficeObjective();
    this.syncWorldReadout();
    this.showRegionTitle(this.loadedScreen.screen);
  }

  update(_: number, delta: number) {
    const keys = this.player.inputKeys;
    if (Phaser.Input.Keyboard.JustDown(keys.f)) this.scale.toggleFullscreen();
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      const visible = this.cameraController.toggleDebug();
      setLatestMessage(`Camera debug ${visible ? "on" : "off"}.`);
      this.syncWorldReadout();
    }
    if (Phaser.Input.Keyboard.JustDown(this.modeKey)) {
      const mode = this.cameraController.toggleMode();
      setLatestMessage(`Camera transition mode: ${mode.toUpperCase()}.`);
      this.syncWorldReadout();
    }

    if (this.dialog.active) {
      if (this.interactPressed() || Phaser.Input.Keyboard.JustDown(keys.enter)) this.dialog.advance();
      this.player.update(delta, false);
      this.syncWorldReadout();
      return;
    }
    if (this.mapPressed()) {
      this.togglePauseMap();
      this.player.update(delta, false);
      this.syncWorldReadout();
      return;
    }
    if (this.pauseMap.active) {
      if (Phaser.Input.Keyboard.JustDown(keys.esc)) this.closePauseMap();
      this.player.update(delta, false);
      this.syncWorldReadout();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.n)) retroAudio.toggle();
    if (Phaser.Input.Keyboard.JustDown(keys.r)) this.showReliabilityPanel();
    if (Phaser.Input.Keyboard.JustDown(keys.e)) activateRoleAbility(this);
    if (Phaser.Input.Keyboard.JustDown(keys.enter)) {
      this.toggleMenu();
      this.player.update(delta, false);
      this.syncWorldReadout();
      return;
    }
    if (this.inventory.active || this.cameraController.isTransitioning) {
      this.player.update(delta, false);
      this.syncWorldReadout();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The district waits.");
      return;
    }

    this.player.update(delta, true, {
      bounds: screenBounds(),
      solids: this.loadedScreen.solids
    });
    this.handleScreenEdge();

    const target = this.facingTarget();
    setNearestInteractable(target?.label ?? null);
    this.hintText.setText(target ? `${this.facingLabel()} ${target.label.toUpperCase()}` : "");
    if (this.interactPressed() && target) {
      target.onInteract();
    } else if (this.toolPressed()) {
      this.handleToolAction(target);
    }
    this.objectiveText.setText(gameState.objective);
    this.syncWorldReadout();
  }

  private interactPressed() {
    const keys = this.player.inputKeys;
    return Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.z);
  }

  private toolPressed() {
    const keys = this.player.inputKeys;
    return Phaser.Input.Keyboard.JustDown(keys.x) || Phaser.Input.Keyboard.JustDown(keys.shift);
  }

  private mapPressed() {
    const keys = this.player.inputKeys;
    return Phaser.Input.Keyboard.JustDown(keys.m) || Phaser.Input.Keyboard.JustDown(keys.tab);
  }

  private toggleMenu() {
    this.inventory.toggle();
    setLatestMessage(this.inventory.active ? "MENU OPENED." : "MENU CLOSED.");
  }

  private togglePauseMap() {
    if (this.inventory.active) this.inventory.toggle();
    const open = this.pauseMap.toggle(this.pauseMapState());
    this.worldState.pauseMapOpen = open;
    setGameMode(open ? "pause" : "explore");
    setLatestMessage(open ? "PAUSE MAP OPENED." : "PAUSE MAP CLOSED.");
  }

  private closePauseMap() {
    this.pauseMap.hide();
    this.worldState.pauseMapOpen = false;
    setGameMode("explore");
    setLatestMessage("PAUSE MAP CLOSED.");
  }

  private pauseMapState() {
    return {
      currentScreenId: this.loadedScreen.screen.id,
      visitedScreenIds: [...this.worldState.visitedScreenIds],
      discoveredRegionNames: [...this.worldState.discoveredRegionNames],
      questFlags: { ...this.worldState.questFlags },
      debugRevealMap: this.worldState.debugRevealMap
    };
  }

  private facingTarget() {
    return facingInteractable(this.player.position, this.player.facingDirection, this.interactables);
  }

  private withNpcRegistry(world: WorldScreensDefinition, registry: WorldNpcRegistryDefinition[]): WorldScreensDefinition {
    const byScreen = new Map<string, WorldNpcDefinition[]>();
    for (const npc of registry) {
      const screenNpcs = byScreen.get(npc.homeScreenId) ?? [];
      screenNpcs.push({
        id: npc.id,
        label: npc.displayName,
        displayName: npc.displayName,
        role: npc.role,
        x: npc.position.tileX * WORLD_TILE_SIZE + WORLD_TILE_SIZE / 2,
        y: npc.position.tileY * WORLD_TILE_SIZE + WORLD_TILE_SIZE / 2,
        facing: npc.facing,
        texture: npc.spriteKey,
        spriteKey: npc.spriteKey,
        dialogueId: npc.dialogueId,
        questFlags: [...(npc.questFlags ?? [])]
      });
      byScreen.set(npc.homeScreenId, screenNpcs);
    }

    return {
      ...world,
      viewport: { ...world.viewport },
      tileLegend: { ...world.tileLegend },
      questFlags: { ...world.questFlags },
      screens: world.screens.map((screen) => ({
        ...screen,
        exits: { ...screen.exits },
        exitRequirements: screen.exitRequirements ? { ...screen.exitRequirements } : undefined,
        spawnPoints: { ...screen.spawnPoints },
        interactables: screen.interactables.map((object) => this.cloneWorldObject(object)),
        npcs: byScreen.get(screen.id) ?? []
      }))
    };
  }

  private withInteriorScreens(world: WorldScreensDefinition, interiors?: WorldInteriorDefinition): WorldScreensDefinition {
    if (!interiors) return world;
    const doorsByScreen = new Map<string, WorldDoorDefinition[]>();
    for (const door of interiors.doors) {
      const list = doorsByScreen.get(door.screenId) ?? [];
      list.push(door);
      doorsByScreen.set(door.screenId, list);
    }

    const augmentedOverworld = world.screens.map((screen) => {
      const doors = doorsByScreen.get(screen.id) ?? [];
      const returnDoor = doors[0]?.object;
      const returnSpawn = returnDoor
        ? { return: { x: returnDoor.x, y: Math.min(WORLD_SCREEN_HEIGHT - 18, returnDoor.y + 36) } }
        : {};
      const doorIds = new Set(doors.map((door) => door.object.id));
      return {
        ...screen,
        screenType: screen.screenType ?? "overworld",
        spawnPoints: {
          ...screen.spawnPoints,
          ...returnSpawn
        },
        interactables: [
          ...screen.interactables
            .filter((object) => !doorIds.has(object.id))
            .map((object) => this.cloneWorldObject(object)),
          ...doors.map((door) => this.cloneWorldObject(door.object))
        ]
      };
    });
    const interiorScreens = interiors.screens.map((screen) => ({
      ...screen,
      screenType: "interior" as const,
      exits: { ...screen.exits },
      exitRequirements: screen.exitRequirements ? { ...screen.exitRequirements } : undefined,
      spawnPoints: { ...screen.spawnPoints },
      interactables: screen.interactables.map((object) => this.cloneWorldObject(object)),
      npcs: screen.npcs.map((npc) => ({ ...npc }))
    }));

    return {
      ...world,
      screens: [...augmentedOverworld, ...interiorScreens]
    };
  }

  private cloneWorldObject(object: WorldObjectDefinition): WorldObjectDefinition {
    return {
      ...object,
      requiresFlags: object.requiresFlags ? [...object.requiresFlags] : undefined,
      requiresItems: object.requiresItems ? [...object.requiresItems] : undefined,
      dialog: object.dialog ? [...object.dialog] : undefined,
      lockedDialog: object.lockedDialog ? [...object.lockedDialog] : undefined,
      successDialog: object.successDialog ? [...object.successDialog] : undefined
    };
  }

  private facingLabel() {
    const direction = this.player.facingDirection;
    if (direction === "north") return "UP:";
    if (direction === "south") return "DOWN:";
    if (direction === "west") return "LEFT:";
    return "RIGHT:";
  }

  private initialCameraMode(): CameraTransitionMode {
    if (typeof window === "undefined") return "hard";
    return new URLSearchParams(window.location.search).get("camera") === "pan" ? "pan" : "hard";
  }

  private debugRevealMapEnabled() {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("debugRevealMap") === "1" || params.get("debugRevealMap") === "true";
  }

  private createFixedHud() {
    this.add.rectangle(128, 8, GAME_WIDTH, WORLD_HUD_HEIGHT, color(PALETTE.black)).setScrollFactor(0).setDepth(850);
    this.add.rectangle(128, 16, GAME_WIDTH, 2, color(PALETTE.buckramRed)).setScrollFactor(0).setDepth(851);
    this.hudTitle = this.add.text(4, 2, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setScrollFactor(0).setDepth(852);
    this.hudMeta = this.add.text(87, 2, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setScrollFactor(0).setDepth(852);
    this.objectiveText = this.add.text(8, GAME_HEIGHT - 12, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setScrollFactor(0).setDepth(860);
    this.hintText = this.add.text(128, GAME_HEIGHT - 24, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setScrollFactor(0).setDepth(860);
    this.drawMiniMap();
  }

  private drawMiniMap() {
    const startX = 216;
    const startY = 3;
    for (const screen of this.world.screens) {
      if (screen.screenType === "interior") continue;
      const cell = this.add.rectangle(
        startX + screen.gridX * 8,
        startY + screen.gridY * 4,
        6,
        3,
        color(PALETTE.stoneGray)
      ).setOrigin(0, 0).setScrollFactor(0).setDepth(852);
      this.minimapCells.set(screen.id, cell);
    }
  }

  private rebuildInteractables() {
    this.interactables = [
      ...this.loadedScreen.objects.map((object) => ({
        id: object.id,
        label: object.label,
        x: object.screenX,
        y: object.screenY,
        kind: object.kind,
        radius: 20,
        onInteract: () => this.handleObjectInteraction(object)
      })),
      ...this.loadedScreen.npcs.map((npc) => ({
        id: npc.id,
        label: npc.label,
        x: npc.screenX,
        y: npc.screenY,
        kind: npc.role === "mice" ? "enemy" as const : "npc" as const,
        radius: 20,
        onInteract: () => this.handleNpcInteraction(npc)
      }))
    ];
  }

  private handleObjectInteraction(object: WorldObjectDefinition) {
    const objectGate = this.canUseObject(object);
    if (!objectGate.allowed) {
      this.showObjectGateLock(object, objectGate);
      return;
    }
    if (object.kind === "door" && object.targetScreenId) {
      this.enterDoor(object);
      return;
    }
    if (object.id === "golden_rule") {
      this.readGoldenRule();
      return;
    }
    if (object.id === "classnet" || object.id === "archive_gate") {
      this.inspectArchiveGate();
      return;
    }
    if (object.id === "opennet") {
      this.dialog.show("OPENNET TERMINAL", ["READY", "OPEN SOURCE CHECKS ONLY.", "NO CLASSIFIED MATERIAL HERE."]);
      return;
    }
    const rewards = this.applyObjectRewards(object);
    const dialogue = rewards.length && object.successDialog ? object.successDialog : object.dialog;
    const [speaker, ...pages] = dialogue ?? [object.label.toUpperCase(), "The route continues."];
    this.dialog.show(speaker, pages.length ? pages : "The route continues.");
  }

  private canUseObject(object: WorldObjectDefinition) {
    const requiredFlags = [
      ...(object.requiresFlag ? [object.requiresFlag] : []),
      ...(object.requiresFlags ?? [])
    ];
    const requiredItems = [
      ...(object.requiresItem ? [object.requiresItem] : []),
      ...(object.requiresItems ?? [])
    ];
    const missingFlags = requiredFlags.filter((flag) => !this.worldState.questFlags[flag]);
    const missingItems = requiredItems.filter((item) => !hasWorldQuestItem(gameState.inventory, item));
    return {
      allowed: missingFlags.length === 0 && missingItems.length === 0,
      missingFlags,
      missingItems
    };
  }

  private showObjectGateLock(
    object: WorldObjectDefinition,
    gate: { missingFlags: string[]; missingItems: string[] }
  ) {
    const requirement = this.requirementList(gate.missingFlags, gate.missingItems);
    setLatestMessage(`${object.label}: needs ${requirement}.`);
    if (object.lockedDialog?.length) {
      const [speaker, ...pages] = object.lockedDialog;
      this.dialog.show(speaker, pages.length ? pages : `Need: ${requirement}.`);
      return;
    }
    this.dialog.show("WORKFLOW GATE", [`Need: ${requirement}.`, "Route the evidence through the right human workstation."]);
  }

  private applyObjectRewards(object: WorldObjectDefinition) {
    const rewards: string[] = [];
    if (object.grantsItem) {
      const result = addWorldQuestItemToInventory(gameState.inventory, object.grantsItem);
      if (result.added) rewards.push(result.label);
    }
    if (object.grantsFlag && this.grantQuestFlag(object.grantsFlag)) {
      rewards.push(this.flagLabel(object.grantsFlag));
    }
    if (rewards.length) {
      setLatestMessage(`${rewards.join(" + ")} acquired.`);
      retroAudio.stamp();
      const rewardPosition = object as WorldObjectDefinition & { screenX?: number; screenY?: number };
      playPackStampOverlay(this, rewardPosition.screenX ?? object.x, rewardPosition.screenY ?? WORLD_HUD_HEIGHT + object.y, "APPROVED");
      playPackEffect(this, rewardPosition.screenX ?? object.x, rewardPosition.screenY ?? WORLD_HUD_HEIGHT + object.y, "check");
      this.updateOfficeObjective();
      this.syncWorldReadout();
    }
    return rewards;
  }

  private enterDoor(object: WorldObjectDefinition) {
    const target = this.screenManager.getScreen(object.targetScreenId ?? "");
    if (!target) {
      this.dialog.show("LOCKED DOOR", "This doorway is not mapped yet.");
      return;
    }
    const gate = this.screenManager.canEnter(target, this.worldState.questFlags);
    if (!gate.allowed) {
      this.dialog.show("LOCKED DOOR", `Required: ${this.flagList(gate.missingFlags)}`);
      return;
    }
    this.startDoorTransition(target, object.targetSpawn ?? "entry", object.label);
  }

  private handleToolAction(target: Interactable | null) {
    if (!target) {
      const message = "TOOL READY: face a document, terminal, door, or colleague.";
      setLatestMessage(message);
      this.flashToolCue("TOOL", "FACE TARGET");
      return;
    }

    const verb = this.toolVerbFor(target.kind);
    setLatestMessage(`${verb}: ${target.label}.`);
    this.flashToolCue(verb, target.label.toUpperCase());
    if (target.kind === "door" || target.kind === "terminal" || target.kind === "document" || target.kind === "poster") {
      target.onInteract();
    }
  }

  private toolVerbFor(kind: Interactable["kind"]) {
    if (kind === "door") return "UNLOCK";
    if (kind === "document" || kind === "poster" || kind === "manuscript") return "CITE";
    if (kind === "terminal") return "INSPECT";
    if (kind === "npc") return "STAMP";
    return "INSPECT";
  }

  private flashToolCue(verb: string, label: string) {
    const cue = this.add.container(128, 34).setDepth(920).setScrollFactor(0);
    const panel = this.add.rectangle(0, 0, 164, 20, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan));
    const text = this.add.text(0, -5, `${verb}: ${label.slice(0, 18)}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0);
    cue.add([panel, text]);
    this.tweens.add({
      targets: cue,
      alpha: 0,
      delay: 360,
      duration: 150,
      ease: "Stepped",
      onComplete: () => cue.destroy()
    });
  }

  private grantQuestFlag(flag: string) {
    if (this.worldState.questFlags[flag]) return false;
    this.worldState.questFlags[flag] = true;
    return true;
  }

  private handleNpcInteraction(npc: WorldNpcDefinition) {
    if (npc.id === "general_editor") {
      this.talkGeneralEditor();
      return;
    }
    if (npc.id === "mice") {
      adjustReliability(-1, "Navy Hill mice scattered a source-note trail");
      this.dialog.show("NAVY HILL MICE", "They scatter source notes. Skirt them and keep provenance intact.");
      return;
    }
    const dialogue = npc.dialogueId ? this.dialogueData.npcs?.[npc.dialogueId] : null;
    const [speaker, ...pages] = dialogue ?? [npc.label.toUpperCase(), "Every production role stands at equal rank."];
    this.dialog.show(speaker, pages.length ? pages : "Every production role stands at equal rank.");
  }

  private talkGeneralEditor() {
    if (gameState.sceneProgress.office === 0) {
      const dialogue = this.dialogueData.npcs?.general_editor_intro ?? [
        "GENERAL EDITOR",
        "The machine proposes.\nWe decide.",
        "Nothing reaches print on its word alone.",
        "The AI annotation review tool can flag patterns; it cannot settle evidence."
      ];
      const [speaker, ...pages] = dialogue;
      this.dialog.show(speaker, pages, () => {
        gameState.sceneProgress.office = 1;
        this.updateOfficeObjective();
      });
      return;
    }
    const dialogue = this.dialogueData.npcs?.general_editor_repeat ?? [
      "GENERAL EDITOR",
      "Archive work begins with a source you can defend."
    ];
    const [speaker, ...pages] = dialogue;
    this.dialog.show(speaker, pages.length ? pages : "Archive work begins with a source you can defend.");
  }

  private readGoldenRule() {
    if (gameState.sceneProgress.office < 1) {
      this.dialog.show("POSTER", "Talk to Elena. Then the rule will land.");
      return;
    }
    this.dialog.show("GOLDEN RULE", [
      "STATECHAT PROPOSES.",
      "HUMANS DECIDE.",
      "PUBLISHED FRUS IS THE RECORD."
    ], () => {
      awardProcessStamp("rule");
      retroAudio.stamp();
      playPackStampOverlay(this, 128, 96, "APPROVED");
      gameState.sceneProgress.office = Math.max(gameState.sceneProgress.office, 2);
      this.worldState.questFlags.goldenRuleRead = true;
      this.worldState.questFlags.archiveGateOpen = true;
      this.updateOfficeObjective();
    });
  }

  private inspectArchiveGate() {
    if (gameState.sceneProgress.office < 2) {
      this.dialog.show("CLASSNET TERMINAL", "Read the Golden Rule before the archive route opens.");
      return;
    }
    this.dialog.show("CLASSNET TERMINAL", [
      "PRE-SUBMISSION REVIEW",
      "AI ANNO TOOL QUEUED",
      "ARCHIVE CAVERN UNLOCKED"
    ], () => transitionTo(this, "GuideScene"));
  }

  private updateOfficeObjective() {
    const flags = this.worldState.questFlags;
    if (!flags.hasAssignmentMemo) setObjective("Collect the assignment memo in Navy Hill Compiler Office.");
    else if (!flags.hasFindingAid) setObjective("Use the Document Cart to reach NARA II and collect the Finding Aid.");
    else if (!flags.hasDocumentSet) setObjective("Use the Finding Aid in the NARA I Reading Room to pull the document set.");
    else if (!flags.hasSourceNote) setObjective("Return to the Navy Hill source note table and verify provenance.");
    else if (!flags.hasReviewerApproval) setObjective("Route the source note packet to the White House review desk.");
    else if (!flags.hasClearanceBadge) setObjective("Collect the Clearance Badge on the Potomac route.");
    else if (!flags.hasDeclassificationStamp) setObjective("Use the Classification Gate to earn the Declassification Stamp.");
    else if (!flags.hasGeneralEditorSignoff) setObjective("Take the reviewed volume to the publication lectern.");
    else setObjective("FRUS overworld gates cleared; continue to the Buckram Gate.");
  }

  private showReliabilityPanel() {
    this.dialog.show("RELIABILITY", [
      `CONFIDENCE ${gameState.reliability}/100`,
      `ROLE ${gameState.playerProfile.roleLabel}`,
      "AI annotation review remains a tool; human review signs off."
    ]);
  }

  private handleScreenEdge() {
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x <= 9) direction = "west";
    else if (position.x >= WORLD_SCREEN_WIDTH - 9) direction = "east";
    else if (position.y <= WORLD_HUD_HEIGHT + 9) direction = "north";
    else if (position.y >= WORLD_HUD_HEIGHT + WORLD_SCREEN_HEIGHT - 9) direction = "south";
    if (!direction) return;
    this.startScreenTransition(direction);
  }

  private startScreenTransition(direction: Direction) {
    if (this.cameraController.isTransitioning) return;
    const nextScreen = this.screenManager.getNextScreen(direction);
    if (!nextScreen) return;
    const exitGate = this.screenManager.canExit(this.loadedScreen.screen, direction, this.worldState.questFlags);
    if (!exitGate.allowed) {
      this.pushBackFromEdge(direction);
      this.dialog.show("BLOCKED PATH", [`Required: ${this.flagList(exitGate.missingFlags)}.`, "Find the matching FRUS tool or workstation."]);
      return;
    }
    const gate = this.screenManager.canEnter(nextScreen, this.worldState.questFlags);
    if (!gate.allowed) {
      this.pushBackFromEdge(direction);
      this.dialog.show("LOCKED ROUTE", [`Required: ${this.flagList(gate.missingFlags)}.`, "The route opens only after human review."]);
      return;
    }

    retroAudio.transition();
    this.cameraController.startTransition({
      direction,
      fromScreenId: this.loadedScreen.screen.id,
      toScreenId: nextScreen.id,
      toRegionName: nextScreen.regionName,
      onPreparePan: () => this.screenManager.renderPreview(nextScreen.id, direction),
      onCommit: () => {
        const spawn = this.screenManager.spawnForTransition(nextScreen, direction);
        this.loadedScreen = this.screenManager.loadScreen(nextScreen.id);
        this.cameraController.configureForScreen(this.loadedScreen.screen, this.loadedScreen.solids);
        this.player.setPosition(spawn.x, spawn.y);
        this.rebuildInteractables();
        setLatestMessage(`Entered ${nextScreen.regionName}.`);
        this.syncWorldReadout();
        this.pauseMap.refresh(this.pauseMapState());
        this.showRegionTitle(nextScreen);
      },
      onCleanup: () => this.screenManager.clearPreview()
    });
  }

  private startDoorTransition(target: WorldScreenDefinition, spawnKey: SpawnPointKey, label: string) {
    if (this.cameraController.isTransitioning) return;
    const previousMode = this.cameraController.transitionMode;
    this.cameraController.setMode("hard");
    retroAudio.transition();
    this.cameraController.startTransition({
      direction: this.player.facingDirection,
      fromScreenId: this.loadedScreen.screen.id,
      toScreenId: target.id,
      toRegionName: target.regionName,
      onCommit: () => {
        const spawn = this.screenManager.spawnFor(target, spawnKey);
        this.loadedScreen = this.screenManager.loadScreen(target.id);
        this.cameraController.configureForScreen(this.loadedScreen.screen, this.loadedScreen.solids);
        this.player.setPosition(spawn.x, spawn.y);
        this.rebuildInteractables();
        setLatestMessage(`Entered ${target.regionName} via ${label}.`);
        this.syncWorldReadout();
        this.pauseMap.refresh(this.pauseMapState());
        this.showRegionTitle(target);
      },
      onCleanup: () => this.cameraController.setMode(previousMode)
    });
  }

  private pushBackFromEdge(direction: Direction) {
    const p = this.player.position;
    if (direction === "west") this.player.setPosition(18, p.y);
    else if (direction === "east") this.player.setPosition(WORLD_SCREEN_WIDTH - 18, p.y);
    else if (direction === "north") this.player.setPosition(p.x, WORLD_HUD_HEIGHT + 18);
    else this.player.setPosition(p.x, WORLD_HUD_HEIGHT + WORLD_SCREEN_HEIGHT - 18);
  }

  private syncWorldReadout() {
    const screen = this.loadedScreen.screen;
    this.worldState.currentRegion = screen.regionName;
    this.worldState.currentAreaId = screen.areaId;
    this.worldState.currentScreenId = screen.id;
    this.worldState.currentScreenX = screen.gridX;
    this.worldState.currentScreenY = screen.gridY;
    this.worldState.player = this.player.position;
    this.worldState.inventory = [...gameState.inventory];
    this.worldState.activeTool = gameState.heldItem;
    this.worldState.visitedScreenIds = [...this.screenManager.visitedScreenIds];
    this.worldState.discoveredRegionNames = [...new Set(
      this.worldState.visitedScreenIds
        .map((screenId) => this.screenManager.getScreen(screenId)?.regionName)
        .filter((regionName): regionName is string => !!regionName)
    )];
    this.worldState.pauseMapOpen = this.pauseMap.active;
    this.worldState.camera = this.cameraController.getReadout();
    this.pauseMap.refresh(this.pauseMapState());
    patchOverworldState(this.worldState);
    this.hudTitle.setText(screen.regionName.toUpperCase());
    this.hudMeta.setText(`${gameState.playerProfile.roleLabel.toUpperCase().slice(0, 8)} ${screen.gridX},${screen.gridY}`);
    this.objectiveText.setText(gameState.objective);
    for (const [id, cell] of this.minimapCells) {
      const active = id === screen.id;
      const visited = this.screenManager.visitedScreenIds.has(id);
      cell.setFillStyle(color(active ? PALETTE.goldStamp : visited ? PALETTE.terminalCyan : PALETTE.stoneGray));
    }
    setRoomTraversalState({
      currentRoomId: screen.id,
      roomTitle: screen.regionName,
      roomType: screen.screenType === "interior" ? "puzzle" : "normal",
      visitedRoomIds: [...this.screenManager.visitedScreenIds],
      revealedRoomIds: [...this.screenManager.visitedScreenIds],
      exits: { ...screen.exits }
    });
    setVisibleEntities(this.interactables.map((item) => item.label));
    setVisibleThreats(this.loadedScreen.npcs
      .filter((npc) => npc.role === "mice")
      .map((npc) => ({
        label: npc.label,
        x: npc.screenX,
        y: npc.screenY,
        spriteKey: npc.texture,
        behavior: "scurries around Navy Hill and scatters source notes",
        defeatMethod: "Avoid the patrol and keep source notes routed through human review.",
        status: "patrolling overworld"
      })));
  }

  private showRegionTitle(screen: WorldScreenDefinition) {
    this.regionTitleCard?.destroy();
    const panelWidth = screen.regionName.length > 23 ? 214 : 156;
    const titleSize = screen.regionName.length > 23 ? "6px" : "9px";
    const subtitleText = screen.screenType === "interior" ? "INTERIOR MAP" : "FRUS OVERWORLD";
    const panel = this.add.rectangle(0, 0, panelWidth, 28, color(PALETTE.black))
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    const title = this.add.text(0, -7, screen.regionName.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: titleSize,
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 6, subtitleText, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.regionTitleCard = this.add.container(128, 42, [panel, title, subtitle]).setDepth(900).setScrollFactor(0);
    this.tweens.add({
      targets: this.regionTitleCard,
      alpha: 0,
      delay: 680,
      duration: 260,
      ease: "Stepped",
      onComplete: () => {
        this.regionTitleCard?.destroy();
        this.regionTitleCard = null;
      }
    });
  }

  private flagList(flags: string[]) {
    return flags.map((flag) => this.flagLabel(flag)).join(", ").toUpperCase();
  }

  private requirementList(flags: string[], items: string[]) {
    const labels = [
      ...flags.map((flag) => this.flagLabel(flag)),
      ...items.map((item) => worldQuestItemLabel(item))
    ];
    return labels.length ? labels.join(", ").toUpperCase() : "CLEAR ROUTE";
  }

  private flagLabel(flag: string) {
    const labels: Record<string, string> = {
      hasAssignmentMemo: "Assignment Memo",
      hasFindingAid: "Finding Aid",
      hasDocumentSet: "Document Set",
      hasSourceNote: "Source Note",
      hasClearanceBadge: "Clearance Badge",
      hasReviewMemo: "Review Memo",
      hasDeclassificationStamp: "Declassification Stamp",
      hasReviewerApproval: "Reviewer Approval",
      hasGeneralEditorSignoff: "General Editor Signoff",
      goldenRuleRead: "Golden Rule",
      archiveGateOpen: "Archive Gate"
    };
    return labels[flag] ?? flag;
  }
}
