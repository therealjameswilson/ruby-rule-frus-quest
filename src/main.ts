import Phaser from "phaser";
import "./styles/pixel.css";
import { gameConfig } from "./game/config";
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

new Phaser.Game(gameConfig);
