import Phaser from "phaser";
import {
  ACCESSIBILITY_OVERLAYS,
  FRUS_VOLUMES,
  UI_PACK,
  UI_PACK_FRAMES,
  publicAssetPath
} from "../assets/registry";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import {
  SNES_COVER_FRAGMENT_RELIC_ASSET,
  SNES_EQUITY_CRYSTAL_RELIC_ASSET,
  SNES_RESEARCH_PENDANT_RELIC_ASSET,
  SNES_ROOM_MAP_MARKER_ASSET
} from "../game/snesAtlas";
import { gameState, getAdventureHudReadout, getAdventureSubscreenReadout } from "../game/state";
import { getVolumeAssemblyReadout } from "../game/state";
import { addGamepadConnectionListener, getInput, updateInputCallbacks } from "../input/InputState";
import { TouchControls } from "../input/TouchControls";
import { openCodex } from "../systems/codexOverlay";
import { getString } from "../systems/i18n";
import { applyIntegerZoom } from "../systems/pixelPerfect";
import { VOLUME_ASSEMBLY_ASSETS, type VolumeAssemblyReadout } from "../systems/volumeAssembly";
import { addColorblindModeListener, isColorblindModeEnabled } from "../systems/accessibilitySettings";
import { questBandCoverFragmentSlots, questBandCrystalSlots } from "./questBandCue";

type RoomMapMarkerFrameName = (typeof SNES_ROOM_MAP_MARKER_ASSET.frames)[number];

function roomMapFrameName(roomType: string, current: boolean, visited: boolean): RoomMapMarkerFrameName {
  if (current) return "current";
  if (roomType === "boss") return "boss";
  if (roomType === "reward") return "reward";
  return visited ? "visited" : "locked";
}

