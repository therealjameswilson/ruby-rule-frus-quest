import type Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";

/** Rendering density is independent of the campaign's logical coordinate space. */
export const RENDER_DENSITY = 3;

export function configureLogicalCameras(game: Phaser.Game) {
  for (const scene of game.scene.getScenes(true)) {
    for (const camera of scene.cameras.cameras) {
      camera.setOrigin(0, 0);
      camera.setViewport(0, 0, GAME_WIDTH * RENDER_DENSITY, GAME_HEIGHT * RENDER_DENSITY);
      camera.setZoom(RENDER_DENSITY);
      camera.roundPixels = false;
    }
  }
}

export function installRenderDensity(game: Phaser.Game) {
  const prepared = new WeakSet<Phaser.GameObjects.GameObject>();
  const prepareObject = (object: Phaser.GameObjects.GameObject) => {
    if (!prepared.has(object)) {
      if (object.type === "Text") (object as Phaser.GameObjects.Text).setResolution(RENDER_DENSITY);
      prepared.add(object);
    }
    if (object.type === "Container") (object as Phaser.GameObjects.Container).list.forEach(prepareObject);
  };
  const prepare = () => {
    configureLogicalCameras(game);
    for (const scene of game.scene.getScenes(true)) scene.children.list.forEach(prepareObject);
  };
  game.events.on("prerender", prepare);
  game.events.once("destroy", () => game.events.off("prerender", prepare));
}
