import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { ArchiveScene } from "../scenes/ArchiveScene";
import { BootScene } from "../scenes/BootScene";
import { CharacterCreateScene } from "../scenes/CharacterCreateScene";
import { EndingScene } from "../scenes/EndingScene";
import { NetworkScene } from "../scenes/NetworkScene";
import { OfficeScene } from "../scenes/OfficeScene";
import { ReferralVaultScene } from "../scenes/ReferralVaultScene";
import { SilentReadScene } from "../scenes/SilentReadScene";
import { TitleScene } from "../scenes/TitleScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: "game-shell",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  zoom: 3,
  backgroundColor: "#101820",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    TitleScene,
    CharacterCreateScene,
    OfficeScene,
    ArchiveScene,
    NetworkScene,
    ReferralVaultScene,
    SilentReadScene,
    EndingScene
  ]
};