function clampQuestBandText(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  const max = 27;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

export class UIScene extends Phaser.Scene {
  private controls!: TouchControls;
  private gamepadToastBg?: Phaser.GameObjects.Rectangle;
  private gamepadToastText?: Phaser.GameObjects.Text;
  private gamepadToastTimer?: Phaser.Time.TimerEvent;
  private gamepadToastTween?: Phaser.Tweens.Tween;
  private removeGamepadListener?: () => void;
  private pixelCameraSignature = "";
  private questBandGraphics!: Phaser.GameObjects.Graphics;
  private questBandText!: Phaser.GameObjects.Text;
  private questBandToolText!: Phaser.GameObjects.Text;
  private questBandVerbText!: Phaser.GameObjects.Text;
  private questBandCueText!: Phaser.GameObjects.Text;
  private questBandVolumeText!: Phaser.GameObjects.Text;
  private questBandPendantRelics: Phaser.GameObjects.Image[] = [];
  private questBandCrystalRelics: Phaser.GameObjects.Image[] = [];
  private questBandCoverFragmentRelics: Phaser.GameObjects.Image[] = [];
  private questBandVolumeAssemblyBar?: Phaser.GameObjects.Image;
  private questBandRoomMapMarkers: Phaser.GameObjects.Image[] = [];
  private questBandArtPackChrome?: Phaser.GameObjects.Image;
  private questBandArtPackHearts: Phaser.GameObjects.Image[] = [];
  private questBandArtPackToolSlot?: Phaser.GameObjects.Image;
  private questBandArtPackActionBadge?: Phaser.GameObjects.Image;
  private questBandHeartOverlays: Phaser.GameObjects.Image[] = [];
  private removeColorblindModeListener?: () => void;
  private questBandSignature = "";
  private questBandLastRefresh = 0;

  constructor() {
    super("UIScene");
  }

  preload() {
    if (!this.textures.exists("ui_row_six")) {
      this.load.image("ui_row_six", publicAssetPath(FRUS_VOLUMES.ui_row_six));
    }
    for (const [key, path] of Object.entries(UI_PACK)) {
      if (!this.textures.exists(key)) this.load.image(key, publicAssetPath(path));
    }
    for (const [key, path] of Object.entries(ACCESSIBILITY_OVERLAYS)) {
      if (!this.textures.exists(key)) this.load.image(key, publicAssetPath(path));
    }
  }

  create() {
    this.registerArtPackUiFrames();
    this.controls = new TouchControls(this);
    this.createQuestBand();
    this.createGamepadToast();
    this.removeGamepadListener = addGamepadConnectionListener((connected) => {
      this.controls.setGamepadSuppressed(connected);
      this.showGamepadToast(connected ? getString("hud.controllerConnected") : getString("hud.touchControlsReady"));
    });
    updateInputCallbacks({
      toggleTouchOverlay: () => {
        this.controls.setForceVisible(!this.controls.isForceVisible);
      }
    });
    this.removeColorblindModeListener = addColorblindModeListener(() => {
      this.questBandSignature = "";
      this.questBandLastRefresh = 0;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeGamepadListener?.();
      this.removeColorblindModeListener?.();
      this.gamepadToastTimer?.remove(false);
      this.gamepadToastTween?.stop();
    });
    this.scene.bringToTop();
  }

  private registerArtPackUiFrames() {
    for (const frameSpec of Object.values(UI_PACK_FRAMES)) {
      if (!this.textures.exists(frameSpec.textureKey)) continue;
      const texture = this.textures.get(frameSpec.textureKey);
      if (texture.has(frameSpec.frame)) continue;
      texture.add(
        frameSpec.frame,
        0,
        frameSpec.x,
        frameSpec.y,
        frameSpec.width,
        frameSpec.height
      );
    }
  }

  update() {
    this.syncPixelCameras();
    if (this.scene.isActive("CodexScene")) {
      this.controls.refreshForScene(null);
      this.refreshQuestBand(this.time.now, null);
      return;
    }
    this.controls.refreshForScene(this.activeGameplaySceneKey());
    const activeSceneKey = this.activeGameplaySceneKey();
    this.refreshQuestBand(this.time.now, activeSceneKey);
    if (getInput().selectJustPressed && activeSceneKey) openCodex(this, activeSceneKey);
    this.scene.bringToTop();
  }

  private activeGameplaySceneKey() {
    if (gameState.currentScene && gameState.currentScene !== this.scene.key) return gameState.currentScene;
    const activeScenes = this.scene.manager.getScenes(true)
      .filter((scene) => scene.scene.key !== this.scene.key);
    return activeScenes.at(-1)?.scene.key ?? null;
  }

  private syncPixelCameras() {
    const activeSceneKeys = this.scene.manager.getScenes(true).map((scene) => scene.scene.key).join("|");
    const signature = `${activeSceneKeys}:${this.game.canvas.width}x${this.game.canvas.height}:${this.game.scale.zoom}`;
    if (signature === this.pixelCameraSignature) return;
    this.pixelCameraSignature = signature;
    applyIntegerZoom(this.game);
  }

  private createGamepadToast() {
    this.gamepadToastBg = this.add
      .rectangle(GAME_WIDTH / 2, 26, 150, 18, color(PALETTE.black), 0.85)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.9)
      .setDepth(21000)
      .setScrollFactor(0)
      .setVisible(false);
    this.gamepadToastText = this.add
      .text(GAME_WIDTH / 2, 26, "", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(21001)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private createQuestBand() {
    this.questBandGraphics = this.add.graphics()
      .setDepth(20400)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandText = this.add.text(78, 5, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 132, useAdvancedWrap: true },
      fixedWidth: 132
    })
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandToolText = this.add.text(GAME_WIDTH - 4, 5, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "right"
    })
      .setOrigin(1, 0)
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandVerbText = this.add.text(7, 18, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black,
      align: "center"
    })
      .setName("quest-band-verb-text")
      .setDepth(20402)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandCueText = this.add.text(34, 17, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    })
      .setName("quest-band-cue-text")
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandVolumeText = this.add.text(GAME_WIDTH - 4, 23, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "right"
    })
      .setName("quest-band-volume-text")
      .setOrigin(1, 0)
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    if (this.textures.exists(VOLUME_ASSEMBLY_ASSETS.hudBar.key)) {
      this.questBandVolumeAssemblyBar = this.add.image(145, 15, VOLUME_ASSEMBLY_ASSETS.hudBar.key)
        .setName("quest-band-volume-assembly-art-bar")
        .setOrigin(0, 0)
        .setScale(0.5)
        .setDepth(20402)
        .setScrollFactor(0)
        .setVisible(false);
    }
    this.createArtPackQuestBandSprites();
    this.createQuestBandPendantRelics();
    this.createQuestBandCrystalRelics();
    this.createQuestBandCoverFragmentRelics();
  }

  private refreshQuestBand(now: number, activeSceneKey: string | null) {
    const visible = this.shouldShowQuestBand(activeSceneKey);
    this.questBandGraphics.setVisible(visible);
    this.questBandText.setVisible(visible);
    this.questBandToolText.setVisible(visible);
    this.questBandVerbText.setVisible(visible);
    this.questBandCueText.setVisible(visible);
    this.questBandVolumeText.setVisible(false);
    this.questBandVolumeAssemblyBar?.setVisible(false);
    this.setArtPackQuestBandVisible(visible);
    this.questBandPendantRelics.forEach((relic) => relic.setVisible(false));
    this.questBandHeartOverlays.forEach((overlay) => overlay.setVisible(false));
    if (!visible) {
      this.questBandCrystalRelics.forEach((relic) => relic.setVisible(false));
      this.questBandCoverFragmentRelics.forEach((relic) => relic.setVisible(false));
    }
    if (!visible) return;

    const hud = getAdventureHudReadout();
    const subscreen = getAdventureSubscreenReadout();
    const volumeAssembly = getVolumeAssemblyReadout();
    if (now - this.questBandLastRefresh < 120) return;
    this.questBandLastRefresh = now;

    const toolLabel = subscreen.equippedTool?.shortLabel ?? hud.equippedItem?.shortLabel ?? getString("hud.none");
    const weapon = gameState.playerCombat.weapon;
    const objectiveLine = this.compactObjective(activeSceneKey);
    const riskLine = this.compactReliabilityRiskLine();
    const actionLine = riskLine ?? this.compactActionLine(toolLabel);
    const signature = [
      gameState.reliability,
      toolLabel,
      volumeAssembly.earnedPieces.join(","),
      volumeAssembly.ceremonyUnlocked ? "bound" : "loose",
      weapon.phase,
      weapon.cooldownMsRemaining,
      objectiveLine,
      actionLine,
      gameState.nearestInteractable ?? "",
      gameState.heldItem ?? "",
      gameState.mode,
      isColorblindModeEnabled() ? "hc" : "std"
    ].join("|");
    if (signature === this.questBandSignature) return;
    this.questBandSignature = signature;

    this.questBandGraphics.clear();
    this.drawQuestBandChrome(subscreen.reliabilityHearts.filled, subscreen.reliabilityHearts.total);
    this.drawQuestBandActionBadge();
    this.drawQuestBandToolSlot(Boolean(subscreen.equippedTool ?? hud.equippedItem), weapon.cooldownRatio, weapon.phase);
    this.drawQuestBandVolumeAssembly(volumeAssembly);
    this.questBandText.setText(objectiveLine);
    this.questBandVerbText.setText("A");
    this.questBandCueText.setText(actionLine);
    this.questBandCueText.setColor(riskLine ? PALETTE.classNetRed : PALETTE.terminalCyan);
    this.questBandToolText.setText(getString("hud.toolLabel", { label: toolLabel }));
    this.questBandVolumeText.setText("");
    this.hideDetailedQuestBandRelics();
  }

  private compactObjective(activeSceneKey: string | null) {
    if (gameState.mode === "dialog") return getString("hud.readLine");
    if (gameState.mode === "choice") return getString("hud.chooseAnswer");
    if (gameState.heldItem) return clampQuestBandText(getString("hud.carryItem", { item: gameState.heldItem }));
    if (activeSceneKey === "OfficeScene" && !gameState.sceneProgress.juniorCompilerIntroduced) {
      return clampQuestBandText(getString("hud.talkJuniorCompiler"));
    }
    const objective = gameState.objective.replace(/^Mission:\s*/i, "");
    const firstSentence = objective.split(".")[0]?.trim() || objective.trim();
    return clampQuestBandText(firstSentence);
  }

  private compactReliabilityRiskLine() {
    const hardestThreat = gameState.visibleThreats
      .filter((threat) => (threat.hp ?? 0) > 0 && threat.enemyState !== "defeated" && (threat.difficultyTier ?? 0) >= 4)
      .sort((left, right) => (right.difficultyTier ?? 0) - (left.difficultyTier ?? 0))[0];
    if (!hardestThreat) return null;
    const risk = (hardestThreat.reliabilityRisk ?? "high").toUpperCase();
    return clampQuestBandText(`RELIABILITY RISK: ${risk}`);
  }

  private compactActionLine(toolLabel: string) {
    if (gameState.mode === "dialog") return getString("hud.nextLine");
    if (gameState.mode === "choice") return getString("hud.confirm");
    if (gameState.currentScene === "OfficeScene" && !gameState.sceneProgress.juniorCompilerIntroduced) {
      return getString("hud.goLeftTalk");
    }
    if (gameState.nearestInteractable) return getString("hud.interact", { label: gameState.nearestInteractable.toUpperCase().slice(0, 22) });
    if (toolLabel !== getString("hud.none")) return getString("hud.useTool", { tool: toolLabel });
    return getString("hud.findGlowing");
  }

  private hideDetailedQuestBandRelics() {
    this.questBandPendantRelics.forEach((relic) => relic.setVisible(false));
    this.questBandCrystalRelics.forEach((relic) => relic.setVisible(false));
    this.questBandCoverFragmentRelics.forEach((relic) => relic.setVisible(false));
    this.questBandVolumeAssemblyBar?.setVisible(false);
    this.questBandRoomMapMarkers.forEach((marker) => marker.destroy());
    this.questBandRoomMapMarkers = [];
  }

  private createArtPackQuestBandSprites() {
    const topBar = UI_PACK_FRAMES.rubyHudBar;
    if (this.textures.exists(topBar.textureKey) && this.textures.get(topBar.textureKey).has(topBar.frame)) {
      this.questBandArtPackChrome = this.add.image(0, 0, topBar.textureKey, topBar.frame)
        .setName("quest-band-artpack-ruby-hud-bar")
        .setOrigin(0, 0)
        .setDisplaySize(GAME_WIDTH, 14)
        .setDepth(20400)
        .setScrollFactor(0)
        .setVisible(false);
    }

    const toolSlot = UI_PACK_FRAMES.toolSlot;
    if (this.textures.exists(toolSlot.textureKey) && this.textures.get(toolSlot.textureKey).has(toolSlot.frame)) {
      this.questBandArtPackToolSlot = this.add.image(GAME_WIDTH - 48, 3, toolSlot.textureKey, toolSlot.frame)
        .setName("quest-band-artpack-tool-slot")
        .setOrigin(0, 0)
        .setDisplaySize(14, 14)
        .setDepth(20402)
        .setScrollFactor(0)
        .setVisible(false);
    }

    const actionBadge = UI_PACK_FRAMES.actionBadge;
    if (this.textures.exists(actionBadge.textureKey) && this.textures.get(actionBadge.textureKey).has(actionBadge.frame)) {
      this.questBandArtPackActionBadge = this.add.image(3, 17, actionBadge.textureKey, actionBadge.frame)
        .setName("quest-band-artpack-action-badge")
        .setOrigin(0, 0)
        .setDisplaySize(25, 7)
        .setDepth(20401)
        .setScrollFactor(0)
        .setVisible(false);
    }
  }

  private setArtPackQuestBandVisible(visible: boolean) {
    this.questBandArtPackChrome?.setVisible(visible);
    this.questBandArtPackToolSlot?.setVisible(false);
    this.questBandArtPackActionBadge?.setVisible(false);
    this.questBandArtPackHearts.forEach((heart) => heart.setVisible(false));
  }

  private shouldShowQuestBand(activeSceneKey: string | null) {
    if (!activeSceneKey) return false;
    if (this.scene.isActive("CodexScene")) return false;
    return !new Set([
      "BootScene",
      "TapToStartScene",
      "WarningScene",
      "TitleScene",
      "CharacterCreateScene",
      "RenderDebugScene",
      "DanneGallery",
      "SpriteGallery"
    ]).has(activeSceneKey);
  }

  private drawQuestBandChrome(filledHearts: number, totalHearts: number) {
    const g = this.questBandGraphics;
    if (this.questBandArtPackChrome) {
      this.questBandArtPackChrome.setVisible(true);
      g.fillStyle(color(PALETTE.black), 0.76);
      g.fillRect(0, 13, GAME_WIDTH, 11);
    } else {
      g.fillStyle(color(PALETTE.black), 0.86);
      g.fillRect(0, 0, GAME_WIDTH, 24);
      g.fillStyle(color(PALETTE.deepRuby), 0.8);
      g.fillRect(0, 16, GAME_WIDTH, 8);
    }
    g.fillStyle(color(PALETTE.goldStamp), 1);
    g.fillRect(0, 23, GAME_WIDTH, 1);
    g.fillStyle(color(PALETTE.black), 0.72);
    g.fillRect(0, 17, GAME_WIDTH, 6);
    if (!this.syncArtPackQuestHearts(filledHearts, totalHearts)) {
      for (let index = 0; index < totalHearts; index += 1) {
        this.drawQuestHeart(index, 5 + index * 7, 3, index < filledHearts);
      }
    }
  }

  private syncArtPackQuestHearts(filledHearts: number, totalHearts: number) {
    const heart = UI_PACK_FRAMES.verificationHeart;
    if (!this.textures.exists(heart.textureKey) || !this.textures.get(heart.textureKey).has(heart.frame)) return false;
    while (this.questBandArtPackHearts.length < totalHearts) {
      const index = this.questBandArtPackHearts.length;
      const icon = this.add.image(5 + index * 7, 3, heart.textureKey, heart.frame)
        .setName(`quest-band-artpack-heart-${index}`)
        .setOrigin(0, 0)
        .setDisplaySize(7, 7)
        .setDepth(20403)
        .setScrollFactor(0)
        .setVisible(false);
      this.questBandArtPackHearts.push(icon);
    }
    this.questBandArtPackHearts.forEach((icon, index) => {
      const filled = index < filledHearts;
      const x = 5 + index * 7;
      const y = 2;
      icon
        .setPosition(x, y)
        .setAlpha(index < totalHearts ? (filled ? 1 : 0.36) : 0)
        .setTint(filled ? 0xffffff : color(PALETTE.stoneGray))
        .setVisible(index < totalHearts);
      if (index < totalHearts) this.syncQuestHeartOverlay(index, x, y, filled);
      else this.questBandHeartOverlays[index]?.setVisible(false);
    });
    return true;
  }

  private drawQuestHeart(index: number, x: number, y: number, filled: boolean) {
    const g = this.questBandGraphics;
    g.fillStyle(color(PALETTE.black), 1);
    g.fillRect(x, y + 1, 6, 5);
    g.fillStyle(color(filled ? PALETTE.classNetRed : PALETTE.stoneDark), 1);
    g.fillRect(x + 1, y, 1, 1);
    g.fillRect(x + 4, y, 1, 1);
    g.fillRect(x, y + 1, 6, 3);
    g.fillRect(x + 1, y + 4, 4, 1);
    g.fillRect(x + 2, y + 5, 2, 1);
    if (filled) {
      g.fillStyle(color(PALETTE.goldStamp), 1);
      g.fillRect(x + 2, y + 1, 1, 1);
    }
    this.syncQuestHeartOverlay(index, x, y, filled);
  }

  private syncQuestHeartOverlay(index: number, x: number, y: number, filled: boolean) {
    const textureKey: keyof typeof ACCESSIBILITY_OVERLAYS = filled ? "hp_cell_full" : "hp_cell_empty";
    if (!isColorblindModeEnabled() || !this.textures.exists(textureKey)) {
      this.questBandHeartOverlays[index]?.setVisible(false);
      return;
    }
    const overlay = this.questBandHeartOverlays[index] ?? this.add
      .image(0, 0, textureKey)
      .setName(`quest-band-heart-accessibility-${index}`)
      .setDepth(20404)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandHeartOverlays[index] = overlay;
    overlay
      .setTexture(textureKey)
      .setPosition(x + 3, y + 3)
      .setScale(0.75)
      .setAlpha(filled ? 0.95 : 0.82)
      .setVisible(true);
  }

  private drawQuestBandPendants(acquired: boolean[]) {
    const g = this.questBandGraphics;
    acquired.forEach((held, index) => {
      const x = 82 + index * 11;
      const y = 9;
      g.fillStyle(color(PALETTE.black), 0.72);
      g.fillRect(x - 5, y - 5, 10, 10);
      g.lineStyle(1, color(held ? PALETTE.goldStamp : PALETTE.stoneGray), 0.95);
      g.strokeRect(x - 5, y - 5, 10, 10);

      const relic = this.questBandPendantRelics[index];
      if (relic?.texture.key === SNES_RESEARCH_PENDANT_RELIC_ASSET.key) {
        relic
          .setPosition(x, y)
          .setAlpha(held ? 1 : 0.42)
          .setVisible(true);
        if (held) relic.clearTint();
        else relic.setTint(color(PALETTE.stoneGray));
        if (held) {
          g.fillStyle(color(PALETTE.white), 0.95);
          g.fillRect(x + 3, y - 4, 1, 1);
        }
        return;
      }

      g.fillStyle(color(held ? PALETTE.goldStamp : PALETTE.black), 1);
      g.lineStyle(1, color(held ? PALETTE.white : PALETTE.stoneGray), 1);
      g.fillTriangle(x, y - 5, x - 5, y + 5, x + 5, y + 5);
      g.strokeTriangle(x, y - 5, x - 5, y + 5, x + 5, y + 5);
      if (held) {
        g.fillStyle(color(PALETTE.white), 1);
        g.fillRect(x - 1, y, 2, 1);
      }
    });
  }

  private createQuestBandPendantRelics() {
    this.questBandPendantRelics.forEach((relic) => relic.destroy());
    this.questBandPendantRelics = [];
    if (!this.textures.exists(SNES_RESEARCH_PENDANT_RELIC_ASSET.key)) return;
    const texture = this.textures.get(SNES_RESEARCH_PENDANT_RELIC_ASSET.key);
    for (let index = 0; index < SNES_RESEARCH_PENDANT_RELIC_ASSET.frames.length; index += 1) {
      const frameName = SNES_RESEARCH_PENDANT_RELIC_ASSET.frames[index];
      if (!texture.has(frameName)) {
        texture.add(
          frameName,
          0,
          index * SNES_RESEARCH_PENDANT_RELIC_ASSET.frame.width,
          0,
          SNES_RESEARCH_PENDANT_RELIC_ASSET.frame.width,
          SNES_RESEARCH_PENDANT_RELIC_ASSET.frame.height
        );
      }
      const relic = this.add.image(82 + index * 11, 9, SNES_RESEARCH_PENDANT_RELIC_ASSET.key, frameName)
        .setName(`quest-band-research-pendant-${SNES_RESEARCH_PENDANT_RELIC_ASSET.frames[index]}`)
        .setDepth(20403)
        .setScrollFactor(0)
        .setVisible(false);
      this.questBandPendantRelics.push(relic);
    }
  }

  private drawQuestBandCrystals(earned: number, total: number) {
    const g = this.questBandGraphics;
    const slots = questBandCrystalSlots(earned, total, SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.length);
    this.syncQuestBandCrystalRelics(earned, total);
    for (const slot of slots.filter((candidate) => candidate.visible)) {
      const index = slot.index;
      const x = 122 + index * 8;
      const y = 9;
      const held = slot.held;
      g.fillStyle(color(PALETTE.black), 0.72);
      g.fillRect(x - 4, y - 5, 8, 10);
      g.lineStyle(1, color(held ? PALETTE.terminalCyan : PALETTE.stoneGray), 0.9);
      g.strokeRect(x - 4, y - 5, 8, 10);

      const relic = this.questBandCrystalRelics[index];
      if (relic?.texture.key === SNES_EQUITY_CRYSTAL_RELIC_ASSET.key) {
        relic
          .setPosition(x, y)
          .setAlpha(held ? 1 : 0.38)
          .setVisible(true);
        if (held) relic.clearTint();
        else relic.setTint(color(PALETTE.stoneGray));
        if (held) {
          g.fillStyle(color(PALETTE.white), 0.95);
          g.fillRect(x + 2, y - 4, 1, 1);
        }
        continue;
      }

      g.fillStyle(color(held ? PALETTE.terminalCyan : PALETTE.black), 1);
      g.lineStyle(1, color(held ? PALETTE.white : PALETTE.stoneGray), 1);
      g.fillTriangle(x, y - 5, x - 4, y, x + 4, y);
      g.fillTriangle(x, y + 5, x - 4, y, x + 4, y);
      g.lineBetween(x, y - 5, x - 4, y);
      g.lineBetween(x - 4, y, x, y + 5);
      g.lineBetween(x, y + 5, x + 4, y);
      g.lineBetween(x + 4, y, x, y - 5);
    }
  }

  private syncQuestBandCrystalRelics(earned: number, total: number) {
    const slots = questBandCrystalSlots(earned, total, SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.length);
    for (const slot of slots) {
      const relic = this.questBandCrystalRelics[slot.index];
      if (!relic) continue;
      relic.setVisible(slot.visible);
      if (!slot.visible) continue;
      relic
        .setPosition(122 + slot.index * 8, 9)
        .setAlpha(slot.held ? 1 : 0.38);
      if (slot.held) relic.clearTint();
      else relic.setTint(color(PALETTE.stoneGray));
    }
  }

  private createQuestBandCrystalRelics() {
    this.questBandCrystalRelics.forEach((relic) => relic.destroy());
    this.questBandCrystalRelics = [];
    if (!this.textures.exists(SNES_EQUITY_CRYSTAL_RELIC_ASSET.key)) return;
    const texture = this.textures.get(SNES_EQUITY_CRYSTAL_RELIC_ASSET.key);
    for (let index = 0; index < SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames.length; index += 1) {
      const frameName = SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames[index];
      if (!texture.has(frameName)) {
        texture.add(
          frameName,
          0,
          index * SNES_EQUITY_CRYSTAL_RELIC_ASSET.frame.width,
          0,
          SNES_EQUITY_CRYSTAL_RELIC_ASSET.frame.width,
          SNES_EQUITY_CRYSTAL_RELIC_ASSET.frame.height
        );
      }
      const relic = this.add.image(122 + index * 8, 9, SNES_EQUITY_CRYSTAL_RELIC_ASSET.key, frameName)
        .setName(`quest-band-equity-crystal-${SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames[index]}`)
        .setDepth(20403)
        .setScrollFactor(0)
        .setVisible(false);
      this.questBandCrystalRelics.push(relic);
    }
  }

  private drawQuestBandRoomMap(roomMap: ReturnType<typeof getAdventureSubscreenReadout>["roomMap"]) {
    this.questBandRoomMapMarkers.forEach((marker) => marker.destroy());
    this.questBandRoomMapMarkers = [];
    const rooms = roomMap.rooms;
    if (!roomMap.currentRoomId || !rooms.length) return;

    const g = this.questBandGraphics;
    const revealedRooms = rooms.filter((room) => room.revealed || room.visited || room.id === roomMap.currentRoomId);
    if (!revealedRooms.length) return;

    const minX = Math.min(...rooms.map((room) => room.grid.x));
    const minY = Math.min(...rooms.map((room) => room.grid.y));
    const maxX = Math.max(...rooms.map((room) => room.grid.x));
    const maxY = Math.max(...rooms.map((room) => room.grid.y));
    const markerTextureReady = this.textures.exists(SNES_ROOM_MAP_MARKER_ASSET.key);
    const cell = markerTextureReady ? SNES_ROOM_MAP_MARKER_ASSET.frame.width : 3;
    const gap = 1;
    const width = (maxX - minX + 1) * (cell + gap) + 1;
    const height = (maxY - minY + 1) * (cell + gap) + 1;
    const originX = 158;
    const originY = 3;

    g.fillStyle(color(PALETTE.black), 0.9);
    g.fillRect(originX - 3, originY - 2, width + 6, height + 4);
    g.lineStyle(1, color(PALETTE.stoneGray), 0.85);
    g.strokeRect(originX - 3, originY - 2, width + 6, height + 4);

    for (const room of rooms) {
      const current = room.id === roomMap.currentRoomId;
      if (!current && !room.revealed && !room.visited) continue;
      const x = originX + (room.grid.x - minX) * (cell + gap);
      const y = originY + (room.grid.y - minY) * (cell + gap);
      const frame = roomMapFrameName(room.roomType, current, room.visited);
      if (markerTextureReady) {
        const marker = this.add.image(x + cell / 2, y + cell / 2, SNES_ROOM_MAP_MARKER_ASSET.key, frame)
          .setName(`quest-band-room-map-marker-${room.id}-${frame}`)
          .setDepth(20404)
          .setScrollFactor(0)
          .setAlpha(current || room.visited ? 1 : 0.76);
        this.questBandRoomMapMarkers.push(marker);
      } else {
        const fill = current
          ? PALETTE.goldStamp
          : room.visited
            ? PALETTE.terminalCyan
            : room.roomType === "boss"
              ? PALETTE.classNetRed
              : PALETTE.stoneDark;
        g.fillStyle(color(fill), current ? 1 : 0.82);
        g.fillRect(x, y, cell, cell);
        if (current) {
          g.lineStyle(1, color(PALETTE.white), 1);
          g.strokeRect(x - 1, y - 1, cell + 2, cell + 2);
        }
      }
    }
  }

  private drawQuestBandKeyStatus(dungeons: ReturnType<typeof getAdventureSubscreenReadout>["dungeons"]) {
    const activeDungeon = dungeons.find((dungeon) => dungeon.active)
      ?? dungeons.find((dungeon) => dungeon.smallKeys > 0 || dungeon.bigKeyHeld || dungeon.mapRevealed);
    if (!activeDungeon) return;

    const g = this.questBandGraphics;
    const x = 190;
    const y = 5;
    g.fillStyle(color(PALETTE.black), 0.9);
    g.fillRect(x - 3, y - 2, 16, 12);
    g.lineStyle(1, color(PALETTE.stoneGray), 0.85);
    g.strokeRect(x - 3, y - 2, 16, 12);

    const keyHeld = activeDungeon.smallKeys > 0;
    g.fillStyle(color(keyHeld ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
    g.fillRect(x, y + 3, 7, 2);
    g.fillRect(x + 6, y + 2, 2, 4);
    g.fillRect(x + 1, y + 1, 2, 4);
    g.fillStyle(color(PALETTE.black), 1);
    g.fillRect(x + 2, y + 2, 1, 1);

    if (activeDungeon.bigKeyHeld) {
      g.fillStyle(color(PALETTE.terminalCyan), 1);
      g.fillTriangle(x + 11, y, x + 8, y + 5, x + 14, y + 5);
      g.fillRect(x + 10, y + 5, 2, 3);
    } else if (activeDungeon.mapRevealed) {
      g.fillStyle(color(PALETTE.creamPaper), 1);
      g.fillRect(x + 10, y + 1, 3, 6);
      g.fillStyle(color(PALETTE.deepRuby), 1);
      g.fillRect(x + 11, y + 2, 1, 4);
    }
  }

  private drawQuestBandVolumeAssembly(readout: VolumeAssemblyReadout) {
    const g = this.questBandGraphics;
    const clampedTotal = Math.max(1, readout.total);
    const filled = Math.max(0, Math.min(clampedTotal, readout.earnedCount));
    const x = 146;
    const y = 16;
    const hasCoverFragmentSprites = this.questBandCoverFragmentRelics.length >= SNES_COVER_FRAGMENT_RELIC_ASSET.frames.length;
    this.syncQuestBandCoverFragmentRelics(readout.earnedCount, readout.total);
    if (this.questBandVolumeAssemblyBar) {
      this.questBandVolumeAssemblyBar
        .setVisible(true)
        .setAlpha(0.9)
        .setPosition(x - 1, y - 2);
      for (let index = 0; index < clampedTotal; index += 1) {
        const earned = index < filled;
        const pieceX = x + 3 + index * 8;
        g.fillStyle(color(earned ? PALETTE.goldStamp : PALETTE.black), earned ? 0.95 : 0.55);
        g.fillRect(pieceX, y + 1, 5, 3);
        if (earned) {
          g.fillStyle(color(PALETTE.white), 0.95);
          g.fillRect(pieceX + 1, y + 1, 1, 1);
        }
      }
      return;
    }
    g.fillStyle(color(PALETTE.black), 0.9);
    g.fillRect(x - 2, y - 1, 43, 8);
    g.lineStyle(1, color(filled >= clampedTotal ? PALETTE.goldStamp : PALETTE.stoneGray), 0.95);
    g.strokeRect(x - 2, y - 1, 43, 8);
    g.fillStyle(color(PALETTE.deepRuby), 1);
    g.fillRect(x, y + 1, 39, 4);
    if (hasCoverFragmentSprites) {
      if (filled >= clampedTotal) {
        g.fillStyle(color(PALETTE.white), 1);
        g.fillRect(x + 5, y + 3, 2, 1);
      }
      return;
    }

    for (let index = 0; index < clampedTotal; index += 1) {
      const pieceX = x + 2 + index * 2;
      const earned = index < filled;
      g.fillStyle(color(earned ? PALETTE.creamPaper : PALETTE.black), earned ? 1 : 0.65);
      g.fillRect(pieceX, y + 5, 1, 4);
      if (earned) {
        g.fillStyle(color(PALETTE.goldStamp), 1);
        g.fillRect(pieceX, y + 4, 1, 1);
      }
    }
    if (filled >= clampedTotal) {
      g.fillStyle(color(PALETTE.white), 1);
      g.fillRect(x + 5, y + 3, 2, 1);
    }
  }

  private syncQuestBandCoverFragmentRelics(current: number, total: number) {
    const slots = questBandCoverFragmentSlots(current, total, SNES_COVER_FRAGMENT_RELIC_ASSET.frames.length);
    for (const slot of slots) {
      const relic = this.questBandCoverFragmentRelics[slot.index];
      if (!relic) continue;
      relic.setVisible(slot.visible);
      if (!slot.visible) continue;
      relic
        .setPosition(178 + slot.index * SNES_COVER_FRAGMENT_RELIC_ASSET.frame.width, 5)
        .setAlpha(slot.held ? 1 : 0.34);
      if (slot.held) relic.clearTint();
      else relic.setTint(color(PALETTE.stoneGray));
    }
  }

  private createQuestBandCoverFragmentRelics() {
    this.questBandCoverFragmentRelics.forEach((relic) => relic.destroy());
    this.questBandCoverFragmentRelics = [];
    if (!this.textures.exists(SNES_COVER_FRAGMENT_RELIC_ASSET.key)) return;
    const texture = this.textures.get(SNES_COVER_FRAGMENT_RELIC_ASSET.key);
    for (let index = 0; index < SNES_COVER_FRAGMENT_RELIC_ASSET.frames.length; index += 1) {
      const frameName = SNES_COVER_FRAGMENT_RELIC_ASSET.frames[index];
      if (!texture.has(frameName)) {
        texture.add(
          frameName,
          0,
          index * SNES_COVER_FRAGMENT_RELIC_ASSET.frame.width,
          0,
          SNES_COVER_FRAGMENT_RELIC_ASSET.frame.width,
          SNES_COVER_FRAGMENT_RELIC_ASSET.frame.height
        );
      }
      const relic = this.add.image(
        178 + index * SNES_COVER_FRAGMENT_RELIC_ASSET.frame.width,
        5,
        SNES_COVER_FRAGMENT_RELIC_ASSET.key,
        frameName
      )
        .setName(`quest-band-cover-fragment-${SNES_COVER_FRAGMENT_RELIC_ASSET.frames[index]}`)
        .setOrigin(0, 0)
        .setDepth(20403)
        .setScrollFactor(0)
        .setVisible(false);
      this.questBandCoverFragmentRelics.push(relic);
    }
  }

  private drawQuestBandToolSlot(acquired: boolean, cooldownRatio = 0, phase: string = "idle") {
    const g = this.questBandGraphics;
    const x = GAME_WIDTH - 48;
    if (this.questBandArtPackToolSlot) {
      this.questBandArtPackToolSlot
        .setVisible(true)
        .setAlpha(acquired ? 1 : 0.45)
        .setTint(acquired ? 0xffffff : color(PALETTE.stoneGray));
    } else {
      g.lineStyle(1, color(acquired ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
      g.fillStyle(color(acquired ? PALETTE.deepRuby : PALETTE.black), 0.95);
      g.fillRect(x, 3, 14, 14);
      g.strokeRect(x, 3, 14, 14);
    }
    g.fillStyle(color(acquired ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
    g.fillRect(x + 4, 6, 6, 2);
    g.fillRect(x + 6, 8, 2, 5);
    if (acquired && cooldownRatio > 0) {
      const barHeight = Math.max(1, Math.round(12 * cooldownRatio));
      g.fillStyle(color(PALETTE.black), 0.74);
      g.fillRect(x + 16, 3, 3, 14);
      g.fillStyle(color(phase === "active" ? PALETTE.terminalCyan : PALETTE.classNetRed), 0.95);
      g.fillRect(x + 17, 16 - barHeight, 1, barHeight);
    } else if (acquired) {
      g.fillStyle(color(PALETTE.terminalCyan), 0.9);
      g.fillRect(x + 16, 15, 3, 2);
    }
  }

  private drawQuestBandActionBadge() {
    const g = this.questBandGraphics;
    const accent = gameState.nearestInteractable ? PALETTE.goldStamp : PALETTE.terminalCyan;
    if (this.questBandArtPackActionBadge) {
      this.questBandArtPackActionBadge
        .setVisible(true)
        .setTint(color(accent))
        .setAlpha(0.95);
      g.fillStyle(color(PALETTE.black), 0.58);
      g.fillRect(6, 18, 19, 5);
    } else {
      g.fillStyle(color(PALETTE.black), 0.98);
      g.fillRect(3, 17, 25, 7);
      g.lineStyle(1, color(accent), 1);
      g.strokeRect(3, 17, 25, 7);
      g.fillStyle(color(accent), 0.95);
      g.fillRect(4, 18, 23, 5);
    }
  }

  private showGamepadToast(message: string) {
    if (!this.gamepadToastBg || !this.gamepadToastText) return;
    this.gamepadToastTimer?.remove(false);
    this.gamepadToastTween?.stop();
    this.gamepadToastText.setText(message);
    this.gamepadToastBg.setVisible(true).setAlpha(1);
    this.gamepadToastText.setVisible(true).setAlpha(1);
    this.gamepadToastTimer = this.time.delayedCall(1100, () => {
      this.gamepadToastTween = this.tweens.add({
        targets: [this.gamepadToastBg, this.gamepadToastText],
        alpha: 0,
        duration: 200,
        ease: "Linear",
        onComplete: () => {
          this.gamepadToastBg?.setVisible(false);
          this.gamepadToastText?.setVisible(false);
        }
      });
    });
  }
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}
