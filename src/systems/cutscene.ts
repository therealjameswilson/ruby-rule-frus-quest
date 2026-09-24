import { presentationPanel, PANEL_COLORS } from "./presentationPanel";
import { prefersReducedMotion } from "./motionPreferences";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { clearDialogState, setDialogState, setGameMode, setLatestMessage } from "../game/state";
import { isTouchInputCapable } from "../input/InputState";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface CutsceneController {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  topBar: Phaser.GameObjects.GameObject & { y: number };
  bottomBar: Phaser.GameObjects.GameObject & { y: number };
  textFrame: Phaser.GameObjects.Container;
  lineText: Phaser.GameObjects.Text;
  portrait?: Phaser.GameObjects.Image;
  dialogueOffset: number;
}

const controllers = new WeakMap<Phaser.Scene, CutsceneController>();

type TweenPropsWithoutTargets = Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">;

function tweenTo(scene: Phaser.Scene, targets: Phaser.GameObjects.GameObject[], props: TweenPropsWithoutTargets) {
  return new Promise<void>((resolve) => {
    scene.tweens.add({
      ...props,
      targets,
      onComplete: () => resolve()
    });
  });
}

function controllerFor(scene: Phaser.Scene) {
  return controllers.get(scene);
}

function makeController(scene: Phaser.Scene) {
  const dialogueOffset = isTouchInputCapable() ? 64 : 0;
  const topBar = scene.add.rectangle(GAME_WIDTH / 2, -24, GAME_WIDTH, 16, color(PALETTE.black))
    .setDepth(1600).setScrollFactor(0);
  const bottomBar = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 24, GAME_WIDTH, 48, color(PALETTE.black))
    .setDepth(1600).setScrollFactor(0);
  const frame = presentationPanel(scene, 8, GAME_HEIGHT - 56 - dialogueOffset, GAME_WIDTH - 16, 48);
  const frameContainer = scene.add.container(0, 0, frame.objects).setDepth(1610).setVisible(false).setScrollFactor(0);
  const lineText = scene.add.text(52, GAME_HEIGHT - 46 - dialogueOffset, "", {
    fontFamily: "Arial",
    fontSize: "9px",
    color: PANEL_COLORS.text,
    wordWrap: { width: GAME_WIDTH - 72, useAdvancedWrap: true },
    lineSpacing: 1
  }).setDepth(1611).setVisible(false).setScrollFactor(0);
  const container = scene.add.container(0, 0, [topBar, bottomBar, frameContainer, lineText])
    .setDepth(1600)
    .setScrollFactor(0);
  const controller: CutsceneController = { scene, container, topBar, bottomBar, textFrame: frameContainer, lineText, dialogueOffset };
  controllers.set(scene, controller);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    controllers.delete(scene);
  });
  return controller;
}

export function isCutsceneActive(scene: Phaser.Scene) {
  return Boolean(controllerFor(scene)?.container.visible);
}

export async function enterCutscene(scene: Phaser.Scene) {
  const controller = controllerFor(scene) ?? makeController(scene);
  controller.container.setVisible(true);
  setGameMode("dialog");
  setLatestMessage("Cutscene mode entered.");
  await tweenTo(scene, [controller.topBar, controller.bottomBar], {
    y: (target: Phaser.GameObjects.GameObject) => target === controller.topBar ? 32 : GAME_HEIGHT - 24,
    duration: prefersReducedMotion() ? 0 : 220,
    ease: "Cubic.easeOut"
  });
}

export async function exitCutscene(scene: Phaser.Scene) {
  const controller = controllerFor(scene);
  if (!controller) return;
  await tweenTo(scene, [controller.topBar, controller.bottomBar], {
    y: (target: Phaser.GameObjects.GameObject) => target === controller.topBar ? -24 : GAME_HEIGHT + 24,
    duration: prefersReducedMotion() ? 0 : 180,
    ease: "Cubic.easeIn"
  });
  controller.textFrame.setVisible(false);
  controller.lineText.setVisible(false);
  controller.portrait?.setVisible(false);
  controller.container.setVisible(false);
  clearDialogState();
  setLatestMessage("Cutscene mode exited.");
}

export function playLine(scene: Phaser.Scene, text: string, portraitKey?: string) {
  const controller = controllerFor(scene) ?? makeController(scene);
  controller.textFrame.setVisible(true);
  controller.lineText.setText(text).setVisible(true);
  if (portraitKey && scene.textures.exists(portraitKey)) {
    if (!controller.portrait) {
      controller.portrait = scene.add.image(32, GAME_HEIGHT - 32 - controller.dialogueOffset, portraitKey)
        .setDepth(1612)
        .setScrollFactor(0);
      controller.container.add(controller.portrait);
    }
    const source = scene.textures.get(portraitKey).getSourceImage() as { width?: number; height?: number };
    const scale = Math.min(24 / Math.max(1, source.width ?? 1024), 24 / Math.max(1, source.height ?? 1024));
    controller.portrait.setTexture(portraitKey).setScale(scale).setVisible(true);
  } else {
    controller.portrait?.setVisible(false);
  }
  setDialogState("CUTSCENE", text);
  setLatestMessage(text);
}

export function drawCutsceneDebugNote(scene: Phaser.Scene) {
  scene.add.text(GAME_WIDTH - 5, 58, "H CUTSCENE  J EXIT  B HUD", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    backgroundColor: PALETTE.black
  }).setOrigin(1, 0).setDepth(1700).setScrollFactor(0);
  scene.add.rectangle(GAME_WIDTH - 46, 55, 86, 1, color(PALETTE.goldStamp)).setDepth(1699).setScrollFactor(0);
}
