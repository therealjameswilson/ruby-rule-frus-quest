import Phaser from "phaser";
import "./styles/pixel.css";
import { gameConfig } from "./game/config";
import { GAME_HEIGHT, GAME_WIDTH } from "./game/constants";
import { renderGameToText } from "./game/state";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });

function configureIntegerGameShellScale() {
  const shell = document.getElementById("game-shell");
  if (!shell) return;
  const rawScale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  const scale = rawScale >= 1 ? Math.max(1, Math.floor(rawScale)) : rawScale;
  shell.style.width = `${Math.max(1, Math.floor(GAME_WIDTH * scale))}px`;
  shell.style.height = `${Math.max(1, Math.floor(GAME_HEIGHT * scale))}px`;
  shell.dataset.scale = scale.toFixed(3);
  shell.dataset.integerScale = Number.isInteger(scale) ? "true" : "false";
}

configureIntegerGameShellScale();
window.addEventListener("resize", configureIntegerGameShellScale);

new Phaser.Game(gameConfig);
