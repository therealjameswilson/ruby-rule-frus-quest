import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class BadEndingScene extends Phaser.Scene {
  constructor() {
    super("BadEndingScene");
  }

  create() {
    setSceneState("BadEndingScene", "ending", "Bad ending: DANN-E concealed material defects.");
    setVisibleEntities(["DANN-E Shortcut", "Concealed Policy Defect", "Rejected FRUS Volume"]);
    setVisibleThreats([]);
    setLatestMessage("Bad ending reached: DANN-E shortcut concealed material defects.");
    retroAudio.startMusic("EndingScene");

    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black));
    this.add.rectangle(GAME_WIDTH / 2, 36, GAME_WIDTH - 36, 36, color(PALETTE.deepRuby))
      .setStrokeStyle(2, color(PALETTE.classNetRed));
    this.add.text(GAME_WIDTH / 2, 25, "BAD ENDING", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: PALETTE.classNetRed
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 74, "SHORTCUT ACCEPTED", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 104, [
      "DANN-E rushed the volume through the clock.",
      "Contested material was omitted to hide a policy defect.",
      "The record cannot be certified under the Kellogg standards."
    ], {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      align: "center",
      wordWrap: { width: GAME_WIDTH - 42, useAdvancedWrap: true },
      lineSpacing: 4
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 34, "PRESS A TO RETURN TO TITLE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
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
