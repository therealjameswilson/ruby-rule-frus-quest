import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import {
  WORLD_HUD_HEIGHT,
  WORLD_SCREEN_HEIGHT,
  WORLD_SCREEN_WIDTH
} from "../game/world";
import type { WorldScreenDefinition } from "../game/world";
import { snapPixel } from "./pixelPerfect";

export const CAMERA_TRANSITION_COMPLETE = "camera-transition-complete";

export type CameraTransitionMode = "hard" | "pan";
export type CameraTransitionState = "idle" | "hard" | "pan";

export interface CameraReadout {
  logicalResolution: { width: number; height: number };
  canvasResolution: { width: number; height: number };
  viewport: { x: number; y: number; width: number; height: number };
  scroll: { x: number; y: number };
  currentScreenId: string;
  currentRegionName: string;
  transitionMode: CameraTransitionMode;
  transitionState: CameraTransitionState;
  isTransitioning: boolean;
  debugVisible: boolean;
  pixelPerfect: {
    pixelArt: true;
    antialias: false;
    nearestNeighbor: true;
    roundPixels: true;
    subpixelScroll: false;
  };
}

interface TransitionRequest {
  direction: Direction;
  fromScreenId: string;
  toScreenId: string;
  toRegionName: string;
  onPreparePan?: () => void;
  onCommit: () => void;
  onCleanup?: () => void;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function transitionOffset(direction: Direction) {
  if (direction === "east") return { x: WORLD_SCREEN_WIDTH, y: 0 };
  if (direction === "west") return { x: -WORLD_SCREEN_WIDTH, y: 0 };
  if (direction === "south") return { x: 0, y: WORLD_SCREEN_HEIGHT };
  return { x: 0, y: -WORLD_SCREEN_HEIGHT };
}

export class CameraController {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly gridGraphics: Phaser.GameObjects.Graphics;
  private readonly debugLabel: Phaser.GameObjects.Text;
  private mode: CameraTransitionMode;
  private transitionState: CameraTransitionState = "idle";
  private debugVisible = false;
  private currentScreenId = "";
  private currentRegionName = "";
  private collisionSolids: Phaser.Geom.Rectangle[] = [];

  constructor(scene: Phaser.Scene, mode: CameraTransitionMode = "hard") {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.mode = mode;
    this.camera.setRoundPixels(true);
    this.camera.setBackgroundColor(PALETTE.creamPaper);
    this.gridGraphics = scene.add.graphics().setDepth(4800).setScrollFactor(0).setVisible(false);
    this.debugLabel = scene.add.text(4, WORLD_HUD_HEIGHT + 3, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black
    }).setScrollFactor(0).setDepth(4801).setVisible(false);
    this.clampToCurrentScreen();
  }

  get isTransitioning() {
    return this.transitionState !== "idle";
  }

  get transitionMode() {
    return this.mode;
  }

  configureForScreen(screen: WorldScreenDefinition, solids: Phaser.Geom.Rectangle[]) {
    this.currentScreenId = screen.id;
    this.currentRegionName = screen.regionName;
    this.collisionSolids = solids;
    this.clampToCurrentScreen();
    this.refreshDebugOverlay();
  }

  clampToCurrentScreen() {
    this.camera.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.setCameraScroll(0, 0);
  }

  toggleDebug() {
    this.debugVisible = !this.debugVisible;
    this.refreshDebugOverlay();
    return this.debugVisible;
  }

  toggleMode() {
    this.mode = this.mode === "hard" ? "pan" : "hard";
    return this.mode;
  }

  setMode(mode: CameraTransitionMode) {
    this.mode = mode;
  }

  startTransition(request: TransitionRequest) {
    if (this.isTransitioning) return false;
    if (this.mode === "pan") this.startPanTransition(request);
    else this.startHardTransition(request);
    return true;
  }

