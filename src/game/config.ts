import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./constants";
import { ArchiveScene } from "../scenes/ArchiveScene";
import { BlackVaultLairScene } from "../scenes/BlackVaultLairScene";
import { BootScene } from "../scenes/BootScene";
import { CharacterCreateScene } from "../scenes/CharacterCreateScene";
import { CherryBlossomGardenScene } from "../scenes/CherryBlossomGardenScene";
import { DanneGallery } from "../scenes/DanneGallery";
import { EmbassyCableRoomScene } from "../scenes/EmbassyCableRoomScene";
import { EndingScene } from "../scenes/EndingScene";
import { GuideScene } from "../scenes/GuideScene";
import { NaraStacksScene } from "../scenes/NaraStacksScene";
import { NetworkScene } from "../scenes/NetworkScene";
import { OfficeScene } from "../scenes/OfficeScene";
import { ReferralVaultScene } from "../scenes/ReferralVaultScene";
import { RenderDebugScene } from "../scenes/RenderDebugScene";
import { SenateHearingChamberScene } from "../scenes/SenateHearingChamberScene";
import { SilentReadScene } from "../scenes/SilentReadScene";
import { SpriteGallery } from "../scenes/SpriteGallery";
import { TapToStartScene } from "../scenes/TapToStartScene";
import { TitleScene } from "../scenes/TitleScene";
import { TrueEndingScene } from "../scenes/TrueEndingScene";
import { UIScene } from "../scenes/UIScene";
import { WarningScene } from "../scenes/WarningScene";

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
    activePointers: 4,
    gamepad: true
  },
  audio: {
    disableWebAudio: false
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
    WarningScene,
    TapToStartScene,
    TitleScene,
    CharacterCreateScene,
    GuideScene,
    OfficeScene,
    ArchiveScene,
    CherryBlossomGardenScene,
    BlackVaultLairScene,
    SenateHearingChamberScene,
    NaraStacksScene,
    EmbassyCableRoomScene,
    NetworkScene,
    ReferralVaultScene,
    SilentReadScene,
    EndingScene,
    TrueEndingScene,
    RenderDebugScene,
    DanneGallery,
    SpriteGallery,
    UIScene
  ]
};
