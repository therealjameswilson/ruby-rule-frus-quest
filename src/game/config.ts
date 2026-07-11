import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./constants";
import { ArchiveScene } from "../scenes/ArchiveScene";
import { BadEndingScene } from "../scenes/BadEndingScene";
import { BlackVaultLairScene } from "../scenes/BlackVaultLairScene";
import { BootScene } from "../scenes/BootScene";
import { CharacterCreateScene } from "../scenes/CharacterCreateScene";
import { CherryBlossomGardenScene } from "../scenes/CherryBlossomGardenScene";
import { CodexScene } from "../scenes/CodexScene";
import { DanneGallery } from "../scenes/DanneGallery";
import { EmbassyCableRoomScene } from "../scenes/EmbassyCableRoomScene";
import { EndingScene } from "../scenes/EndingScene";
import { GameplayMapScene } from "../scenes/GameplayMapScene";
import { GuideScene } from "../scenes/GuideScene";
import { HiddenReadingRoomScene } from "../scenes/HiddenReadingRoomScene";
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
import { WorldMapScene } from "../scenes/WorldMapScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-shell",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
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
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 }
    }
  },
  scale: {
    parent: "game-shell",
    mode: Phaser.Scale.NONE,
    zoom: 1,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // High-DPR devices can need a fractional CSS zoom that still resolves to a
    // whole-number physical pixel multiple (for example 4 / 3 on DPR 3).
    autoRound: false
  },
  scene: [
    BootScene,
    WarningScene,
    TapToStartScene,
    TitleScene,
    WorldMapScene,
    CharacterCreateScene,
    GuideScene,
    OfficeScene,
    ArchiveScene,
    CherryBlossomGardenScene,
    BlackVaultLairScene,
    SenateHearingChamberScene,
    NaraStacksScene,
    HiddenReadingRoomScene,
    EmbassyCableRoomScene,
    GameplayMapScene,
    NetworkScene,
    ReferralVaultScene,
    SilentReadScene,
    EndingScene,
    TrueEndingScene,
    BadEndingScene,
    CodexScene,
    RenderDebugScene,
    DanneGallery,
    SpriteGallery,
    UIScene
  ]
};
