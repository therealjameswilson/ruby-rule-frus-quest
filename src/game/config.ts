import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./constants";
import { ArchiveScene } from "../scenes/ArchiveScene";
import { BootScene } from "../scenes/BootScene";
import { CharacterCreateScene } from "../scenes/CharacterCreateScene";
import { EndingScene } from "../scenes/EndingScene";
import { GuideScene } from "../scenes/GuideScene";
import { NetworkScene } from "../scenes/NetworkScene";
import { OfficeScene } from "../scenes/OfficeScene";
import { ReferralVaultScene } from "../scenes/ReferralVaultScene";
import { RenderDebugScene } from "../scenes/RenderDebugScene";
import { SilentReadScene } from "../scenes/SilentReadScene";
import { SpriteGallery } from "../scenes/SpriteGallery";
import { TapToStartScene } from "../scenes/TapToStartScene";
import { TitleScene } from "../scenes/TitleScene";
import { UIScene } from "../scenes/UIScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: "game-shell",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  zoom: 3,
  backgroundColor: PALETTE.shadowNavy,
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
    powerPreference: "high-performance"
  },
  input: {
    activePointers: 4
  },
  scale: {
    parent: "game-shell",
    mode: Phaser.Scale.FIT,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true
  },
  scene: [
    BootScene,
    TapToStartScene,
    TitleScene,
    CharacterCreateScene,
    GuideScene,
    OfficeScene,
    ArchiveScene,
    NetworkScene,
    ReferralVaultScene,
    SilentReadScene,
    EndingScene,
    RenderDebugScene,
    SpriteGallery,
    UIScene
  ]
};