  getReadout(): CameraReadout {
    return {
      logicalResolution: { width: WORLD_SCREEN_WIDTH, height: WORLD_SCREEN_HEIGHT },
      canvasResolution: { width: GAME_WIDTH, height: GAME_HEIGHT },
      viewport: { x: 0, y: WORLD_HUD_HEIGHT, width: WORLD_SCREEN_WIDTH, height: WORLD_SCREEN_HEIGHT },
      scroll: { x: Math.round(this.camera.scrollX), y: Math.round(this.camera.scrollY) },
      currentScreenId: this.currentScreenId,
      currentRegionName: this.currentRegionName,
      transitionMode: this.mode,
      transitionState: this.transitionState,
      isTransitioning: this.isTransitioning,
      debugVisible: this.debugVisible,
      pixelPerfect: {
        pixelArt: true,
        antialias: false,
        nearestNeighbor: true,
        roundPixels: true,
        subpixelScroll: false
      }
    };
  }

  private startHardTransition(request: TransitionRequest) {
    this.transitionState = "hard";
    const overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black), 0)
      .setDepth(5000)
      .setScrollFactor(0);
    this.scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 90,
      ease: "Stepped",
      onComplete: () => {
        request.onCommit();
        this.scene.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: 90,
          ease: "Stepped",
          onComplete: () => {
            overlay.destroy();
            request.onCleanup?.();
            this.finishTransition(request);
          }
        });
      }
    });
  }

  private startPanTransition(request: TransitionRequest) {
    this.transitionState = "pan";
    request.onPreparePan?.();
    const offset = transitionOffset(request.direction);
    this.camera.setBounds(
      Math.min(0, offset.x),
      Math.min(0, offset.y),
      GAME_WIDTH + Math.abs(offset.x),
      GAME_HEIGHT + Math.abs(offset.y)
    );
    const pan = { x: 0, y: 0 };
    this.scene.tweens.add({
      targets: pan,
      x: offset.x,
      y: offset.y,
      duration: 260,
      ease: "Linear",
      onUpdate: () => this.setCameraScroll(pan.x, pan.y),
      onComplete: () => {
        request.onCommit();
        request.onCleanup?.();
        this.clampToCurrentScreen();
        this.finishTransition(request);
      }
    });
  }

  private finishTransition(request: TransitionRequest) {
    this.transitionState = "idle";
    this.clampToCurrentScreen();
    this.refreshDebugOverlay();
    this.scene.events.emit(CAMERA_TRANSITION_COMPLETE, {
      direction: request.direction,
      fromScreenId: request.fromScreenId,
      toScreenId: request.toScreenId,
      toRegionName: request.toRegionName,
      mode: this.mode
    });
  }

  private setCameraScroll(x: number, y: number) {
    this.camera.setScroll(snapPixel(x), snapPixel(y));
  }

  private refreshDebugOverlay() {
    this.gridGraphics.clear();
    this.gridGraphics.setVisible(this.debugVisible);
    this.debugLabel.setVisible(this.debugVisible);
    if (!this.debugVisible) return;

    this.gridGraphics.lineStyle(1, color(PALETTE.terminalCyan), 1);
    for (let x = 0; x <= WORLD_SCREEN_WIDTH; x += 16) {
      this.gridGraphics.lineBetween(x, WORLD_HUD_HEIGHT, x, WORLD_HUD_HEIGHT + WORLD_SCREEN_HEIGHT);
    }
    for (let y = WORLD_HUD_HEIGHT; y <= WORLD_HUD_HEIGHT + WORLD_SCREEN_HEIGHT; y += 16) {
      this.gridGraphics.lineBetween(0, y, WORLD_SCREEN_WIDTH, y);
    }

    this.gridGraphics.lineStyle(1, color(PALETTE.classNetRed), 1);
    for (const solid of this.collisionSolids) {
      this.gridGraphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
    }

    this.debugLabel.setText([
      `${this.currentScreenId.toUpperCase()} ${this.currentRegionName.toUpperCase()}`,
      `CAM ${this.mode.toUpperCase()} ${this.transitionState.toUpperCase()}`,
      `VIEW ${WORLD_SCREEN_WIDTH}x${WORLD_SCREEN_HEIGHT} HUD ${WORLD_HUD_HEIGHT}`
    ]);
  }
}
