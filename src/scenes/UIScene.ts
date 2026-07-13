import Phaser from "phaser";
import {
  ACCESSIBILITY_OVERLAYS,
  FRUS_VOLUMES,
  UI_PACK,
  publicAssetPath
} from "../assets/registry";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import { gameState, getAdventureHudReadout, getAdventureSubscreenReadout, hasProcessItem } from "../game/state";
import { getVolumeAssemblyReadout } from "../game/state";
import { getGuideCavernStage, guideCavernActionCue } from "../game/guideCavernFlow";
import { addGamepadConnectionListener, getInput, getPrimaryActionBadge, updateInputCallbacks } from "../input/InputState";
import { TouchControls } from "../input/TouchControls";
import { openCodex } from "../systems/codexOverlay";
import { getString } from "../systems/i18n";
import { applyIntegerZoom } from "../systems/pixelPerfect";
import type { VolumeAssemblyReadout } from "../systems/volumeAssembly";
import { addColorblindModeListener, isColorblindModeEnabled } from "../systems/accessibilitySettings";
import { QUEST_BAND_HEIGHT, QUEST_BAND_LAYOUT, clampQuestBandText } from "./questBandLayout";

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
        fontSize: "8px",
        color: PALETTE.creamPaper,
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(21001)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private createQuestBand() {
    const layout = QUEST_BAND_LAYOUT;
    this.questBandGraphics = this.add.graphics()
      .setDepth(20400)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandText = this.add.text(layout.objective.x, layout.objective.y, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper,
      fixedWidth: layout.objective.width
    })
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandToolText = this.add.text(layout.toolLabel.right, layout.toolLabel.y, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp,
      align: "right",
      fixedWidth: layout.toolLabel.width
    })
      .setOrigin(1, 0)
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandVerbText = this.add.text(
      layout.actionBadge.x + Math.floor(layout.actionBadge.width / 2),
      layout.actionBadge.y,
      "",
      {
        fontFamily: "monospace",
        fontSize: "8px",
        color: PALETTE.black,
        align: "center"
      }
    )
      .setName("quest-band-verb-text")
      .setOrigin(0.5, 0)
      .setDepth(20403)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandCueText = this.add.text(layout.actionCue.x, layout.actionCue.y, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      fixedWidth: layout.actionCue.width
    })
      .setName("quest-band-cue-text")
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private refreshQuestBand(now: number, activeSceneKey: string | null) {
    const visible = this.shouldShowQuestBand(activeSceneKey);
    this.questBandGraphics.setVisible(visible);
    this.questBandText.setVisible(visible);
    this.questBandToolText.setVisible(visible);
    this.questBandVerbText.setVisible(visible);
    this.questBandCueText.setVisible(visible);
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
    this.questBandText.setText(clampQuestBandText(objectiveLine, QUEST_BAND_LAYOUT.objective.maxChars));
    this.questBandVerbText.setText(getPrimaryActionBadge());
    this.questBandCueText.setText(clampQuestBandText(actionLine, QUEST_BAND_LAYOUT.actionCue.maxChars));
    this.questBandCueText.setColor(riskLine ? PALETTE.classNetRed : PALETTE.terminalCyan);
    this.questBandToolText.setText(clampQuestBandText(
      getString("hud.toolLabel", { label: toolLabel }),
      QUEST_BAND_LAYOUT.toolLabel.maxChars
    ));
  }

  private compactObjective(activeSceneKey: string | null) {
    if (gameState.mode === "dialog") return getString("hud.readLine");
    if (gameState.mode === "choice") return getString("hud.chooseAnswer");
    if (gameState.heldItem) return getString("hud.carryItem", { item: gameState.heldItem });
    if (activeSceneKey === "OfficeScene" && !gameState.sceneProgress.juniorCompilerIntroduced) {
      return getString("hud.talkJuniorCompiler");
    }
    const objective = gameState.objective.replace(/^Mission:\s*/i, "");
    const firstSentence = objective.split(".")[0]?.trim() || objective.trim();
    return firstSentence;
  }

  private compactReliabilityRiskLine() {
    const hardestThreat = gameState.visibleThreats
      .filter((threat) => (threat.hp ?? 0) > 0 && threat.enemyState !== "defeated" && (threat.difficultyTier ?? 0) >= 4)
      .sort((left, right) => (right.difficultyTier ?? 0) - (left.difficultyTier ?? 0))[0];
    if (!hardestThreat) return null;
    const risk = (hardestThreat.reliabilityRisk ?? "high").toUpperCase();
    return `RELIABILITY RISK: ${risk}`;
  }

  private compactActionLine(toolLabel: string) {
    if (gameState.mode === "dialog") return getString("hud.nextLine");
    if (gameState.mode === "choice") return getString("hud.confirm");
    if (gameState.currentScene === "OfficeScene" && !gameState.sceneProgress.juniorCompilerIntroduced) {
      return getString("hud.goLeftTalk");
    }
    if (gameState.nearestInteractable) return getString("hud.interact", { label: gameState.nearestInteractable.toUpperCase().slice(0, 22) });
    if (gameState.currentScene === "GuideScene") {
      const stage = getGuideCavernStage(
        hasProcessItem("citation_stamp"),
        gameState.volumeFragments.includes("Front Matter Fragment")
      );
      return guideCavernActionCue(stage);
    }
    if (toolLabel !== getString("hud.none")) return getString("hud.useTool", { tool: toolLabel });
    return getString("hud.findGlowing");
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
    g.fillStyle(color(PALETTE.black), 0.96);
    g.fillRect(0, 0, GAME_WIDTH, QUEST_BAND_HEIGHT);
    g.fillStyle(color(PALETTE.deepRuby), 0.86);
    g.fillRect(0, QUEST_BAND_LAYOUT.actionBadge.y - 1, GAME_WIDTH, 9);
    g.fillStyle(color(PALETTE.goldStamp), 1);
    g.fillRect(0, 0, GAME_WIDTH, 1);
    g.fillRect(0, QUEST_BAND_HEIGHT - 1, GAME_WIDTH, 1);
    g.fillStyle(color(PALETTE.black), 0.72);
    g.fillRect(0, QUEST_BAND_LAYOUT.actionBadge.y, GAME_WIDTH, 7);
    for (let index = 0; index < totalHearts; index += 1) {
      const column = index % QUEST_BAND_LAYOUT.hearts.columns;
      const row = Math.floor(index / QUEST_BAND_LAYOUT.hearts.columns);
      const x = QUEST_BAND_LAYOUT.hearts.x + column * QUEST_BAND_LAYOUT.hearts.gap;
      const y = QUEST_BAND_LAYOUT.hearts.y + row * QUEST_BAND_LAYOUT.hearts.gap;
      this.drawQuestHeart(index, x, y, index < filledHearts);
    }
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
    if (isColorblindModeEnabled()) {
      g.fillStyle(color(PALETTE.creamPaper), filled ? 1 : 0.72);
      g.fillRect(x + 1, y + 2, 1, 1);
      g.fillRect(x + 3, y + 3, 1, 1);
      g.fillRect(x + 4, y + 2, 1, 1);
    }
  }

  private drawQuestBandVolumeAssembly(readout: VolumeAssemblyReadout) {
    const g = this.questBandGraphics;
    const clampedTotal = Math.max(1, Math.min(5, readout.total));
    const filled = Math.max(0, Math.min(clampedTotal, readout.earnedCount));
    const { x, y, width, height } = QUEST_BAND_LAYOUT.assembly;
    g.fillStyle(color(PALETTE.black), 0.9);
    g.fillRect(x, y, width, height);
    g.lineStyle(1, color(filled >= clampedTotal ? PALETTE.goldStamp : PALETTE.stoneGray), 0.95);
    g.strokeRect(x, y, width, height);
    const segmentWidth = 6;
    const segmentGap = 2;
    for (let index = 0; index < clampedTotal; index += 1) {
      const pieceX = x + 2 + index * (segmentWidth + segmentGap);
      const earned = index < filled;
      g.fillStyle(color(earned ? PALETTE.goldStamp : PALETTE.stoneDark), earned ? 1 : 0.76);
      g.fillRect(pieceX, y + 2, segmentWidth, 3);
      if (earned) {
        g.fillStyle(color(PALETTE.creamPaper), 1);
        g.fillRect(pieceX + 1, y + 2, 1, 1);
      }
    }
  }

  private drawQuestBandToolSlot(acquired: boolean, cooldownRatio = 0, phase: string = "idle") {
    const g = this.questBandGraphics;
    const { x, y, size } = QUEST_BAND_LAYOUT.toolIcon;
    g.lineStyle(1, color(acquired ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
    g.fillStyle(color(acquired ? PALETTE.deepRuby : PALETTE.black), 0.95);
    g.fillRect(x, y, size, size);
    g.strokeRect(x, y, size, size);
    g.fillStyle(color(acquired ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
    g.fillRect(x + 2, y + 2, 6, 2);
    g.fillRect(x + 4, y + 4, 2, 4);
    if (acquired && cooldownRatio > 0) {
      const barHeight = Math.max(1, Math.round(6 * cooldownRatio));
      g.fillStyle(color(PALETTE.black), 0.74);
      g.fillRect(x + size - 2, y + 1, 1, size - 2);
      g.fillStyle(color(phase === "active" ? PALETTE.terminalCyan : PALETTE.classNetRed), 0.95);
      g.fillRect(x + size - 2, y + size - 1 - barHeight, 1, barHeight);
    } else if (acquired) {
      g.fillStyle(color(PALETTE.terminalCyan), 0.9);
      g.fillRect(x + size - 2, y + size - 2, 1, 1);
    }
  }

  private drawQuestBandActionBadge() {
    const g = this.questBandGraphics;
    const accent = gameState.nearestInteractable ? PALETTE.goldStamp : PALETTE.terminalCyan;
    const { x, y, width, height } = QUEST_BAND_LAYOUT.actionBadge;
    g.fillStyle(color(accent), 0.95);
    g.fillRect(x, y, width, height);
    g.lineStyle(1, color(PALETTE.goldStamp), 1);
    g.strokeRect(x, y, width, height);
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
