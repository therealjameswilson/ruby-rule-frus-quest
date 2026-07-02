import Phaser from "phaser";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import {
  SNES_COVER_FRAGMENT_RELIC_ASSET,
  SNES_EQUITY_CRYSTAL_RELIC_ASSET,
  SNES_RESEARCH_PENDANT_RELIC_ASSET,
  SNES_ROOM_MAP_MARKER_ASSET
} from "../game/snesAtlas";
import { gameState, getAdventureHudReadout, getAdventureSubscreenReadout, getAdventureTrainingReadout } from "../game/state";
import { addGamepadConnectionListener, getInput, updateInputCallbacks } from "../input/InputState";
import { TouchControls } from "../input/TouchControls";
import { openCodex } from "../systems/codexOverlay";
import { applyIntegerZoom } from "../systems/pixelPerfect";
import { questBandCoverFragmentSlots, questBandCrystalSlots, questBandCueLine, questBandVerbCode } from "./questBandCue";

type RoomMapMarkerFrameName = (typeof SNES_ROOM_MAP_MARKER_ASSET.frames)[number];

function roomMapFrameName(roomType: string, current: boolean, visited: boolean): RoomMapMarkerFrameName {
  if (current) return "current";
  if (roomType === "boss") return "boss";
  if (roomType === "reward") return "reward";
  return visited ? "visited" : "locked";
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
  private questBandRoomMapMarkers: Phaser.GameObjects.Image[] = [];
  private questBandSignature = "";
  private questBandLastRefresh = 0;

  constructor() {
    super("UIScene");
  }

  create() {
    this.controls = new TouchControls(this);
    this.createQuestBand();
    this.createGamepadToast();
    this.removeGamepadListener = addGamepadConnectionListener((connected) => {
      this.controls.setGamepadSuppressed(connected);
      this.showGamepadToast(connected ? "CONTROLLER CONNECTED" : "TOUCH CONTROLS READY");
    });
    updateInputCallbacks({
      toggleTouchOverlay: () => {
        this.controls.setForceVisible(!this.controls.isForceVisible);
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeGamepadListener?.();
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
    this.questBandText = this.add.text(5, 13, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    })
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandToolText = this.add.text(GAME_WIDTH - 4, 13, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "right"
    })
      .setOrigin(1, 0)
      .setDepth(20401)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandVerbText = this.add.text(6, 23, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black,
      align: "center"
    })
      .setName("quest-band-verb-text")
      .setDepth(20402)
      .setScrollFactor(0)
      .setVisible(false);
    this.questBandCueText = this.add.text(35, 23, "", {
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
    this.questBandVolumeText.setVisible(visible);
    this.questBandPendantRelics.forEach((relic) => relic.setVisible(visible));
    if (!visible) {
      this.questBandCrystalRelics.forEach((relic) => relic.setVisible(false));
      this.questBandCoverFragmentRelics.forEach((relic) => relic.setVisible(false));
    }
    if (!visible) return;

    const hud = getAdventureHudReadout();
    const subscreen = getAdventureSubscreenReadout();
    const trainingCue = getAdventureTrainingReadout();
    this.syncQuestBandCrystalRelics(subscreen.crystals.earned, subscreen.crystals.total);
    this.syncQuestBandCoverFragmentRelics(hud.fragments.current, hud.fragments.total);
    if (now - this.questBandLastRefresh < 120) return;
    this.questBandLastRefresh = now;

    const activePhase = subscreen.productionBoard.activePhase;
    const phaseLabel = activePhase
      ? `${activePhase.shortLabel} ${activePhase.completed}/${activePhase.total}`
      : "DONE";
    const toolLabel = subscreen.equippedTool?.shortLabel ?? hud.equippedItem?.shortLabel ?? "NONE";
    const signature = [
      gameState.reliability,
      subscreen.pendants.map((pendant) => pendant.acquired ? "1" : "0").join(""),
      `${subscreen.crystals.earned}/${subscreen.crystals.total}`,
      toolLabel,
      hud.stamps,
      `${hud.fragments.current}/${hud.fragments.total}`,
      phaseLabel,
      hud.documentPoints,
      trainingCue.verb,
      trainingCue.text,
      trainingCue.drillId,
      subscreen.roomMap.currentAreaId,
      subscreen.roomMap.currentRoomId ?? "--",
      subscreen.roomMap.rooms
        .map((room) => `${room.id}:${room.visited ? "v" : ""}${room.revealed ? "r" : ""}`)
        .join(","),
      subscreen.dungeons
        .map((dungeon) => `${dungeon.areaId}:${dungeon.smallKeys}/${dungeon.smallKeysRequired}:${dungeon.bigKeyHeld ? "b" : ""}:${dungeon.mapRevealed ? "m" : ""}`)
        .join(",")
    ].join("|");
    if (signature === this.questBandSignature) return;
    this.questBandSignature = signature;

    this.questBandGraphics.clear();
    this.drawQuestBandChrome(subscreen.reliabilityHearts.filled, subscreen.reliabilityHearts.total);
    this.drawQuestBandPendants(subscreen.pendants.map((pendant) => pendant.acquired));
    this.drawQuestBandCrystals(subscreen.crystals.earned, subscreen.crystals.total);
    this.drawQuestBandRoomMap(subscreen.roomMap);
    this.drawQuestBandKeyStatus(subscreen.dungeons);
    this.drawQuestBandVolumeAssembly(hud.fragments.current, hud.fragments.total);
    this.drawQuestBandToolSlot(Boolean(subscreen.equippedTool ?? hud.equippedItem));
    this.drawQuestBandVerbBadge(trainingCue.verb);
    this.questBandText.setText(`PH ${phaseLabel}  DP ${hud.documentPoints}`);
    this.questBandVerbText.setText(questBandVerbCode(trainingCue.verb));
    this.questBandCueText.setText(questBandCueLine(trainingCue));
    this.questBandToolText.setText(`TOOL ${toolLabel}`);
    this.questBandVolumeText.setText(`VOL ${hud.fragments.current}/${hud.fragments.total}`);
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
    g.fillStyle(color(PALETTE.black), 0.82);
    g.fillRect(0, 0, GAME_WIDTH, 30);
    g.fillStyle(color(PALETTE.deepRuby), 0.78);
    g.fillRect(0, 20, GAME_WIDTH, 10);
    g.fillStyle(color(PALETTE.goldStamp), 1);
    g.fillRect(0, 21, GAME_WIDTH, 1);
    g.fillStyle(color(PALETTE.black), 0.72);
    g.fillRect(0, 22, GAME_WIDTH, 8);
    for (let index = 0; index < totalHearts; index += 1) {
      this.drawQuestHeart(5 + index * 7, 3, index < filledHearts);
    }
  }

  private drawQuestHeart(x: number, y: number, filled: boolean) {
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

  private drawQuestBandVolumeAssembly(current: number, total: number) {
    const g = this.questBandGraphics;
    const clampedTotal = Math.max(1, total);
    const filled = Math.max(0, Math.min(clampedTotal, current));
    const x = 178;
    const y = 4;
    const hasCoverFragmentSprites = this.questBandCoverFragmentRelics.length >= SNES_COVER_FRAGMENT_RELIC_ASSET.frames.length;
    this.syncQuestBandCoverFragmentRelics(current, total);
    g.fillStyle(color(PALETTE.black), 0.9);
    g.fillRect(x - 2, y - 1, 17, 14);
    g.lineStyle(1, color(filled >= clampedTotal ? PALETTE.goldStamp : PALETTE.stoneGray), 0.95);
    g.strokeRect(x - 2, y - 1, 17, 14);
    g.fillStyle(color(PALETTE.deepRuby), 1);
    g.fillRect(x, y + 1, 13, 10);
    g.fillStyle(color(PALETTE.buckramRed), 1);
    g.fillRect(x + 2, y + 2, 1, 8);
    g.fillStyle(color(PALETTE.goldStamp), 1);
    g.fillRect(x + 10, y + 1, 2, 10);
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

  private drawQuestBandToolSlot(acquired: boolean) {
    const g = this.questBandGraphics;
    const x = GAME_WIDTH - 48;
    g.lineStyle(1, color(acquired ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
    g.fillStyle(color(acquired ? PALETTE.deepRuby : PALETTE.black), 0.95);
    g.fillRect(x, 3, 14, 14);
    g.strokeRect(x, 3, 14, 14);
    g.fillStyle(color(acquired ? PALETTE.goldStamp : PALETTE.stoneGray), 1);
    g.fillRect(x + 4, 6, 6, 2);
    g.fillRect(x + 6, 8, 2, 5);
  }

  private drawQuestBandVerbBadge(verb: ReturnType<typeof getAdventureTrainingReadout>["verb"]) {
    const g = this.questBandGraphics;
    const accent = this.questBandVerbAccent(verb);
    g.fillStyle(color(PALETTE.black), 0.98);
    g.fillRect(3, 22, 29, 8);
    g.lineStyle(1, color(accent), 1);
    g.strokeRect(3, 22, 29, 8);
    g.fillStyle(color(accent), 0.95);
    g.fillRect(4, 23, 27, 6);
  }

  private questBandVerbAccent(verb: ReturnType<typeof getAdventureTrainingReadout>["verb"]) {
    if (verb === "UNLOCK" || verb === "BOSS") return PALETTE.classNetRed;
    if (verb === "KEY" || verb === "RETURN") return PALETTE.goldStamp;
    if (verb === "MAP" || verb === "ACT") return PALETTE.terminalCyan;
    if (verb === "READ" || verb === "CHOOSE") return PALETTE.creamPaper;
    return PALETTE.openNetGreen;
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
