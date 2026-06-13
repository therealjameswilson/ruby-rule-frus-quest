import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class TrueEndingScene extends Phaser.Scene {
  constructor() {
    super("TrueEndingScene");
  }

  create() {
    setSceneState("TrueEndingScene", "ending", "True ending placeholder after the DANN-E Ascendant phase.");
    setVisibleEntities(["Bound FRUS Volume", "Complete Treaty Record", "DANN-E Ascendant Cleared"]);
    setVisibleThreats([]);
    setLatestMessage("True ending reached.");
    retroAudio.startMusic("EndingScene");
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.creamPaper));
    this.add.rectangle(GAME_WIDTH / 2, 34, GAME_WIDTH - 34, 32, color(PALETTE.deepRuby))
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(GAME_WIDTH / 2, 25, "TRUE ENDING", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 83, "TRUE ENDING — TO BE WRITTEN", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.deepRuby,
      align: "center",
      wordWrap: { width: GAME_WIDTH - 48, useAdvancedWrap: true }
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 122, [
      "The complete treaty fragments survived the automated queue.",
      "Human review, provenance, and publication judgment remain in charge."
    ], {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.black,
      align: "center",
      wordWrap: { width: GAME_WIDTH - 46, useAdvancedWrap: true },
      lineSpacing: 4
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 34, "PRESS A TO RETURN TO TITLE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5);
  }

  update() {
    tickInput();
    const input = getInput();
    if (input.aJustPressed || input.startJustPressed) {
      transitionTo(this, "TitleScene");
    }
  }
}
